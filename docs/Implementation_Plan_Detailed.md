# Detailed Implementation Plan

This document expands on each step from `Implementation_Plan.md`, providing specific setup instructions, commands, configurations, and technologies for each phase.

---

## 1. Data Layer (Database)

**Technologies**: PostgreSQL 14+, `uuid-ossp`, Alembic, SQLAlchemy (async)

1. Install and initialize PostgreSQL:
   ```powershell
   choco install postgresql --version=14.4
   initdb -D C:\pgdata
   ```
2. Enable `uuid-ossp`:
   ```sql
   -- Connect as postgres:
   CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
   ```
3. Create user and database:
   ```sql
   CREATE USER hospital_app WITH PASSWORD 'securepass';
   CREATE DATABASE hospital_db OWNER hospital_app;
   ```
4. Alembic setup:
   ```bash
   cd backend
   pip install alembic psycopg2-binary
   alembic init alembic
   # Edit alembic.ini: set sqlalchemy.url = postgresql+asyncpg://hospital_app:securepass@localhost/hospital_db
   ```
5. Define models and migrations:
   - Create `models.py` with SQLAlchemy ORM classes using `UUID(as_uuid=True)`, `server_default=text('uuid_generate_v4()')`.
   - Generate initial migration:
     ```bash
     alembic revision --autogenerate -m "Initial schema"
     alembic upgrade head
     ```
6. Index optimization:
   - Add indexes in migration scripts:
     ```python
     op.create_index('ix_patients_phone', 'patients', ['phone_number'])
     ```

---

## 2. Backend API Layer (FastAPI)

**Technologies**: FastAPI, Uvicorn, SQLAlchemy (async), Pydantic, OAuth2/JWT, Celery, Redis

1. Project scaffolding:
   ```bash
   mkdir backend && cd backend
   python -m venv venv; . venv/bin/activate
   pip install fastapi uvicorn[standard] sqlalchemy[asyncio] pydantic alembic python-dotenv
   pip install celery redis
   ```
2. Directory structure:
   ```text
   backend/
   ├─ app/
   │  ├─ main.py
   │  ├─ api/
   │  │  ├─ v1/
   │  │  │  ├─ patients.py
   │  │  │  ├─ auth.py
   │  │  │  └─ queue.py
   │  ├─ core/
   │  │  ├─ config.py
   │  │  └─ security.py
   │  ├─ models.py
   │  ├─ schemas.py
   │  └─ tasks.py
   └─ alembic/
   ```
3. Configuration:
   - Use `.env` file at project root:
     ```env
     DATABASE_URL=postgresql+asyncpg://hospital_app:pass@localhost/hospital_db
     SECRET_KEY=your_jwt_secret
     REDIS_URL=redis://localhost:6379/0
     ```
   - Load with `python-dotenv` in `config.py`.
4. Run server:
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```
5. Authentication module:
   - Implement OAuth2 Password Flow in `auth.py`, issuing JWT tokens via `pyjwt`.
   - Refresh tokens endpoint and dependency injection for role-checking.
6. Celery integration:
   ```python
   # in app/tasks.py
   from celery import Celery
   celery = Celery(__name__, broker=config.REDIS_URL)
   ```
7. Testing foundation:
   ```bash
   pip install pytest pytest-asyncio httpx
   ```
   - Create `tests/` folder with `test_auth.py`, `test_queue.py`.

---

## 3. Service & Business Logic Layer

**Technologies**: Pure Python modules under `app/services`, Pydantic for validation

1. Create `app/services/queue_engine.py`:
   ```python
   class PriorityCalculator:
       def compute(self, appointment, severity):
           # combine urgency and timestamp
           return score
   ```
2. Notification handlers in `app/services/notification.py`:
   ```python
   class TwilioService:
       def send_sms(self, to, msg):
           # use twilio rest client
   ```
3. Analytics scripts in `app/services/analytics.py`:
   - Schedule daily job via Celery beat:
     ```python
     @celery.on_after_configure.connect
     def setup_periodic_tasks(sender, **kwargs):
         sender.add_periodic_task(86400.0, generate_report.s())
     ```
4. Audit logging decorator:
   ```python
   def audit(event_type):
       def decorator(fn): ...
   ```
5. Unit tests under `tests/services/`.

---

## 4. Web Client Layer (React.js Dashboards)

**Technologies**: React 18, Vite or Create React App, Tailwind CSS, Redux Toolkit, React Query, IndexedDB via `idb`, Axios

1. Scaffold projects:
   ```bash
   cd web
   npm create vite@latest receptionist --template react
   cd receptionist; npm install
   npm install redux react-redux @reduxjs/toolkit react-query axios idb
   ```
2. Tailwind setup:
   ```bash
   npm install -D tailwindcss postcss autoprefixer
   npx tailwindcss init -p
   ```
3. Folder layout:
   ```text
   src/
   ├─ api/
   │  └─ client.ts    # axios instance
   ├─ features/
   ├─ components/
   ├─ store/
   └─ App.tsx
   ```
4. IndexedDB cache:
   ```js
   import { openDB } from 'idb';
   const db = await openDB('queue-db', 1, { upgrade(db) { db.createObjectStore('pending'); } });
   ```
5. Start dev server:
   ```bash
   npm run dev
   ```
6. Repeat for `doctor` and `admin` workspaces.

---

## 5. Mobile App Layer (React Native)

**Technologies**: React Native CLI, TypeScript, React Navigation v6, `@react-native-async-storage/async-storage`, `react-native-sqlite-storage`, Firebase Messaging, `react-native-encrypted-storage`

1. Initialize project:
   ```bash
   npx react-native init PatientApp --template react-native-template-typescript
   cd PatientApp
   ```
2. Install deps:
   ```bash
   npm install @react-navigation/native @react-navigation/stack
   npm install @react-native-async-storage/async-storage react-native-sqlite-storage
   npm install @react-native-firebase/app @react-native-firebase/messaging
   npm install react-native-encrypted-storage
   ```
3. iOS/Android setup:
   ```bash
   cd ios; pod install; cd ..
   ```
4. Configure Firebase:
   - Add `GoogleService-Info.plist` (iOS) and `google-services.json` (Android).
5. Navigation:
   ```tsx
   // App.tsx
   <NavigationContainer><Stack.Navigator>...</Stack.Navigator></NavigationContainer>
   ```
6. Background sync:
   ```bash
   npm install react-native-background-fetch
   ```
7. Run on device/emulator:
   ```bash
   npm run android
   npm run ios
   ```

---

## 6. Notifications Layer

**Technologies**: Twilio Python SDK, Firebase Admin SDK, Celery + Redis

1. Configure credentials in `.env`:
   ```env
   TWILIO_ACCOUNT_SID=xxx
   TWILIO_AUTH_TOKEN=yyy
   FIREBASE_CREDENTIALS=./firebase-service-account.json
   ```
2. Install SDKs:
   ```bash
   pip install twilio firebase-admin
   ```
3. Celery task example (`app/tasks/notify.py`):
   ```python
   @celery.task(bind=True, max_retries=3)
   def send_sms(self, to, body): TwilioService().send_sms(to, body)
   ```
4. Schedule tasks on queue events in API handlers.

---

## 7. Security & Authentication Layer

**Technologies**: OAuth2, PyJWT, SlowAPI, CORS middleware

1. Install security deps:
   ```bash
   pip install python-jose[cryptography] slowapi
   ```
2. CORS & HTTPS in `app/main.py`:
   ```python
   app.add_middleware(CORSMiddleware, allow_origins=[...])
   ```
3. Rate limiting:
   ```python
   from slowapi import Limiter
   limiter = Limiter(key_func=get_remote_address)
   @app.post('/login')
   @limiter.limit('5/minute')
   ```
4. Role-based routes via FastAPI dependencies.

---

## 8. Offline Sync & Caching Layer

**Technologies**: react-native-background-fetch, IndexedDB (idb), SQLite

1. Define sync API routes in FastAPI (`/sync/push`, `/sync/pull`).
2. Mobile: register background task:
   ```js
   BackgroundFetch.configure({ minimumFetchInterval: 15 }, async taskId => { await sync(); BackgroundFetch.finish(taskId); });
   ```
3. Web: detect offline via `navigator.onLine`, queue actions in IndexedDB.

---

## 9. DevOps & Infrastructure

**Technologies**: Docker, Docker Compose, GitHub Actions, Render

1. `backend/Dockerfile`:
   ```dockerfile
   FROM python:3.11-slim
   WORKDIR /app
   COPY requirements.txt .
   RUN pip install -r requirements.txt
   COPY . .
   CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
   ```
2. `docker-compose.yml`:
   ```yaml
   services:
     db:
       image: postgres:14
     redis:
       image: redis:6
     backend:
       build: ./backend
       ports: [8000:8000]
       depends_on: [db, redis]
   ```
3. GitHub Actions workflow (`.github/workflows/ci.yml`) sets up Python, Node, runs tests, builds Docker.
4. Deploy to Render with Docker settings.

---

## 10. Monitoring & Logging

**Technologies**: Sentry, Prometheus, Grafana, pg_stat_statements

1. Sentry setup (backend):
   ```bash
   pip install sentry-sdk
   ```
   ```python
   sentry_sdk.init(dsn=config.SENTRY_DSN)
   ```
2. Metrics endpoint:
   ```bash
   pip install prometheus-fastapi-instrumentator
   ```
   ```python
   Instrumentator().instrument(app).expose(app)
   ```
3. Grafana: provision dashboards via JSON.
4. Enable PostgreSQL slow query log in `postgresql.conf`.

---

## 11. Testing & QA

**Technologies**: Pytest, Jest, Cypress, Detox, Postman Collection

1. Pytest config (`pytest.ini`):
   ```ini
   [pytest]
   asyncio_mode = auto
   ```
2. Jest config in `package.json` for web:
   ```json
   "scripts": { "test": "jest" }
   ```
3. Cypress scaffold:
   ```bash
   npx cypress open
   ```
4. Detox for React Native:
   ```bash
   npm install --save-dev detox-cli
   detox init -r jest
   ```
5. Postman: export collection to `docs/postman_collection.json`.

---

## 12. Deployment & Environment Management

**Technologies**: Docker secrets, Render environment, GitHub Actions, Alembic migrations

1. Store secrets in Render dashboard or GitHub Secrets.
2. GitHub Actions deploy step:
   ```yaml
   - name: Deploy to Render
     uses: renderinc/render-github-action@v1
     with: ...
   ```
3. Automate migrations in CI:
   ```bash
   alembic upgrade head
   ```
4. Document all environment variables in `README.md` under **Deployment**.

---

*End of Detailed Implementation Plan* 