/**
 * Known User Role identifiers in the system.
 * Moved from app-config.types to shared types for API definitions.
 */
export type RoleId = "analyst" | "admin";

/**
 * API Definition - Catalog of available data source APIs.
 *
 * Represents an API endpoint/service that can be queried. This is the catalog entry,
 * NOT the instance of a configured query.
 *
 * @example
 * ```typescript
 * const salesApi: ApiDefinition = {
 *   id: 'sales-summary-api',
 *   name: 'Sales Summary API',
 *   description: 'Aggregated sales data by region',
 *   allowedRoles: ['analyst', 'admin'],
 *   parameters: [
 *     { key: 'StartDate', type: 'date', required: true },
 *     { key: 'EndDate', type: 'date', required: true }
 *   ],
 *   responseSchema: [
 *     { key: 'region', name: 'Region', dataType: 'string' },
 *     { key: 'totalSales', name: 'Total Sales', dataType: 'number' }
 *   ]
 * };
 * ```
 */
export interface ApiDefinition {
  /** Unique API identifier (kebab-case recommended) */
  id: string;

  /** Display name for UI */
  name: string;

  /** Description of what data this API provides */
  description?: string;

  /** Roles allowed to access this API (empty = all roles) */
  allowedRoles?: RoleId[];

  /** Parameters this API accepts */
  parameters: ApiParameter[];

  /** Response schema (columns returned by API) */
  responseSchema?: ApiColumnDefinition[];

  /** UI configuration for catalog display */
  catalogUiConfig?: ApiCatalogUiConfig;
}

/**
 * API Parameter - Defines an input parameter for an API.
 */
export interface ApiParameter {
  /** Parameter key (used in parameter values object) */
  key: string;

  /** Parameter data type */
  type: 'string' | 'number' | 'date' | 'boolean' | 'array';

  /** Whether parameter is required */
  required: boolean;

  /** Default value if not provided */
  defaultValue?: any;

  /** Description for UI help text */
  description?: string;

  /** Display label (defaults to key if not provided) */
  label?: string;
}

/**
 * API Column Definition - Defines a column in the API response.
 */
export interface ApiColumnDefinition {
  /** Column key (matches property in response data) */
  key: string;

  /** Display name for column header */
  name: string;

  /** Column data type */
  dataType: 'string' | 'number' | 'date' | 'boolean';

  /** Description for documentation */
  description?: string;
}

/**
 * API Catalog UI Config - UI metadata for catalog display.
 */
export interface ApiCatalogUiConfig {
  /** Icon name or path */
  icon?: string;

  /** Category for grouping APIs */
  category?: string;

  /** Tags for search/filtering */
  tags?: string[];
}
