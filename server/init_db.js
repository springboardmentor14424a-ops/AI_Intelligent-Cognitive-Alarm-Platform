import pg from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pool = new pg.Pool({
  user: process.env.PGUSER || 'postgres',
  host: process.env.PGHOST || 'localhost',
  database: process.env.PGDATABASE || 'cogniwell_db',
  password: process.env.PGPASSWORD || 'postgres',
  port: process.env.PGPORT || 5432,
});

async function initializeDatabase() {
  console.log('🔌 Connecting to your PostgreSQL database account...');
  try {
    const schemaPath = path.join(__dirname, 'schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('⚡ Executing schema.sql to create users table...');
    await pool.query(sql);
    
    console.log('✅ SUCCESS: `users` table and indexes created in your PostgreSQL database!');
    
    const res = await pool.query('SELECT count(*) FROM users;');
    console.log(`📊 Current user count in PostgreSQL database: ${res.rows[0].count}`);
  } catch (err) {
    console.error('❌ Error initializing PostgreSQL database:', err.message);
    console.log('💡 Tip: Make sure your PostgreSQL server is running and check your credentials in .env file.');
  } finally {
    await pool.end();
  }
}

initializeDatabase();
