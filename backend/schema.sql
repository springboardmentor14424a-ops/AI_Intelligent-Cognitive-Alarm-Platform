-- Database: ai_alarm_db
-- CREATE DATABASE ai_alarm_db;
-- \c ai_alarm_db;

-- Step 1: Create Users Table as per Screenshot Specification
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'USER',
    provider VARCHAR(50) NOT NULL DEFAULT 'LOCAL',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index on email for fast lookup
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Insert Sample User (matching screenshot request example)
-- Note: Password 'Password@123' should be hashed via BCrypt in production
INSERT INTO users (name, email, password, role, provider)
VALUES (
    'John', 
    'john@gmail.com', 
    '$2b$12$eImiTXuWVxfM37uY4JANjO5y/1Y8W2Z8FhZf5XhLgQ/9m4jK9P5qO', -- BCrypt hash of 'Password@123'
    'USER', 
    'LOCAL'
)
ON CONFLICT (email) DO NOTHING;
