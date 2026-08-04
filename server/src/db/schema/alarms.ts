import { pgTable, uuid, varchar, boolean, timestamp, pgEnum } from 'drizzle-orm/pg-core';
import { users } from './users.js';

export const repeatTypeEnum = pgEnum('repeat_type', ['daily', 'weekdays', 'weekend', 'one_time']);

export const alarms = pgTable('alarms', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  alarmTitle: varchar('alarm_title', { length: 150 }).notNull(),
  alarmTime: varchar('alarm_time', { length: 20 }).notNull(), // e.g. '07:00 AM'
  repeatType: repeatTypeEnum('repeat_type').default('daily').notNull(),
  sound: varchar('sound', { length: 50 }).default('Gentle Chime').notNull(),
  vibration: boolean('vibration').default(true).notNull(),
  activeStatus: boolean('active_status').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type Alarm = typeof alarms.$inferSelect;
export type NewAlarm = typeof alarms.$inferInsert;
export type RepeatType = 'daily' | 'weekdays' | 'weekend' | 'one_time';
