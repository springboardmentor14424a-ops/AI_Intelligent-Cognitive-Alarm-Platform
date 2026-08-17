import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: process.env.PGPORT
});

async function migrate() {
  try {
    // 1. Create coach_assignments table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS coach_assignments (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        coach_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id)
      )
    `);
    console.log('✅ coach_assignments table created (or already exists)');

    // 2. Fetch all coaches and users from DB
    const coachRes = await pool.query(`SELECT id, name FROM users WHERE LOWER(role) IN ('wellness coach', 'coach') ORDER BY id`);
    const userRes = await pool.query(`SELECT id, name FROM users WHERE LOWER(role) IN ('user') ORDER BY id`);

    const coaches = coachRes.rows;
    const users = userRes.rows;

    if (coaches.length === 0) {
      console.log('⚠️  No coaches found in database. Register a coach first.');
      return;
    }

    console.log(`\n📋 Found ${coaches.length} coach(es): ${coaches.map(c => c.name).join(', ')}`);
    console.log(`👤 Found ${users.length} user(s) to assign\n`);

    // 3. Randomly assign each unassigned user to a coach
    let assigned = 0;
    for (const user of users) {
      const randomCoach = coaches[Math.floor(Math.random() * coaches.length)];
      try {
        await pool.query(
          `INSERT INTO coach_assignments (user_id, coach_id) VALUES ($1, $2) ON CONFLICT (user_id) DO NOTHING`,
          [user.id, randomCoach.id]
        );
        console.log(`   ✅ Assigned "${user.name}" → Coach "${randomCoach.name}"`);
        assigned++;
      } catch (err) {
        console.log(`   ⚠️  Skipped "${user.name}" (already assigned)`);
      }
    }

    console.log(`\n🎉 Migration complete! ${assigned} user(s) randomly assigned to coaches.`);
  } catch (err) {
    console.error('❌ Migration error:', err.message);
  } finally {
    await pool.end();
  }
}

migrate();
