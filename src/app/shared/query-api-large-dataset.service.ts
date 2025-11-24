import { Injectable } from "@angular/core";
import { QueryDefinition } from "./query-model";
import { ExecuteQueryResultRow, ExecuteQueryParams, ExecuteQueryResult } from "./query-api-mock.service";

/**
 * Service providing large dataset mock API endpoints for testing Excel performance.
 * These endpoints fetch real data from external APIs to simulate production workloads.
 */
@Injectable({ providedIn: "root" })
export class QueryApiLargeDatasetService {
  private readonly queries: QueryDefinition[] = [
    {
      id: "user-demographics",
      name: "User Demographics",
      description: "Comprehensive user demographic data with 25 columns and 5000 rows.",
      parameters: [],
      defaultSheetName: "User_Demographics",
      defaultTableName: "tbl_UserDemographics",
    },
    {
      id: "large-dataset",
      name: "Large Dataset (Multiple Batches)",
      description: "10k rows with 30 columns from multiple paginated API calls.",
      parameters: [],
      defaultSheetName: "Large_Dataset",
      defaultTableName: "tbl_LargeDataset",
    },
    {
      id: "product-catalog",
      name: "Product Catalog",
      description: "1000 products with 20+ columns from DummyJSON API.",
      parameters: [],
      defaultSheetName: "Product_Catalog",
      defaultTableName: "tbl_ProductCatalog",
    },
    {
      id: "mixed-dataset",
      name: "Mixed Dataset (Users + Posts)",
      description: "8000 rows combining user and post data with 35+ columns.",
      parameters: [],
      defaultSheetName: "Mixed_Dataset",
      defaultTableName: "tbl_MixedDataset",
    },
    {
      id: "synthetic-expansion",
      name: "Synthetic Expansion Dataset",
      description: "25k rows with 40 columns including synthetic transaction data.",
      parameters: [],
      defaultSheetName: "Synthetic_Expansion",
      defaultTableName: "tbl_SyntheticExpansion",
    },
  ];

  getQueries(): QueryDefinition[] {
    return this.queries;
  }

  getQueryById(id: string): QueryDefinition | undefined {
    return this.queries.find((q) => q.id === id);
  }

  async executeQuery(
    queryId: string,
    params: ExecuteQueryParams = {}
  ): Promise<ExecuteQueryResult> {
    const query = this.getQueryById(queryId);
    if (!query) {
      throw new Error(`Query not found: ${queryId}`);
    }

    const rows = await this.buildRows(query, params);
    return { query, rows };
  }

  private async buildRows(
    query: QueryDefinition,
    params: ExecuteQueryParams
  ): Promise<ExecuteQueryResultRow[]> {
    switch (query.id) {
      case "user-demographics":
        return await this.fetchUserDemographics();
      case "large-dataset":
        return await this.fetchLargeDataset();
      case "product-catalog":
        return await this.fetchProductCatalog();
      case "mixed-dataset":
        return await this.fetchMixedDataset();
      case "synthetic-expansion":
        return await this.fetchSyntheticExpansion();
      default:
        return [];
    }
  }

  /**
   * Example 1: User Demographics (25 columns, 5000 rows)
   * Fetches comprehensive user demographic data from randomuser.me API
   */
  private async fetchUserDemographics(): Promise<ExecuteQueryResultRow[]> {
    try {
      const response = await fetch("https://randomuser.me/api/?results=5000");
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
   * Example 2: Multiple Paginated Calls (10k rows, 30 columns)
   * Fetches data in multiple batches using different seeds
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
   * Example 3: Products from DummyJSON (1000 rows, 20+ columns)
   * Fetches product catalog data with pagination
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
   * Example 4: Mixed Data - Users + Posts (8000 rows, 35+ columns)
   * Combines user and post data from multiple APIs
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
   * Example 5: Synthetic Expansion (25k rows, 40 columns)
   * Expands user data with synthetic transaction records
   */
  private async fetchSyntheticExpansion(): Promise<ExecuteQueryResultRow[]> {
    try {
      const response = await fetch("https://randomuser.me/api/?results=5000");
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
