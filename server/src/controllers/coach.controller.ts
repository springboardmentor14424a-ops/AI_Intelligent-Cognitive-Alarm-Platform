import { Request, Response, NextFunction } from 'express';
import { db } from '../db/index.js';
import { users } from '../db/schema/users.js';
import { coachUserAssignments } from '../db/schema/coachUserAssignments.js';
import { habits } from '../db/schema/habits.js';
import { alarms } from '../db/schema/alarms.js';
import { challengeAttempts } from '../db/schema/challengeAttempts.js';
import { wakeUpVerifications } from '../db/schema/wakeUpVerifications.js';
import { snoozeLogs } from '../db/schema/snoozeLogs.js';
import { sleepLogs } from '../db/schema/sleepLogs.js';
import { eq, inArray, desc } from 'drizzle-orm';
import { calculateHabitScore } from '../services/habitScore.service.js';
import { getOverviewAnalytics, getWakeUpAnalytics, getChallengeAnalytics, getHabitAnalytics } from '../services/behavioralAnalytics.service.js';
import { getAdaptiveDifficultyForUser } from '../services/adaptiveDifficulty.service.js';
import { AppError } from '../middleware/error.middleware.js';

/**
 * GET /api/coach/users
 * Returns list of authorized users assigned to current coach (or all registered standard users if unassigned)
 */
export const getCoachUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const coachId = req.user?.userId;
    if (!coachId) {
      throw new AppError('Unauthorized', 401);
    }

    // Check assignments for this coach
    const assignments = await db
      .select()
      .from(coachUserAssignments)
      .where(eq(coachUserAssignments.coachId, coachId));

    let assignedUserIds = assignments.map((a) => a.userId);

    // If no explicit assignments exist, fetch standard 'user' role users as unassigned pool
    let authorizedUsers: any[] = [];
    if (assignedUserIds.length > 0) {
      authorizedUsers = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          role: users.role,
          status: users.status,
          createdAt: users.createdAt,
        })
        .from(users)
        .where(inArray(users.id, assignedUserIds));
    } else {
      authorizedUsers = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          role: users.role,
          status: users.status,
          createdAt: users.createdAt,
        })
        .from(users)
        .where(eq(users.role, 'user'));
    }

    // Build real performance information for each user
    const usersTelemetry = await Promise.all(
      authorizedUsers.map(async (u) => {
        const attempts = await db.select().from(challengeAttempts).where(eq(challengeAttempts.userId, u.id));
        const verifications = await db.select().from(wakeUpVerifications).where(eq(wakeUpVerifications.userId, u.id));
        const userHabits = await db.select().from(habits).where(eq(habits.userId, u.id));
        const snoozes = await db.select().from(snoozeLogs).where(eq(snoozeLogs.userId, u.id));

        const hasActivity = attempts.length > 0 || verifications.length > 0 || userHabits.length > 0;

        let habitScore: number | null = null;
        let streak = userHabits.length > 0 ? Math.max(...userHabits.map((h) => h.currentStreak || 0), 0) : 0;
        let wakeUpConsistency: number | null = null;
        let challengeAccuracy: number | null = null;

        if (verifications.length > 0) {
          const verified = verifications.filter((v) => v.wakeUpVerified).length;
          wakeUpConsistency = Math.round((verified / verifications.length) * 100);
        }

        if (attempts.length > 0) {
          const correct = attempts.filter((a) => a.isCorrect).length;
          challengeAccuracy = Math.round((correct / attempts.length) * 100);
        }

        if (wakeUpConsistency !== null && challengeAccuracy !== null) {
          const totalSnoozes = snoozes.reduce((acc, curr) => acc + (curr.snoozeCount || 1), 0);
          const computedScore = calculateHabitScore({
            wakeUpConsistency,
            challengeCompletion: challengeAccuracy,
            snoozeReduction: Math.max(0, 100 - totalSnoozes * 10),
            sleepAdherence: 80,
          });
          habitScore = computedScore.overall_score;
        }

        return {
          id: u.id,
          name: u.name,
          email: u.email,
          status: u.status,
          hasActivity,
          habitScore: habitScore !== null ? `${habitScore}/100` : 'No data yet',
          streak: hasActivity ? `${streak} Days` : 'No data yet',
          wakeUpConsistency: wakeUpConsistency !== null ? `${wakeUpConsistency}%` : 'No data yet',
          challengeAccuracy: challengeAccuracy !== null ? `${challengeAccuracy}%` : 'No data yet',
        };
      })
    );

    res.status(200).json({
      success: true,
      data: {
        total: usersTelemetry.length,
        users: usersTelemetry,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/coach/users/:id
 * Returns detailed telemetry for specific authorized user
 */
export const getCoachUserDetail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const [targetUser] = await db.select().from(users).where(eq(users.id, id));

    if (!targetUser) {
      throw new AppError('User not found', 404);
    }

    const overview = await getOverviewAnalytics(id);
    const wakeup = await getWakeUpAnalytics(id);
    const challenges = await getChallengeAnalytics(id);
    const habitAnalyticsData = await getHabitAnalytics(id);
    const adaptiveDifficulty = await getAdaptiveDifficultyForUser(id);

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: targetUser.id,
          name: targetUser.name,
          email: targetUser.email,
          role: targetUser.role,
        },
        overview,
        wakeup,
        challenges,
        habits: habitAnalyticsData,
        adaptiveDifficulty,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/coach/statistics
 * Returns aggregate metrics for coach cohort
 */
export const getCoachStatistics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const coachId = req.user?.userId;

    const assignments = await db
      .select()
      .from(coachUserAssignments)
      .where(eq(coachUserAssignments.coachId, coachId || ''));

    const assignedIds = assignments.map((a) => a.userId);
    let cohort = await db.select().from(users).where(eq(users.role, 'user'));
    if (assignedIds.length > 0) {
      cohort = await db.select().from(users).where(inArray(users.id, assignedIds));
    }

    const totalTrainees = cohort.length;

    res.status(200).json({
      success: true,
      data: {
        assignedTraineesCount: totalTrainees,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/coach/assign
 * Assign user to coach
 */
export const assignUserToCoach = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const coachId = req.user?.userId;
    const { userId } = req.body;

    if (!coachId || !userId) {
      throw new AppError('Coach ID and User ID are required', 400);
    }

    const [assignment] = await db
      .insert(coachUserAssignments)
      .values({
        coachId,
        userId,
      })
      .returning();

    res.status(201).json({
      success: true,
      message: 'User assigned successfully',
      data: { assignment },
    });
  } catch (error) {
    next(error);
  }
};
