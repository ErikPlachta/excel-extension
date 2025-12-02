import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiDefinition, ApiParameter, RoleId } from '@excel-platform/shared/types';
import { AppConfigService } from './app-config.service';

/**
 * API Catalog Service - Manages available API definitions.
 *
 * Provides read-only access to API catalog. This service now loads APIs from
 * AppConfig (Phase 2), enabling dynamic catalog updates via config hot-reload.
 *
 * For backward compatibility, synchronous getApis() methods are kept but load
 * from current config snapshot. New code should subscribe to apis$ observable.
 */
@Injectable({ providedIn: 'root' })
export class ApiCatalogService {
  /**
   * Observable stream of API definitions from config.
   *
   * Emits updated APIs whenever config changes (hot-reload).
   */
  readonly apis$: Observable<ApiDefinition[]>;

  constructor(private readonly appConfig: AppConfigService) {
    this.apis$ = this.appConfig.config$.pipe(
      map(config => config.apiCatalog || [])
    );
  }

  /**
   * DEPRECATED: Hardcoded APIs moved to AppConfig.
   *
   * This array is no longer used. APIs are now loaded from AppConfig.apiCatalog.
   * Keeping this comment for reference during migration.
   */
  private readonly _deprecatedApis: ApiDefinition[] = [
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
   * Get all API definitions from catalog (synchronous snapshot).
   *
   * For reactive updates, subscribe to apis$ observable instead.
   *
   * @returns Array of all API definitions from current config
   */
  getApis(): ApiDefinition[] {
    return this.appConfig.getConfig().apiCatalog || [];
  }

  /**
   * Get single API definition by ID (synchronous snapshot).
   *
   * @param id - API identifier
   * @returns API definition or undefined if not found
   */
  getApiById(id: string): ApiDefinition | undefined {
    const apis = this.appConfig.getConfig().apiCatalog || [];
    return apis.find(api => api.id === id);
  }

  /**
   * Get APIs filtered by user roles (synchronous snapshot).
   *
   * Returns APIs that either have no allowedRoles restriction, or have at least
   * one role that matches the user's roles.
   *
   * @param roles - User's role IDs
   * @returns Array of API definitions user is allowed to access
   */
  getApisByRole(roles: RoleId[]): ApiDefinition[] {
    const apis = this.appConfig.getConfig().apiCatalog || [];
    return apis.filter(api => {
      // No role restriction = available to all
      if (!api.allowedRoles || api.allowedRoles.length === 0) {
        return true;
      }
      // User has at least one matching role
      return api.allowedRoles.some(allowedRole => roles.includes(allowedRole));
    });
  }

  /**
   * Observable stream of APIs filtered by user roles.
   *
   * Use this for reactive role-based filtering that updates when config changes.
   *
   * @param roles - User's role IDs
   * @returns Observable of filtered API definitions
   */
  getApisByRole$(roles: RoleId[]): Observable<ApiDefinition[]> {
    return this.apis$.pipe(
      map(apis => apis.filter(api => {
        if (!api.allowedRoles || api.allowedRoles.length === 0) {
          return true;
        }
        return api.allowedRoles.some(allowedRole => roles.includes(allowedRole));
      }))
    );
  }
}
