
# ✅ Updated Backend Architecture (No Celery)

## 1️⃣ Data Layer — PostgreSQL Database

| Table | Description |
|---|---|
| **patients** | Stores patient account & demographic data. |
| **users** | Stores staff/admin/doctor credentials, role. |
| **doctors** | Links user to doctor info. |
| **appointments** | Booking info, urgency, linked to patient & created_by (staff). |
| **queue** | Tracks queue number, priority, status. |
| **notifications** | Log of all SMS/push messages. |
| **audit_log** | Records all security/audit events. |

- Uses UUIDs for PKs
- Enforces unique `phone_number` for patients and `username` for staff/admin.

## 2️⃣ Backend API — FastAPI

**Endpoints by Actor:**

| Actor | Endpoints |
|---|---|
| **Patients** | Register, Login, Update Profile, View Queue Status |
| **Receptionists** | Register patient, assign urgency, manage queue |
| **Doctors** | View queue, mark patient served |
| **Admins** | Create/manage users, view analytics |
| **Queue** | Internal queue updates, status sync |

- Uses Pydantic models, async SQLAlchemy, JWT.

## 3️⃣ Service & Business Logic Layer

| Service | Logic |
|---|---|
| **Registration** | Hash passwords, check unique phone/username |
| **Login** | JWT token |
| **Queue Management** | FIFO or urgency override |
| **Appointment** | Book slot, enqueue |
| **Notification** | Uses FastAPI `BackgroundTasks` for async SMS/push |
| **Audit** | Async event logging |
| **Offline Sync** | `/api/sync` for cached updates |

## 4️⃣ Notification Layer — Revised

| Channel | Tool | When |
|---|---|---|
| **SMS** | Twilio | After booking, before turn, when it’s turn |
| **Push** | Firebase | Same as SMS |
| **Background Logic** | FastAPI `BackgroundTasks` | Inline async execution |

## 5️⃣ Security & Authentication Layer

| Area | Tool/Pattern |
|---|---|
| **Password Hashing** | bcrypt |
| **Auth** | JWT OAuth2 |
| **Roles** | RBAC |
| **Transport Security** | HTTPS |
| **Input Validation** | Pydantic |
| **Audit Logging** | Async via `BackgroundTasks` |

## 6️⃣ Offline Sync & Caching Layer

| Client | Storage |
|---|---|
| **Mobile App** | React Native AsyncStorage / SQLite |
| **Receptionist Web** | IndexedDB + Service Workers |
| **Sync** | `/api/sync` |
| **Conflict Resolution** | Last-write-wins, staff overrides |

## ✅ Folder Structure

```
backend/
 ├── main.py
 ├── api/
 │   ├── routes/
 │   │   ├── patient.py
 │   │   ├── staff.py
 │   │   ├── doctor.py
 │   │   ├── admin.py
 │   ├── dependencies.py
 ├── core/
 │   ├── config.py
 │   ├── security.py
 ├── models/
 ├── schemas/
 ├── services/
 ├── database.py
 ├── requirements.txt
```

## ✅ Key Changes

| Before (with Celery) | Now (No Celery) |
|---|---|
| Uses Celery + Redis | Uses FastAPI `BackgroundTasks` |
| Needs broker, worker | Simpler, inline async tasks |
| Heavy job handling | Lightweight async suitable |

## ✅ Why Valid

- Tasks are IO-bound, short-lived.
- No heavy compute or large batch jobs.
- Celery can be added later if needed.

## ✅ Next Steps

- Example `BackgroundTasks` usage
- Docker Compose without Celery
- `.env` for secrets
- Revised ERD

---
