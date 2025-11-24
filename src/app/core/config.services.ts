import { Injectable } from "@angular/core";
import { AppConfig } from "../types";
import { DEFAULT_APP_CONFIG } from "../shared/app-config";
import { ViewId } from "../types";
import { UiLayoutHints } from "../types/ui/primitives.types";

/**
 * Central place for AppConfig-driven helpers so core shell/components
 * don't each reimplement their own config utilities.
 *
 * This is intentionally minimal for now and will be expanded as
 * additional data-driven behaviors (layout classes, view wiring,
 * etc.) are added.
 */
@Injectable({ providedIn: "root" })
export class AppConfigService {
  private readonly config: AppConfig = DEFAULT_APP_CONFIG;

  // TODO: Add config validation
  // TODO: add config load from remote or storage
  // TODO: Onboard all config related logic within app here with full data-driven-helpers and then onboard into logic.

  /**
   * Exposes the current AppConfig for read-only consumption.
   * Future work may allow swapping this via DI or remote loading.
   */
  get appConfig(): AppConfig {
    return this.config;
  }

  /**
   * Returns layout hints for a given view, if configured.
   *
   * Shell or primitive layers can use this to determine section
   * density, card variants, or root classes without touching
   * feature components.
   */
  getViewLayoutHints(viewId: ViewId): UiLayoutHints | undefined {
    return this.config.ui?.viewLayout?.[viewId];
  }

  /**
   * Helper for computing a section variant for a view, defaulting
   * to "default" when no hint is configured.
   */
  getSectionVariantFor(viewId: ViewId): "default" | "dense" {
    const hints = this.getViewLayoutHints(viewId);
    return hints?.sectionVariant ?? "default";
  }

  /**
   * Helper for building a root class string from UiLayoutHints.
   * Not currently used, but framed in for future layout work
   * (e.g., view-level rootClass/extraClasses).
   */
  buildRootClass(hints?: UiLayoutHints): string {
    if (!hints) return "";
    const root = hints.rootClass ?? "";
    const extra = hints.extraClasses ?? "";
    return [root, extra].filter(Boolean).join(" ");
  }
}
