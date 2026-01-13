import { Injectable } from "@angular/core";
import { ApiCatalogService } from './api-catalog.service';
import { IndexedDBService } from "@excel-platform/data/storage";
import { SettingsService } from "@excel-platform/core/settings";
import { TelemetryService } from "@excel-platform/core/telemetry";
import { AuthService } from "@excel-platform/core/auth";
import {
  JsonPlaceholderUserSchema,
  RandomUserFullResponseSchema,
  DummyJsonProductsResponseSchema,
  type JsonPlaceholderUserParsed,
  type RandomUserFullParsed,
  type DummyJsonProductParsed,
} from "@excel-platform/shared/types";

/**
 * Concrete parameter values supplied when invoking a query against a
 * particular API definition.
 */
export interface ExecuteQueryParams {
  [key: string]: string | number | boolean | Date | null | undefined;
}

/**
 * A single row returned from a query invocation against an API.
 */
export interface ExecuteQueryResultRow {
  [column: string]: string | number | boolean | Date | null;
}

export interface GroupingOptionsResult {
  groups: string[];
  subGroups: string[];
}

/**
 * Error thrown when API request fails authentication validation.
 * Contains HTTP-like status code for consistent error handling.
 */
export class ApiAuthError extends Error {
  constructor(
    message: string,
    public readonly status: number = 401,
    public readonly reason?: string
  ) {
    super(message);
    this.name = 'ApiAuthError';
  }
}

/**
 * Mock API service for local development and testing.
 *
 * Fetches data from external mock APIs (JSONPlaceholder, RandomUser, DummyJSON)
 * and local mock data files. Includes caching via IndexedDB with TTL expiration.
 * Validates auth tokens before data access per backend security spec.
 */
@Injectable({ providedIn: "root" })
export class QueryApiMockService {
  constructor(
    private apiCatalog: ApiCatalogService,
    private indexedDB: IndexedDBService,
    private settings: SettingsService,
    private telemetry: TelemetryService,
    private auth: AuthService
  ) {}

  /**
   * Validate current auth token before API execution.
   *
   * Per BACKEND-API-SPEC Section 6: "JTI blacklist checked on every request"
   *
   * @throws ApiAuthError with 401 status if token invalid/revoked/missing
   */
  private validateRequest(): void {
    const validation = this.auth.validateCurrentToken();
    if (!validation.valid) {
      throw new ApiAuthError(
        `Unauthorized - token ${validation.reason ?? 'invalid'}`,
        401,
        validation.reason
      );
    }
  }

  async getGroupingOptions(): Promise<GroupingOptionsResult> {
    return {
      groups: ["All", "Consumer", "Enterprise", "Government"],
      subGroups: ["All", "North", "South", "East", "West"],
    };
  }

  /**
   * Execute an API with given parameters (NEW method for Phase 1).
   *
   * This is the NEW method that separates API execution from catalog management.
   * It works with ApiDefinition IDs from ApiCatalogService, not QueryDefinition.
   *
   * Checks IndexedDB cache before executing. Cached results are returned immediately
   * if not expired. On cache miss, executes API and caches result for future calls.
   *
   * **Security:** Validates auth token before any data access per BACKEND-API-SPEC.
   *
   * @param apiId - API identifier from ApiCatalogService
   * @param params - Parameter values for API execution
   * @returns Promise of result rows (from cache or fresh execution)
   * @throws ApiAuthError with status 401 if token is invalid/revoked/missing
   */
  async executeApi(apiId: string, params: ExecuteQueryParams = {}): Promise<ExecuteQueryResultRow[]> {
    // Validate auth token before any data access
    this.validateRequest();

    // Validate API exists in catalog
    const api = this.apiCatalog.getApiById(apiId);
    if (!api) {
      throw new Error(`API not found: ${apiId}`);
    }

    // Try cache first
    const cacheKey = this.generateCacheKey(apiId, params);
    const cachedResult = await this.indexedDB.getCachedQueryResult(cacheKey);
    if (cachedResult) {
      return cachedResult as ExecuteQueryResultRow[];
    }

    // Cache miss - execute and cache
    const rows = await this.executeApiUncached(apiId, params);
    await this.indexedDB.cacheQueryResult(cacheKey, rows);
    return rows;
  }

  /**
   * Execute API without checking cache. Used internally by executeApi().
   *
   * @internal
   * @param apiId - API identifier
   * @param params - Parameter values for API execution
   * @returns Promise of result rows
   */
  private async executeApiUncached(apiId: string, params: ExecuteQueryParams): Promise<ExecuteQueryResultRow[]> {
    // Get max row limit from settings
    const queryExecSettings = this.settings.value.queryExecution;
    const maxRows = queryExecSettings?.maxRowsPerQuery ?? 10000;

    // Route to appropriate fetch method based on API ID
    let rows: ExecuteQueryResultRow[];
    switch (apiId) {
      case "jsonapi-example":
        rows = await this.fetchJsonPlaceholderUsers();
        break;
      case "user-demographics":
        rows = await this.fetchUserDemographics();
        break;
      case "large-dataset":
        rows = await this.fetchLargeDataset();
        break;
      case "product-catalog":
        rows = await this.fetchProductCatalog();
        break;
      case "mixed-dataset":
        rows = await this.fetchMixedDataset();
        break;
      case "synthetic-expansion":
        rows = await this.fetchSyntheticExpansion();
        break;
      default:
        rows = await this.loadAndFilterMockRows(apiId, params);
    }

    // Enforce max row limit
    if (rows.length > maxRows) {
      this.telemetry.logEvent({
        category: 'query',
        name: 'executeApi:rowLimitExceeded',
        severity: 'warn',
        message: `Query result exceeded max row limit (${rows.length} > ${maxRows})`,
        context: {
          apiId,
          rowCount: rows.length,
          maxRows,
          truncated: true,
        },
      });
      return rows.slice(0, maxRows); // Truncate to max rows
    }

    return rows;
  }

  /**
   * Generate cache key from API ID and parameters.
   *
   * Creates deterministic key by sorting parameter keys to ensure
   * same params in different order produce same cache key.
   *
   * @internal
   * @param apiId - API identifier
   * @param params - Parameter values
   * @returns Cache key string
   */
  private generateCacheKey(apiId: string, params: ExecuteQueryParams): string {
    // Sort params for deterministic cache key
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((acc, key) => {
        acc[key] = params[key];
        return acc;
      }, {} as ExecuteQueryParams);

    return `${apiId}:${JSON.stringify(sortedParams)}`;
  }

  private async loadAndFilterMockRows(
    queryId: string,
    params: ExecuteQueryParams
  ): Promise<ExecuteQueryResultRow[]> {
    let raw: ExecuteQueryResultRow[] = [];

    try {
      switch (queryId) {
        case "sales-summary":
          raw = (await import("./mock-data/sales-summary.json")).default as ExecuteQueryResultRow[];
          break;
        case "top-customers":
          raw = (await import("./mock-data/top-customers.json")).default as ExecuteQueryResultRow[];
          break;
        case "inventory-status":
          raw = (await import("./mock-data/inventory-status.json"))
            .default as ExecuteQueryResultRow[];
          break;
        default:
          this.telemetry.logEvent({
            category: "query",
            name: "mock:unknownApiId",
            severity: "warning",
            context: { queryId },
          });
          return [];
      }
    } catch (error) {
      this.telemetry.logEvent({
        category: "query",
        name: "mock:loadError",
        severity: "error",
        context: {
          queryId,
          error: error instanceof Error ? error.message : String(error),
        },
      });
      return [];
    }

    // Basic parameter-driven filtering; can be extended per-query.
    // NOTE: ExecuteQueryParams come from QueryParamsService/QueryStateService,
    // which currently use parameter keys like "startDate"/"endDate".
    // The mock data itself uses an "AsOfDate" column, so we support both
    // naming conventions when filtering.
    const startDateRaw = params["StartDate"] ?? params["startDate"];
    const endDateRaw = params["EndDate"] ?? params["endDate"];

    const rawGroup = typeof params["Group"] === "string" ? (params["Group"] as string) : "";
    const rawSubGroup =
      typeof params["SubGroup"] === "string" ? (params["SubGroup"] as string) : "";

    // Treat the literal "All" as a no-op filter so that selecting
    // (All) in the UI does not accidentally filter out every row.
    const groupFilter = rawGroup && rawGroup !== "All" ? rawGroup : "";
    const subGroupFilter = rawSubGroup && rawSubGroup !== "All" ? rawSubGroup : "";

    let rows = raw;

    if (startDateRaw || endDateRaw) {
      const start = startDateRaw ? new Date(String(startDateRaw)) : null;
      const end = endDateRaw ? new Date(String(endDateRaw)) : null;
      rows = rows.filter((r) => {
        const asOf = r["AsOfDate"] ? new Date(String(r["AsOfDate"])) : null;
        if (!asOf) return false;
        if (start && asOf < start) return false;
        if (end && asOf > end) return false;
        return true;
      });
    }

    if (groupFilter) {
      rows = rows.filter((r) => r["Group"] === groupFilter);
    }

    if (subGroupFilter) {
      rows = rows.filter((r) => r["SubGroup"] === subGroupFilter);
    }

    // top-customers: respect topN if provided
    if (queryId === "top-customers") {
      const topNRaw = params["topN"];
      const topN = typeof topNRaw === "number" && topNRaw > 0 ? Math.min(topNRaw, 200) : 50;
      rows = rows
        .slice()
        .sort((a, b) => (Number(a["Rank"]) || 0) - (Number(b["Rank"]) || 0))
        .filter((r) => (Number(r["Rank"]) || 0) >= 1 && (Number(r["Rank"]) || 0) <= topN);
    }

    return rows;
  }

  private buildJsonApiExampleRows(params: ExecuteQueryParams): ExecuteQueryResultRow[] {
    const resourceTypeRaw = params["resourceType"];
    const resourceType =
      typeof resourceTypeRaw === "string" && resourceTypeRaw.trim().length
        ? resourceTypeRaw.trim()
        : "articles";

    if (resourceType === "people") {
      return [
        {
          Type: "people",
          Id: "9",
          Name: "Dan",
          Twitter: "@dan",
        },
        {
          Type: "people",
          Id: "2",
          Name: "John",
          Twitter: "@john",
        },
      ];
    }

    // Default to an articles-like shape inspired by jsonapi.org examples.
    return [
      {
        Type: "articles",
        Id: "1",
        Title: "JSON:API paints my bikeshed!",
        AuthorId: "9",
        Created: new Date("2015-05-22T14:56:29.000Z"),
      },
      {
        Type: "articles",
        Id: "2",
        Title: "Understanding JSON:API relationships",
        AuthorId: "2",
        Created: new Date("2015-05-23T10:12:00.000Z"),
      },
    ];
  }

  private async fetchJsonPlaceholderUsers(): Promise<ExecuteQueryResultRow[]> {
    const endpoint = "https://jsonplaceholder.typicode.com/users";
    const response = await fetch(endpoint, { method: "GET" });
    if (!response.ok) {
      throw new Error(`JSONPlaceholder request failed: ${response.status}`);
    }

    const rawData = await response.json();

    // Validate with Zod schema - external API is a trust boundary
    if (!Array.isArray(rawData)) {
      return this.buildJsonPlaceholderFallbackRows();
    }

    const users: JsonPlaceholderUserParsed[] = [];
    for (const item of rawData) {
      const result = JsonPlaceholderUserSchema.safeParse(item);
      if (result.success) {
        users.push(result.data);
      }
      // Skip invalid items silently - partial data is acceptable
    }

    if (users.length === 0) {
      return this.buildJsonPlaceholderFallbackRows();
    }

    return users.map((u) => ({
      Id: u.id,
      Name: u.name,
      Username: u.username,
      Email: u.email,
      Phone: u.phone ?? "",
      Website: u.website ?? "",
      City: u.address?.city ?? "",
      Company: u.company?.name ?? "",
    }));
  }

  private buildJsonPlaceholderFallbackRows(): ExecuteQueryResultRow[] {
    return this.buildJsonApiExampleRows({});
  }

  /**
   * Fetches comprehensive user demographic data from randomuser.me API.
   * Returns 5000 rows with 25 columns including personal info, location, and demographics.
   */
  private async fetchUserDemographics(): Promise<ExecuteQueryResultRow[]> {
    try {
      const response = await fetch("https://randomuser.me/api/?results=5000");
      if (!response.ok) {
        throw new Error(`RandomUser API request failed: ${response.status}`);
      }
      const rawData = await response.json();

      // Validate with Zod schema - external API is a trust boundary
      const result = RandomUserFullResponseSchema.safeParse(rawData);
      if (!result.success) {
        console.error("RandomUser API response validation failed:", result.error.issues);
        return [];
      }

      return result.data.results.map((u: RandomUserFullParsed) => ({
        id: u.login.uuid,
        firstName: u.name.first,
        lastName: u.name.last,
        title: u.name.title ?? "",
        gender: u.gender ?? "",
        email: u.email,
        phone: u.phone ?? "",
        cell: u.cell ?? "",
        streetNumber: u.location.street?.number ?? 0,
        streetName: u.location.street?.name ?? "",
        city: u.location.city,
        state: u.location.state,
        country: u.location.country,
        postcode: String(u.location.postcode ?? ""),
        latitude: u.location.coordinates?.latitude ?? "",
        longitude: u.location.coordinates?.longitude ?? "",
        timezoneOffset: u.location.timezone?.offset ?? "",
        timezoneDesc: u.location.timezone?.description ?? "",
        dob: u.dob.date ?? "",
        age: u.dob.age,
        registered: u.registered?.date ?? "",
        registeredAge: u.registered?.age ?? 0,
        nationality: u.nat ?? "",
        picture: u.picture?.large ?? "",
        thumbnail: u.picture?.thumbnail ?? "",
      }));
    } catch (error) {
      console.error("Error fetching user demographics:", error);
      return [];
    }
  }

  /**
   * Fetches data in multiple batches using different seeds.
   * Returns 10k rows with 30 columns from multiple paginated API calls.
   */
  private async fetchLargeDataset(): Promise<ExecuteQueryResultRow[]> {
    try {
      const batches = await Promise.all([
        fetch("https://randomuser.me/api/?results=5000&seed=a"),
        fetch("https://randomuser.me/api/?results=5000&seed=b"),
      ]);

      const allData = await Promise.all(batches.map((r) => r.json()));

      // Validate each batch with Zod schema - external API is a trust boundary
      const validatedUsers: RandomUserFullParsed[] = [];
      for (const data of allData) {
        const result = RandomUserFullResponseSchema.safeParse(data);
        if (result.success) {
          validatedUsers.push(...result.data.results);
        } else {
          console.error("Large dataset batch validation failed:", result.error.issues);
        }
      }

      return validatedUsers.map((u: RandomUserFullParsed) => ({
        uuid: u.login.uuid,
        username: u.login.username ?? "",
        password: u.login.password ?? "",
        salt: u.login.salt ?? "",
        md5: u.login.md5 ?? "",
        sha1: u.login.sha1 ?? "",
        sha256: u.login.sha256 ?? "",
        title: u.name.title ?? "",
        first: u.name.first,
        last: u.name.last,
        gender: u.gender ?? "",
        email: u.email,
        dobDate: u.dob.date ?? "",
        dobAge: u.dob.age,
        regDate: u.registered?.date ?? "",
        regAge: u.registered?.age ?? 0,
        phone: u.phone ?? "",
        cell: u.cell ?? "",
        nat: u.nat ?? "",
        street: `${u.location.street?.number ?? ""} ${u.location.street?.name ?? ""}`,
        city: u.location.city,
        state: u.location.state,
        country: u.location.country,
        postcode: String(u.location.postcode ?? ""),
        lat: u.location.coordinates?.latitude ?? "",
        lng: u.location.coordinates?.longitude ?? "",
        tzOffset: u.location.timezone?.offset ?? "",
        tzDesc: u.location.timezone?.description ?? "",
        picLarge: u.picture?.large ?? "",
        picMed: u.picture?.medium ?? "",
        picThumb: u.picture?.thumbnail ?? "",
      }));
    } catch (error) {
      console.error("Error fetching large dataset:", error);
      return [];
    }
  }

  /**
   * Fetches product catalog data with pagination from DummyJSON API.
   * Returns 1000 products with 20+ columns.
   */
  private async fetchProductCatalog(): Promise<ExecuteQueryResultRow[]> {
    try {
      const calls = Array.from({ length: 10 }, (_, i) =>
        fetch(`https://dummyjson.com/products?limit=100&skip=${i * 100}`)
      );

      const responses = await Promise.all(calls);
      const rawData = await Promise.all(responses.map((r) => r.json()));

      // Validate each batch with Zod schema - external API is a trust boundary
      const validatedProducts: DummyJsonProductParsed[] = [];
      for (const data of rawData) {
        const result = DummyJsonProductsResponseSchema.safeParse(data);
        if (result.success) {
          validatedProducts.push(...result.data.products);
        } else {
          console.error("Product catalog batch validation failed:", result.error.issues);
        }
      }

      return validatedProducts.map((p: DummyJsonProductParsed) => ({
        id: p.id,
        title: p.title,
        description: p.description ?? "",
        category: p.category ?? "",
        price: p.price ?? 0,
        discountPercentage: p.discountPercentage ?? 0,
        rating: p.rating ?? 0,
        stock: p.stock ?? 0,
        brand: p.brand ?? "",
        sku: p.sku ?? "",
        weight: p.weight ?? 0,
        width: p.dimensions?.width ?? 0,
        height: p.dimensions?.height ?? 0,
        depth: p.dimensions?.depth ?? 0,
        warrantyInfo: p.warrantyInformation ?? "",
        shippingInfo: p.shippingInformation ?? "",
        availabilityStatus: p.availabilityStatus ?? "",
        returnPolicy: p.returnPolicy ?? "",
        minimumOrderQty: p.minimumOrderQuantity ?? 0,
        thumbnail: p.thumbnail ?? "",
        image1: p.images?.[0] ?? "",
        image2: p.images?.[1] ?? "",
      }));
    } catch (error) {
      console.error("Error fetching product catalog:", error);
      return [];
    }
  }

  /**
   * Combines user and post data from multiple APIs.
   * Returns 8000 rows with 35+ columns mixing user and post data.
   */
  private async fetchMixedDataset(): Promise<ExecuteQueryResultRow[]> {
    try {
      const [usersRaw, postsResponses] = await Promise.all([
        fetch("https://randomuser.me/api/?results=3000").then((r) => r.json()),
        Promise.all(
          Array.from({ length: 50 }, (_, i) =>
            fetch(`https://dummyjson.com/posts?limit=100&skip=${i * 100}`).then((r) => r.json())
          )
        ),
      ]);

      // Validate user data with Zod schema - external API is a trust boundary
      const usersResult = RandomUserFullResponseSchema.safeParse(usersRaw);
      const validatedUsers = usersResult.success ? usersResult.data.results : [];
      if (!usersResult.success) {
        console.error("Mixed dataset users validation failed:", usersResult.error.issues);
      }

      const userData = validatedUsers.map((u: RandomUserFullParsed, idx: number) => ({
        type: "USER",
        id: idx + 1,
        uuid: u.login.uuid,
        fullName: `${u.name.first} ${u.name.last}`,
        email: u.email,
        phone: u.phone ?? "",
        address: `${u.location.street?.number ?? ""} ${u.location.street?.name ?? ""}`,
        city: u.location.city,
        state: u.location.state,
        zip: String(u.location.postcode ?? ""),
        country: u.location.country,
        lat: u.location.coordinates?.latitude ?? "",
        lng: u.location.coordinates?.longitude ?? "",
        age: u.dob.age,
        gender: u.gender ?? "",
        nationality: u.nat ?? "",
        // Null columns for posts
        title: null,
        body: null,
        tags: null,
        reactions: null,
        views: null,
      }));

      // DummyJSON posts - no schema validation (third-party mock API)
      // Keeping light validation only for this mock service
      const postData: ExecuteQueryResultRow[] = postsResponses.flatMap((p: { posts?: Array<Record<string, unknown>> }) =>
        (p.posts ?? []).map((post: Record<string, unknown>): ExecuteQueryResultRow => ({
          type: "POST",
          id: typeof post['id'] === 'number' ? post['id'] : 0,
          uuid: null,
          fullName: null,
          email: null,
          phone: null,
          address: null,
          city: null,
          state: null,
          zip: null,
          country: null,
          lat: null,
          lng: null,
          age: null,
          gender: null,
          nationality: null,
          title: typeof post['title'] === 'string' ? post['title'] : "",
          body: typeof post['body'] === 'string' ? post['body'] : "",
          tags: Array.isArray(post['tags']) ? (post['tags'] as string[]).join(", ") : "",
          reactions: typeof (post['reactions'] as Record<string, unknown>)?.['likes'] === 'number'
            ? (post['reactions'] as Record<string, unknown>)['likes'] as number
            : null,
          views: typeof post['views'] === 'number' ? post['views'] : null,
        }))
      );

      return [...userData, ...postData];
    } catch (error) {
      console.error("Error fetching mixed dataset:", error);
      return [];
    }
  }

  /**
   * Expands user data with synthetic transaction records.
   * Returns 25k rows with 40 columns including user info and synthetic transaction data.
   */
  private async fetchSyntheticExpansion(): Promise<ExecuteQueryResultRow[]> {
    try {
      const response = await fetch("https://randomuser.me/api/?results=5000");
      if (!response.ok) {
        throw new Error(`RandomUser API request failed: ${response.status}`);
      }
      const rawData = await response.json();

      // Validate with Zod schema - external API is a trust boundary
      const result = RandomUserFullResponseSchema.safeParse(rawData);
      if (!result.success) {
        console.error("Synthetic expansion validation failed:", result.error.issues);
        return [];
      }

      // Expand each user 5x with synthetic variations
      return result.data.results.flatMap((u: RandomUserFullParsed, idx: number) =>
        Array.from({ length: 5 }, (_, variantIdx) => ({
          recordId: idx * 5 + variantIdx + 1,
          userId: u.login.uuid,
          variant: variantIdx + 1,
          timestamp: new Date(Date.now() - Math.random() * 31536000000).toISOString(),
          title: u.name.title ?? "",
          firstName: u.name.first,
          lastName: u.name.last,
          gender: u.gender ?? "",
          email: u.email,
          username: u.login.username ?? "",
          phone: u.phone ?? "",
          cell: u.cell ?? "",
          dob: u.dob.date ?? "",
          age: u.dob.age,
          registered: u.registered?.date ?? "",
          streetNum: u.location.street?.number ?? 0,
          streetName: u.location.street?.name ?? "",
          city: u.location.city,
          state: u.location.state,
          country: u.location.country,
          postcode: String(u.location.postcode ?? ""),
          latitude: u.location.coordinates?.latitude ?? "",
          longitude: u.location.coordinates?.longitude ?? "",
          timezone: u.location.timezone?.offset ?? "",
          nationality: u.nat ?? "",
          picture: u.picture?.large ?? "",
          // Synthetic transaction data
          transactionId: `TXN-${idx}-${variantIdx}`,
          amount: Math.random() * 10000,
          currency: ["USD", "EUR", "GBP", "JPY"][Math.floor(Math.random() * 4)],
          status: ["completed", "pending", "failed"][Math.floor(Math.random() * 3)],
          category: ["retail", "food", "transport", "entertainment"][Math.floor(Math.random() * 4)],
          merchant: `Merchant-${Math.floor(Math.random() * 100)}`,
          paymentMethod: ["credit", "debit", "cash", "crypto"][Math.floor(Math.random() * 4)],
          score: Math.random() * 100,
          approved: Math.random() > 0.5,
          notes: `Transaction note ${variantIdx}`,
          refCode: Math.random().toString(36).substring(7).toUpperCase(),
          processed: Math.random() > 0.3,
          flagged: Math.random() > 0.9,
          reviewRequired: Math.random() > 0.85,
          region: ["NA", "EU", "APAC", "LATAM"][Math.floor(Math.random() * 4)],
        }))
      );
    } catch (error) {
      console.error("Error fetching synthetic expansion:", error);
      return [];
    }
  }
}
