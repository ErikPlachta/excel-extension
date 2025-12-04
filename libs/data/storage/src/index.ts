// @excel-platform/data/storage
// Storage services library for localStorage and IndexedDB operations

export { StorageBaseService } from './lib/storage-base.service';
export { StorageHelperService } from './lib/storage-helper.service';
export { IndexedDBService } from './lib/indexeddb.service';
export type { QueryResultCache } from './lib/indexeddb.service';
export { BackupRestoreService } from './lib/backup-restore.service';
// AppStateBackup type now exported from @excel-platform/shared/types as AppStateBackupParsed
export { UserKeyedStorageService } from './lib/user-keyed-storage.service';
export { WINDOW } from './lib/window.token';
