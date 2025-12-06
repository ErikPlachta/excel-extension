---
sidebar_position: 2
title: Storage Architecture
---

Reference guide for browser storage APIs used in the Excel Add-In extension.

## Overview

Multi-tiered storage strategy:

- **localStorage** for small, frequently-accessed state (< 100KB)
- **IndexedDB** for large datasets and query result caching (100KB+)
- **Service Workers** deferred to post-MVP

## Browser Storage Options Comparison

| Storage Type       | Max Size      | API Type     | Offline | Performance         | Best For                            |
| ------------------ | ------------- | ------------ | ------- | ------------------- | ----------------------------------- |
| **localStorage**   | 5-10 MB       | Synchronous  | ✓       | Fast (sync)         | Settings, auth tokens, UI state     |
| **sessionStorage** | 5-10 MB       | Synchronous  | ✓       | Fast (sync)         | Temp session data (not used)        |
| **IndexedDB**      | 50 MB - 1 GB+ | Asynchronous | ✓       | Fast for large data | Query results, cached API responses |
| **Cache API**      | 50 MB - 1 GB+ | Asynchronous | ✓       | HTTP-optimized      | API response caching (future)       |
| **Service Worker** | N/A           | N/A          | ✓       | N/A                 | Offline support, background sync    |

### Quota Details

- **localStorage/sessionStorage:** ~5-10 MB per origin (browser-dependent)
- **IndexedDB:** Quota-based, typically 50 MB minimum, can request more (browser prompts user)
- **Cache API:** Shares quota with IndexedDB
- **Total Storage Quota:** Varies by browser, typically 50% of available disk space (with soft limits)

### Browser Support

All storage APIs supported in modern browsers and Office.js environments:

- ✓ Chrome/Edge (Chromium) - Excel Desktop uses embedded Chromium
- ✓ Safari - Excel Online on macOS
- ✓ Firefox - Not primary target but compatible
- ✓ Office.js task pane context - Runs in browser environment

## Storage Tiers

### Tier 1: localStorage (< 100 KB)

- User authentication state
- User preferences and settings
- UI state, global query parameters
- Saved query configurations

### Tier 2: IndexedDB (100 KB+)

- Query result caching (10k+ row datasets)
- Large API response caching
- Backup snapshots

### Tier 3: Cache API (Future)

- HTTP response caching for real API calls

## IndexedDB Schema

**Database:** `ExcelExtensionDB`
**Version:** 1
**Object Store:** `queryResults`

**Schema:**

```typescript
interface QueryResultCache {
  id: string; // PK: `${queryId}-${timestamp}`
  queryId: string; // Index: queryId
  rows: any[]; // Cached result rows
  timestamp: number; // Index: timestamp
  expiresAt: number; // TTL expiration
}
```

**Indexes:**

- `queryId` (non-unique) - Lookup cached results by query
- `timestamp` (non-unique) - Support TTL expiration cleanup

**Cache Invalidation:**

- **TTL-based:** Default 1 hour (configurable via SettingsService)
- **Manual:** User can clear cache via Settings
- **Automatic:** App init calls `clearExpiredCache()`

## Excel Desktop vs Online Storage Differences

### Test Environment

- **Excel Desktop (macOS/Windows):** Sideloading via `dev-manifest.xml` → localhost:4200
- **Excel Online (Browser):** Sideloading via GitHub Pages deployment → HTTPS

### Expected Behavior

| Aspect              | Excel Desktop                                                         | Excel Online                          | Notes                                                       |
| ------------------- | --------------------------------------------------------------------- | ------------------------------------- | ----------------------------------------------------------- |
| **Browser Engine**  | Embedded Chromium (Edge WebView2 on Windows, Safari WebView on macOS) | User's browser (Chrome, Safari, Edge) | Both run Angular in browser context                         |
| **localStorage**    | ✓ Supported                                                           | ✓ Supported                           | Identical API, same quota (~5-10 MB)                        |
| **IndexedDB**       | ✓ Supported                                                           | ✓ Supported                           | Identical API, quota may vary by host                       |
| **Service Workers** | ⚠️ HTTPS required                                                     | ✓ HTTPS required                      | Dev sideload (localhost) may not support SW; GH Pages works |
| **Quota**           | Browser default                                                       | Browser default                       | Desktop may have more generous quota                        |
| **Persistence**     | Tied to WebView profile                                               | Tied to browser profile               | Clearing browser data clears storage                        |

### Known Limitations

1. **Service Worker on localhost:** May not work in Excel Desktop when sideloaded to `http://localhost:4200` (HTTP not HTTPS). Works fine on GitHub Pages (HTTPS).
2. **Storage Persistence:** Clearing browser cache/data will clear IndexedDB and localStorage. No direct control over persistence guarantees.
3. **Quota Prompts:** IndexedDB quota requests may behave differently between Desktop and Online (browser-dependent).

## Backup/Restore Functionality

### Requirements

- Export all app state to downloadable JSON file
- Import JSON file to restore state (with confirmation)
- Automatic backup on critical operations (optional, configurable)
- Version compatibility checks (semantic versioning)

### Backup Schema

```typescript
interface AppStateBackup {
  version: string; // e.g., "1.0.0"
  timestamp: string; // ISO 8601
  authState: AuthState;
  settings: Settings;
  queryConfigs: QueryConfiguration[];
  queryState: QueryStateSnapshot;
}
```

### UI Integration

**Location:** User/Settings view

**Export Flow:**

1. User clicks "Export Backup" button
2. BackupRestoreService collects state from StorageHelperService
3. JSON blob created and downloaded as `excel-extension-backup-{timestamp}.json`
4. Telemetry logged

**Import Flow:**

1. User clicks "Import Backup" button → file picker
2. User selects `.json` file
3. Confirmation dialog: "This will overwrite current settings. Continue?"
4. BackupRestoreService validates version compatibility
5. State restored to localStorage
6. App reloads to apply restored state
7. Telemetry logged

### Version Compatibility

- **Major version mismatch:** Reject import (e.g., v2.x.x backup into v1.x.x app)
- **Minor version mismatch:** Allow import with warning (e.g., v1.2.0 backup into v1.1.0 app)
- **Patch version mismatch:** Allow import silently (e.g., v1.0.1 backup into v1.0.0 app)

## Future Enhancements

- Service Worker implementation (offline support)
- Cache API for HTTP response caching
- Background sync for query runs
- PWA manifest for installability

## References

- [MDN: Web Storage API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API)
- [MDN: IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [MDN: Cache API](https://developer.mozilla.org/en-US/docs/Web/API/Cache)
- [MDN: Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Office.js Documentation](https://learn.microsoft.com/en-us/office/dev/add-ins/)
- [Browser Storage Limits](https://web.dev/articles/storage-for-the-web)
