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

-- Step 2: Create Alarms Table matching SQL/DB Specification
CREATE TABLE IF NOT EXISTS alarms (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(100) NOT NULL,
    alarm_time VARCHAR(50) NOT NULL,
    alarm_type VARCHAR(50) NOT NULL DEFAULT 'One-Time',
    repeat_days VARCHAR(100) NOT NULL DEFAULT '',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    challenge VARCHAR(50) NOT NULL DEFAULT 'None',
    difficulty_level VARCHAR(50) NOT NULL DEFAULT 'Medium',
    sound VARCHAR(100) NOT NULL DEFAULT 'Radar',
    vibration VARCHAR(50) NOT NULL DEFAULT 'Standard',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index on user_id for rapid querying
CREATE INDEX IF NOT EXISTS idx_alarms_user_id ON alarms(user_id);

CREATE TABLE IF NOT EXISTS alarm_snooze_events (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    alarm_id INTEGER NOT NULL REFERENCES alarms(id) ON DELETE CASCADE,
    snooze_count INTEGER NOT NULL DEFAULT 1,
    scheduled_for TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_alarm_snooze_events_user ON alarm_snooze_events(user_id);
CREATE INDEX IF NOT EXISTS idx_alarm_snooze_events_alarm ON alarm_snooze_events(alarm_id);

