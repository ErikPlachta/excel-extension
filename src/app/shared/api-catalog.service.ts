import { Injectable } from '@angular/core';
import { ApiDefinition, ApiParameter } from '../types/api.types';
import { RoleId } from '../types/app-config.types';

/**
 * API Catalog Service - Manages available API definitions.
 *
 * Provides read-only access to API catalog. This is the NEW service that separates
 * API definitions (catalog) from query execution (QueryApiMockService).
 *
 * In Phase 2, this will load from AppConfig instead of hardcoded array.
 */
@Injectable({ providedIn: 'root' })
export class ApiCatalogService {
  /**
   * Master catalog of API definitions.
   *
   * These represent available data sources that can be queried. Users create
   * QueryConfiguration instances from these APIs with specific parameter values.
   */
  private readonly apis: ApiDefinition[] = [
    {
      id: 'sales-summary',
      name: 'Sales Summary',
      description: 'Summarized sales by region and month.',
      allowedRoles: ['analyst', 'admin'],
      parameters: [
        { key: 'startDate', type: 'date', required: true, label: 'Start Date' },
        { key: 'endDate', type: 'date', required: true, label: 'End Date' },
      ],
      responseSchema: [
        { key: 'region', name: 'Region', dataType: 'string' },
        { key: 'totalSales', name: 'Total Sales', dataType: 'number' },
        { key: 'period', name: 'Period', dataType: 'string' },
      ],
    },
    {
      id: 'top-customers',
      name: 'Top Customers',
      description: 'Top customers by revenue.',
      allowedRoles: ['analyst', 'admin'],
      parameters: [
        { key: 'topN', type: 'number', required: false, defaultValue: 10, label: 'Top N' },
      ],
      responseSchema: [
        { key: 'customerName', name: 'Customer Name', dataType: 'string' },
        { key: 'revenue', name: 'Revenue', dataType: 'number' },
        { key: 'orderCount', name: 'Order Count', dataType: 'number' },
      ],
    },
    {
      id: 'inventory-status',
      name: 'Inventory Status',
      description: 'Current inventory levels by product.',
      allowedRoles: ['analyst', 'admin'],
      parameters: [],
      responseSchema: [
        { key: 'productId', name: 'Product ID', dataType: 'string' },
        { key: 'productName', name: 'Product Name', dataType: 'string' },
        { key: 'quantity', name: 'Quantity', dataType: 'number' },
        { key: 'status', name: 'Status', dataType: 'string' },
      ],
    },
    {
      id: 'jsonapi-example',
      name: 'JSONPlaceholder Users',
      description: 'Fetches user data from jsonplaceholder.typicode.com and flattens it into Excel-friendly rows.',
      allowedRoles: ['admin'],
      parameters: [],
      catalogUiConfig: {
        category: 'External APIs',
        tags: ['demo', 'api'],
      },
    },
    {
      id: 'user-demographics',
      name: 'User Demographics',
      description: 'Comprehensive user demographic data with 25 columns and 5000 rows from randomuser.me.',
      allowedRoles: ['admin'],
      parameters: [],
      catalogUiConfig: {
        category: 'Large Datasets',
        tags: ['demo', 'large'],
      },
    },
    {
      id: 'large-dataset',
      name: 'Large Dataset (Multiple Batches)',
      description: '10k rows with 30 columns from multiple paginated API calls.',
      allowedRoles: ['admin'],
      parameters: [],
      catalogUiConfig: {
        category: 'Large Datasets',
        tags: ['demo', 'large', 'performance'],
      },
    },
    {
      id: 'product-catalog',
      name: 'Product Catalog',
      description: '1000 products with 20+ columns from DummyJSON API.',
      allowedRoles: ['admin'],
      parameters: [],
      catalogUiConfig: {
        category: 'Large Datasets',
        tags: ['demo', 'products'],
      },
    },
    {
      id: 'mixed-dataset',
      name: 'Mixed Dataset (Users + Posts)',
      description: '8000 rows combining user and post data with 35+ columns.',
      allowedRoles: ['admin'],
      parameters: [],
      catalogUiConfig: {
        category: 'Large Datasets',
        tags: ['demo', 'large', 'mixed'],
      },
    },
    {
      id: 'synthetic-expansion',
      name: 'Synthetic Expansion Dataset',
      description: '25k rows with 40 columns including synthetic transaction data.',
      allowedRoles: ['admin'],
      parameters: [],
      catalogUiConfig: {
        category: 'Large Datasets',
        tags: ['demo', 'large', 'synthetic'],
      },
    },
  ];

  /**
   * Get all API definitions from catalog.
   *
   * @returns Array of all API definitions
   */
  getApis(): ApiDefinition[] {
    return this.apis;
  }

  /**
   * Get single API definition by ID.
   *
   * @param id - API identifier
   * @returns API definition or undefined if not found
   */
  getApiById(id: string): ApiDefinition | undefined {
    return this.apis.find(api => api.id === id);
  }

  /**
   * Get APIs filtered by user roles.
   *
   * Returns APIs that either have no allowedRoles restriction, or have at least
   * one role that matches the user's roles.
   *
   * @param roles - User's role IDs
   * @returns Array of API definitions user is allowed to access
   */
  getApisByRole(roles: RoleId[]): ApiDefinition[] {
    return this.apis.filter(api => {
      // No role restriction = available to all
      if (!api.allowedRoles || api.allowedRoles.length === 0) {
        return true;
      }
      // User has at least one matching role
      return api.allowedRoles.some(allowedRole => roles.includes(allowedRole));
    });
  }
}
