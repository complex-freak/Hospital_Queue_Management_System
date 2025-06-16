-- Create database if not exists
SELECT 'CREATE DATABASE queue_management'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'queue_management')\gexec

-- Create test database if not exists
SELECT 'CREATE DATABASE queue_management_test'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'queue_management_test')\gexec

-- Connect to the main database
\c queue_management;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create indexes for better performance
-- These will be created by Alembic migrations, but having them here as backup

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create roles and permissions (optional)
-- CREATE ROLE queue_admin;
-- CREATE ROLE queue_staff;
-- CREATE ROLE queue_doctor;
-- CREATE ROLE queue_patient;

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE queue_management TO queue_user;
GRANT ALL PRIVILEGES ON DATABASE queue_management_test TO queue_user;