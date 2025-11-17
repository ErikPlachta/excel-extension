export type UiButtonVariant = "primary" | "secondary" | "ghost";
export type UiButtonSize = "sm" | "md" | "lg";

export type UiBannerType = "info" | "warning" | "error";

export interface UiButtonConfig {
  id: string;
  labelKey: string;
  variant?: UiButtonVariant;
  size?: UiButtonSize;
  iconName?: string | null;
}

export interface UiBannerConfig {
  id: string;
  type: UiBannerType;
  titleKey?: string;
  messageKey?: string;
  iconName?: string | null;
}
