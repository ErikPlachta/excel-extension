/**
 * Visual variants supported by `ButtonComponent`.
 *
 * These map to concrete CSS/Tailwind classes inside the primitive,
 * allowing feature code to stay style-agnostic and config-driven.
 */
export type UiButtonVariant = "primary" | "secondary" | "ghost";

/**
 * Size options for `ButtonComponent`.
 *
 * Used to adjust padding, font-size, and hit-area consistently.
 */
export type UiButtonSize = "sm" | "md" | "lg";

/**
 * Semantic types for `StatusBannerComponent` and other banners.
 *
 * These are rendered as different visual treatments (info/warning/error)
 * inside the primitive.
 */
export type UiBannerType = "info" | "warning" | "error";

/**
 * Configuration used when describing a nav or action button in data.
 *
 * Typically appears in `AppConfig` or other config structures, and is
 * consumed by `ButtonComponent` via mapped inputs.
 */
export interface UiButtonConfig {
  /** Unique identifier for this button in configuration. */
  id: string;
  /** i18n/text key used to look up the button label. */
  labelKey: string;
  /** Optional variant override; falls back to config defaults when omitted. */
  variant?: UiButtonVariant;
  /** Optional size override; falls back to config defaults when omitted. */
  size?: UiButtonSize;
  /** Optional icon name to render alongside the label. */
  iconName?: string | null;
}

/**
 * Configuration for status/host banners described in data.
 *
 * Allows text and icon selection to be driven from configuration and
 * text catalogs instead of hard-coded in components.
 */
export interface UiBannerConfig {
  /** Unique identifier for this banner in configuration. */
  id: string;
  /** Semantic banner type controlling visual treatment. */
  type: UiBannerType;
  /** Optional i18n key for the banner title. */
  titleKey?: string;
  /** Optional i18n key for the banner message body. */
  messageKey?: string;
  /** Optional icon name to render for this banner. */
  iconName?: string | null;
}

/**
 * Generic layout hints that can be used by UI primitives
 * (e.g., Section/Card) to adjust density and classes based
 * on configuration rather than hard-coded values.
 */
export interface UiLayoutHints {
  /** Optional root class for the rendered container. */
  rootClass?: string;
  /** Additional class names to append to the container. */
  extraClasses?: string;
  /** Optional density/spacing variant for section-like primitives. */
  sectionVariant?: "default" | "dense";
  /** Optional variant hint for card-like primitives. */
  cardVariant?: "default" | "accent";
}

/**
 * Supported semantic action types for query UI interactions.
 *
 * These are interpreted by the query UI layer (e.g., `QueryHomeComponent`)
 * to trigger behaviors such as running a query or navigating to its table.
 *
 * @TODO add more types here as we start to refine the design.
 */
export type QueryUiActionType = "run-query" | "go-to-table" | "show-details";

/**
 * Configuration for a single query-level UI action.
 *
 * This is typically attached to a `QueryInstance` via `uiConfig.actions`
 * so that the feature UI can render buttons and dispatch actions based on
 * data instead of hard-coded templates.
 */
export interface QueryUiActionConfig {
  /** Stable identifier for this action within the query. */
  id: string;
  /** Semantic action type that the dispatcher understands. */
  type: QueryUiActionType;
  /** i18n/text key used to look up the button label. */
  labelKey: string;
  /** Optional button config driving variant/size/icon for this action. */
  button?: UiButtonConfig;
}

/**
 * Per-query UI configuration describing how the query should
 * be presented (badges) and which actions are available.
 */
export interface QueryUiConfig {
  /** Optional badge to show next to the query name. */
  badgeLabelKey?: string;
  /**
   * Actions available for this query in the UI. These will
   * typically be rendered as buttons in the query list/detail.
   */
  actions: QueryUiActionConfig[];
}
