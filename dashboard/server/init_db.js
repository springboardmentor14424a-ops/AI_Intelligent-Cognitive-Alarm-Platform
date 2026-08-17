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
  console.log('🔌 Connecting to PostgreSQL database account...');
  try {
    const schemaPath = path.join(__dirname, 'schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('⚡ Executing schema.sql to create users table with BCrypt encrypted password column...');
    await pool.query(sql);
    
    console.log('✅ SUCCESS: `users` table created in your PostgreSQL database!');
    
    const res = await pool.query('SELECT count(*) FROM users;');
    console.log(`📊 Current registered users in PostgreSQL: ${res.rows[0].count}`);
  } catch (err) {
    console.error('❌ Error initializing PostgreSQL database:', err.message);
  } finally {
    await pool.end();
  }
}

initializeDatabase();
