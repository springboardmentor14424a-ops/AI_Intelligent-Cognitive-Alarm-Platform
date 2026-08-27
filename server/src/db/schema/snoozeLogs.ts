import { pgTable, uuid, integer, timestamp } from 'drizzle-orm/pg-core';
import { users } from './users.js';
import { alarms } from './alarms.js';

export const snoozeLogs = pgTable('snooze_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  alarmId: uuid('alarm_id')
    .references(() => alarms.id, { onDelete: 'cascade' }),
  snoozeCount: integer('snooze_count').default(1).notNull(),
  snoozeDurationMinutes: integer('snooze_duration_minutes').default(5).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export type SnoozeLog = typeof snoozeLogs.$inferSelect;
export type NewSnoozeLog = typeof snoozeLogs.$inferInsert;
