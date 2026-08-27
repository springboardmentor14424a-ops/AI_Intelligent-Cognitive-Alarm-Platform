import { randomUUID } from 'crypto';
import { db, isDbConnected } from '../db/index.js';
import { notifications } from '../db/schema/notifications.js';
import { eq, desc } from 'drizzle-orm';

export interface AppNotification {
  id: string;
  userId: string;
  type: 'bedtime' | 'wakeup' | 'habit' | 'challenge' | 'coaching' | 'system';
  title: string;
  message: string;
  isRead: boolean;
  scheduledFor: string;
  createdAt: string;
}

const mockNotificationsStore: Record<string, AppNotification[]> = {
  'demo-user-id': [
    {
      id: 'notif-1',
      userId: 'demo-user-id',
      type: 'bedtime',
      title: 'Digital Sunset Reminder',
      message: 'It is 10:15 PM. Turn off screens and prepare for optimal REM sleep phase.',
      isRead: false,
      scheduledFor: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    },
    {
      id: 'notif-2',
      userId: 'demo-user-id',
      type: 'wakeup',
      title: 'Morning Awakening Ready',
      message: 'Alarm set for 07:00 AM with Smart Adaptive Cognitive Challenge.',
      isRead: false,
      scheduledFor: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    },
    {
      id: 'notif-3',
      userId: 'demo-user-id',
      type: 'habit',
      title: 'Habit Streak Milestone!',
      message: 'You have achieved a 14-day streak on Morning Hydration. Keep it up!',
      isRead: true,
      scheduledFor: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    },
  ],
};

const getOrInitNotifications = (userId: string): AppNotification[] => {
  if (!mockNotificationsStore[userId]) {
    mockNotificationsStore[userId] = [
      {
        id: `notif-${Date.now()}-1`,
        userId,
        type: 'system',
        title: 'Welcome to Cognitive Alarm Platform',
        message: 'Your personal adaptive intelligence and habit engines are active.',
        isRead: false,
        scheduledFor: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      },
    ];
  }
  return mockNotificationsStore[userId];
};

export const getUserNotifications = async (userId: string): Promise<AppNotification[]> => {
  if (await isDbConnected()) {
    try {
      const dbNotifs = await db
        .select()
        .from(notifications)
        .where(eq(notifications.userId, userId))
        .orderBy(desc(notifications.createdAt));
      if (dbNotifs.length > 0) {
        return dbNotifs.map((n) => ({
          id: n.id,
          userId: n.userId,
          type: n.type as any,
          title: n.title,
          message: n.message,
          isRead: n.isRead,
          scheduledFor: n.scheduledFor.toISOString(),
          createdAt: n.createdAt.toISOString(),
        }));
      }
    } catch (_err) {}
  }
  return getOrInitNotifications(userId);
};

export const markNotificationAsRead = async (userId: string, notificationId: string): Promise<boolean> => {
  const notifs = getOrInitNotifications(userId);
  const target = notifs.find((n) => n.id === notificationId);
  if (target) {
    target.isRead = true;
  }

  if (await isDbConnected()) {
    try {
      await db
        .update(notifications)
        .set({ isRead: true })
        .where(eq(notifications.id, notificationId));
    } catch (_err) {}
  }
  return true;
};

export const markAllNotificationsAsRead = async (userId: string): Promise<boolean> => {
  const notifs = getOrInitNotifications(userId);
  for (const n of notifs) {
    n.isRead = true;
  }

  if (await isDbConnected()) {
    try {
      await db
        .update(notifications)
        .set({ isRead: true })
        .where(eq(notifications.userId, userId));
    } catch (_err) {}
  }
  return true;
};

export const sendNotification = async (
  userId: string,
  type: AppNotification['type'],
  title: string,
  message: string
): Promise<AppNotification> => {
  const newNotif: AppNotification = {
    id: randomUUID(),
    userId,
    type,
    title,
    message,
    isRead: false,
    scheduledFor: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };

  const notifs = getOrInitNotifications(userId);
  notifs.unshift(newNotif);

  if (await isDbConnected()) {
    try {
      await db.insert(notifications).values({
        id: newNotif.id,
        userId,
        type,
        title,
        message,
        isRead: false,
      });
    } catch (_err) {}
  }

  return newNotif;
};
