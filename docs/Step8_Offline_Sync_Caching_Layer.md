# Step 8: Offline Sync & Caching Layer Detailed Implementation

**Overview**: Define client-server synchronization mechanisms, local caching strategies, and conflict resolution for offline support.

---

## 1. Technologies & Libraries

- SQLite (`react-native-sqlite-storage`) & AsyncStorage (mobile)
- IndexedDB (`idb`) for web
- FastAPI endpoints for sync
- `react-native-background-fetch` for mobile background jobs
- `workbox` for PWA offline (optional)

---

## 2. Client-Side Caching

### Mobile App

1. **Storage Setup**:
   - AsyncStorage for simple key-value.
   - SQLite DB for structured queue and form data.
2. **Schema** (SQLite):
   - Tables: `pending_actions`, `queue_snapshot`, `notifications_cache`.
3. **Helpers**:
   - `storage.ts` with methods: `saveAction()`, `getPendingActions()`, `clearAction()`.
4. **Background Sync**:
   - Configure `react-native-background-fetch` to call `syncPending()` every X minutes or on connectivity change.

### Web Dashboard

1. **IndexedDB Setup**:
   - Use `idb` to open `reception-cache` DB.
   - Object stores: `pendingRegistrations`, `queueSnapshot`.
2. **Service Worker** (PWA)
   - Use Workbox to precache static assets and API fallback.

---

## 3. API Sync Endpoints

- **File**: `api/v1/routers/sync.py`
  ```python
  @router.post('/sync/push')
  async def push_actions(actions: List[ActionSchema], user=Depends(get_current_user)):
      # iterate and apply each action transactionally
      # return summary of successes/failures

  @router.get('/sync/pull')
  async def pull_snapshot(user=Depends(get_current_user)):
      # return current queue state and notifications
  ```

---

## 4. Conflict Resolution

- Use `last_updated` timestamps on records.
- On `push`, compare timestamps; if server record newer, reject with code 409 Conflict.
- Client handles 409 by refreshing snapshot.

---

## 5. Error Handling & Retries

- If `push` fails network error, keep actions in local DB and retry.
- Show status indicators in UI for pending, synced, or failed.

---

## 6. Testing Offline Scenarios

- Simulate offline in emulator and browser devtools.
- Test form submission offline, auto-sync on reconnect.
- Validate conflict resolution path.

---

*End of Step 8 documentation.* 