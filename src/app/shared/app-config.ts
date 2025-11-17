export type RoleId = "analyst" | "admin";

export type ViewId = "sso" | "worksheets" | "tables" | "user" | "queries";

export interface NavItemConfig {
  id: string;
  /** i18n/text key for the label; actual text comes from a catalog */
  labelKey: string;
  /** The view this nav item selects in the shell */
  viewId: ViewId;
  /** Optional DOM id for the nav element */
  domId?: string;
  /** Optional extra CSS class names for the nav element */
  classNames?: string;
  /** Whether authentication is required for this nav item */
  requiresAuth?: boolean;
  /** Optional list of roles required to see/use this nav item */
  requiredRoles?: RoleId[];
}

export interface RoleDefinition {
  id: RoleId;
  /** i18n/text key describing the role */
  labelKey: string;
  descriptionKey: string;
}

export interface AppConfig {
  /** Default view when the shell loads */
  defaultViewId: ViewId;
  /** Navigation items available in the shell */
  navItems: NavItemConfig[];
  /** Root-level DOM ids/classes used by the shell */
  rootIdsAndClasses: {
    navClass: string;
    statusClass: string;
    userBannerClass: string;
    hostStatusClass: string;
  };
  /** Known roles in the system */
  roles: RoleDefinition[];
}

// User-defined AppConfig entry point. By default this simply re-exports the
// DEFAULT_APP_CONFIG from app-config.default, but it can be customized per
// environment or tenant by editing this file instead of the defaults.
export { DEFAULT_APP_CONFIG } from "./app-config.default";
