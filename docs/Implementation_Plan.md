# Implementation Plan

This document outlines the detailed implementation plan for the Hospital Queuing System, organized by architectural layer. Each section highlights the specific components, technologies, and tasks to be implemented.

---

## 1. Data Layer (Database)

- **Technology**: PostgreSQL + `uuid-ossp` extension, Alembic migrations
- **Tasks**:
  - Initialize database and enable `uuid-ossp` extension.
  - Create Alembic configuration and initial migration.
  - Define tables and UUID primary keys:
    - `Patients`, `Appointments`, `Queue`, `Users`, `Doctors`, `Notifications`, `AuditLog`.
  - Create indexes on `phone_number`, `queue_number`, `urgency_level`, `scheduled_date`.
  - Configure connection pooling and async driver (`asyncpg`).
  - Write SQL scripts or ORM mappings for foreign key constraints and enums.

---

## 2. Backend API Layer (FastAPI)

- **Technology**: FastAPI, SQLAlchemy, Pydantic, OAuth2/JWT, Celery + Redis
- **Tasks**:
  - Scaffold FastAPI project with router structure (patients, auth, appointments, queue, notifications, analytics).
  - Integrate SQLAlchemy models and Alembic migrations.
  - Implement authentication:
    - Patient OTP flow or phone number login.
    - Staff login with username/password (JWT issuance & refresh).
    - Role-based dependencies (patient, receptionist, doctor, admin).
  - Build REST endpoints:
    - **Patients**: register, login, profile.
    - **Appointments**: create, view, cancel.
    - **Queue**: fetch current state, update status (served, skipped), manual overrides.
    - **Notifications**: trigger logs, retry failures.
    - **Analytics**: patient volume, average wait times.
  - Add input validation with Pydantic schemas.
  - Integrate Celery tasks for asynchronous jobs (SMS/push sending, analytics aggregation).
  - Secure all routes with HTTPS enforcement, CORS policy, rate limiting (SlowAPI).
  - Write unit and integration tests with pytest.
  - Enable Swagger UI and auto-generated OpenAPI docs.

---

## 3. Service & Business Logic Layer

- **Components**:
  - **Queue Engine**: `PriorityCalculator`, `QueueAllocator`, `QueueUpdater`.
  - **Notification Module**: `TwilioSMSService`, `FirebasePushService`, `NotificationTriggerHandler`.
  - **Analytics Module**: `DataCollector`, `StatisticsEngine`, `ReportExporter`.
  - **Audit Logger**: centralized event logging to `AuditLog` table.
  - **Offline Sync Manager**: endpoints to reconcile local cache updates.
- **Tasks**:
  - Implement priority rules combining severity, appointment time, and patient type.
  - Build notification triggers on state changes.
  - Develop analytics aggregation routines for daily/weekly reports.
  - Ensure idempotent audit logging for key events.

---

## 4. Web Client Layer (React.js Dashboards)

- **Technology**: React.js, Tailwind CSS or Bootstrap, Redux or Context API, IndexedDB, React Query
- **Tasks**:
  - Initialize separate SPA projects or monorepo structure:
    - **Receptionist Dashboard**
    - **Doctor Dashboard**
    - **Admin Panel**
  - Implement authentication flow storing JWT securely.
  - Build core components:
    - **Receptionist**: `RegistrationForm`, `QueueMonitorView`, `ManualQueueAssignment`.
    - **Doctor**: `QueueListView`, `PatientDetailsViewer`, `ConsultationFeedbackForm`.
    - **Admin**: `AnalyticsDashboard`, `UserManagement`, `QueueConfigurator`.
  - Integrate API calls, handle loading and error states.
  - Implement offline caching with IndexedDB for receptionist panel.
  - Add real-time updates (polling or WebSockets optional).
  - Write unit tests with Jest and E2E smoke tests.

---

## 5. Mobile App Layer (React Native)

- **Technology**: React Native, TypeScript/JavaScript, React Navigation, AsyncStorage/SQLite, Firebase Cloud Messaging
- **Tasks**:
  - Scaffold React Native app with navigation structure.
  - Implement screens:
    - **RegistrationScreen**: form in Swahili, validation.
    - **QueueStatusScreen**: real-time position, estimated wait.
    - **NotificationCenter**: list of push/SMS alerts.
    - **HelpOverlay**: pop-up tutorials and tooltips.
    - **Settings**: language selector, logout.
  - Integrate offline cache (SQLite or AsyncStorage) for queue data.
  - Configure Firebase Cloud Messaging for push notifications.
  - Secure token storage using encrypted storage.
  - Disable screenshot capture on sensitive screens.
  - Write Detox E2E tests and local unit tests.

---

## 6. Notifications Layer

- **Technology**: Twilio SMS API, Firebase Cloud Messaging, Celery + Redis
- **Tasks**:
  - Provision and configure Twilio and Firebase credentials.
  - Build service wrappers for SMS and push.
  - Connect notification triggers to Celery tasks with retry and backoff.
  - Log all message events to `Notifications` table.

---

## 7. Security & Authentication Layer

- **Technology**: OAuth2 (FastAPI), JWT, HTTPS/TLS, SlowAPI rate limiting
- **Tasks**:
  - Implement JWT issuance, refresh, and revocation logic.
  - Enforce role-based access with dependency injection.
  - Configure CORS and HSTS headers.
  - Apply rate limits on sensitive endpoints (login, registration).
  - Validate all inputs with Pydantic and sanitize outputs.

---

## 8. Offline Sync & Caching Layer

- **Tasks**:
  - Define sync endpoints for mobile/web to pull/push changes.
  - Implement background-sync on mobile (`react-native-background-fetch`).
  - Handle merge conflicts and retries.
  - Store pending actions locally and reconcile when online.

---

## 9. DevOps & Infrastructure

- **Technology**: Docker, Docker Compose, GitHub Actions, Render/DigitalOcean/Railway
- **Tasks**:
  - Create Dockerfiles for backend, web, and mobile build pipelines.
  - Define `docker-compose.yml` for local development (FastAPI, PostgreSQL, Redis, Celery).
  - Implement CI pipeline:
    - Linting (flake8, ESLint), testing, build artifacts.
    - Deploy to staging and production environments.
  - Configure hosting:
    - Backend behind NGINX or built-in LB.
    - Static assets served via CDN.
    - Setup environment variables and secrets management.

---

## 10. Monitoring & Logging

- **Technology**: Sentry, Prometheus + Grafana, pg_stat_statements
- **Tasks**:
  - Integrate Sentry SDK into backend and frontend.
  - Expose Prometheus metrics in FastAPI.
  - Configure Grafana dashboards for API latency, queue length, error rates.
  - Enable database slow query logging and monitor with PgHero or custom dashboards.

---

## 11. Testing & QA

- **Tasks**:
  - Write unit tests for all business logic (pytest, Jest).
  - Develop integration tests for API endpoints.
  - Create Postman collection for manual testing and documentation.
  - Implement E2E tests:
    - Mobile (Detox).
    - Web dashboards (Cypress).

---

## 12. Deployment & Environment Management

- **Tasks**:

  - Define staging and production environments with separate DB instances.
  - Manage secrets via Render secrets or Docker secrets.
  - Automate database migrations in CI/CD workflow.
  - Document environment variables and setup steps in `README.md`.

  1. Complete doctor dashboard API implementation
  2. Implement remaining notification endpoints
  3. Finalize Docker containerization
  4. Implement frontend components for all dashboards
  5. Complete testing and deployment
  6. Implement offline sync capabilities

---

*End of Implementation Plan*
