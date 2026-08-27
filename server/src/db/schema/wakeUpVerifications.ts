import { pgTable, uuid, varchar, timestamp, integer, boolean } from 'drizzle-orm/pg-core';
import { users } from './users';
import { alarms } from './alarms';

export const wakeUpVerifications = pgTable('wake_up_verifications', {
  id: uuid('id').defaultRandom().primaryKey(),
  alarmId: uuid('alarm_id')
    .references(() => alarms.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  verificationStarted: timestamp('verification_started').defaultNow().notNull(),
  verificationCompleted: timestamp('verification_completed'),
  attempts: integer('attempts').default(0).notNull(),
  correctAnswers: integer('correct_answers').default(0).notNull(),
  wakeUpVerified: boolean('wake_up_verified').default(false).notNull(),
  verificationMethod: varchar('verification_method', { length: 50 }).default('puzzle_completion').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type WakeUpVerification = typeof wakeUpVerifications.$inferSelect;
export type NewWakeUpVerification = typeof wakeUpVerifications.$inferInsert;
