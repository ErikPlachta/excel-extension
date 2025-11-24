import { Injectable } from "@angular/core";
import { QueryDefinition, QueryParameter } from "./query-model";
import { QueryUiConfig } from "../types/ui/primitives.types";

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

/**
 * Result of executing a query against an API definition.
 */
export interface ExecuteQueryResult {
  query: QueryDefinition;
  rows: ExecuteQueryResultRow[];
}

export interface GroupingOptionsResult {
  groups: string[];
  subGroups: string[];
}

@Injectable({ providedIn: "root" })
export class QueryApiMockService {
  private createStandardQueryUiConfig(options?: { adminOnly?: boolean }): QueryUiConfig {
    const isAdminOnly = options?.adminOnly ?? false;

    return {
      badgeLabelKey: isAdminOnly ? "query.badge.adminOnly" : undefined,
      actions: [
        {
          id: "run",
          type: "run-query",
          labelKey: "query.action.run",
          button: {
            id: "run",
            labelKey: "query.action.run",
          },
        },
        {
          id: "go-to-table",
          type: "go-to-table",
          labelKey: "query.action.goToTable",
          button: {
            id: "go-to-table",
            labelKey: "query.action.goToTable",
          },
        },
        {
          id: "details",
          type: "show-details",
          labelKey: "query.action.details",
          button: {
            id: "details",
            labelKey: "query.action.details",
            variant: "secondary",
            size: "sm",
          },
        },
      ],
    };
  }

  /**
   * Master catalog of API definitions that can be invoked as queries.
   *
   * Each {@link QueryDefinition} describes an API; individual query runs
   * are represented by a definition + parameter values in state/services
   * such as QueryStateService.
   */
  private readonly queries: QueryDefinition[] = [
    {
      id: "sales-summary",
      name: "Sales Summary",
      description: "Summarized sales by region and month.",
      parameterKeys: ["StartDate", "EndDate", "Group", "SubGroup"],
      parameterBindings: [
        {
          key: "StartDate",
          description: "Filters rows on or after the start date.",
          fieldNames: ["AsOfDate"],
        },
        {
          key: "EndDate",
          description: "Filters rows on or before the end date.",
          fieldNames: ["AsOfDate"],
        },
        {
          key: "Group",
          description: "Filters by primary group.",
          fieldNames: ["Group"],
        },
        {
          key: "SubGroup",
          description: "Filters by subgroup within the primary group.",
          fieldNames: ["SubGroup"],
        },
      ],
      parameters: [
        this.createDateParam("startDate", "Start Date"),
        this.createDateParam("endDate", "End Date"),
      ],
      defaultSheetName: "Sales_Summary",
      defaultTableName: "tbl_SalesSummary",
      writeMode: "overwrite",
      uiConfig: this.createStandardQueryUiConfig(),
    },
    {
      id: "top-customers",
      name: "Top Customers",
      description: "Top customers by revenue.",
      parameterKeys: ["Group", "SubGroup"],
      parameters: [this.createNumberParam("topN", "Top N", 10)],
      defaultSheetName: "Top_Customers",
      defaultTableName: "tbl_TopCustomers",
      writeMode: "append",
      uiConfig: this.createStandardQueryUiConfig(),
    },
    {
      id: "inventory-status",
      name: "Inventory Status",
      description: "Current inventory levels by product.",
      parameterKeys: ["Group"],
      parameters: [],
      defaultSheetName: "Inventory_Status",
      defaultTableName: "tbl_InventoryStatus",
      writeMode: "overwrite",
      uiConfig: this.createStandardQueryUiConfig(),
    },
    {
      id: "user-audit",
      name: "User Access Audit",
      description: "Admin-only report of users and their roles.",
      parameterKeys: [],
      parameters: [],
      defaultSheetName: "User_Audit",
      defaultTableName: "tbl_UserAudit",
      writeMode: "overwrite",
      allowedRoles: ["admin"],
      uiConfig: this.createStandardQueryUiConfig({ adminOnly: true }),
    },
    {
      id: "jsonapi-example",
      name: "JSONPlaceholder Users",
      description:
        "Fetches user data from jsonplaceholder.typicode.com and flattens it into Excel-friendly rows.",
      parameterKeys: [],
      parameters: [],
      defaultSheetName: "JsonApi_Example",
      defaultTableName: "tbl_JsonApiExample",
      writeMode: "overwrite",
      allowedRoles: ["admin"],
      uiConfig: this.createStandardQueryUiConfig({ adminOnly: true }),
    },
    {
      id: "user-demographics",
      name: "User Demographics",
      description: "Comprehensive user demographic data with 25 columns and 5000 rows from randomuser.me.",
      parameterKeys: [],
      parameters: [],
      defaultSheetName: "User_Demographics",
      defaultTableName: "tbl_UserDemographics",
      writeMode: "overwrite",
      allowedRoles: ["admin"],
      uiConfig: this.createStandardQueryUiConfig({ adminOnly: true }),
    },
    {
      id: "large-dataset",
      name: "Large Dataset (Multiple Batches)",
      description: "10k rows with 30 columns from multiple paginated API calls.",
      parameterKeys: [],
      parameters: [],
      defaultSheetName: "Large_Dataset",
      defaultTableName: "tbl_LargeDataset",
      writeMode: "overwrite",
      allowedRoles: ["admin"],
      uiConfig: this.createStandardQueryUiConfig({ adminOnly: true }),
    },
    {
      id: "product-catalog",
      name: "Product Catalog",
      description: "1000 products with 20+ columns from DummyJSON API.",
      parameterKeys: [],
      parameters: [],
      defaultSheetName: "Product_Catalog",
      defaultTableName: "tbl_ProductCatalog",
      writeMode: "overwrite",
      allowedRoles: ["admin"],
      uiConfig: this.createStandardQueryUiConfig({ adminOnly: true }),
    },
    {
      id: "mixed-dataset",
      name: "Mixed Dataset (Users + Posts)",
      description: "8000 rows combining user and post data with 35+ columns.",
      parameterKeys: [],
      parameters: [],
      defaultSheetName: "Mixed_Dataset",
      defaultTableName: "tbl_MixedDataset",
      writeMode: "overwrite",
      allowedRoles: ["admin"],
      uiConfig: this.createStandardQueryUiConfig({ adminOnly: true }),
    },
    {
      id: "synthetic-expansion",
      name: "Synthetic Expansion Dataset",
      description: "25k rows with 40 columns including synthetic transaction data.",
      parameterKeys: [],
      parameters: [],
      defaultSheetName: "Synthetic_Expansion",
      defaultTableName: "tbl_SyntheticExpansion",
      writeMode: "overwrite",
      allowedRoles: ["admin"],
      uiConfig: this.createStandardQueryUiConfig({ adminOnly: true }),
    },
  ];

  /**
   * Returns the master catalog of available API definitions. Callers treat
   * these as "queries" when invoking them with specific parameters.
   */
  getQueries(): QueryDefinition[] {
    return this.queries;
  }

  /**
   * Looks up a single API definition by id from the catalog.
   */
  getQueryById(id: string): QueryDefinition | undefined {
    return this.queries.find((q) => q.id === id);
  }

  async getGroupingOptions(): Promise<GroupingOptionsResult> {
    return {
      groups: ["All", "Consumer", "Enterprise", "Government"],
      subGroups: ["All", "North", "South", "East", "West"],
    };
  }

  /**
   * Executes a query invocation against a given API definition using the
   * supplied parameters. This is a mock implementation that either loads
   * local JSON fixtures or synthesizes rows.
   */
  async executeQuery(
    queryId: string,
    params: ExecuteQueryParams = {}
  ): Promise<ExecuteQueryResult> {
    const query = this.getQueryById(queryId);
    if (!query) {
      throw new Error(`Query not found: ${queryId}`);
    }

    let rows: ExecuteQueryResultRow[];

    // Route to appropriate fetch method based on query ID
    switch (query.id) {
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
        rows = await this.loadAndFilterMockRows(query.id, params);
    }

    return { query, rows };
  }

  private createDateParam(id: string, label: string): QueryParameter {
    return {
      id,
      label,
      type: "date",
      defaultValue: null,
    };
  }

  private createNumberParam(id: string, label: string, defaultValue: number): QueryParameter {
    return {
      id,
      label,
      type: "number",
      defaultValue,
    };
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
        case "user-audit":
          return this.buildUserAuditRows();
        default:
          return [];
      }
    } catch {
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

  // Legacy procedural builders kept for reference; not used now that
  // JSON-backed mock data is loaded via `loadAndFilterMockRows`.
  private buildSalesSummaryRows(params: ExecuteQueryParams): ExecuteQueryResultRow[] {
    const regions = ["North", "South", "East", "West"];
    const groups = ["Consumer", "Enterprise", "Government"];

    const startDateRaw = params["StartDate"];
    const endDateRaw = params["EndDate"];
    const groupFilter = typeof params["Group"] === "string" ? (params["Group"] as string) : "";
    const subGroupFilter =
      typeof params["SubGroup"] === "string" ? (params["SubGroup"] as string) : "";

    const baseDate = new Date();
    baseDate.setMonth(0, 1);

    const startDate =
      typeof startDateRaw === "string" && startDateRaw
        ? new Date(startDateRaw)
        : new Date(baseDate.getFullYear(), 0, 1);
    const endDate =
      typeof endDateRaw === "string" && endDateRaw
        ? new Date(endDateRaw)
        : new Date(baseDate.getFullYear(), 11, 31);

    const rows: ExecuteQueryResultRow[] = [];
    const maxRows = 5000;

    // Walk day-by-day and emit 10-20 randomized rows per day.
    for (
      let asOfDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
      asOfDate <= endDate;
      asOfDate = new Date(asOfDate.getFullYear(), asOfDate.getMonth(), asOfDate.getDate() + 1)
    ) {
      const perDayCount = 10 + Math.floor(Math.random() * 11); // 10-20 rows per day

      for (let i = 0; i < perDayCount; i += 1) {
        const group = groups[Math.floor(Math.random() * groups.length)];
        const region = regions[Math.floor(Math.random() * regions.length)];

        if (groupFilter && group !== groupFilter) {
          continue;
        }
        if (subGroupFilter && region !== subGroupFilter) {
          continue;
        }

        if (rows.length >= maxRows) {
          return rows;
        }

        rows.push({
          AsOfDate: asOfDate,
          Group: group,
          SubGroup: region,
          Region: region,
          Year: asOfDate.getFullYear(),
          Month: asOfDate.getMonth() + 1,
          Day: asOfDate.getDate(),
          Sales: 10000 + asOfDate.getMonth() * 2500 + asOfDate.getDate() * 10 + i,
        });
      }
    }

    return rows;
  }

  private buildTopCustomersRows(params: ExecuteQueryParams): ExecuteQueryResultRow[] {
    const topNRaw = params["topN"];
    const topN = typeof topNRaw === "number" && topNRaw > 0 ? Math.min(topNRaw, 200) : 50;

    const groups = ["Consumer", "Enterprise", "Government"];
    const subGroups = ["North", "South", "East", "West"];

    const groupFilter = typeof params["Group"] === "string" ? (params["Group"] as string) : "";
    const subGroupFilter =
      typeof params["SubGroup"] === "string" ? (params["SubGroup"] as string) : "";

    const rows: ExecuteQueryResultRow[] = [];

    let rank = 1;
    for (
      let asOfDate = new Date();
      rank <= topN;
      asOfDate = new Date(asOfDate.getFullYear(), asOfDate.getMonth(), asOfDate.getDate() + 1)
    ) {
      const perDayCount = 10 + Math.floor(Math.random() * 11);

      for (let i = 0; i < perDayCount && rank <= topN; i += 1) {
        const group = groups[Math.floor(Math.random() * groups.length)];
        const subGroup = subGroups[Math.floor(Math.random() * subGroups.length)];

        if (groupFilter && group !== groupFilter) {
          continue;
        }
        if (subGroupFilter && subGroup !== subGroupFilter) {
          continue;
        }

        rows.push({
          Rank: rank,
          Customer: `Customer ${rank}`,
          Revenue: 50000 - rank * 100,
          AsOfDate: asOfDate,
          Group: group,
          SubGroup: subGroup,
        });

        rank += 1;
      }
    }

    return rows;
  }

  private buildInventoryStatusRows(params: ExecuteQueryParams): ExecuteQueryResultRow[] {
    const products = ["Widget A", "Widget B", "Widget C", "Widget D", "Widget E", "Widget F"];
    const groups = ["Consumer", "Enterprise", "Government"];
    const subGroups = ["North", "South", "East", "West"];

    const groupFilter = typeof params["Group"] === "string" ? (params["Group"] as string) : "";
    const subGroupFilter =
      typeof params["SubGroup"] === "string" ? (params["SubGroup"] as string) : "";

    const rows: ExecuteQueryResultRow[] = [];
    const maxRows = 5000;

    // Walk day-by-day and emit 10-20 randomized rows per day across products,
    // with a hard cap to keep Excel responsive.
    for (
      let asOfDate = new Date();
      rows.length < maxRows;
      asOfDate = new Date(asOfDate.getFullYear(), asOfDate.getMonth(), asOfDate.getDate() + 1)
    ) {
      const perDayCount = 10 + Math.floor(Math.random() * 11);

      for (let i = 0; i < perDayCount; i += 1) {
        const product = products[Math.floor(Math.random() * products.length)];
        const group = groups[Math.floor(Math.random() * groups.length)];
        const subGroup = subGroups[Math.floor(Math.random() * subGroups.length)];

        if (groupFilter && group !== groupFilter) {
          continue;
        }
        if (subGroupFilter && subGroup !== subGroupFilter) {
          continue;
        }

        if (rows.length >= maxRows) {
          return rows;
        }

        rows.push({
          AsOfDate: asOfDate,
          Group: group,
          SubGroup: subGroup,
          Product: product,
          SKU: `SKU-${product.replace(/\D/g, "") || "1000"}`,
          OnHand: 100 - asOfDate.getMonth() * 5 - asOfDate.getDate(),
          ReorderLevel: 40,
        });
      }
    }

    return rows;
  }

  private buildUserAuditRows(): ExecuteQueryResultRow[] {
    const users = [
      { name: "Analyst One", email: "analyst@example.com", roles: "analyst" },
      { name: "Admin One", email: "admin@example.com", roles: "admin" },
    ];

    return users.map((u, index) => ({
      Id: index + 1,
      Name: u.name,
      Email: u.email,
      Roles: u.roles,
    }));
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

    type JsonPlaceholderUser = {
      id: number;
      name: string;
      username: string;
      email: string;
      phone: string;
      website: string;
      address?: {
        city?: string;
        street?: string;
        suite?: string;
        zipcode?: string;
      };
      company?: {
        name?: string;
      };
    };

    const users = (await response.json()) as JsonPlaceholderUser[];

    if (!Array.isArray(users)) {
      return this.buildJsonPlaceholderFallbackRows();
    }

    return users.map((u) => ({
      Id: u.id,
      Name: u.name,
      Username: u.username,
      Email: u.email,
      Phone: u.phone,
      Website: u.website,
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
      const data = await response.json();

      return data.results.map((u: any) => ({
        id: u.login.uuid,
        firstName: u.name.first,
        lastName: u.name.last,
        title: u.name.title,
        gender: u.gender,
        email: u.email,
        phone: u.phone,
        cell: u.cell,
        streetNumber: u.location.street.number,
        streetName: u.location.street.name,
        city: u.location.city,
        state: u.location.state,
        country: u.location.country,
        postcode: u.location.postcode,
        latitude: u.location.coordinates.latitude,
        longitude: u.location.coordinates.longitude,
        timezoneOffset: u.location.timezone.offset,
        timezoneDesc: u.location.timezone.description,
        dob: u.dob.date,
        age: u.dob.age,
        registered: u.registered.date,
        registeredAge: u.registered.age,
        nationality: u.nat,
        picture: u.picture.large,
        thumbnail: u.picture.thumbnail,
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

      return allData.flatMap((data) =>
        data.results.map((u: any) => ({
          uuid: u.login.uuid,
          username: u.login.username,
          password: u.login.password,
          salt: u.login.salt,
          md5: u.login.md5,
          sha1: u.login.sha1,
          sha256: u.login.sha256,
          title: u.name.title,
          first: u.name.first,
          last: u.name.last,
          gender: u.gender,
          email: u.email,
          dobDate: u.dob.date,
          dobAge: u.dob.age,
          regDate: u.registered.date,
          regAge: u.registered.age,
          phone: u.phone,
          cell: u.cell,
          nat: u.nat,
          street: `${u.location.street.number} ${u.location.street.name}`,
          city: u.location.city,
          state: u.location.state,
          country: u.location.country,
          postcode: u.location.postcode,
          lat: u.location.coordinates.latitude,
          lng: u.location.coordinates.longitude,
          tzOffset: u.location.timezone.offset,
          tzDesc: u.location.timezone.description,
          picLarge: u.picture.large,
          picMed: u.picture.medium,
          picThumb: u.picture.thumbnail,
        }))
      );
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
      const data = await Promise.all(responses.map((r) => r.json()));

      return data.flatMap((d) =>
        d.products.map((p: any) => ({
          id: p.id,
          title: p.title,
          description: p.description,
          category: p.category,
          price: p.price,
          discountPercentage: p.discountPercentage,
          rating: p.rating,
          stock: p.stock,
          brand: p.brand,
          sku: p.sku,
          weight: p.weight,
          width: p.dimensions?.width,
          height: p.dimensions?.height,
          depth: p.dimensions?.depth,
          warrantyInfo: p.warrantyInformation,
          shippingInfo: p.shippingInformation,
          availabilityStatus: p.availabilityStatus,
          returnPolicy: p.returnPolicy,
          minimumOrderQty: p.minimumOrderQuantity,
          thumbnail: p.thumbnail,
          image1: p.images?.[0],
          image2: p.images?.[1],
        }))
      );
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
      const [usersResponse, postsResponses] = await Promise.all([
        fetch("https://randomuser.me/api/?results=3000").then((r) => r.json()),
        Promise.all(
          Array.from({ length: 50 }, (_, i) =>
            fetch(`https://dummyjson.com/posts?limit=100&skip=${i * 100}`).then((r) => r.json())
          )
        ),
      ]);

      const userData = usersResponse.results.map((u: any, idx: number) => ({
        type: "USER",
        id: idx + 1,
        uuid: u.login.uuid,
        fullName: `${u.name.first} ${u.name.last}`,
        email: u.email,
        phone: u.phone,
        address: `${u.location.street.number} ${u.location.street.name}`,
        city: u.location.city,
        state: u.location.state,
        zip: u.location.postcode,
        country: u.location.country,
        lat: u.location.coordinates.latitude,
        lng: u.location.coordinates.longitude,
        age: u.dob.age,
        gender: u.gender,
        nationality: u.nat,
        // Null columns for posts
        title: null,
        body: null,
        tags: null,
        reactions: null,
        views: null,
      }));

      const postData = postsResponses.flatMap((p) =>
        p.posts.map((post: any) => ({
          type: "POST",
          id: post.id,
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
          title: post.title,
          body: post.body,
          tags: post.tags?.join(", "),
          reactions: post.reactions?.likes,
          views: post.views,
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
      const data = await response.json();

      // Expand each user 5x with synthetic variations
      return data.results.flatMap((u: any, idx: number) =>
        Array.from({ length: 5 }, (_, variantIdx) => ({
          recordId: idx * 5 + variantIdx + 1,
          userId: u.login.uuid,
          variant: variantIdx + 1,
          timestamp: new Date(Date.now() - Math.random() * 31536000000).toISOString(),
          title: u.name.title,
          firstName: u.name.first,
          lastName: u.name.last,
          gender: u.gender,
          email: u.email,
          username: u.login.username,
          phone: u.phone,
          cell: u.cell,
          dob: u.dob.date,
          age: u.dob.age,
          registered: u.registered.date,
          streetNum: u.location.street.number,
          streetName: u.location.street.name,
          city: u.location.city,
          state: u.location.state,
          country: u.location.country,
          postcode: u.location.postcode,
          latitude: u.location.coordinates.latitude,
          longitude: u.location.coordinates.longitude,
          timezone: u.location.timezone.offset,
          nationality: u.nat,
          picture: u.picture.large,
          // Synthetic transaction data
          transactionId: `TXN-${idx}-${variantIdx}`,
          amount: Math.random() * 10000,
          currency: ["USD", "EUR", "GBP", "JPY"][Math.floor(Math.random() * 4)],
          status: ["completed", "pending", "failed"][Math.floor(Math.random() * 3)],
          category: ["retail", "food", "transport", "entertainment"][
            Math.floor(Math.random() * 4)
          ],
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
