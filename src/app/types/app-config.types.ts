/**
 * Known role identifiers in the system.
 */
export type RoleId = "analyst" | "admin";

/**
 * View identifiers used by the SPA shell.
 */
export type ViewId = "sso" | "worksheets" | "tables" | "user" | "queries";

/**
 * Configuration for a single navigation item in the shell.
 */
export interface NavItemConfig {
  /** Unique id for this nav item. */
  id: string;
  /** i18n/text key for the label; actual text comes from a catalog. */
  labelKey: string;
  /** The view this nav item selects in the shell. */
  viewId: ViewId;
  /** Optional DOM id for the nav element. */
  domId?: string;
  /** Optional extra CSS class names for the nav element. */
  classNames?: string;
  /** Whether authentication is required for this nav item. */
  requiresAuth?: boolean;
  /** Optional list of roles required to see/use this nav item. */
  requiredRoles?: RoleId[];
}

/**
 * Definition of a known role, used for display and configuration.
 */
export interface RoleDefinition {
  /** Role identifier used in logic. */
  id: RoleId;
  /** i18n/text key describing the role. */
  labelKey: string;
  /** i18n/text key for the role description. */
  descriptionKey: string;
}

/**
 * Root application configuration driving nav, roles, and DOM ids/classes.
 */
export interface AppConfig {
  /** Default view when the shell loads. */
  defaultViewId: ViewId;
  /** Navigation items available in the shell. */
  navItems: NavItemConfig[];
  /** Root-level DOM ids/classes used by the shell. */
  rootIdsAndClasses: {
    navClass: string;
    statusClass: string;
    userBannerClass: string;
    hostStatusClass: string;
  };
  /** Known roles in the system. */
  roles: RoleDefinition[];
}
