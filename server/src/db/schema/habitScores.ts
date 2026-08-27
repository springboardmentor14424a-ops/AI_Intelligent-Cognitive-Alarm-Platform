import { pgTable, uuid, integer, varchar, text, timestamp } from 'drizzle-orm/pg-core';
import { users } from './users.js';

export const habitScores = pgTable('habit_scores', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  overallScore: integer('overall_score').notNull(),
  wakeUpConsistency: integer('wake_up_consistency').notNull(),
  challengeCompletion: integer('challenge_completion').notNull(),
  snoozeReduction: integer('snooze_reduction').notNull(),
  sleepAdherence: integer('sleep_adherence').notNull(),
  scoreCategory: varchar('score_category', { length: 50 }).notNull(), // Needs Improvement, Developing, Good, Excellent
  summaryMessage: text('summary_message').default('').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export type HabitScoreRecord = typeof habitScores.$inferSelect;
export type NewHabitScoreRecord = typeof habitScores.$inferInsert;
