-- Normalized PostgreSQL Schema for AI Intelligent Cognitive Alarm Platform

-- Users Table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(100),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(20),
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(30) DEFAULT 'user', -- administrator, coach, user
    provider VARCHAR(20) DEFAULT 'local', -- local, google
    profile_image VARCHAR(255),
    gender VARCHAR(20),
    date_of_birth DATE,
    country VARCHAR(100),
    timezone VARCHAR(50) DEFAULT 'UTC',
    account_status VARCHAR(20) DEFAULT 'active', -- active, suspended, inactive
    email_verified BOOLEAN DEFAULT FALSE,
    last_login TIMESTAMP,
    login_attempts INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User Profiles Table
CREATE TABLE user_profiles (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    wake_up_time VARCHAR(5) DEFAULT '07:00',
    sleep_time VARCHAR(5) DEFAULT '22:30',
    sleep_duration FLOAT DEFAULT 8.0,
    productivity_goal VARCHAR(255) DEFAULT 'Stay Consistent',
    preferred_alarm_sound VARCHAR(50) DEFAULT 'Chimes',
    challenge_preference VARCHAR(50) DEFAULT 'Math Puzzle',
    difficulty_level VARCHAR(20) DEFAULT 'medium',
    notification_enabled BOOLEAN DEFAULT TRUE,
    snooze_limit INTEGER DEFAULT 3,
    streak INTEGER DEFAULT 0,
    habit_score INTEGER DEFAULT 50,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Alarm Table
CREATE TABLE alarms (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    alarm_name VARCHAR(100) DEFAULT 'Alarm',
    alarm_time VARCHAR(5) NOT NULL, -- HH:MM
    repeat_type VARCHAR(20) DEFAULT 'once', -- once, daily, weekdays, weekends
    smart_alarm BOOLEAN DEFAULT FALSE,
    volume FLOAT DEFAULT 0.8,
    vibration BOOLEAN DEFAULT TRUE,
    challenge_required VARCHAR(50) DEFAULT 'None',
    alarm_status BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Notifications Table
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    title VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(30) DEFAULT 'info', -- info, alarm, coach, achievement, system
    read_status BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Activity Logs Table
CREATE TABLE activity_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL, -- Login, Logout, Register, etc.
    details VARCHAR(255),
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Reports Table
CREATE TABLE reports (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    report_type VARCHAR(20) NOT NULL, -- daily, weekly, monthly
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    average_sleep_duration FLOAT DEFAULT 8.0,
    wake_up_consistency FLOAT DEFAULT 100.0,
    challenge_completion_rate FLOAT DEFAULT 100.0,
    alarms_missed INTEGER DEFAULT 0,
    alarms_snoozed INTEGER DEFAULT 0,
    habit_score INTEGER DEFAULT 50,
    recommendation_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Indexes
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_alarms_user ON alarms(user_id);
CREATE INDEX idx_logs_user ON activity_logs(user_id);
CREATE INDEX idx_notifications_user ON notifications(user_id);
