import { pgTable, uuid, varchar, timestamp, text } from 'drizzle-orm/pg-core';
import { users } from './users.js';

export const profiles = pgTable('profiles', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull()
    .unique(),
  fullName: varchar('full_name', { length: 100 }).notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  wakeUpTime: varchar('wake_up_time', { length: 20 }).default('07:00 AM').notNull(),
  sleepTime: varchar('sleep_time', { length: 20 }).default('11:00 PM').notNull(),
  timezone: varchar('timezone', { length: 50 }).default('UTC').notNull(),
  productivityGoal: text('productivity_goal').default('Maintain peak morning focus').notNull(),
  difficultyPreference: varchar('difficulty_preference', { length: 20 }).default('Moderate').notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;
