import { Injectable } from "@angular/core";
import { BehaviorSubject } from "rxjs";
import { QueryConfiguration } from "../types";
import { AuthService } from "../core/auth.service";

/**
 * Simple local-storage backed store for named query configurations.
 *
 * This service intentionally keeps storage concerns isolated so it
 * can later be swapped to an HTTP-backed implementation without
 * changing callers. It has no knowledge of Excel/Office.js APIs.
 */
@Injectable({ providedIn: "root" })
export class QueryConfigurationService {
  private readonly subject = new BehaviorSubject<QueryConfiguration[]>([]);
  readonly configs$ = this.subject.asObservable();

  private static readonly STORAGE_KEY_PREFIX = "excel-ext:query-configs:";

  constructor(private readonly auth: AuthService) {
    const initial = this.hydrateFromStorage();
    this.subject.next(initial);
  }

  get snapshot(): QueryConfiguration[] {
    return this.subject.value;
  }

  list(): QueryConfiguration[] {
    return this.snapshot;
  }

  get(id: string): QueryConfiguration | undefined {
    return this.snapshot.find((c) => c.id === id);
  }

  save(config: QueryConfiguration): void {
    const existing = this.snapshot;
    const idx = existing.findIndex((c) => c.id === config.id);
    const next = idx === -1 ? [...existing, config] : existing.map((c, i) => (i === idx ? config : c));
    this.subject.next(next);
    this.persistToStorage(next);
  }

  delete(id: string): void {
    const next = this.snapshot.filter((c) => c.id !== id);
    this.subject.next(next);
    this.persistToStorage(next);
  }

  /**
   * Mark a configuration as deleted without permanently removing it.
   * For now this is implemented the same as delete, but the method
   * name leaves room for a richer soft-delete model later.
   */
  softDelete(id: string): void {
    this.delete(id);
  }

  private storageKey(): string {
    const user = this.auth.state.user?.id ?? "anonymous";
    // Workbook context is not wired yet; use a simple default bucket.
    const workbookId = "default";
    return `${QueryConfigurationService.STORAGE_KEY_PREFIX}${user}:${workbookId}`;
  }

  private hydrateFromStorage(): QueryConfiguration[] {
    if (typeof window === "undefined" || !window.localStorage) {
      return [];
    }

    try {
      const raw = window.localStorage.getItem(this.storageKey());
      if (!raw) return [];
      const parsed = JSON.parse(raw) as QueryConfiguration[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private persistToStorage(configs: QueryConfiguration[]): void {
    if (typeof window === "undefined" || !window.localStorage) {
      return;
    }

    try {
      window.localStorage.setItem(this.storageKey(), JSON.stringify(configs));
    } catch {
      // Swallow storage errors; configs still work in-memory.
    }
  }
}
