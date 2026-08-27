import { pgTable, uuid, varchar, text, timestamp } from 'drizzle-orm/pg-core';
import { users } from './users.js';

export const recommendations = pgTable('recommendations', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  category: varchar('category', { length: 50 }).notNull(), // sleep, wakeup, habit, challenge, productivity
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description').notNull(),
  reason: text('reason').notNull(),
  priority: varchar('priority', { length: 20 }).default('medium').notNull(), // high, medium, low
  actionableStep: text('actionable_step').default('').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export type Recommendation = typeof recommendations.$inferSelect;
export type NewRecommendation = typeof recommendations.$inferInsert;
