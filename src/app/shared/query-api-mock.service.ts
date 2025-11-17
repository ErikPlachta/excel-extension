import { Injectable } from "@angular/core";
import { QueryDefinition, QueryParameter } from "./query-model";

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
    },
    {
      id: "top-customers",
      name: "Top Customers",
      description: "Top customers by revenue.",
      parameters: [this.createNumberParam("topN", "Top N", 10)],
      defaultSheetName: "Top_Customers",
      defaultTableName: "tbl_TopCustomers",
    },
    {
      id: "inventory-status",
      name: "Inventory Status",
      description: "Current inventory levels by product.",
      parameters: [],
      defaultSheetName: "Inventory_Status",
      defaultTableName: "tbl_InventoryStatus",
    },
    {
      id: "user-audit",
      name: "User Access Audit",
      description: "Admin-only report of users and their roles.",
      parameters: [],
      defaultSheetName: "User_Audit",
      defaultTableName: "tbl_UserAudit",
      allowedRoles: ["admin"],
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

    // Deterministic mock rows based on query id and simple params.
    const rows = this.buildRows(query, params);
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
}
