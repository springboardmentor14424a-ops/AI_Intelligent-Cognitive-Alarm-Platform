import { pgTable, uuid, varchar, boolean, timestamp, integer, text, pgEnum } from 'drizzle-orm/pg-core';
import { users } from './users';

export const repeatTypeEnum = pgEnum('repeat_type', ['daily', 'weekdays', 'weekend', 'one_time', 'smart_adaptive']);

export const alarms = pgTable('alarms', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  alarmTitle: varchar('alarm_title', { length: 150 }).notNull(),
  alarmTime: varchar('alarm_time', { length: 20 }).notNull(), // e.g. '07:00 AM'
  repeatType: repeatTypeEnum('repeat_type').default('daily').notNull(),
  repeatDays: text('repeat_days').default('[]').notNull(), // e.g. JSON array of days ["Mon", "Wed"]
  difficultyLevel: varchar('difficulty_level', { length: 20 }).default('Moderate').notNull(),
  sound: varchar('sound', { length: 50 }).default('Gentle Chime').notNull(),
  vibration: boolean('vibration').default(true).notNull(),
  snooze: integer('snooze').default(5).notNull(), // snooze duration in minutes
  activeStatus: boolean('active_status').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type Alarm = typeof alarms.$inferSelect;
export type NewAlarm = typeof alarms.$inferInsert;
export type RepeatType = 'daily' | 'weekdays' | 'weekend' | 'one_time' | 'smart_adaptive';

