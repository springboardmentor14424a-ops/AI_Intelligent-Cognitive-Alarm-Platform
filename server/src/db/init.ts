import { pool, db, checkDatabaseConnection } from './index.js';
import { users } from './schema/users.js';
import { profiles } from './schema/profiles.js';
import { hashPassword } from '../utils/password.js';
import { eq } from 'drizzle-orm';

export const initializeDatabase = async (): Promise<boolean> => {
  const isConnected = await checkDatabaseConnection();
  if (!isConnected) {
    console.log('===========================================================');
    console.log('⚠️ PostgreSQL database is NOT connected or unavailable.');
    console.log('🔄 Switched automatically to DEVELOPMENT FALLBACK MODE (Dummy Authentication).');
    console.log('===========================================================');
    return false;
  }

  try {
    console.log('📦 PostgreSQL Connected! Initializing schema tables...');

    // 0. Enable pgcrypto extension for gen_random_uuid()
    await pool.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);

    // 1. Create Enums & Alter repeat_type if exists
    await pool.query(`
      DO $$ BEGIN
        CREATE TYPE user_role AS ENUM ('user', 'coach', 'admin');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;

      DO $$ BEGIN
        CREATE TYPE repeat_type AS ENUM ('daily', 'weekdays', 'weekend', 'one_time', 'smart_adaptive');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;

      ALTER TYPE repeat_type ADD VALUE IF NOT EXISTS 'smart_adaptive';
    `);

    // 2. Create Users Table & Ensure Nullable password_hash for OAuth
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash TEXT,
        role user_role DEFAULT 'user' NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
      ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
    `);

    // 3. Create Profiles Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS profiles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        full_name VARCHAR(100) NOT NULL,
        email VARCHAR(255) NOT NULL,
        wake_up_time VARCHAR(20) DEFAULT '07:00 AM' NOT NULL,
        sleep_time VARCHAR(20) DEFAULT '11:00 PM' NOT NULL,
        sleep_duration VARCHAR(50) DEFAULT '8 Hours' NOT NULL,
        timezone VARCHAR(50) DEFAULT 'UTC' NOT NULL,
        productivity_goal TEXT DEFAULT 'Maintain peak morning focus' NOT NULL,
        difficulty_preference VARCHAR(20) DEFAULT 'Moderate' NOT NULL,
        habit_preferences TEXT DEFAULT 'Morning Hydration, Digital Sunset' NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
      ALTER TABLE profiles ADD COLUMN IF NOT EXISTS sleep_duration VARCHAR(50) DEFAULT '8 Hours' NOT NULL;
      ALTER TABLE profiles ADD COLUMN IF NOT EXISTS habit_preferences TEXT DEFAULT 'Morning Hydration, Digital Sunset' NOT NULL;
    `);

    // 4. Create Habits Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS habits (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        habit_name VARCHAR(150) NOT NULL,
        target_days INTEGER DEFAULT 7 NOT NULL,
        current_streak INTEGER DEFAULT 0 NOT NULL,
        is_enabled BOOLEAN DEFAULT TRUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
      ALTER TABLE habits ADD COLUMN IF NOT EXISTS is_enabled BOOLEAN DEFAULT TRUE NOT NULL;
    `);

    // 5. Create Alarms Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS alarms (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        alarm_title VARCHAR(150) NOT NULL,
        alarm_time VARCHAR(20) NOT NULL,
        repeat_type repeat_type DEFAULT 'daily' NOT NULL,
        repeat_days TEXT DEFAULT '[]' NOT NULL,
        difficulty_level VARCHAR(20) DEFAULT 'Moderate' NOT NULL,
        sound VARCHAR(50) DEFAULT 'Gentle Chime' NOT NULL,
        vibration BOOLEAN DEFAULT TRUE NOT NULL,
        snooze INTEGER DEFAULT 5 NOT NULL,
        active_status BOOLEAN DEFAULT TRUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
      ALTER TABLE alarms ADD COLUMN IF NOT EXISTS repeat_days TEXT DEFAULT '[]' NOT NULL;
      ALTER TABLE alarms ADD COLUMN IF NOT EXISTS difficulty_level VARCHAR(20) DEFAULT 'Moderate' NOT NULL;
      ALTER TABLE alarms ADD COLUMN IF NOT EXISTS snooze INTEGER DEFAULT 5 NOT NULL;
    `);

    // 6. Create Challenges Table
    await pool.query(`
      DO $$ BEGIN
        CREATE TYPE challenge_type AS ENUM ('math', 'logic', 'memory', 'word', 'pattern', 'riddle', 'quiz');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;

      DO $$ BEGIN
        CREATE TYPE challenge_difficulty AS ENUM ('beginner', 'easy', 'medium', 'hard', 'expert');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;

      CREATE TABLE IF NOT EXISTS challenges (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        challenge_type challenge_type NOT NULL,
        difficulty challenge_difficulty DEFAULT 'medium' NOT NULL,
        question TEXT NOT NULL,
        options TEXT,
        correct_answer TEXT NOT NULL,
        explanation TEXT DEFAULT '' NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);

    // 7. Create Challenge Attempts Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS challenge_attempts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        challenge_id UUID REFERENCES challenges(id) ON DELETE SET NULL,
        answer TEXT NOT NULL,
        is_correct BOOLEAN NOT NULL,
        time_taken INTEGER DEFAULT 0 NOT NULL,
        difficulty VARCHAR(20) DEFAULT 'medium' NOT NULL,
        challenge_type VARCHAR(50) DEFAULT 'math' NOT NULL,
        completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);

    // 8. Create Wake-Up Verifications Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS wake_up_verifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        alarm_id UUID REFERENCES alarms(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        verification_started TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        verification_completed TIMESTAMP,
        attempts INTEGER DEFAULT 0 NOT NULL,
        correct_answers INTEGER DEFAULT 0 NOT NULL,
        wake_up_verified BOOLEAN DEFAULT FALSE NOT NULL,
        verification_method VARCHAR(50) DEFAULT 'puzzle_completion' NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);

    // 9. Create Snooze Logs Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS snooze_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        alarm_id UUID REFERENCES alarms(id) ON DELETE CASCADE,
        snooze_count INTEGER DEFAULT 1 NOT NULL,
        snooze_duration_minutes INTEGER DEFAULT 5 NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);

    // 10. Create Sleep Logs Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sleep_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        sleep_time VARCHAR(20) NOT NULL,
        wake_up_time VARCHAR(20) NOT NULL,
        sleep_duration_hours NUMERIC(4,2) DEFAULT 8.00 NOT NULL,
        sleep_quality_rating INTEGER DEFAULT 8 NOT NULL,
        logged_date VARCHAR(20) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);

    // 11. Create Notifications Table
    await pool.query(`
      DO $$ BEGIN
        CREATE TYPE notification_type AS ENUM ('bedtime', 'wakeup', 'habit', 'challenge', 'coaching', 'system');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;

      CREATE TABLE IF NOT EXISTS notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type notification_type DEFAULT 'system' NOT NULL,
        title VARCHAR(200) NOT NULL,
        message TEXT NOT NULL,
        is_read BOOLEAN DEFAULT FALSE NOT NULL,
        scheduled_for TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);

    // 12. Create Recommendations Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS recommendations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        category VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        reason TEXT NOT NULL,
        priority VARCHAR(20) DEFAULT 'medium' NOT NULL,
        actionable_step TEXT DEFAULT '' NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);

    // 13. Create Habit Scores Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS habit_scores (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        overall_score INTEGER NOT NULL,
        wake_up_consistency INTEGER NOT NULL,
        challenge_completion INTEGER NOT NULL,
        snooze_reduction INTEGER NOT NULL,
        sleep_adherence INTEGER NOT NULL,
        score_category VARCHAR(50) NOT NULL,
        summary_message TEXT DEFAULT '' NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);

    console.log('✅ PostgreSQL Schema Tables initialized successfully!');

    // 6. Seed Development Accounts into PostgreSQL Database if not present
    const devAccounts = [
      { name: 'Admin User', email: 'admin@example.com', password: 'Admin@123', role: 'admin' as const },
      { name: 'Coach User', email: 'coach@example.com', password: 'Coach@123', role: 'coach' as const },
      { name: 'Standard User', email: 'user@example.com', password: 'User@123', role: 'user' as const },
      { name: 'Demo Admin', email: 'admin@cognitivealarm.com', password: 'Admin@123', role: 'admin' as const },
      { name: 'Demo Coach', email: 'coach@cognitivealarm.com', password: 'Coach@123', role: 'coach' as const },
      { name: 'Demo User', email: 'user@cognitivealarm.com', password: 'User@123', role: 'user' as const },
    ];

    for (const dev of devAccounts) {
      const existing = await db.select().from(users).where(eq(users.email, dev.email.toLowerCase()));
      if (existing.length === 0) {
        const passwordHash = await hashPassword(dev.password);
        const [newUser] = await db
          .insert(users)
          .values({
            name: dev.name,
            email: dev.email.toLowerCase(),
            passwordHash,
            role: dev.role,
          })
          .returning();

        await db.insert(profiles).values({
          userId: newUser.id,
          fullName: dev.name,
          email: dev.email.toLowerCase(),
          wakeUpTime: '07:00 AM',
          sleepTime: '11:00 PM',
          sleepDuration: '8 Hours',
          timezone: 'UTC',
          productivityGoal: 'Maintain peak morning focus',
          difficultyPreference: 'Moderate',
          habitPreferences: 'Morning Hydration, Digital Sunset',
        });
      }
    }

    console.log('🌱 Development Seed accounts verified in PostgreSQL!');
    return true;
  } catch (err: any) {
    console.warn('⚠️ Error during PostgreSQL initialization:', err?.message || err);
    return false;
  }
};
