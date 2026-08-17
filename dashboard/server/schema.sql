-- PostgreSQL Users, Coach Assignments & Alarms Table Schema
-- File: server/schema.sql

-- Drop table check constraint if exists to allow flexible role names
ALTER TABLE IF EXISTS users DROP CONSTRAINT IF EXISTS users_role_check;

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL, -- BCrypt Encrypted Password Hash
    role VARCHAR(50) NOT NULL DEFAULT 'User', -- 'User' / 'Wellness Coach' / 'Administrator'
    provider VARCHAR(50) NOT NULL DEFAULT 'LOCAL', -- 'LOCAL' or 'GOOGLE'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Coach Assignments Table
CREATE TABLE IF NOT EXISTS coach_assignments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    coach_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- Module 3: Alarms Table Schema
CREATE TABLE IF NOT EXISTS alarms (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(100) NOT NULL,
    alarm_time VARCHAR(10) NOT NULL, -- Format: "06:30 AM" or "06:30"
    alarm_type VARCHAR(50) NOT NULL DEFAULT 'One-Time', -- Daily, Weekday, Weekend, One-Time, Smart Adaptive
    repeat_days VARCHAR(100) DEFAULT '', -- "Mon,Tue,Wed,Thu,Fri"
    is_active BOOLEAN DEFAULT TRUE,
    difficulty_level VARCHAR(50) DEFAULT 'Medium', -- Easy, Medium, Hard, Expert
    sound VARCHAR(100) DEFAULT 'REM Sync',
    vibration BOOLEAN DEFAULT TRUE,
    snooze_interval INTEGER DEFAULT 5, -- Snooze interval in minutes
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_alarms_user_id ON alarms(user_id);
CREATE INDEX IF NOT EXISTS idx_alarms_is_active ON alarms(is_active);

-- Module 3: Alarm Sessions Table (records each alarm ring event with Gemini AI challenge data)
CREATE TABLE IF NOT EXISTS alarm_sessions (
    id SERIAL PRIMARY KEY,
    alarm_id INTEGER REFERENCES alarms(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,


    snooze_count     INTEGER DEFAULT 0,
    status           VARCHAR(30) DEFAULT 'Pending',   -- Pending, Dismissed, Snoozed, Missed

    question         TEXT,
    correct_answer   VARCHAR(255),
    user_answer      VARCHAR(255),
    challenge_theme  VARCHAR(100) DEFAULT 'Math Challenge',
    difficulty       VARCHAR(50) DEFAULT 'Medium',
    challenge_solved BOOLEAN DEFAULT FALSE,
    completion_time  INTEGER,                         -- seconds taken to solve challenge

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_alarm_sessions_user_id ON alarm_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_alarm_sessions_alarm_id ON alarm_sessions(alarm_id);

-- Insert Default Seed Accounts
INSERT INTO users (name, email, password, role, provider)
VALUES 
  ('John Doe', 'user@cogniwell.com', '$2a$10$eE61K7l04lY8N7gQhFkUue4A3y5xJ5tJ2P1L6Q4M9N8B7V6C5Z4X3', 'User', 'LOCAL'),
  ('Dr. Sarah Wilson', 'coach@cogniwell.com', '$2a$10$eE61K7l04lY8N7gQhFkUue4A3y5xJ5tJ2P1L6Q4M9N8B7V6C5Z4X3', 'Wellness Coach', 'LOCAL'),
  ('Admin User', 'admin@cogniwell.com', '$2a$10$eE61K7l04lY8N7gQhFkUue4A3y5xJ5tJ2P1L6Q4M9N8B7V6C5Z4X3', 'Administrator', 'LOCAL')
ON CONFLICT (email) DO NOTHING;
