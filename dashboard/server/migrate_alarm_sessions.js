import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({
  user: process.env.PGUSER || 'postgres',
  host: process.env.PGHOST || 'localhost',
  database: process.env.PGDATABASE || 'cogniwell_db',
  password: process.env.PGPASSWORD || 'postgres',
  port: process.env.PGPORT || 5432
});

async function migrate() {
  console.log('🔧 Running alarm_sessions migration...\n');

  // 1. Create alarm_sessions table with all requested fields
  await pool.query(`
    CREATE TABLE IF NOT EXISTS alarm_sessions (
      id SERIAL PRIMARY KEY,
      alarm_id INTEGER REFERENCES alarms(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

      snooze_count     INTEGER DEFAULT 0,
      status           VARCHAR(30) DEFAULT 'Pending',  -- Pending, Dismissed, Snoozed, Missed

      question         TEXT,
      correct_answer   VARCHAR(255),
      user_answer      VARCHAR(255),
      challenge_theme  VARCHAR(100) DEFAULT 'Math Challenge',
      difficulty       VARCHAR(50) DEFAULT 'Medium',
      challenge_solved BOOLEAN DEFAULT FALSE,
      completion_time  INTEGER,   -- seconds taken to solve challenge

      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);
  console.log('✅ Created alarm_sessions table with all fields.');

  // 2. Add challenge_theme column to alarms table if missing
  const cols = await pool.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'alarms' AND table_schema = 'public'
  `);
  const colNames = cols.rows.map(r => r.column_name);

  if (!colNames.includes('challenge_theme')) {
    await pool.query(`ALTER TABLE alarms ADD COLUMN challenge_theme VARCHAR(100) DEFAULT 'Math Challenge'`);
    console.log('✅ Added challenge_theme column to alarms table.');
  }

  // 3. Show current alarm_sessions table structure
  const struct = await pool.query(`
    SELECT column_name, data_type, column_default
    FROM information_schema.columns
    WHERE table_name = 'alarm_sessions' AND table_schema = 'public'
    ORDER BY ordinal_position
  `);
  console.log('\n📋 alarm_sessions table columns:');
  struct.rows.forEach(r => console.log(`  ├── ${r.column_name} (${r.data_type})`));

  const count = await pool.query('SELECT COUNT(*) FROM alarm_sessions');
  console.log(`\n🎉 Total alarm_sessions in PostgreSQL: ${count.rows[0].count}`);
  await pool.end();
}

migrate().catch(err => { console.error('Migration error:', err.message); pool.end(); });
