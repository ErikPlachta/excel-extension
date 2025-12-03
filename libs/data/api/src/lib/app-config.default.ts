/**
 * @packageDocumentation Default application configuration.
 *
 * This file contains **structural defaults only** - minimal configuration
 * required for the application to function. It does NOT contain:
 * - Demo/test API catalog entries (see app-config.demo.ts)
 * - Demo role definitions (see app-config.demo.ts)
 * - Test navigation items (see app-config.demo.ts)
 *
 * Production deployments should provide config via remote loading.
 * Demo/development mode merges DEMO_CONFIG on top of these defaults.
 *
 * @see AppConfigService for config loading and merging logic
 * @see app-config.demo.ts for demo/test configuration
 */

import { AppConfig } from './app-config';

/**
 * Default application configuration - structural defaults only.
 *
 * Contains minimal nav items, empty arrays for roles/APIs, and base UI/text
 * settings. Demo config is merged on top in development mode.
 */
export const DEFAULT_APP_CONFIG: AppConfig = {
  /** Default view when shell loads */
  defaultViewId: 'sso',

  /**
   * Core navigation items only.
   * Demo sign-in buttons are added by SSO component from demo config.
   */
  navItems: [
    {
      id: 'nav-sso',
      labelKey: 'nav.ssoHome',
      viewId: 'sso',
      domId: 'nav-sso',
      actionType: 'select-view',
    },
    {
      id: 'nav-worksheets',
      labelKey: 'nav.worksheets',
      viewId: 'worksheets',
      requiresAuth: true,
      domId: 'nav-worksheets',
      actionType: 'select-view',
    },
    {
      id: 'nav-tables',
      labelKey: 'nav.tables',
      viewId: 'tables',
      requiresAuth: true,
      domId: 'nav-tables',
      actionType: 'select-view',
    },
    {
      id: 'nav-user',
      labelKey: 'nav.user',
      viewId: 'user',
      requiresAuth: true,
      domId: 'nav-user',
      actionType: 'select-view',
    },
    {
      id: 'nav-queries',
      labelKey: 'nav.queries',
      viewId: 'queries',
      requiresAuth: true,
      requiredRoles: ['analyst', 'admin'],
      domId: 'nav-queries',
      actionType: 'select-view',
    },
    {
      id: 'nav-debug',
      labelKey: 'nav.debug',
      viewId: 'debug',
      requiresAuth: true,
      requiredRoles: ['admin'],
      domId: 'nav-debug',
      actionType: 'select-view',
    },
    {
      id: 'nav-settings',
      labelKey: 'nav.settings',
      viewId: 'settings',
      requiresAuth: true,
      domId: 'nav-settings',
      actionType: 'select-view',
    },
    {
      id: 'nav-signout',
      labelKey: 'auth.signOut',
      actionType: 'sign-out',
      buttonVariant: 'ghost',
      buttonSize: 'sm',
      requiresAuth: true,
    },
  ],

  /** Root-level DOM ids/classes for shell layout */
  rootIdsAndClasses: {
    navClass: 'mobile-nav',
    statusClass: 'status',
    userBannerClass: 'user-banner',
    hostStatusClass: 'host-status',
    rootClass: 'app-shell',
    extraRootClasses: '',
  },

  /**
   * Empty by default - populated by remote config or demo config.
   * Production deployments define roles via remote config loading.
   */
  roles: [],

  /** UI primitive settings for shell */
  ui: {
    navButtonVariant: 'primary',
    navButtonSize: 'md',
    hostStatusBannerType: 'info',
    viewLayout: {
      sso: { sectionVariant: 'default' },
      user: { sectionVariant: 'default' },
      worksheets: { sectionVariant: 'dense' },
      tables: { sectionVariant: 'dense' },
      queries: { sectionVariant: 'default' },
    },
  },

  /**
   * Empty by default - populated by remote config or demo config.
   * Production deployments define API catalog via remote config loading.
   */
  apiCatalog: [],

  /** Base text catalog - structural entries only */
  text: {
    nav: {
      ssoHome: 'SSO Home',
      worksheets: 'Worksheets',
      tables: 'Tables',
      user: 'User',
      queries: 'Queries',
      debug: 'Debug',
      settings: 'Settings',
    },
    auth: {
      signOut: 'Sign out',
    },
    query: {},
    worksheet: {},
    table: {},
    user: {},
    hostStatus: {
      excelNotDetectedLabel: 'Excel not detected.',
      excelNotDetectedMessage:
        'Open this add-in inside Excel to enable worksheet and query features.',
      excelConnectedLabel: 'Excel connected.',
      onlineLabel: 'Online',
      offlineLabel: 'Offline',
      offlineMessage:
        'Some features may be unavailable until connectivity is restored.',
    },
    userBanner: {
      noRolesAssigned: 'No roles assigned',
    },
    ui: {},
  },
};
