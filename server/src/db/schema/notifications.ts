import { pgTable, uuid, varchar, text, boolean, timestamp, pgEnum } from 'drizzle-orm/pg-core';
import { users } from './users.js';

export const notificationTypeEnum = pgEnum('notification_type', [
  'bedtime',
  'wakeup',
  'habit',
  'challenge',
  'coaching',
  'system',
]);

export const notifications = pgTable('notifications', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  type: notificationTypeEnum('type').default('system').notNull(),
  title: varchar('title', { length: 200 }).notNull(),
  message: text('message').notNull(),
  isRead: boolean('is_read').default(false).notNull(),
  scheduledFor: timestamp('scheduled_for').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;
