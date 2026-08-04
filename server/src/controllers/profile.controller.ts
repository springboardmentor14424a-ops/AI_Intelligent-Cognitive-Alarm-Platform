import { Request, Response, NextFunction } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { profiles } from '../db/schema/profiles.js';
import { users } from '../db/schema/users.js';
import { AppError } from '../middleware/error.middleware.js';
import { UpdateProfileInput } from '../schemas/profile.schema.js';

// In-memory fallback state for demo sessions
const mockProfilesStore: Record<string, any> = {
  'demo-user-id': {
    id: 'profile-user-1',
    userId: 'demo-user-id',
    fullName: 'Demo User',
    email: 'user@cognitivealarm.com',
    wakeUpTime: '07:00 AM',
    sleepTime: '11:00 PM',
    timezone: 'UTC-5 (EST)',
    productivityGoal: 'Consistent morning focus and early alarms',
    difficultyPreference: 'Moderate',
    updatedAt: new Date().toISOString(),
  },
  'demo-coach-id': {
    id: 'profile-coach-1',
    userId: 'demo-coach-id',
    fullName: 'Demo Coach',
    email: 'coach@cognitivealarm.com',
    wakeUpTime: '06:00 AM',
    sleepTime: '10:00 PM',
    timezone: 'UTC-5 (EST)',
    productivityGoal: 'Optimize trainee sleep and waking routines',
    difficultyPreference: 'High',
    updatedAt: new Date().toISOString(),
  },
  'demo-admin-id': {
    id: 'profile-admin-1',
    userId: 'demo-admin-id',
    fullName: 'Demo Admin',
    email: 'admin@cognitivealarm.com',
    wakeUpTime: '05:30 AM',
    sleepTime: '09:30 PM',
    timezone: 'UTC',
    productivityGoal: 'Platform stability and user monitoring',
    difficultyPreference: 'Expert',
    updatedAt: new Date().toISOString(),
  },
};

export const getProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      throw new AppError('Unauthorized', 401);
    }

    // Check mock store for demo sessions
    if (mockProfilesStore[userId]) {
      res.status(200).json({
        success: true,
        data: { profile: mockProfilesStore[userId] },
      });
      return;
    }

    // Try database
    try {
      const [existingProfile] = await db
        .select()
        .from(profiles)
        .where(eq(profiles.userId, userId));

      if (existingProfile) {
        res.status(200).json({
          success: true,
          data: { profile: existingProfile },
        });
        return;
      }
    } catch (_dbError) {
      // Database not yet migrated or unreachable in dev phase
    }

    // Fallback default profile
    const defaultProfile = {
      id: `profile-${userId}`,
      userId,
      fullName: req.user?.email.split('@')[0] || 'User',
      email: req.user?.email || 'user@example.com',
      wakeUpTime: '07:00 AM',
      sleepTime: '11:00 PM',
      timezone: 'UTC',
      productivityGoal: 'Improve daily focus and waking habits',
      difficultyPreference: 'Moderate',
      updatedAt: new Date().toISOString(),
    };

    res.status(200).json({
      success: true,
      data: { profile: defaultProfile },
    });
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (
  req: Request<{}, {}, UpdateProfileInput>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      throw new AppError('Unauthorized', 401);
    }

    const updates = req.body;

    // Update in-memory mock store
    if (!mockProfilesStore[userId]) {
      mockProfilesStore[userId] = {
        id: `profile-${userId}`,
        userId,
        fullName: req.user?.email.split('@')[0] || 'User',
        email: req.user?.email || 'user@example.com',
        wakeUpTime: '07:00 AM',
        sleepTime: '11:00 PM',
        timezone: 'UTC',
        productivityGoal: 'Improve daily focus and waking habits',
        difficultyPreference: 'Moderate',
      };
    }

    mockProfilesStore[userId] = {
      ...mockProfilesStore[userId],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    // Attempt DB update if available
    try {
      await db
        .insert(profiles)
        .values({
          userId,
          fullName: updates.fullName || mockProfilesStore[userId].fullName,
          email: updates.email || mockProfilesStore[userId].email,
          wakeUpTime: updates.wakeUpTime || mockProfilesStore[userId].wakeUpTime,
          sleepTime: updates.sleepTime || mockProfilesStore[userId].sleepTime,
          timezone: updates.timezone || mockProfilesStore[userId].timezone,
          productivityGoal: updates.productivityGoal || mockProfilesStore[userId].productivityGoal,
          difficultyPreference: updates.difficultyPreference || mockProfilesStore[userId].difficultyPreference,
        })
        .onConflictDoUpdate({
          target: profiles.userId,
          set: {
            ...updates,
            updatedAt: new Date(),
          },
        });
    } catch (_dbError) {
      // Ignored for dev phase fallback
    }

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: { profile: mockProfilesStore[userId] },
    });
  } catch (error) {
    next(error);
  }
};
