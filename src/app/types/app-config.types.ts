/**
 * @packageDocumentation Type Definitions for the application configuration file,
 * used to allow a modular and data-driven design.
 */

import { UiLayoutHints } from "./ui/primitives.types";

/**
 * Known User Role identifiers in the system.
 *
 * These role IDs are used throughout the application to manage
 * access control and permissions for different features and views.
 * Each role ID corresponds to a specific set of capabilities within the app.
 * The roles are designed to be flexible and extensible, allowing for future growth.
 */
export type RoleId = "analyst" | "admin";

/**
 * View identifiers used by the SPA shell.
 *
 * These correspond to the different main views/components rendered in the shell.
 * Each view is responsible for a specific part of the user interface and user experience.
 * The views are designed to be modular and reusable across the application.
 */
export type ViewId = "sso" | "worksheets" | "tables" | "user" | "queriesOld" | "debug" | "settings";

/**
 * Supported navigation action types for shell nav items.
 */
export type NavActionType = "select-view" | "sign-in-analyst" | "sign-in-admin" | "sign-out";

/**
 * Configuration for a single navigation item in the shell.
 */
export interface NavItemConfig {
  /** Unique id for this nav item. */
  id: string;
  /** i18n/text key for the label; actual text comes from a catalog. */
  labelKey: string;
  /** The view this nav item selects in the shell. */
  viewId?: ViewId;
  /** Optional DOM id for the nav element. */
  domId?: string;
  /** Optional extra CSS class names for the nav element. */
  classNames?: string;
  /** Optional button variant hint for this nav item. */
  buttonVariant?: import("./ui/primitives.types").UiButtonVariant;
  /** Optional button size hint for this nav item. */
  buttonSize?: import("./ui/primitives.types").UiButtonSize;
  /** What action this nav item performs when clicked. */
  actionType: NavActionType;
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
    /** Class for the navigation container. */
    navClass: string;
    statusClass: string;
    /** Class for the user information banner. */
    userBannerClass: string;
    /** Class for the host status banner. */
    hostStatusClass: string;
    /** Optional root class for the main shell container. */
    rootClass?: string;
    /** Optional extra classes for the main shell container. */
    extraRootClasses?: string;
  };
  /** Known roles in the system. */
  roles: RoleDefinition[];
  /**
   * Optional UI primitive wiring for the shell so that button/banner variants
   * can be controlled via configuration while CSS or Tailwind classes are
   * provided by the templates/styles.
   */
  ui?: {
    /** Variant for navigation buttons. */
    navButtonVariant?: import("./ui/primitives.types").UiButtonVariant;
    /** Size for navigation buttons. */
    navButtonSize?: import("./ui/primitives.types").UiButtonSize;
    /** Type for host status banner. */
    hostStatusBannerType?: string;
    /** Optional per-view layout hints consumed by section/card primitives. */
    viewLayout?: Partial<Record<ViewId, UiLayoutHints>>;
  };
}
