import { Injectable, Inject } from '@angular/core';
import { StorageHelperService } from './storage-helper.service';
import { TelemetryService } from '../core/telemetry.service';
import { WINDOW } from '../core/window.token';

/**
 * Backup/Restore Service - Export/import app state for data persistence.
 *
 * Provides functionality to export all application state (auth, settings,
 * query configs) to a downloadable JSON file and restore from backup.
 * Supports version compatibility checks for safe migrations.
 *
 * **Usage:**
 * ```typescript
 * // Export backup
 * await backupRestore.exportBackup();
 *
 * // Import backup
 * await backupRestore.importBackup(file);
 * ```
 */
@Injectable({ providedIn: 'root' })
export class BackupRestoreService {
  private readonly BACKUP_VERSION = '1.0.0';

  constructor(
    private readonly storage: StorageHelperService,
    private readonly telemetry: TelemetryService,
    @Inject(WINDOW) private readonly window: Window
  ) {}

  /**
   * Export all app state to downloadable JSON file.
   *
   * Creates a backup of all localStorage data including:
   * - Auth state (user, roles)
   * - Settings (preferences, telemetry config)
   * - Query configurations (saved reports)
   * - Query state (global parameters, last runs)
   *
   * Downloads as `excel-extension-backup-{timestamp}.json`.
   */
  async exportBackup(): Promise<void> {
    try {
      const backup: AppStateBackup = {
        version: this.BACKUP_VERSION,
        timestamp: new Date().toISOString(),
        authState: this.storage.getItem('auth-state', null),
        settings: this.storage.getItem('settings', null),
        queryConfigs: this.getQueryConfigs(),
        queryState: this.storage.getItem('query-state', null),
      };

      const blob = new Blob([JSON.stringify(backup, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `excel-extension-backup-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);

      this.telemetry.logEvent({
        category: 'system',
        name: 'backup-export-success',
        severity: 'info',
        message: 'Backup exported successfully',
        context: { timestamp: backup.timestamp },
      });
    } catch (error) {
      this.telemetry.logEvent({
        category: 'system',
        name: 'backup-export-error',
        severity: 'error',
        message: 'Failed to export backup',
        context: { error },
      });
      throw new Error('Failed to export backup. See console for details.');
    }
  }

  /**
   * Import app state from JSON file.
   *
   * Validates version compatibility before restoring state. Overwrites
   * current state with backup data and reloads the app to apply changes.
   *
   * **Version Compatibility:**
   * - Major version mismatch: Reject (e.g., v2.x.x backup into v1.x.x app)
   * - Minor version mismatch: Allow with warning (e.g., v1.2.0 into v1.1.0)
   * - Patch version mismatch: Allow silently (e.g., v1.0.1 into v1.0.0)
   *
   * @param file - Backup JSON file to import
   * @throws Error if version incompatible or file invalid
   */
  async importBackup(file: File): Promise<void> {
    try {
      const text = await file.text();
      const backup = JSON.parse(text) as unknown;

      // Validate backup structure
      const validationError = this.validateBackupStructure(backup);
      if (validationError) {
        throw new Error(validationError);
      }

      const validatedBackup = backup as AppStateBackup;

      // Validate version compatibility
      if (!this.isCompatibleVersion(validatedBackup.version)) {
        throw new Error(
          `Incompatible backup version: ${validatedBackup.version}. ` +
            `Current app version: ${this.BACKUP_VERSION}. ` +
            `Cannot import backup from different major version.`
        );
      }

      // Restore state to localStorage
      if (validatedBackup.authState) {
        this.storage.setItem('auth-state', validatedBackup.authState);
      }
      if (validatedBackup.settings) {
        this.storage.setItem('settings', validatedBackup.settings);
      }
      if (validatedBackup.queryConfigs) {
        this.restoreQueryConfigs(validatedBackup.queryConfigs);
      }
      if (validatedBackup.queryState) {
        this.storage.setItem('query-state', validatedBackup.queryState);
      }

      this.telemetry.logEvent({
        category: 'system',
        name: 'backup-import-success',
        severity: 'info',
        message: 'Backup restored successfully',
        context: {
          backupVersion: validatedBackup.version,
          backupTimestamp: validatedBackup.timestamp,
        },
      });

      // Reload app to apply restored state
      this.window.location.reload();
    } catch (error) {
      this.telemetry.logEvent({
        category: 'system',
        name: 'backup-import-error',
        severity: 'error',
        message: 'Failed to import backup',
        context: { error },
      });

      if (error instanceof Error) {
        throw error; // Re-throw with original message
      }
      throw new Error('Failed to import backup. Invalid file format or version.');
    }
  }

  /**
   * Validate backup object structure before import.
   *
   * Checks that required fields exist and have correct types to prevent
   * runtime errors from malformed or corrupted backup files.
   *
   * @param backup - Parsed backup object to validate
   * @returns Error message if invalid, null if valid
   */
  private validateBackupStructure(backup: unknown): string | null {
    if (!backup || typeof backup !== 'object') {
      return 'Invalid backup: not an object';
    }

    const obj = backup as Record<string, unknown>;

    // Required fields
    if (typeof obj['version'] !== 'string' || !obj['version']) {
      return 'Invalid backup: missing or invalid version';
    }
    if (typeof obj['timestamp'] !== 'string' || !obj['timestamp']) {
      return 'Invalid backup: missing or invalid timestamp';
    }

    // Optional array field validation
    if (obj['queryConfigs'] !== undefined && !Array.isArray(obj['queryConfigs'])) {
      return 'Invalid backup: queryConfigs must be an array';
    }

    return null;
  }

  /**
   * Check if backup version is compatible with current app version.
   *
   * Uses semantic versioning major version check. Backups from different
   * major versions are rejected to avoid data loss or corruption.
   *
   * @param backupVersion - Backup file version (e.g., "1.2.3")
   * @returns true if compatible (same major version)
   */
  private isCompatibleVersion(backupVersion: string): boolean {
    const [backupMajor] = backupVersion.split('.');
    const [appMajor] = this.BACKUP_VERSION.split('.');
    return backupMajor === appMajor;
  }

  /**
   * Get all query configurations from localStorage.
   *
   * Query configs are stored per-user and per-workbook. This method
   * collects all config keys and returns aggregated configs.
   *
   * @returns Array of query config objects
   */
  private getQueryConfigs(): any[] {
    // Query configs are stored with keys like:
    // "excel-ext:query-configs:user-id:workbook-id"
    // We need to collect all matching keys
    const configs: any[] = [];
    const prefix = 'excel-ext:query-configs:';

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        const value = this.storage.getItem(key, null);
        if (value) {
          configs.push({ key, value });
        }
      }
    }

    return configs;
  }

  /**
   * Restore query configurations to localStorage.
   *
   * Writes each config back to its original storage key.
   *
   * @param configs - Array of config objects with key and value
   */
  private restoreQueryConfigs(configs: any[]): void {
    for (const config of configs) {
      if (config.key && config.value) {
        this.storage.setItem(config.key, config.value);
      }
    }
  }
}

/**
 * App state backup schema.
 *
 * Version 1.0.0 schema includes all localStorage data needed to
 * restore app state after reinstall or across devices.
 */
export interface AppStateBackup {
  /** Backup schema version (semantic versioning) */
  version: string;

  /** Timestamp when backup was created (ISO 8601) */
  timestamp: string;

  /** Auth state (user, roles) */
  authState: any;

  /** Settings (preferences, telemetry config) */
  settings: any;

  /** Query configurations (saved reports) */
  queryConfigs: any[];

  /** Query state (global parameters, last runs) */
  queryState: any;
}
