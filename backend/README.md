# Hospital Queue System Backend

This is the backend API for the hospital queue management system.

## Prerequisites

- Python 3.11+
- PostgreSQL 14+
- Redis (for Celery)

## Database Setup

1. Install PostgreSQL if not already installed.
2. Connect to PostgreSQL as the postgres user:
   ```bash
   psql -U postgres
   ```
3. Execute the following SQL commands to create the database and user:
   ```sql
   -- Create database
   CREATE DATABASE hospital_queue;

   -- Create user with password
   CREATE USER hq_user WITH ENCRYPTED PASSWORD 'secure_pass';

   -- Grant privileges to the user
   GRANT ALL PRIVILEGES ON DATABASE hospital_queue TO hq_user;

   -- Connect to the new database
   \c hospital_queue

   -- Grant schema permissions to the user
   GRANT ALL ON SCHEMA public TO hq_user;
   ```

## Environment Setup

1. Create a virtual environment:
   ```bash
   python -m venv .venv
   ```

2. Activate the virtual environment:
   - Windows: `.venv\Scripts\activate`
   - Linux/Mac: `source .venv/bin/activate`

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Create a `.env` file in the backend directory with the following content:
   ```
   # Database settings
   DATABASE_URL=postgresql+asyncpg://postgres:your_password@localhost/hospital_queue

   # JWT Authentication
   JWT_SECRET_KEY=your_secure_secret_key
   ACCESS_TOKEN_EXPIRE_MINUTES=60

   # Celery settings
   CELERY_BROKER_URL=redis://localhost:6379/0
   CELERY_RESULT_BACKEND=redis://localhost:6379/1

   # Twilio for SMS
   TWILIO_ACCOUNT_SID=your_twilio_sid
   TWILIO_AUTH_TOKEN=your_twilio_token
   TWILIO_PHONE_NUMBER=+1234567890

   # Monitoring
   SENTRY_DSN=

   # CORS
   ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001,http://localhost:3002,http://localhost:3003
   ```

## Database Migrations

1. Generate a migration:
   ```bash
   python -m alembic revision --autogenerate -m "Initial schema"
   ```

2. Apply migrations:
   ```bash
   python -m alembic upgrade head
   ```

## Running the Application

1. Start the API server:
   ```bash
   uvicorn app.main:app --reload
   ```

2. In a separate terminal, start Celery for background tasks:
   ```bash
   celery -A app.workers.celery_app worker --loglevel=info
   ```

3. Access the API documentation at `http://localhost:8000/docs`

## Testing

Run tests with pytest:
```bash
pytest
```

Generate coverage report:
```bash
coverage run -m pytest
coverage report
coverage html  # for HTML report
``` 