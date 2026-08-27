import { pgTable, uuid, varchar, integer, timestamp, boolean } from 'drizzle-orm/pg-core';
import { users } from './users';

export const habits = pgTable('habits', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  habitName: varchar('habit_name', { length: 150 }).notNull(),
  targetDays: integer('target_days').default(7).notNull(),
  currentStreak: integer('current_streak').default(0).notNull(),
  isEnabled: boolean('is_enabled').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type Habit = typeof habits.$inferSelect;
export type NewHabit = typeof habits.$inferInsert;
