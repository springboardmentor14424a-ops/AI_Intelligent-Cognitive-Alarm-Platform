-- Run this once in pgAdmin or psql after creating the brainos database.
-- `backend/main.py` also creates these tables on application startup.

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255),
  role VARCHAR(30) NOT NULL DEFAULT 'USER',
  provider VARCHAR(30) NOT NULL DEFAULT 'LOCAL',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_profiles (
  profile_id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  timezone VARCHAR(64) NOT NULL DEFAULT 'UTC',
  preferred_wake_time TIME,
  target_sleep_duration_minutes INTEGER CHECK (target_sleep_duration_minutes BETWEEN 60 AND 960) DEFAULT 480,
  productivity_goal VARCHAR(255),
  difficulty_preference VARCHAR(30) NOT NULL DEFAULT 'MEDIUM',
  habit_preferences JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS alarms (
  alarm_id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(120) NOT NULL DEFAULT 'Wake mission',
  alarm_time TIME NOT NULL,
  alarm_type VARCHAR(30) NOT NULL DEFAULT 'DAILY',
  repeat_days VARCHAR(50),
  difficulty VARCHAR(30) NOT NULL DEFAULT 'MEDIUM',
  sound VARCHAR(80) NOT NULL DEFAULT 'Neural Dawn',
  vibration BOOLEAN NOT NULL DEFAULT TRUE,
  snooze_minutes INTEGER NOT NULL DEFAULT 5 CHECK (snooze_minutes BETWEEN 0 AND 30),
  status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
  daybreak_route_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  wake_window_minutes INTEGER NOT NULL DEFAULT 15 CHECK (wake_window_minutes BETWEEN 0 AND 60),
  last_fired_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS missions (
  mission_id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  challenge_type VARCHAR(40) NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  reward INTEGER NOT NULL DEFAULT 180,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS challenge_attempts (
  challenge_id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  challenge_type VARCHAR(40) NOT NULL,
  difficulty VARCHAR(30) NOT NULL,
  intent VARCHAR(60) NOT NULL,
  prompt TEXT NOT NULL,
  expected_answer VARCHAR(255) NOT NULL,
  submitted_answer VARCHAR(255),
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  is_correct BOOLEAN,
  elapsed_seconds DOUBLE PRECISION,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_challenge_attempts_user_created ON challenge_attempts(user_id, created_at DESC);
