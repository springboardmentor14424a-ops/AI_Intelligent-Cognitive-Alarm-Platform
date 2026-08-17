import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new pg.Pool({
  user: process.env.PGUSER || 'postgres',
  host: process.env.PGHOST || 'localhost',
  database: process.env.PGDATABASE || 'cogniwell_db',
  password: process.env.PGPASSWORD || 'postgres',
  port: process.env.PGPORT || 5432,
  connectionTimeoutMillis: 2000
});

async function viewUsersInTerminal() {
  console.log('\n===============================================================');
  console.log('🗄️  POSTGRESQL DATABASE: `users` TABLE (ENCRYPTED PASSWORDS)');
  console.log('===============================================================\n');

  try {
    const res = await pool.query(
      'SELECT id, name, email, password, role, provider, created_at FROM users ORDER BY id ASC'
    );

    if (res.rows.length === 0) {
      console.log('No user records found in PostgreSQL database.');
    } else {
      console.table(res.rows);
    }
  } catch (err) {
    console.error('❌ Could not query PostgreSQL database:', err.message);
  } finally {
    await pool.end();
    console.log('===============================================================\n');
  }
}

viewUsersInTerminal();
