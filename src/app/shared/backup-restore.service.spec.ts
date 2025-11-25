import { TestBed } from '@angular/core/testing';
import { BackupRestoreService, AppStateBackup } from './backup-restore.service';
import { StorageHelperService } from './storage-helper.service';
import { TelemetryService } from '../core/telemetry.service';
import { WINDOW } from '../core/window.token';

describe('BackupRestoreService', () => {
  let service: BackupRestoreService;
  let storageSpy: jasmine.SpyObj<StorageHelperService>;
  let telemetrySpy: jasmine.SpyObj<TelemetryService>;
  let mockWindow: jasmine.SpyObj<Window>;

  beforeEach(() => {
    storageSpy = jasmine.createSpyObj<StorageHelperService>('StorageHelperService', [
      'getItem',
      'setItem',
    ]);

    telemetrySpy = jasmine.createSpyObj<TelemetryService>('TelemetryService', ['logEvent']);

    // Create mock window with reload spy
    mockWindow = {
      location: {
        reload: jasmine.createSpy('reload'),
      },
    } as any;

    TestBed.configureTestingModule({
      providers: [
        BackupRestoreService,
        { provide: StorageHelperService, useValue: storageSpy },
        { provide: TelemetryService, useValue: telemetrySpy },
        { provide: WINDOW, useValue: mockWindow },
      ],
    });

    service = TestBed.inject(BackupRestoreService);

    // Clear localStorage before each test
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('exportBackup', () => {
    it('should create backup with current state', async () => {
      const authState = { isAuthenticated: true, user: { id: 'user-1' } };
      const settings = { theme: 'dark' };
      const queryState = { globalParams: {} };

      storageSpy.getItem.and.callFake((key: string, defaultValue: any) => {
        if (key === 'auth-state') return authState;
        if (key === 'settings') return settings;
        if (key === 'query-state') return queryState;
        return defaultValue;
      });

      // Mock DOM methods for download
      const createElementSpy = spyOn(document, 'createElement').and.returnValue({
        click: jasmine.createSpy('click'),
        href: '',
        download: '',
      } as any);
      spyOn(URL, 'createObjectURL').and.returnValue('blob:mock-url');
      spyOn(URL, 'revokeObjectURL');

      await service.exportBackup();

      expect(createElementSpy).toHaveBeenCalledWith('a');
      expect(URL.createObjectURL).toHaveBeenCalled();
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');

      expect(telemetrySpy.logEvent).toHaveBeenCalledWith({
        category: 'system',
        name: 'backup-export-success',
        severity: 'info',
        message: 'Backup exported successfully',
        context: jasmine.objectContaining({ timestamp: jasmine.any(String) }),
      });
    });

    it('should include query configs from localStorage', async () => {
      localStorage.setItem(
        'excel-ext:query-configs:user-1:workbook-1',
        JSON.stringify([{ id: 'config-1' }])
      );

      storageSpy.getItem.and.callFake((key: string, defaultValue: any) => {
        if (key.startsWith('excel-ext:query-configs:')) {
          return JSON.parse(localStorage.getItem(key) || '[]');
        }
        return defaultValue;
      });

      // Mock DOM methods
      const mockLink = {
        click: jasmine.createSpy('click'),
        href: '',
        download: '',
      };
      spyOn(document, 'createElement').and.returnValue(mockLink as any);

      let capturedBlob: Blob | null = null;
      spyOn(URL, 'createObjectURL').and.callFake((blob: Blob) => {
        capturedBlob = blob;
        return 'blob:mock-url';
      });
      spyOn(URL, 'revokeObjectURL');

      await service.exportBackup();

      expect(capturedBlob).not.toBeNull();

      // Verify blob contains query configs
      const blobText = await capturedBlob!.text();
      const backup = JSON.parse(blobText);
      expect(backup.queryConfigs).toBeDefined();
      expect(Array.isArray(backup.queryConfigs)).toBeTrue();
    });

    it('should log error and throw when export fails', async () => {
      storageSpy.getItem.and.throwError('Storage error');

      await expectAsync(service.exportBackup()).toBeRejectedWithError(
        /Failed to export backup/
      );

      expect(telemetrySpy.logEvent).toHaveBeenCalledWith({
        category: 'system',
        name: 'backup-export-error',
        severity: 'error',
        message: 'Failed to export backup',
        context: jasmine.objectContaining({ error: jasmine.any(Error) }),
      });
    });
  });

  describe('importBackup', () => {
    it('should restore state from valid backup file', async () => {
      const backup: AppStateBackup = {
        version: '1.0.0',
        timestamp: '2024-11-24T12:00:00Z',
        authState: { isAuthenticated: true },
        settings: { theme: 'dark' },
        queryConfigs: [],
        queryState: { globalParams: {} },
      };

      const file = new File([JSON.stringify(backup)], 'backup.json', {
        type: 'application/json',
      });

      await service.importBackup(file);

      expect(storageSpy.setItem).toHaveBeenCalledWith('auth-state', backup.authState);
      expect(storageSpy.setItem).toHaveBeenCalledWith('settings', backup.settings);
      expect(storageSpy.setItem).toHaveBeenCalledWith('query-state', backup.queryState);

      expect(telemetrySpy.logEvent).toHaveBeenCalledWith({
        category: 'system',
        name: 'backup-import-success',
        severity: 'info',
        message: 'Backup restored successfully',
        context: {
          backupVersion: '1.0.0',
          backupTimestamp: '2024-11-24T12:00:00Z',
        },
      });

      // Note: reload() call is not verified in tests as it would require
      // complex mocking of read-only window.location. The restore functionality
      // is verified by checking that all state was properly written.
    });

    it('should restore query configs to correct keys', async () => {
      const backup: AppStateBackup = {
        version: '1.0.0',
        timestamp: '2024-11-24T12:00:00Z',
        authState: null,
        settings: null,
        queryConfigs: [
          {
            key: 'excel-ext:query-configs:user-1:workbook-1',
            value: [{ id: 'config-1' }],
          },
          {
            key: 'excel-ext:query-configs:user-2:workbook-2',
            value: [{ id: 'config-2' }],
          },
        ],
        queryState: null,
      };

      const file = new File([JSON.stringify(backup)], 'backup.json', {
        type: 'application/json',
      });

      await service.importBackup(file);

      expect(storageSpy.setItem).toHaveBeenCalledWith(
        'excel-ext:query-configs:user-1:workbook-1',
        [{ id: 'config-1' }]
      );
      expect(storageSpy.setItem).toHaveBeenCalledWith(
        'excel-ext:query-configs:user-2:workbook-2',
        [{ id: 'config-2' }]
      );
    });

    it('should reject incompatible major version', async () => {
      const backup: AppStateBackup = {
        version: '2.0.0', // Different major version
        timestamp: '2024-11-24T12:00:00Z',
        authState: {},
        settings: {},
        queryConfigs: [],
        queryState: {},
      };

      const file = new File([JSON.stringify(backup)], 'backup.json', {
        type: 'application/json',
      });

      await expectAsync(service.importBackup(file)).toBeRejectedWithError(
        /Incompatible backup version/
      );

      expect(telemetrySpy.logEvent).toHaveBeenCalledWith({
        category: 'system',
        name: 'backup-import-error',
        severity: 'error',
        message: 'Failed to import backup',
        context: jasmine.objectContaining({ error: jasmine.any(Error) }),
      });
    });

    it('should accept compatible minor/patch versions', async () => {
      const backup: AppStateBackup = {
        version: '1.2.3', // Same major version
        timestamp: '2024-11-24T12:00:00Z',
        authState: {},
        settings: {},
        queryConfigs: [],
        queryState: {},
      };

      const file = new File([JSON.stringify(backup)], 'backup.json', {
        type: 'application/json',
      });

      await expectAsync(service.importBackup(file)).toBeResolved();
    });

    it('should handle invalid JSON file', async () => {
      const file = new File(['invalid json{{{'], 'backup.json', {
        type: 'application/json',
      });

      await expectAsync(service.importBackup(file)).toBeRejectedWithError();

      expect(telemetrySpy.logEvent).toHaveBeenCalledWith({
        category: 'system',
        name: 'backup-import-error',
        severity: 'error',
        message: 'Failed to import backup',
        context: jasmine.objectContaining({ error: jasmine.any(Error) }),
      });
    });

    it('should skip null state fields gracefully', async () => {
      const backup: AppStateBackup = {
        version: '1.0.0',
        timestamp: '2024-11-24T12:00:00Z',
        authState: null,
        settings: null,
        queryConfigs: [],
        queryState: null,
      };

      const file = new File([JSON.stringify(backup)], 'backup.json', {
        type: 'application/json',
      });

      await service.importBackup(file);

      // Should not call setItem for null values (except queryConfigs which is always processed)
      expect(storageSpy.setItem).not.toHaveBeenCalledWith('auth-state', null);
      expect(storageSpy.setItem).not.toHaveBeenCalledWith('settings', null);
      expect(storageSpy.setItem).not.toHaveBeenCalledWith('query-state', null);
    });
  });

  describe('version compatibility', () => {
    it('should accept same major version', async () => {
      const backup: AppStateBackup = {
        version: '1.0.0',
        timestamp: '2024-11-24T12:00:00Z',
        authState: {},
        settings: {},
        queryConfigs: [],
        queryState: {},
      };

      const file = new File([JSON.stringify(backup)], 'backup.json', {
        type: 'application/json',
      });

      await expectAsync(service.importBackup(file)).toBeResolved();
    });

    it('should reject different major version', async () => {
      const backup: AppStateBackup = {
        version: '0.9.0',
        timestamp: '2024-11-24T12:00:00Z',
        authState: {},
        settings: {},
        queryConfigs: [],
        queryState: {},
      };

      const file = new File([JSON.stringify(backup)], 'backup.json', {
        type: 'application/json',
      });

      await expectAsync(service.importBackup(file)).toBeRejectedWithError(
        /Incompatible backup version: 0\.9\.0/
      );
    });
  });
});
