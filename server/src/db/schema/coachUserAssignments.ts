import { pgTable, uuid, varchar, timestamp } from 'drizzle-orm/pg-core';
import { users } from './users.js';

export const coachUserAssignments = pgTable('coach_user_assignments', {
  id: uuid('id').defaultRandom().primaryKey(),
  coachId: uuid('coach_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  status: varchar('status', { length: 20 }).default('active').notNull(),
  assignedAt: timestamp('assigned_at').defaultNow().notNull(),
});

export type CoachUserAssignment = typeof coachUserAssignments.$inferSelect;
export type NewCoachUserAssignment = typeof coachUserAssignments.$inferInsert;
