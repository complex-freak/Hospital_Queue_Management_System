# Step 3: Service & Business Logic Layer Detailed Implementation

**Overview**: Implements core business rules, queue prioritization algorithms, notification triggers, analytics aggregation, and offline sync endpoints.

---

## 1. Technologies & Libraries

- Python 3.11+
- FastAPI service layer within `app/services/`
- SQLAlchemy ORM for DB operations
- Celery for background processing
- Pandas or native Python for analytics computations
- Redis for caching queue summaries

---

## 2. Directory Structure

```
backend/app/services/
  ├── queue_engine.py        # PriorityCalculator, QueueAllocator, QueueUpdater
  ├── notification_handler.py# NotificationTriggerHandler
  ├── analytics_engine.py    # DataCollector, StatisticsEngine, ReportExporter
  └── audit_logger.py        # writes to AuditLog table
```

---

## 3. Queue Engine

1. **PriorityCalculator**:
   - Accepts appointment record, severity, patient type → returns integer priority score.
   - Implements weighting: `score = base_time_score - severity_weight + category_weight`.
2. **QueueAllocator**:
   - On registration or new appointment, calls `PriorityCalculator` and inserts into `Queue`.
3. **QueueUpdater**:
   - Monitors state changes (served, skipped) and recalculates positions.

---

## 4. Notification Module

- **TwilioSMSService**:
  - Sends SMS via Twilio REST client.
- **FirebasePushService**:
  - Uses Firebase Admin SDK to send push messages.
- **NotificationTriggerHandler**:
  - Listens to DB events (via polling or hooks) → enqueues Celery tasks for SMS/push.

---

## 5. Analytics Module

1. **DataCollector**:
   - Pulls daily logs (queue, served times, no-shows) into DataFrame.
2. **StatisticsEngine**:
   - Calculates metrics: avg wait time, peak hours, dropout rates.
3. **ReportExporter**:
   - Exports metrics to CSV or JSON for admin panel.

---

## 6. Audit Logger

- Captures key events: registration, login, notification send, status change.
- Writes to `AuditLog` with `actor_id`, `event_type`, `description`, `timestamp`.

---

## 7. Offline Sync Manager

- **Endpoints**:
  - `POST /sync/push` → receive batched offline actions from client
  - `GET /sync/pull` → return latest queue snapshot
- **Conflict Handling**:
  - Use timestamps to resolve newer updates
  - Return error codes for conflicting modifications

---

## 8. Testing Business Logic

- Unit tests for `PriorityCalculator` with example scenarios.
- Mock DB tests for `QueueAllocator` and `QueueUpdater` using `pytest-mock`.
- Integration tests for notification enqueuing and analytics routines.

---

*End of Step 3 documentation.* 