import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { env } from '../config/env.js';
import * as usersSchema from './schema/users.js';
import * as profilesSchema from './schema/profiles.js';
import * as habitsSchema from './schema/habits.js';
import * as alarmsSchema from './schema/alarms.js';

// Safe helper to handle database URLs containing unencoded special characters (e.g. '@' in password)
const createPoolConfig = (connectionString: string): pg.PoolConfig => {
  try {
    const matches = connectionString.match(/^(postgresql:\/\/|postgres:\/\/)([^:]+):(.*)@([^@:]+):(\d+)\/(.+)$/);
    if (matches) {
      const [, , user, rawPassword, host, port, database] = matches;
      return {
        user,
        password: rawPassword,
        host,
        port: parseInt(port, 10),
        database,
        connectionTimeoutMillis: 3000, // 3s connection timeout
      };
    }
  } catch (_e) {}
  return { connectionString, connectionTimeoutMillis: 3000 };
};

const poolConfig = createPoolConfig(env.DATABASE_URL);
export const pool = new pg.Pool(poolConfig);

// Global pool error handler to prevent unhandled process crashes
pool.on('error', (err) => {
  console.warn('⚠️ PostgreSQL Pool Warning/Error:', err.message);
});

export const db = drizzle(pool, {
  schema: {
    ...usersSchema,
    ...profilesSchema,
    ...habitsSchema,
    ...alarmsSchema,
  },
});

/**
 * Check if PostgreSQL database is reachable
 */
export const checkDatabaseConnection = async (): Promise<boolean> => {
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    return true;
  } catch (err: any) {
    console.warn('⚠️ PostgreSQL Connection Check Failed:', err.message);
    return false;
  }
};
