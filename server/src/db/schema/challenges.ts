import { pgTable, uuid, varchar, text, timestamp, pgEnum } from 'drizzle-orm/pg-core';

export const challengeTypeEnum = pgEnum('challenge_type', [
  'math',
  'logic',
  'memory',
  'word',
  'pattern',
  'riddle',
  'quiz',
]);

export const difficultyEnum = pgEnum('challenge_difficulty', [
  'beginner',
  'easy',
  'medium',
  'hard',
  'expert',
]);

export const challenges = pgTable('challenges', {
  id: uuid('id').defaultRandom().primaryKey(),
  challengeType: challengeTypeEnum('challenge_type').notNull(),
  difficulty: difficultyEnum('difficulty').default('medium').notNull(),
  question: text('question').notNull(),
  options: text('options'), // JSON string array e.g. ["A", "B", "C", "D"]
  correctAnswer: text('correct_answer').notNull(),
  explanation: text('explanation').default('').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type Challenge = typeof challenges.$inferSelect;
export type NewChallenge = typeof challenges.$inferInsert;
export type ChallengeType = 'math' | 'logic' | 'memory' | 'word' | 'pattern' | 'riddle' | 'quiz';
export type ChallengeDifficulty = 'beginner' | 'easy' | 'medium' | 'hard' | 'expert';
