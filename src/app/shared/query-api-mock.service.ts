import { Injectable } from "@angular/core";
import { QueryDefinition, QueryParameter } from "./query-model";
import { QueryUiConfig } from "../types/ui/primitives.types";

export interface ExecuteQueryParams {
  [key: string]: string | number | boolean | Date | null | undefined;
}

export interface ExecuteQueryResultRow {
  [column: string]: string | number | boolean | Date | null;
}

export interface ExecuteQueryResult {
  /** The query that was executed */
  query: QueryDefinition;
  /** Rows returned by the mock execution */
  rows: ExecuteQueryResultRow[];
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

  private readonly queries: QueryDefinition[] = [
    {
      id: "sales-summary",
      name: "Sales Summary",
      description: "Summarized sales by region and month.",
      parameters: [
        this.createDateParam("startDate", "Start Date"),
        this.createDateParam("endDate", "End Date"),
      ],
      defaultSheetName: "Sales_Summary",
      defaultTableName: "tbl_SalesSummary",
      uiConfig: this.createStandardQueryUiConfig(),
    },
    {
      id: "top-customers",
      name: "Top Customers",
      description: "Top customers by revenue.",
      parameters: [this.createNumberParam("topN", "Top N", 10)],
      defaultSheetName: "Top_Customers",
      defaultTableName: "tbl_TopCustomers",
      uiConfig: this.createStandardQueryUiConfig(),
    },
    {
      id: "inventory-status",
      name: "Inventory Status",
      description: "Current inventory levels by product.",
      parameters: [],
      defaultSheetName: "Inventory_Status",
      defaultTableName: "tbl_InventoryStatus",
      uiConfig: this.createStandardQueryUiConfig(),
    },
    {
      id: "user-audit",
      name: "User Access Audit",
      description: "Admin-only report of users and their roles.",
      parameters: [],
      defaultSheetName: "User_Audit",
      defaultTableName: "tbl_UserAudit",
      allowedRoles: ["admin"],
      uiConfig: this.createStandardQueryUiConfig({ adminOnly: true }),
    },
    {
      id: "jsonapi-example",
      name: "JSONPlaceholder Users",
      description:
        "Fetches user data from jsonplaceholder.typicode.com and flattens it into Excel-friendly rows.",
      parameters: [],
      defaultSheetName: "JsonApi_Example",
      defaultTableName: "tbl_JsonApiExample",
      allowedRoles: ["admin"],
      uiConfig: this.createStandardQueryUiConfig({ adminOnly: true }),
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

    let rows: ExecuteQueryResultRow[];

    if (query.id === "jsonapi-example") {
      rows = await this.fetchJsonPlaceholderUsers();
    } else {
      // Deterministic mock rows based on query id and simple params.
      rows = this.buildRows(query, params);
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

  private buildRows(query: QueryDefinition, params: ExecuteQueryParams): ExecuteQueryResultRow[] {
    switch (query.id) {
      case "sales-summary":
        return this.buildSalesSummaryRows(params);
      case "top-customers":
        return this.buildTopCustomersRows(params);
      case "inventory-status":
        return this.buildInventoryStatusRows();
      case "user-audit":
        return this.buildUserAuditRows();
      case "jsonapi-example":
        return this.buildJsonPlaceholderFallbackRows();
      default:
        return [];
    }
  }

  private buildSalesSummaryRows(params: ExecuteQueryParams): ExecuteQueryResultRow[] {
    const regions = ["North", "South", "East", "West"];
    const now = new Date();
    const baseYear = now.getFullYear();
    return regions.map((region, index) => ({
      Region: region,
      Year: baseYear,
      Month: index + 1,
      Sales: 10000 + index * 2500,
    }));
  }

  private buildTopCustomersRows(params: ExecuteQueryParams): ExecuteQueryResultRow[] {
    const topNRaw = params["topN"];
    const topN = typeof topNRaw === "number" && topNRaw > 0 ? Math.min(topNRaw, 50) : 10;
    const rows: ExecuteQueryResultRow[] = [];
    for (let i = 1; i <= topN; i += 1) {
      rows.push({
        Rank: i,
        Customer: `Customer ${i}`,
        Revenue: 50000 - i * 750,
      });
    }
    return rows;
  }

  private buildInventoryStatusRows(): ExecuteQueryResultRow[] {
    const products = ["Widget A", "Widget B", "Widget C", "Widget D"];
    return products.map((product, index) => ({
      Product: product,
      SKU: `SKU-${1000 + index}`,
      OnHand: 100 - index * 10,
      ReorderLevel: 40,
    }));
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
}
