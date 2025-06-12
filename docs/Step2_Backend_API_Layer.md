# Step 2: Backend API Layer (FastAPI) Detailed Implementation

**Status: 🔄 In Progress**

**Overview**: This step entails scaffolding the FastAPI backend, integrating ORM models, building REST endpoints, and setting up authentication and asynchronous tasks.

---

## 1. Technologies

- FastAPI 0.78+ ✅
- Uvicorn (ASGI server) ✅
- SQLAlchemy (Async) & Alembic ✅
- Pydantic for schemas ✅
- Celery for background tasks ⏳
- Redis as Celery broker ⏳
- SlowAPI for rate limiting ⏳
- `python-multipart` for file uploads (if needed) ⏳

---

## 2. Environment & Project Setup

1. **Create Project Structure**: ✅
   ```bash
   mkdir -p backend/app/{api/v1/routers,api/v1/schemas,core,models,crud,workers}
   cd backend
   ```
2. **Python Virtualenv & Installation**: ✅
   ```bash
   python3 -m venv .venv
   source .venv/bin/activate
   pip install fastapi uvicorn[standard] sqlalchemy[asyncio] alembic pydantic celery[redis] redis slowapi python-multipart
   ```
3. **Configure Config Settings**: ✅
   - Create `app/core/config.py` with Pydantic `Settings` for DB URL, JWT secret, Celery broker URL.

---

## 3. Application Entry Point

- **File**: `app/main.py` 🔄
  ```python
  from fastapi import FastAPI
  from app.api.v1.routers import auth, patients, appointments, queue, notifications, analytics
  from core.config import settings

  app = FastAPI(title="Hospital Queue API", version="1.0.0")

  # Include routers
  app.include_router(auth.router, prefix='/auth', tags=['auth'])
  app.include_router(patients.router, prefix='/patients', tags=['patients'])
  # ... other routers

  # Middleware
  from slowapi import Limiter, _rate_limit_exceeded_handler
  from slowapi.middleware import SlowAPIMiddleware
  limiter = Limiter(key_func=lambda request: request.client.host)
  app.state.limiter = limiter
  app.add_middleware(SlowAPIMiddleware)
  app.add_exception_handler(429, _rate_limit_exceeded_handler)
  ```

---

## 4. Authentication & Security

- **OAuth2 + JWT**: ⏳
  - Use `OAuth2PasswordBearer` dependency in `api/v1/routers/auth.py`.
  - Issue `access_token` and `refresh_token` on login.
- **Password Hashing**: ⏳
  - `passlib[bcrypt]` for secure hashes.
- **Role-based Authorization**: ⏳
  - Define dependencies: `get_current_user`, `get_current_active_staff`, `get_current_admin`.

---

## 5. Routers & Endpoints

1. **Auth** (`/auth`): ⏳
   - `POST /login` → issue JWT
   - `POST /refresh` → new access token
2. **Patients** (`/patients`): ⏳
   - `POST /` → register
   - `GET /me` → profile
3. **Appointments** (`/appointments`): ⏳
   - CRUD endpoints: create, list, update, delete
4. **Queue** (`/queue`): ⏳
   - `GET /current` → fetch queue state
   - `PATCH /{id}/status` → update status
   - `POST /override` → manual assign/skip
5. **Notifications** (`/notifications`): ⏳
   - `POST /resend` → resend failed notifications
6. **Analytics** (`/analytics`): ⏳
   - `GET /daily`, `/weekly` reports

---

## 6. Asynchronous Workers

- **Celery Configuration**: ⏳
  - File: `app/workers/celery_app.py`
  ```python
  from celery import Celery
  app = Celery(__name__, broker=settings.CELERY_BROKER_URL)
  ```
- **Tasks**: ⏳
  - `send_sms(message_id)`
  - `send_push(notification_id)`
  - `aggregate_metrics()`

---

## 7. Input Validation & Schemas

- **Location**: `app/api/v1/schemas/` ⏳
- Define Pydantic models for request and response bodies. ⏳
- Use validators for phone number format, date, enum values. ⏳

---

## 8. Testing & Documentation

- **API Docs**: Automatic via FastAPI Swagger at `/docs`. ⏳
- **Unit Tests**: ⏳
  - Directory: `tests/`
  - Use `pytest` with `TestClient`.
- **Integration Tests**: ⏳
  - Override dependencies for DB and Celery tasks.

---

## Legend

- ✅ Completed
- 🔄 In Progress
- ⏳ Pending
- ❌ Blocked

*End of Step 2 documentation.* 