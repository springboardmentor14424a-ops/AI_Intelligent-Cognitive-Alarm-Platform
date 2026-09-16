-- PostgreSQL Schema matching pgAdmin exact definition
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(30) NOT NULL,
    provider VARCHAR(20) DEFAULT 'LOCAL',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User Profiles Table
CREATE TABLE user_profiles (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    wake_up_time VARCHAR(5) DEFAULT '07:00',
    sleep_time VARCHAR(5) DEFAULT '22:30',
    sleep_duration FLOAT DEFAULT 8.0,
    productivity_goal TEXT,
    streak INTEGER DEFAULT 0,
    habit_score INTEGER DEFAULT 50,
    challenge_preference VARCHAR(50) DEFAULT 'Math Puzzle'
);

-- Alarms Table
CREATE TABLE alarms (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    alarm_name VARCHAR(100) NOT NULL,
    alarm_time VARCHAR(5) NOT NULL,
    repeat_type VARCHAR(20) DEFAULT 'daily',
    alarm_status BOOLEAN DEFAULT TRUE,
    smart_alarm BOOLEAN DEFAULT FALSE,
    challenge_required VARCHAR(50) DEFAULT 'Math Puzzle',
    vibration BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Notifications Table
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(30) DEFAULT 'info',
    read_status BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Activity Logs Table
CREATE TABLE activity_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL,
    details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Reports Table
CREATE TABLE reports (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    report_type VARCHAR(30) NOT NULL,
    file_path VARCHAR(255) NOT NULL,
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
