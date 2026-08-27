import { pgTable, uuid, varchar, numeric, timestamp, integer } from 'drizzle-orm/pg-core';
import { users } from './users.js';

export const sleepLogs = pgTable('sleep_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  sleepTime: varchar('sleep_time', { length: 20 }).notNull(),
  wakeUpTime: varchar('wake_up_time', { length: 20 }).notNull(),
  sleepDurationHours: numeric('sleep_duration_hours', { precision: 4, scale: 2 }).default('8.00').notNull(),
  sleepQualityRating: integer('sleep_quality_rating').default(8).notNull(), // 1 to 10
  loggedDate: varchar('logged_date', { length: 20 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type SleepLog = typeof sleepLogs.$inferSelect;
export type NewSleepLog = typeof sleepLogs.$inferInsert;
