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

    // 1. Create Enums
    await pool.query(`
      DO $$ BEGIN
        CREATE TYPE user_role AS ENUM ('user', 'coach', 'admin');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;

      DO $$ BEGIN
        CREATE TYPE repeat_type AS ENUM ('daily', 'weekdays', 'weekend', 'one_time');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // 2. Create Users Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role user_role DEFAULT 'user' NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
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
        timezone VARCHAR(50) DEFAULT 'UTC' NOT NULL,
        productivity_goal TEXT DEFAULT 'Maintain peak morning focus' NOT NULL,
        difficulty_preference VARCHAR(20) DEFAULT 'Moderate' NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);

    // 4. Create Habits Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS habits (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        habit_name VARCHAR(150) NOT NULL,
        target_days INTEGER DEFAULT 7 NOT NULL,
        current_streak INTEGER DEFAULT 0 NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);

    // 5. Create Alarms Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS alarms (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        alarm_title VARCHAR(150) NOT NULL,
        alarm_time VARCHAR(20) NOT NULL,
        repeat_type repeat_type DEFAULT 'daily' NOT NULL,
        sound VARCHAR(50) DEFAULT 'Gentle Chime' NOT NULL,
        vibration BOOLEAN DEFAULT TRUE NOT NULL,
        active_status BOOLEAN DEFAULT TRUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
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
          timezone: 'UTC',
          productivityGoal: 'Maintain peak morning focus',
          difficultyPreference: 'Moderate',
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
