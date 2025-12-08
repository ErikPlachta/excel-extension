/**
 * @packageDocumentation Type Definitions for the application configuration file,
 * used to allow a modular and data-driven design.
 */

import { UiLayoutHints, UiButtonVariant, UiButtonSize } from './ui/primitives.types';
import { ApiDefinition, RoleId } from './api.types';

// Re-export RoleId for backward compatibility
export type { RoleId };

/**
 * View identifiers used by the SPA shell.
 *
 * These correspond to the different main views/components rendered in the shell.
 * Each view is responsible for a specific part of the user interface and user experience.
 * The views are designed to be modular and reusable across the application.
 */
export type ViewId =
  | "sso"
  | "worksheets"
  | "tables"
  | "user"
  | "queries"
  | "debug"
  | "settings";

/**
 * Supported navigation action types for shell nav items.
 *
 * Note: Sign-in actions (sign-in-analyst, sign-in-admin) have been removed.
 * Demo sign-in buttons are now rendered by SsoHomeComponent using DemoAuthUser
 * config from app-config.demo.ts, not as nav items.
 */
export type NavActionType = 'select-view' | 'sign-out';

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
  buttonVariant?: UiButtonVariant;
  /** Optional button size hint for this nav item. */
  buttonSize?: UiButtonSize;
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
  /** Human-readable label for the role. */
  label: string;
  /** Description of the role's purpose and permissions. */
  description: string;
}

/**
 * Text catalog structure for UI strings (Phase 2).
 */
export interface TextCatalog {
  /** Navigation-related text */
  nav: Record<string, string>;
  /** Authentication-related text */
  auth: Record<string, string>;
  /** Query-related text */
  query: Record<string, string>;
  /** Worksheet-related text */
  worksheet: Record<string, string>;
  /** Table-related text */
  table: Record<string, string>;
  /** User/settings-related text */
  user: Record<string, string>;
  /** Role definitions */
  role?: Record<string, { label: string; description: string }>;
  /** Host status text (Excel detection, online/offline) */
  hostStatus?: {
    excelNotDetectedLabel?: string;
    excelNotDetectedMessage?: string;
    excelConnectedLabel?: string;
    onlineLabel?: string;
    offlineLabel?: string;
    offlineMessage?: string;
    [key: string]: string | undefined;
  };
  /** User banner text */
  userBanner?: {
    noRolesAssigned?: string;
    [key: string]: string | undefined;
  };
  /** General UI text (can be nested) */
  ui: Record<string, string | Record<string, string>>;
}

/**
 * Valid section keys in TextCatalog for type-safe dynamic access.
 *
 * These are the top-level keys that contain `Record<string, string>` values.
 * Used by `getTextSection()` to provide type-safe lookups without `any` casts.
 */
export type TextCatalogSection = 'nav' | 'auth' | 'query' | 'worksheet' | 'table' | 'user';

/**
 * Type-safe accessor for TextCatalog string sections.
 *
 * Returns the section's string record if the key is valid, undefined otherwise.
 * This eliminates the need for `any` casts when dynamically accessing catalog sections.
 *
 * @param catalog - The TextCatalog to access
 * @param section - The section key to retrieve
 * @returns The section's Record\<string, string\> or undefined if not found/invalid
 *
 * @example
 * ```typescript
 * const navStrings = getTextSection(text, 'nav');
 * if (navStrings) {
 *   const label = navStrings['ssoHome'] ?? 'fallback';
 * }
 * ```
 */
export function getTextSection(
  catalog: TextCatalog,
  section: string
): Record<string, string> | undefined {
  const validSections: TextCatalogSection[] = [
    'nav', 'auth', 'query', 'worksheet', 'table', 'user'
  ];

  if (validSections.includes(section as TextCatalogSection)) {
    return catalog[section as TextCatalogSection];
  }
  return undefined;
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
    navButtonVariant?: UiButtonVariant;
    /** Size for navigation buttons. */
    navButtonSize?: UiButtonSize;
    /** Type for host status banner. */
    hostStatusBannerType?: string;
    /** Optional per-view layout hints consumed by section/card primitives. */
    viewLayout?: Partial<Record<ViewId, UiLayoutHints>>;
  };
  /** API Catalog - Available data source APIs (Phase 2) */
  apiCatalog?: ApiDefinition[];
  /** Text Catalog - All UI strings (Phase 2) */
  text?: TextCatalog;
}
