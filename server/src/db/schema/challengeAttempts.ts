import { pgTable, uuid, varchar, text, timestamp, integer, boolean } from 'drizzle-orm/pg-core';
import { users } from './users';
import { challenges } from './challenges';

export const challengeAttempts = pgTable('challenge_attempts', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  challengeId: uuid('challenge_id')
    .references(() => challenges.id, { onDelete: 'set null' }),
  answer: text('answer').notNull(),
  isCorrect: boolean('is_correct').notNull(),
  timeTaken: integer('time_taken').default(0).notNull(), // seconds
  difficulty: varchar('difficulty', { length: 20 }).default('medium').notNull(),
  challengeType: varchar('challenge_type', { length: 50 }).default('math').notNull(),
  completedAt: timestamp('completed_at').defaultNow().notNull(),
});

export type ChallengeAttempt = typeof challengeAttempts.$inferSelect;
export type NewChallengeAttempt = typeof challengeAttempts.$inferInsert;
