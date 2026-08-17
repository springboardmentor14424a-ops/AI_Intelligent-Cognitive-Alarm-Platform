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

async function initAlarms() {
  console.log('📦 Initializing PostgreSQL Alarms Table & Database...');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS alarms (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(100) NOT NULL,
        alarm_time VARCHAR(10) NOT NULL,
        alarm_type VARCHAR(50) NOT NULL DEFAULT 'One-Time',
        repeat_days VARCHAR(100) DEFAULT '',
        is_active BOOLEAN DEFAULT TRUE,
        difficulty_level VARCHAR(50) DEFAULT 'Medium',
        sound VARCHAR(100) DEFAULT 'REM Sync',
        vibration BOOLEAN DEFAULT TRUE,
        snooze_interval INTEGER DEFAULT 5,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);
  console.log('✅ Created "alarms" table in PostgreSQL!');

  const totalAlarms = await pool.query('SELECT COUNT(*) FROM alarms');
  console.log(`🎉 Total alarms stored in PostgreSQL: ${totalAlarms.rows[0].count}`);

  await pool.end();
}

initAlarms().catch(err => {
  console.error('❌ Error initializing alarms:', err.message);
  pool.end();
});
