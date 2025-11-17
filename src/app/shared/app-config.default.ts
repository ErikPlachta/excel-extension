import { AppConfig } from "./app-config";

export const DEFAULT_APP_CONFIG: AppConfig = {
  defaultViewId: "sso",
  navItems: [
    { id: "nav-sso", labelKey: "nav.ssoHome", viewId: "sso", domId: "nav-sso" },
    {
      id: "nav-worksheets",
      labelKey: "nav.worksheets",
      viewId: "worksheets",
      requiresAuth: true,
      domId: "nav-worksheets",
    },
    {
      id: "nav-tables",
      labelKey: "nav.tables",
      viewId: "tables",
      requiresAuth: true,
      domId: "nav-tables",
    },
    {
      id: "nav-user",
      labelKey: "nav.user",
      viewId: "user",
      requiresAuth: true,
      domId: "nav-user",
    },
    {
      id: "nav-queries",
      labelKey: "nav.queries",
      viewId: "queries",
      requiresAuth: true,
      requiredRoles: ["analyst", "admin"],
      domId: "nav-queries",
    },
  ],
  rootIdsAndClasses: {
    navClass: "mobile-nav",
    statusClass: "status",
    userBannerClass: "user-banner",
    hostStatusClass: "host-status",
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
};
