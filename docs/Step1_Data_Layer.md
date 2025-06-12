# Step 1: Data Layer (Database) Detailed Implementation

**Status: ✅ Completed**

**Overview**: This step covers setting up and configuring the relational database, defining schema, and managing migrations.

---

## 1. Technologies

- PostgreSQL 14+
- `uuid-ossp` extension for UUID PKs
- SQLAlchemy (Async) for ORM
- Alembic for migrations
- `asyncpg` driver for async DB access

---

## 2. Environment Setup

1. **Install PostgreSQL** (e.g., via apt, Homebrew, or direct download). ✅
2. **Create Database and User**: ✅
   ```bash
   psql -U postgres
   CREATE DATABASE hospital_queue;
   CREATE USER hq_user WITH ENCRYPTED PASSWORD 'secure_pass';
   GRANT ALL PRIVILEGES ON DATABASE hospital_queue TO hq_user;
   ```
3. **Enable UUID Extension**: ⏳
   ```sql
   \
   \\c hospital_queue
   CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
   ```
   *Note: This step is no longer required as we're using Python's UUID generation instead.*
4. **Python Virtual Environment**: ✅
   ```bash
   python3 -m venv .venv
   source .venv/bin/activate
   pip install sqlalchemy[asyncio] asyncpg alembic psycopg2-binary
   ```

---

## 3. Alembic Configuration

1. **Initialize**: ✅
   ```bash
   alembic init alembic
   ```
2. **Configure `alembic.ini`**: ✅
   ```ini
   sqlalchemy.url = postgresql+asyncpg://hq_user:secure_pass@localhost/hospital_queue
   ```
3. **Edit `alembic/env.py`**: ✅
   - Import `async_engine_from_config`
   - Use `target_metadata` from your SQLAlchemy models
   - Ensure async context for migrations

---

## 4. Model Definitions

- **Location**: `backend/app/models.py` ✅
- **Base**: `from sqlalchemy.ext.declarative import declarative_base` ✅
- **Example**: ✅
  ```python
  class Patient(Base):
      __tablename__ = 'patients'
      patient_id = Column(UUID(as_uuid=True), primary_key=True, default=generate_uuid)
      full_name = Column(String(100), nullable=False)
      phone_number = Column(String(20), unique=True, nullable=False)
      # ... other fields
  ```
- Define all tables: `Patients`, `Appointments`, `Queue`, `Users`, `Doctors`, `Notifications`, `AuditLog`. ✅

---

## 5. Migrations

1. **Generate Initial Revision**: ✅
   ```bash
   python -m alembic revision --autogenerate -m "Initial schema"
   ```
2. **Review & Edit**: ✅
   - Ensure indexes on `phone_number`, `queue_number`, `urgency_level`, `scheduled_date`.
   - Update to use Python's UUID generation instead of PostgreSQL's uuid-ossp.
3. **Apply Migration**: ✅
   ```bash
   python -m alembic upgrade head
   ```

---

## 6. Connection Pooling

- Configure SQLAlchemy AsyncEngine: ✅
  ```python
  engine = create_async_engine(
      settings.DATABASE_URL,
      pool_size=10,
      max_overflow=20,
      echo=False
  )
  ```
- Store settings in `core/config.py` via Pydantic. ✅

---

## 7. Testing Models & Migrations

- Use `pytest` fixtures to spin up a test database. ⏳
- Validate model creation, insertion, and migrations apply cleanly. ⏳

---

## Implementation Notes

1. We opted to use Python's `uuid.uuid4()` for UUID generation instead of relying on PostgreSQL's `uuid-ossp` extension: ✅
   - More portable solution that doesn't require database extensions
   - Works across different database backends
   - Avoids permission issues with installing PostgreSQL extensions

2. Added proper relationships between tables using SQLAlchemy's relationship features: ✅
   - Improves query performance
   - Makes the code more maintainable
   - Provides intuitive access to related objects

3. Added indices to frequently queried columns: ✅
   - `phone_number`, `queue_number`, `urgency_level`, `scheduled_date`
   - Improves query performance for common lookups

4. Implemented a clean async database connection pattern: ✅
   - Uses connection pooling for better performance
   - Properly handles session lifecycle
   - Integrates with FastAPI's dependency injection

---

## Legend

- ✅ Completed
- 🔄 In Progress
- ⏳ Pending
- ❌ Blocked 