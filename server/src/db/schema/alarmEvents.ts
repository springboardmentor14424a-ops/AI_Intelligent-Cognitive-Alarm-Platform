import { pgTable, uuid, varchar, timestamp } from 'drizzle-orm/pg-core';
import { users } from './users.js';
import { alarms } from './alarms.js';

export const alarmEvents = pgTable('alarm_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  alarmId: uuid('alarm_id')
    .references(() => alarms.id, { onDelete: 'cascade' }),
  eventType: varchar('event_type', { length: 50 }).notNull(), // 'activated', 'snoozed', 'dismissed'
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type AlarmEvent = typeof alarmEvents.$inferSelect;
export type NewAlarmEvent = typeof alarmEvents.$inferInsert;
