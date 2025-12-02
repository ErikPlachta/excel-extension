import { TestBed } from '@angular/core/testing';
import { BackupRestoreService, AppStateBackup } from './backup-restore.service';
import { StorageHelperService } from './storage-helper.service';
import { WINDOW } from './window.token';

describe('BackupRestoreService', () => {
  let service: BackupRestoreService;
  let storageSpy: jasmine.SpyObj<StorageHelperService>;
  let mockWindow: { location: { reload: jasmine.Spy } };

  beforeEach(() => {
    storageSpy = jasmine.createSpyObj<StorageHelperService>('StorageHelperService', [
      'getItem',
      'setItem',
    ]);

    mockWindow = {
      location: {
        reload: jasmine.createSpy('reload'),
      },
    };

    TestBed.configureTestingModule({
      providers: [
        BackupRestoreService,
        { provide: StorageHelperService, useValue: storageSpy },
        { provide: WINDOW, useValue: mockWindow },
      ],
    });

    service = TestBed.inject(BackupRestoreService);
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

      storageSpy.getItem.and.callFake(<T>(key: string, defaultValue: T): T => {
        if (key === 'auth-state') return authState as T;
        if (key === 'settings') return settings as T;
        if (key === 'query-state') return queryState as T;
        return defaultValue;
      });

      const createElementSpy = spyOn(document, 'createElement').and.returnValue({
        click: jasmine.createSpy('click'),
        href: '',
        download: '',
      } as unknown as HTMLAnchorElement);
      spyOn(URL, 'createObjectURL').and.returnValue('blob:mock-url');
      spyOn(URL, 'revokeObjectURL');

      await service.exportBackup();

      expect(createElementSpy).toHaveBeenCalledWith('a');
      expect(URL.createObjectURL).toHaveBeenCalled();
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
    });

    it('should throw when storage fails', async () => {
      storageSpy.getItem.and.throwError('Storage error');

      await expectAsync(service.exportBackup()).toBeRejectedWithError(
        /Storage error/
      );
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
      expect(mockWindow.location.reload).toHaveBeenCalled();
    });

    it('should reject incompatible major version', async () => {
      const backup: AppStateBackup = {
        version: '2.0.0',
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
    });

    it('should accept compatible minor/patch versions', async () => {
      const backup: AppStateBackup = {
        version: '1.2.3',
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
    });
  });
});
