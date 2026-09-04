import { Request, Response, NextFunction } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { profiles } from '../db/schema/profiles.js';
import { users } from '../db/schema/users.js';
import { AppError } from '../middleware/error.middleware.js';
import { UpdateProfileInput } from '../schemas/profile.schema.js';

/**
 * GET /api/profile
 * Retrieves user profile directly from PostgreSQL database
 */
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

    // Auto-create initial profile row in PostgreSQL if missing
    const [userRecord] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId));

    const userName = userRecord?.name || req.user?.email.split('@')[0] || 'User';
    const userEmail = userRecord?.email || req.user?.email || 'user@example.com';

    const [newProfile] = await db
      .insert(profiles)
      .values({
        userId,
        fullName: userName,
        email: userEmail,
        wakeUpTime: '07:00 AM',
        sleepTime: '11:00 PM',
        sleepDuration: '8 Hours',
        timezone: 'UTC',
        productivityGoal: 'Maintain peak morning focus',
        difficultyPreference: 'Moderate',
        habitPreferences: 'Morning Hydration, Digital Sunset',
      })
      .returning();

    res.status(200).json({
      success: true,
      data: { profile: newProfile },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/profile
 * Updates user profile directly in PostgreSQL database
 */
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

    const [userRecord] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId));

    const defaultName = userRecord?.name || req.user?.email.split('@')[0] || 'User';
    const defaultEmail = userRecord?.email || req.user?.email || 'user@example.com';

    const [updatedProfile] = await db
      .insert(profiles)
      .values({
        userId,
        fullName: updates.fullName || defaultName,
        email: updates.email || defaultEmail,
        wakeUpTime: updates.wakeUpTime || '07:00 AM',
        sleepTime: updates.sleepTime || '11:00 PM',
        sleepDuration: updates.sleepDuration || '8 Hours',
        timezone: updates.timezone || 'UTC',
        productivityGoal: updates.productivityGoal || 'Maintain peak morning focus',
        difficultyPreference: updates.difficultyPreference || 'Moderate',
        habitPreferences: updates.habitPreferences || 'Morning Hydration, Digital Sunset',
      })
      .onConflictDoUpdate({
        target: profiles.userId,
        set: {
          ...updates,
          updatedAt: new Date(),
        },
      })
      .returning();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: { profile: updatedProfile },
    });
  } catch (error) {
    next(error);
  }
};
