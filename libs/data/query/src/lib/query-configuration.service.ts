import { Injectable } from "@angular/core";
import { BehaviorSubject } from "rxjs";
import { QueryConfiguration } from '@excel-platform/shared/types';
import { AuthService } from "@excel-platform/core/auth";
import { ApiCatalogService, QueryValidationService } from '@excel-platform/data/api';
import { StorageHelperService } from "@excel-platform/data/storage";

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

  constructor(
    private readonly auth: AuthService,
    private readonly apiCatalog: ApiCatalogService,
    private readonly storage: StorageHelperService,
    private readonly validator: QueryValidationService
  ) {
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
    // Validate configuration using QueryValidationService
    const validationResult = this.validator.validateConfiguration(config);
    if (!validationResult.valid) {
      throw new Error(`Invalid configuration: ${validationResult.errors.join(', ')}`);
    }

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
    const configs = this.storage.getItem<QueryConfiguration[]>(this.storageKey(), []);
    return Array.isArray(configs) ? configs : [];
  }

  private persistToStorage(configs: QueryConfiguration[]): void {
    this.storage.setItem(this.storageKey(), configs);
  }
}
