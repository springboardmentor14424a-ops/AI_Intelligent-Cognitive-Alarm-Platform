CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255),
  role VARCHAR(30) NOT NULL DEFAULT 'USER'
    CHECK (role IN ('USER', 'WELLNESS_COACH', 'ADMIN')),
  provider VARCHAR(30) NOT NULL DEFAULT 'LOCAL'
    CHECK (provider IN ('LOCAL', 'GOOGLE')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_profiles (
  profile_id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  timezone VARCHAR(64) NOT NULL DEFAULT 'UTC',
  preferred_wake_time TIME,
  target_sleep_duration_minutes INTEGER
    CHECK (target_sleep_duration_minutes BETWEEN 60 AND 960)
    DEFAULT 480,
  productivity_goal VARCHAR(255),
  difficulty_preference VARCHAR(30) NOT NULL DEFAULT 'MEDIUM'
    CHECK (difficulty_preference IN ('BEGINNER', 'EASY', 'MEDIUM', 'HARD', 'EXPERT')),
  habit_preferences JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS alarms (
  alarm_id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(120) NOT NULL DEFAULT 'Wake mission',
  alarm_time TIME NOT NULL,
  alarm_type VARCHAR(30) NOT NULL DEFAULT 'DAILY'
    CHECK (alarm_type IN ('DAILY', 'WEEKDAY', 'WEEKEND', 'ONE_TIME', 'SMART_ADAPTIVE')),
  repeat_days VARCHAR(100),
  difficulty VARCHAR(30) NOT NULL DEFAULT 'MEDIUM'
    CHECK (difficulty IN ('BEGINNER', 'EASY', 'MEDIUM', 'HARD', 'EXPERT')),
  sound VARCHAR(80) NOT NULL DEFAULT 'Neural Dawn',
  vibration BOOLEAN NOT NULL DEFAULT TRUE,
  snooze_minutes INTEGER NOT NULL DEFAULT 5
    CHECK (snooze_minutes BETWEEN 0 AND 30),
  status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE'
    CHECK (status IN ('ACTIVE', 'DISABLED', 'RINGING', 'COMPLETED')),
  daybreak_route_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  wake_window_minutes INTEGER NOT NULL DEFAULT 15
    CHECK (wake_window_minutes BETWEEN 0 AND 60),
  challenge_type VARCHAR(30) NOT NULL DEFAULT 'AUTO',
  wake_verification_mode VARCHAR(30) NOT NULL DEFAULT 'SINGLE'
    CHECK (wake_verification_mode IN ('SINGLE', 'MULTI_STEP', 'CONSECUTIVE', 'TIMED', 'ACCURACY')),
  notification_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  last_fired_at TIMESTAMPTZ,
  snoozed_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS missions (
  mission_id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  challenge_type VARCHAR(40) NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  reward INTEGER NOT NULL DEFAULT 180 CHECK (reward BETWEEN 0 AND 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS challenge_attempts (
  challenge_id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  alarm_id INTEGER REFERENCES alarms(alarm_id) ON DELETE SET NULL,
  challenge_type VARCHAR(40) NOT NULL,
  difficulty VARCHAR(30) NOT NULL
    CHECK (difficulty IN ('BEGINNER', 'EASY', 'MEDIUM', 'HARD', 'EXPERT')),
  intent VARCHAR(60) NOT NULL,
  prompt TEXT NOT NULL,
  expected_answer VARCHAR(255) NOT NULL,
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  submitted_answer VARCHAR(255),
  status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
  max_attempts INTEGER NOT NULL DEFAULT 2 CHECK (max_attempts BETWEEN 1 AND 10),
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  failed_attempts INTEGER NOT NULL DEFAULT 0 CHECK (failed_attempts >= 0),
  time_limit_seconds INTEGER NOT NULL DEFAULT 75 CHECK (time_limit_seconds BETWEEN 1 AND 3600),
  expires_at TIMESTAMPTZ,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  is_correct BOOLEAN,
  verification_passed BOOLEAN NOT NULL DEFAULT FALSE,
  elapsed_seconds DOUBLE PRECISION,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS sleep_logs (
  sleep_id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sleep_time TIMESTAMPTZ NOT NULL,
  wake_time TIMESTAMPTZ NOT NULL,
  quality DOUBLE PRECISION NOT NULL CHECK (quality BETWEEN 0 AND 100)
);

CREATE TABLE IF NOT EXISTS analytics (
  analytics_id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  focus_score INTEGER NOT NULL DEFAULT 74 CHECK (focus_score BETWEEN 0 AND 100),
  habit_score INTEGER NOT NULL DEFAULT 68 CHECK (habit_score BETWEEN 0 AND 100),
  sleep_score INTEGER NOT NULL DEFAULT 72 CHECK (sleep_score BETWEEN 0 AND 100),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_alarms_user_status ON alarms(user_id, status);
CREATE INDEX IF NOT EXISTS idx_alarms_user_time ON alarms(user_id, alarm_time);
CREATE INDEX IF NOT EXISTS idx_alarms_snoozed_until ON alarms(snoozed_until);
CREATE INDEX IF NOT EXISTS idx_challenge_attempts_user_created
  ON challenge_attempts(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_challenge_attempts_user_status
  ON challenge_attempts(user_id, status);
CREATE INDEX IF NOT EXISTS idx_challenge_attempts_alarm_id
  ON challenge_attempts(alarm_id);
CREATE INDEX IF NOT EXISTS idx_sleep_logs_user_wake
  ON sleep_logs(user_id, wake_time DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_user_recorded
  ON analytics(user_id, recorded_at DESC);

-- -------------------------------------------------------------------------
-- Additive migration support for databases created by earlier BrainOS builds.
-- -------------------------------------------------------------------------

ALTER TABLE alarms ADD COLUMN IF NOT EXISTS challenge_type VARCHAR(30) DEFAULT 'AUTO';
ALTER TABLE alarms ADD COLUMN IF NOT EXISTS wake_verification_mode VARCHAR(30) DEFAULT 'SINGLE';
ALTER TABLE alarms ADD COLUMN IF NOT EXISTS notification_enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE alarms ADD COLUMN IF NOT EXISTS last_fired_at TIMESTAMPTZ;
ALTER TABLE alarms ADD COLUMN IF NOT EXISTS snoozed_until TIMESTAMPTZ;
ALTER TABLE alarms ADD COLUMN IF NOT EXISTS daybreak_route_enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE alarms ADD COLUMN IF NOT EXISTS wake_window_minutes INTEGER DEFAULT 15;
ALTER TABLE alarms ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE alarms ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE challenge_attempts ADD COLUMN IF NOT EXISTS alarm_id INTEGER;
ALTER TABLE challenge_attempts ADD COLUMN IF NOT EXISTS options JSONB DEFAULT '[]'::jsonb;
ALTER TABLE challenge_attempts ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'ACTIVE';
ALTER TABLE challenge_attempts ADD COLUMN IF NOT EXISTS max_attempts INTEGER DEFAULT 2;
ALTER TABLE challenge_attempts ADD COLUMN IF NOT EXISTS attempt_count INTEGER DEFAULT 0;
ALTER TABLE challenge_attempts ADD COLUMN IF NOT EXISTS failed_attempts INTEGER DEFAULT 0;
ALTER TABLE challenge_attempts ADD COLUMN IF NOT EXISTS time_limit_seconds INTEGER DEFAULT 75;
ALTER TABLE challenge_attempts ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE challenge_attempts ADD COLUMN IF NOT EXISTS verification_passed BOOLEAN DEFAULT FALSE;

-- Reconcile legacy values with the current five-level difficulty model.
UPDATE users SET role = 'USER'
WHERE role IS NULL OR role NOT IN ('USER', 'WELLNESS_COACH', 'ADMIN');

UPDATE user_profiles SET difficulty_preference = 'MEDIUM'
WHERE difficulty_preference IS NULL
   OR difficulty_preference NOT IN ('BEGINNER', 'EASY', 'MEDIUM', 'HARD', 'EXPERT');

UPDATE alarms SET difficulty = 'MEDIUM'
WHERE difficulty IS NULL
   OR difficulty NOT IN ('BEGINNER', 'EASY', 'MEDIUM', 'HARD', 'EXPERT');

UPDATE challenge_attempts SET difficulty = 'MEDIUM'
WHERE difficulty IS NULL
   OR difficulty NOT IN ('BEGINNER', 'EASY', 'MEDIUM', 'HARD', 'EXPERT');

UPDATE alarms SET alarm_type = 'DAILY'
WHERE alarm_type IS NULL
   OR alarm_type NOT IN ('DAILY', 'WEEKDAY', 'WEEKEND', 'ONE_TIME', 'SMART_ADAPTIVE');

UPDATE alarms SET wake_verification_mode = 'SINGLE'
WHERE wake_verification_mode IS NULL
   OR wake_verification_mode NOT IN ('SINGLE', 'MULTI_STEP', 'CONSECUTIVE', 'TIMED', 'ACCURACY');

-- Re-create indexes that depend on additive columns after migrations.
CREATE INDEX IF NOT EXISTS idx_challenge_attempts_alarm_id
  ON challenge_attempts(alarm_id);
