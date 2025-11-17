export type { RoleId, ViewId, NavItemConfig, RoleDefinition, AppConfig } from "../types";

// User-defined AppConfig entry point. By default this simply re-exports the
// DEFAULT_APP_CONFIG from app-config.default, but it can be customized per
// environment or tenant by editing this file instead of the defaults.
export { DEFAULT_APP_CONFIG } from "./app-config.default";
