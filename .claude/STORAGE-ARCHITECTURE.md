# Storage Architecture

**Author:** Claude Code
**Date:** 2025-11-24
**Phase:** 4 (Query Services Refactor + Storage/Caching Strategy)

## Executive Summary

This document outlines the storage and caching strategy for the Excel Add-In extension. The strategy uses a multi-tiered approach:
- **localStorage** for small, frequently-accessed state (< 100KB)
- **IndexedDB** for large datasets and query result caching (100KB+)
- **Service Workers** deferred to post-MVP (Phase 10+)

## Browser Storage Options Comparison

| Storage Type | Max Size | API Type | Offline | Performance | Best For |
|--------------|----------|----------|---------|-------------|----------|
| **localStorage** | 5-10 MB | Synchronous | ✓ | Fast (sync) | Settings, auth tokens, UI state |
| **sessionStorage** | 5-10 MB | Synchronous | ✓ | Fast (sync) | Temp session data (not used) |
| **IndexedDB** | 50 MB - 1 GB+ | Asynchronous | ✓ | Fast for large data | Query results, cached API responses |
| **Cache API** | 50 MB - 1 GB+ | Asynchronous | ✓ | HTTP-optimized | API response caching (future) |
| **Service Worker** | N/A | N/A | ✓ | N/A | Offline support, background sync |

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

## Current State (Before Phase 4)

**All persistence uses localStorage:**

| Service | Storage Key | Data Size | Use Case |
|---------|-------------|-----------|----------|
| AuthService | `auth-state` | < 1 KB | User auth state, roles |
| SettingsService | `settings` | < 5 KB | User preferences, telemetry config |
| QueryStateService | `query-state` | < 10 KB | Global parameters, run state |
| QueryConfigurationService | `query-configs` | < 50 KB | Saved query configurations |

**Limitations:**
- No caching of large query results (10k+ rows)
- No offline support beyond localStorage persistence
- No backup/restore functionality
- Direct localStorage usage scattered across services
- No abstraction for future storage backend changes

## Target State (Phase 4+)

### Multi-Tiered Storage Strategy

**Tier 1: localStorage (< 100 KB)**
- User authentication state
- User preferences and settings
- UI state (current view, collapsed sections)
- Global query parameters
- Saved query configurations

**Tier 2: IndexedDB (100 KB+)**
- Query result caching (10k+ row datasets)
- Large API response caching
- Backup snapshots (full app state exports)

**Tier 3: Cache API (Future - Post-MVP)**
- HTTP response caching for real API calls
- Deferred until moving from mocks to real APIs

**Service Workers (Future - Phase 10+)**
- Offline support for entire app
- Background sync for query runs
- Requires HTTPS (works for GitHub Pages, investigate dev sideload support)

### Service Abstraction

**StorageHelperService** - Single interface for all storage operations:

```typescript
class StorageHelperService {
  // Tier 1: localStorage (sync, small data)
  getItem<T>(key: string, defaultValue: T): T
  setItem<T>(key: string, value: T): void
  removeItem(key: string): void
  clear(): void

  // Tier 2: IndexedDB (async, large data)
  getLargeItem<T>(key: string): Promise<T | null>
  setLargeItem<T>(key: string, value: T, ttl?: number): Promise<void>
  clearExpiredCache(): Promise<void>
}
```

**Benefits:**
- Services don't care about storage backend
- Easy to migrate data between tiers as size grows
- Centralized error handling and telemetry
- Future-proof for new storage APIs

## IndexedDB Schema

**Database:** `ExcelExtensionDB`
**Version:** 1
**Object Store:** `queryResults`

**Schema:**
```typescript
interface QueryResultCache {
  id: string;           // PK: `${queryId}-${timestamp}`
  queryId: string;      // Index: queryId
  rows: any[];          // Cached result rows
  timestamp: number;    // Index: timestamp
  expiresAt: number;    // TTL expiration
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

| Aspect | Excel Desktop | Excel Online | Notes |
|--------|---------------|--------------|-------|
| **Browser Engine** | Embedded Chromium (Edge WebView2 on Windows, Safari WebView on macOS) | User's browser (Chrome, Safari, Edge) | Both run Angular in browser context |
| **localStorage** | ✓ Supported | ✓ Supported | Identical API, same quota (~5-10 MB) |
| **IndexedDB** | ✓ Supported | ✓ Supported | Identical API, quota may vary by host |
| **Service Workers** | ⚠️ HTTPS required | ✓ HTTPS required | Dev sideload (localhost) may not support SW; GH Pages works |
| **Quota** | Browser default | Browser default | Desktop may have more generous quota |
| **Persistence** | Tied to WebView profile | Tied to browser profile | Clearing browser data clears storage |

### Known Limitations

1. **Service Worker on localhost:** May not work in Excel Desktop when sideloaded to `http://localhost:4200` (HTTP not HTTPS). Works fine on GitHub Pages (HTTPS).
2. **Storage Persistence:** Clearing browser cache/data will clear IndexedDB and localStorage. No direct control over persistence guarantees.
3. **Quota Prompts:** IndexedDB quota requests may behave differently between Desktop and Online (browser-dependent).

### Manual Verification Checklist

- [ ] Sideload in Excel Desktop (macOS) → Save config → Reload add-in → Verify config persists
- [ ] Sideload in Excel Desktop (Windows) → Save config → Reload add-in → Verify config persists
- [ ] Sideload in Excel Online (Chrome) → Save config → Reload add-in → Verify config persists
- [ ] Cache large query result (10k rows) → Check IndexedDB via DevTools → Verify cached
- [ ] Wait for TTL expiration → Call clearExpiredCache → Verify removed
- [ ] Export backup → Import backup → Verify state restored
- [ ] Document any quota warnings or storage failures

## Service Worker Evaluation

### Feasibility Assessment

**Pros:**
- Offline support for entire app (no network required after initial load)
- Background sync for query runs (retry on network recovery)
- Cache management for API responses
- Progressive Web App (PWA) capabilities

**Cons:**
- HTTPS requirement (works for GH Pages, may not work for localhost sideload in Desktop)
- Debugging complexity (hidden background processes)
- Version management complexity (SW updates require careful handling)
- Increased development/testing overhead

### Decision Criteria

| Question | Answer | Implication |
|----------|--------|-------------|
| Is offline support critical for MVP? | NO (mock data phase, no real APIs yet) | Defer to later phase |
| Does HTTPS requirement work with dev sideload? | UNCLEAR (needs testing) | Risk for local dev workflow |
| Can defer to post-MVP? | YES (Phase 10+ after formula features) | Lower priority |
| Complexity vs benefit? | HIGH complexity, LOW immediate benefit | Not worth it for Phase 4 |

### Recommendation

**Defer Service Workers to Phase 10+ (post-MVP).**

**Rationale:**
- Current mock data doesn't require network calls (no offline use case yet)
- IndexedDB already provides offline caching for query results
- HTTPS requirement adds friction to local dev sideloading
- Formula features (Phase 6-9) are higher priority than offline support

**Future Implementation Plan (Phase 10+):**
- Implement Service Worker for GitHub Pages deployment only
- Use Workbox library for SW generation/management
- Cache app shell (HTML, JS, CSS) for offline access
- Background sync for real API query runs
- Test HTTPS sideload flow for Excel Desktop (if feasible)

## Backup/Restore Functionality

### Requirements

- Export all app state to downloadable JSON file
- Import JSON file to restore state (with confirmation)
- Automatic backup on critical operations (optional, configurable)
- Version compatibility checks (semantic versioning)

### Backup Schema

```typescript
interface AppStateBackup {
  version: string;       // e.g., "1.0.0"
  timestamp: string;     // ISO 8601
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

## Implementation Checklist

### Phase 4 Deliverables

- [x] This document (STORAGE-ARCHITECTURE.md)
- [x] IndexedDBService (query result caching)
- [x] StorageHelperService (multi-backend abstraction)
- [x] BackupRestoreService (export/import app state)
- [x] Refactor all services to use StorageHelperService
- [x] Integrate IndexedDB caching in QueryApiMockService
- [x] Integrate IndexedDB caching in QueryQueueService (transparent via QueryApiMockService)
- [x] Backup/Restore UI in User/Settings view
- [x] Cache cleanup on app init (AppComponent.ngOnInit)
- [ ] Manual verification in Excel Desktop and Online (requires user testing)

**Implementation Notes:**
- All 160 tests passing (100% success rate)
- Full TSDoc coverage for all new services
- Backup/restore UI integrated in Settings component with file input handling
- Cache cleanup called on every app initialization
- Transparent caching in QueryQueueService via QueryApiMockService integration

### Post-MVP (Phase 10+)

- [ ] Service Worker implementation (offline support)
- [ ] Cache API for HTTP response caching
- [ ] Background sync for query runs
- [ ] PWA manifest for installability

## References

- [MDN: Web Storage API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API)
- [MDN: IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [MDN: Cache API](https://developer.mozilla.org/en-US/docs/Web/API/Cache)
- [MDN: Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Office.js Documentation](https://learn.microsoft.com/en-us/office/dev/add-ins/)
- [Browser Storage Limits](https://web.dev/articles/storage-for-the-web)
