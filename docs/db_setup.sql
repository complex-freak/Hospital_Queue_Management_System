-- Connect to PostgreSQL as postgres user
-- psql -U postgres

-- Create database
CREATE DATABASE hospital_queue;

-- Create user with password
CREATE USER hq_user WITH ENCRYPTED PASSWORD 'secure_pass';

-- Grant privileges to the user
GRANT ALL PRIVILEGES ON DATABASE hospital_queue TO hq_user;

-- Connect to the new database
\c hospital_queue

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Grant schema permissions to the user
GRANT ALL ON SCHEMA public TO hq_user; 