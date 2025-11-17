/**
 * @packageDocumentation Default application configuration options to be used
 * when no custom configuration is provided. This configuration was created to
 * allow for a functional out-of-the-box experience that is data-driven. It can
 * be overridden by providing a custom configuration via dependency injection.
 *
 * @TODO: add more comments here
 */

import { AppConfig } from "./app-config";

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
      domId: "nav-queries",
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
    },
  },
};
