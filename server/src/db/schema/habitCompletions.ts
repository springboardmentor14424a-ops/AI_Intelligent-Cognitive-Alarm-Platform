import { pgTable, uuid, varchar, timestamp } from 'drizzle-orm/pg-core';
import { users } from './users.js';
import { habits } from './habits.js';

export const habitCompletions = pgTable('habit_completions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  habitId: uuid('habit_id')
    .references(() => habits.id, { onDelete: 'cascade' })
    .notNull(),
  completionDate: varchar('completion_date', { length: 20 }).notNull(), // e.g. '2026-08-30'
  completionStatus: varchar('completion_status', { length: 20 }).default('completed').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type HabitCompletion = typeof habitCompletions.$inferSelect;
export type NewHabitCompletion = typeof habitCompletions.$inferInsert;
