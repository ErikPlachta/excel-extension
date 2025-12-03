/**
 * @packageDocumentation Demo/Development configuration overlay.
 *
 * This file contains configuration used only in demo/development mode:
 * - Mock API catalog entries for testing
 * - Demo user roles
 * - Test authentication configuration
 *
 * This config is merged with defaults when running in demo mode.
 * Production deployments should provide their own config via remote loading.
 *
 * @see AppConfigService.loadDemoConfig for merge logic
 */

import { AppConfig } from './app-config';
import { ApiDefinition, RoleDefinition, AuthUserConfig } from '@excel-platform/shared/types';

/**
 * Demo role definitions for development/testing.
 */
export const DEMO_ROLES: RoleDefinition[] = [
  {
    id: 'analyst',
    label: 'Analyst',
    description: 'Analyst role with query access',
  },
  {
    id: 'admin',
    label: 'Admin',
    description: 'Administrator role with full access',
  },
];

/**
 * Demo users available for sign-in during development.
 *
 * Uses the shared AuthUserConfig type. Each entry provides
 * pre-configured credentials for quick sign-in buttons.
 */
export const DEMO_AUTH_USERS: AuthUserConfig[] = [
  {
    id: 'demo-analyst',
    label: 'Sign in as Analyst',
    email: 'analyst@example.com',
    role: 'analyst',
    buttonVariant: 'secondary',
  },
  {
    id: 'demo-admin',
    label: 'Sign in as Admin',
    email: 'admin@example.com',
    role: 'admin',
    buttonVariant: 'secondary',
  },
];

/**
 * Demo API catalog for development and testing.
 *
 * These APIs are mocked by QueryApiMockService.
 */
export const DEMO_API_CATALOG: ApiDefinition[] = [
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
    description: 'Fetches user data from jsonplaceholder.typicode.com.',
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
    description: 'Comprehensive user demographic data (5000 rows).',
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
    description: '10k rows with 30 columns from multiple API calls.',
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
    description: '1000 products with 20+ columns.',
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
    description: '8000 rows combining user and post data.',
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
    description: '25k rows with 40 columns including synthetic data.',
    allowedRoles: ['admin'],
    parameters: [],
    catalogUiConfig: {
      category: 'Large Datasets',
      tags: ['demo', 'large', 'synthetic'],
    },
  },
];

/**
 * Demo text entries for development.
 */
export const DEMO_TEXT = {
  auth: {
    signInAnalyst: 'Sign in as Analyst',
    signInAdmin: 'Sign in as Admin',
    signOut: 'Sign out',
  },
};

/**
 * Partial config for demo mode.
 *
 * Merged with defaults by AppConfigService when demo mode is enabled.
 */
export const DEMO_CONFIG: Partial<AppConfig> = {
  roles: DEMO_ROLES,
  apiCatalog: DEMO_API_CATALOG,
  text: {
    nav: {},
    auth: DEMO_TEXT.auth,
    query: {},
    worksheet: {},
    table: {},
    user: {},
    ui: {},
  },
};
