import { Injectable } from "@angular/core";
import { AppSettings } from "../types";

const STORAGE_KEY = "excel-extension.settings";

const DEFAULT_SETTINGS: AppSettings = {
  telemetry: {
    enableWorkbookLogging: false,
    logWorksheetName: "_Extension_Log",
    logTableName: "_Extension_Log_Table",
    logColumns: {
      timestamp: "timestamp",
      level: "level",
      operation: "operation",
      message: "message",
    },
  },
};

@Injectable({ providedIn: "root" })
export class SettingsService {
  private settings: AppSettings = this.load();

  get value(): AppSettings {
    return this.settings;
  }

  update(partial: Partial<AppSettings>): void {
    this.settings = {
      ...this.settings,
      ...partial,
      telemetry: {
        ...this.settings.telemetry,
        ...(partial.telemetry ?? {}),
      },
    };
    this.save();
  }

  private load(): AppSettings {
    if (typeof window === "undefined") return DEFAULT_SETTINGS;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return DEFAULT_SETTINGS;
      const parsed = JSON.parse(raw) as AppSettings;
      return {
        ...DEFAULT_SETTINGS,
        ...parsed,
        telemetry: {
          ...DEFAULT_SETTINGS.telemetry,
          ...(parsed.telemetry ?? {}),
        },
      };
    } catch {
      return DEFAULT_SETTINGS;
    }
  }

  private save(): void {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
    } catch {
      // Ignore storage errors.
    }
  }
}
