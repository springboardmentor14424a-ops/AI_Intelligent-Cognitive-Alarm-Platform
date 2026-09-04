import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { env } from '../config/env.js';
import * as usersSchema from './schema/users.js';
import * as profilesSchema from './schema/profiles.js';
import * as habitsSchema from './schema/habits.js';
import * as alarmsSchema from './schema/alarms.js';
import * as challengesSchema from './schema/challenges.js';
import * as challengeAttemptsSchema from './schema/challengeAttempts.js';
import * as wakeUpVerificationsSchema from './schema/wakeUpVerifications.js';

import * as snoozeLogsSchema from './schema/snoozeLogs.js';
import * as sleepLogsSchema from './schema/sleepLogs.js';
import * as notificationsSchema from './schema/notifications.js';
import * as recommendationsSchema from './schema/recommendations.js';
import * as habitScoresSchema from './schema/habitScores.js';
import * as habitCompletionsSchema from './schema/habitCompletions.js';
import * as alarmEventsSchema from './schema/alarmEvents.js';
import * as coachUserAssignmentsSchema from './schema/coachUserAssignments.js';

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
        connectionTimeoutMillis: 3000,
      };
    }
  } catch (_e) {}
  return { connectionString, connectionTimeoutMillis: 3000 };
};

const poolConfig = createPoolConfig(env.DATABASE_URL);
export const pool = new pg.Pool(poolConfig);

pool.on('error', (err) => {
  console.warn('⚠️ PostgreSQL Pool Warning/Error:', err.message);
});

export const db = drizzle(pool, {
  schema: {
    ...usersSchema,
    ...profilesSchema,
    ...habitsSchema,
    ...alarmsSchema,
    ...challengesSchema,
    ...challengeAttemptsSchema,
    ...wakeUpVerificationsSchema,
    ...snoozeLogsSchema,
    ...sleepLogsSchema,
    ...notificationsSchema,
    ...recommendationsSchema,
    ...habitScoresSchema,
    ...habitCompletionsSchema,
    ...alarmEventsSchema,
    ...coachUserAssignmentsSchema,
  },
});

export const checkDatabaseConnection = async (): Promise<boolean> => {
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    return true;
  } catch (err: any) {
    return false;
  }
};

// Alias export for helper functions
export const isDbConnected = checkDatabaseConnection;
