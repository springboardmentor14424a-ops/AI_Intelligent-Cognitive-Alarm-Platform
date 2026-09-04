import { Request, Response, NextFunction } from 'express';
import { db } from '../db/index.js';
import { users } from '../db/schema/users.js';
import { alarms } from '../db/schema/alarms.js';
import { habits } from '../db/schema/habits.js';
import { challengeAttempts } from '../db/schema/challengeAttempts.js';
import { wakeUpVerifications } from '../db/schema/wakeUpVerifications.js';
import { snoozeLogs } from '../db/schema/snoozeLogs.js';
import { eq, desc, count } from 'drizzle-orm';
import { calculateHabitScore } from '../services/habitScore.service.js';
import { AppError } from '../middleware/error.middleware.js';

/**
 * GET /api/admin/users
 * Returns list of all registered users from PostgreSQL
 */
export const getAllUsers = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const allUsers = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        status: users.status,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(desc(users.createdAt));

    res.status(200).json({
      success: true,
      data: {
        total: allUsers.length,
        users: allUsers,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/users/recent
 * Returns recently registered users from PostgreSQL
 */
export const getRecentUsers = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const recent = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        status: users.status,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(desc(users.createdAt))
      .limit(10);

    res.status(200).json({
      success: true,
      data: {
        users: recent,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/coaches
 * Returns list of coaches (and pending approval coaches) from PostgreSQL
 */
export const getAllCoaches = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const coaches = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        status: users.status,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.role, 'coach'))
      .orderBy(desc(users.createdAt));

    res.status(200).json({
      success: true,
      data: {
        total: coaches.length,
        pending: coaches.filter((c) => c.status === 'pending').length,
        coaches,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/coaches/recent
 * Returns recent coaches
 */
export const getRecentCoaches = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const recentCoaches = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        status: users.status,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.role, 'coach'))
      .orderBy(desc(users.createdAt))
      .limit(10);

    res.status(200).json({
      success: true,
      data: {
        coaches: recentCoaches,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/admin/coaches/:id/status
 * Approve or reject pending coach account
 */
export const updateCoachStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'active' | 'rejected'

    if (!['active', 'rejected'].includes(status)) {
      throw new AppError('Status must be active or rejected', 400);
    }

    const [coach] = await db.select().from(users).where(eq(users.id, id));
    if (!coach || coach.role !== 'coach') {
      throw new AppError('Coach not found', 404);
    }

    const [updatedCoach] = await db
      .update(users)
      .set({ status, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();

    res.status(200).json({
      success: true,
      message: `Coach status updated to ${status}`,
      data: {
        coach: {
          id: updatedCoach.id,
          name: updatedCoach.name,
          email: updatedCoach.email,
          role: updatedCoach.role,
          status: updatedCoach.status,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/statistics
 * Returns real aggregated statistics queried from PostgreSQL
 */
export const getAdminStatistics = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const dbUsers = await db.select().from(users);
    const totalUsersCount = dbUsers.length;
    const totalCoachesCount = dbUsers.filter((u) => u.role === 'coach').length;
    const pendingCoachesCount = dbUsers.filter((u) => u.role === 'coach' && u.status === 'pending').length;
    const activeUsersCount = dbUsers.filter((u) => u.status === 'active').length;

    const dbAlarms = await db.select().from(alarms);
    const activeAlarmsCount = dbAlarms.filter((a) => a.activeStatus).length;

    const dbHabits = await db.select().from(habits);
    const totalHabitsCount = dbHabits.length;

    const dbAttempts = await db.select().from(challengeAttempts);
    const totalAttemptsCount = dbAttempts.length;
    const correctAttemptsCount = dbAttempts.filter((a) => a.isCorrect).length;
    const avgChallengeAccuracy = totalAttemptsCount > 0
      ? Math.round((correctAttemptsCount / totalAttemptsCount) * 100)
      : null;

    const dbVerifications = await db.select().from(wakeUpVerifications);
    const totalVerificationsCount = dbVerifications.length;
    const verifiedWakeUpsCount = dbVerifications.filter((v) => v.wakeUpVerified).length;
    const avgWakeUpConsistency = totalVerificationsCount > 0
      ? Math.round((verifiedWakeUpsCount / totalVerificationsCount) * 100)
      : null;

    const dbSnoozes = await db.select().from(snoozeLogs);
    const totalSnoozesCount = dbSnoozes.reduce((acc, curr) => acc + (curr.snoozeCount || 1), 0);
    const avgSnoozeRate = totalUsersCount > 0
      ? Math.min(100, Math.round((totalSnoozesCount / totalUsersCount) * 10))
      : 0;

    let avgHabitScore: number | null = null;
    if (avgWakeUpConsistency !== null && avgChallengeAccuracy !== null) {
      const computed = calculateHabitScore({
        wakeUpConsistency: avgWakeUpConsistency,
        challengeCompletion: avgChallengeAccuracy,
        snoozeReduction: Math.max(0, 100 - avgSnoozeRate),
        sleepAdherence: 80,
      });
      avgHabitScore = computed.overall_score;
    }

    res.status(200).json({
      success: true,
      data: {
        totalUsers: totalUsersCount,
        totalCoaches: totalCoachesCount,
        pendingCoaches: pendingCoachesCount,
        activeUsers: activeUsersCount,
        activeAlarms: activeAlarmsCount,
        totalHabits: totalHabitsCount,
        totalChallengeAttempts: totalAttemptsCount,
        avgHabitScore,
        avgWakeUpConsistency: avgWakeUpConsistency !== null ? `${avgWakeUpConsistency}%` : null,
        avgChallengeAccuracy: avgChallengeAccuracy !== null ? `${avgChallengeAccuracy}%` : null,
        avgSnoozeRate: `${avgSnoozeRate}%`,
      },
    });
  } catch (error) {
    next(error);
  }
};
