/**
 * @packageDocumentation Default application configuration options to be used
 * when no custom configuration is provided. This configuration was created to
 * allow for a functional out-of-the-box experience that is data-driven. It can
 * be overridden by providing a custom configuration via dependency injection.
 *
 * @TODO: add more comments here
 */

import { AppConfig } from "./app-config";
import { ApiDefinition } from "../types/api.types";

/**
 * Default application configuration.
 *
 * @TODO: add more comments here
 */
export const DEFAULT_APP_CONFIG: AppConfig = {
  defaultViewId: "sso",
  navItems: [
    {
      id: "nav-sso",
      labelKey: "nav.ssoHome",
      viewId: "sso",
      domId: "nav-sso",
      actionType: "select-view",
    },
    {
      id: "nav-worksheets",
      labelKey: "nav.worksheets",
      viewId: "worksheets",
      requiresAuth: true,
      domId: "nav-worksheets",
      actionType: "select-view",
    },
    {
      id: "nav-tables",
      labelKey: "nav.tables",
      viewId: "tables",
      requiresAuth: true,
      domId: "nav-tables",
      actionType: "select-view",
    },
    {
      id: "nav-user",
      labelKey: "nav.user",
      viewId: "user",
      requiresAuth: true,
      domId: "nav-user",
      actionType: "select-view",
    },
    {
      id: "nav-queries",
      labelKey: "nav.queries",
      viewId: "queries",
      requiresAuth: true,
      requiredRoles: ["analyst", "admin"],
      domId: "nav-queries-new",
      actionType: "select-view",
    },
    {
      id: "nav-queries-old",
      labelKey: "nav.queriesOld",
      viewId: "queriesOld",
      requiresAuth: true,
      requiredRoles: ["analyst", "admin"],
      domId: "nav-queries",
      actionType: "select-view",
    },
    {
      id: "nav-debug",
      labelKey: "nav.debug",
      viewId: "debug",
      requiresAuth: true,
      requiredRoles: ["admin"],
      domId: "nav-debug",
      actionType: "select-view",
    },
    {
      id: "nav-settings",
      labelKey: "nav.settings",
      viewId: "settings",
      requiresAuth: true,
      domId: "nav-settings",
      actionType: "select-view",
    },
    {
      id: "nav-signin-analyst",
      labelKey: "auth.signInAnalyst",
      actionType: "sign-in-analyst",
      buttonVariant: "secondary",
      buttonSize: "sm",
    },
    {
      id: "nav-signin-admin",
      labelKey: "auth.signInAdmin",
      actionType: "sign-in-admin",
      buttonVariant: "secondary",
      buttonSize: "sm",
    },
    {
      id: "nav-signout",
      labelKey: "auth.signOut",
      actionType: "sign-out",
      buttonVariant: "ghost",
      buttonSize: "sm",
      requiresAuth: true,
    },
  ],
  rootIdsAndClasses: {
    navClass: "mobile-nav",
    statusClass: "status",
    userBannerClass: "user-banner",
    hostStatusClass: "host-status",
    rootClass: "app-shell",
    extraRootClasses: "",
  },
  roles: [
    {
      id: "analyst",
      labelKey: "role.analyst.label",
      descriptionKey: "role.analyst.description",
    },
    {
      id: "admin",
      labelKey: "role.admin.label",
      descriptionKey: "role.admin.description",
    },
  ],
  ui: {
    navButtonVariant: "primary",
    navButtonSize: "md",
    hostStatusBannerType: "info",
    viewLayout: {
      sso: { sectionVariant: "default" },
      user: { sectionVariant: "default" },
      worksheets: { sectionVariant: "dense" },
      tables: { sectionVariant: "dense" },
      queries: { sectionVariant: "default" },
      queriesOld: { sectionVariant: "default" },
    },
  },
  apiCatalog: [
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
  ],
  text: {
    nav: {
      ssoHome: "SSO Home",
      worksheets: "Worksheets",
      tables: "Tables",
      user: "User",
      queries: "Queries",
      queriesOld: "QueriesOld",
      debug: "Debug",
      settings: "Settings",
    },
    auth: {
      signInAnalyst: "Sign in as analyst",
      signInAdmin: "Sign in as admin",
      signOut: "Sign out",
    },
    query: {},
    worksheet: {},
    table: {},
    user: {},
    role: {
      analyst: {
        label: "Analyst",
        description: "Analyst role with query access",
      },
      admin: {
        label: "Admin",
        description: "Administrator role with full access",
      },
    },
    ui: {
      hostStatus: {
        excelNotDetectedLabel: "Excel not detected.",
        excelNotDetectedMessage: "Open this add-in inside Excel to enable worksheet and query features.",
        excelConnectedLabel: "Excel connected.",
        onlineLabel: "Online",
        offlineLabel: "Offline",
        offlineMessage: "Some features may be unavailable until connectivity is restored.",
      },
      userBanner: {
        noRolesAssigned: "No roles assigned",
      },
    },
  },
};
