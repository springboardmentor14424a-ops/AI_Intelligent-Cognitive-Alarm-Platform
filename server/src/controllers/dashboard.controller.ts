import { Request, Response } from 'express';
import { db } from '../db/index.js';
import { users } from '../db/schema/users.js';
import { habits } from '../db/schema/habits.js';
import { alarms } from '../db/schema/alarms.js';
import { challenges } from '../db/schema/challenges.js';
import { challengeAttempts } from '../db/schema/challengeAttempts.js';
import { wakeUpVerifications } from '../db/schema/wakeUpVerifications.js';
import { snoozeLogs } from '../db/schema/snoozeLogs.js';
import { coachUserAssignments } from '../db/schema/coachUserAssignments.js';
import { calculateHabitScore } from '../services/habitScore.service.js';
import { eq, inArray, desc } from 'drizzle-orm';

export const getUserDashboard = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const userAlarmsList = await db
      .select()
      .from(alarms)
      .where(eq(alarms.userId, userId))
      .orderBy(desc(alarms.createdAt));

    const attempts = await db
      .select()
      .from(challengeAttempts)
      .where(eq(challengeAttempts.userId, userId))
      .orderBy(desc(challengeAttempts.completedAt));

    const attemptsCount = attempts.length;
    const correctCount = attempts.filter((a) => a.isCorrect).length;
    const accuracy = attemptsCount > 0 ? Math.round((correctCount / attemptsCount) * 100) : null;
    const completionRate = attemptsCount > 0 ? `${Math.round((correctCount / attemptsCount) * 100)}%` : null;

    const todayAlarm = userAlarmsList.length > 0 ? userAlarmsList[0] : null;

    res.status(200).json({
      success: true,
      message: 'User Dashboard Telemetry',
      data: {
        role: req.user?.role,
        userId: req.user?.userId,
        email: req.user?.email,
        todaysAlarm: todayAlarm,
        challengeMetrics: {
          completionRate,
          accuracy: accuracy !== null ? `${accuracy}%` : null,
          totalCompleted: attemptsCount,
          correctAnswers: correctCount,
        },
        recentAttempts: attempts.slice(0, 5),
        dashboardInfo: {
          title: 'Cognitive Readiness Overview',
          status: 'Active',
          cognitiveScore: attemptsCount > 0 ? 'Optimal Focus Ready' : 'No data yet',
        },
      },
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: err.message || 'Error fetching user dashboard',
    });
  }
};

export const getCoachDashboard = async (req: Request, res: Response): Promise<void> => {
  try {
    const coachId = req.user?.userId;

    const assignments = await db
      .select()
      .from(coachUserAssignments)
      .where(eq(coachUserAssignments.coachId, coachId || ''));

    const assignedUserIds = assignments.map((a) => a.userId);
    let userList = await db.select().from(users).where(eq(users.role, 'user'));
    if (assignedUserIds.length > 0) {
      userList = await db.select().from(users).where(inArray(users.id, assignedUserIds));
    }

    const totalUsersCount = userList.length;

    const clientPerformance = await Promise.all(
      userList.map(async (u) => {
        const attempts = await db.select().from(challengeAttempts).where(eq(challengeAttempts.userId, u.id));
        const verifications = await db.select().from(wakeUpVerifications).where(eq(wakeUpVerifications.userId, u.id));
        const uHabits = await db.select().from(habits).where(eq(habits.userId, u.id));
        const uSnoozes = await db.select().from(snoozeLogs).where(eq(snoozeLogs.userId, u.id));

        const attemptsCount = attempts.length;
        const correctCount = attempts.filter((a) => a.isCorrect).length;
        const acc = attemptsCount > 0 ? Math.round((correctCount / attemptsCount) * 100) : null;

        const verifiedCount = verifications.filter((v) => v.wakeUpVerified).length;
        const comp = verifications.length > 0 ? Math.round((verifiedCount / verifications.length) * 100) : null;

        const totalSnoozes = uSnoozes.reduce((sum, s) => sum + (s.snoozeCount || 1), 0);
        const streak = uHabits.length > 0 ? Math.max(...uHabits.map((h) => h.currentStreak || 0), 0) : 0;

        let status = 'No data yet';
        if (attemptsCount > 0 || verifications.length > 0) {
          if (totalSnoozes > 3 || (acc !== null && acc < 60)) {
            status = 'Attention Needed';
          } else if (acc !== null && acc >= 85) {
            status = 'Optimal';
          } else {
            status = 'Good';
          }
        }

        return {
          id: u.id,
          name: u.name,
          email: u.email,
          streak: attemptsCount > 0 || verifications.length > 0 ? streak : 'No data yet',
          compliance: comp !== null ? `${comp}%` : 'No data yet',
          challengeCompletion: attemptsCount > 0 ? `${attemptsCount} attempts` : 'No data yet',
          challengeAccuracy: acc !== null ? `${acc}%` : 'No data yet',
          status,
        };
      })
    );

    res.status(200).json({
      success: true,
      message: 'Coach Dashboard Telemetry',
      data: {
        role: req.user?.role,
        userId: req.user?.userId,
        email: req.user?.email,
        clientPerformance,
        summaryMetrics: {
          assignedClientsCount: totalUsersCount,
        },
        dashboardInfo: {
          title: 'Coach Supervision Panel',
          assignedTraineesCount: totalUsersCount,
        },
      },
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: err.message || 'Error fetching coach dashboard',
    });
  }
};

export const getAdminDashboard = async (req: Request, res: Response): Promise<void> => {
  try {
    const dbUsers = await db.select().from(users);
    const totalUsersCount = dbUsers.length;
    const totalCoachesCount = dbUsers.filter((u) => u.role === 'coach').length;
    const activeUsersCount = dbUsers.filter((u) => u.status === 'active').length;

    const dbAlarms = await db.select().from(alarms);
    const activeAlarmsCount = dbAlarms.filter((a) => a.activeStatus).length;

    const dbHabits = await db.select().from(habits);
    const habitCount = dbHabits.length;

    const dbChallenges = await db.select().from(challenges);
    const totalChallengesCount = dbChallenges.length;

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
      const calculatedScore = calculateHabitScore({
        wakeUpConsistency: avgWakeUpConsistency,
        challengeCompletion: avgChallengeAccuracy,
        snoozeReduction: Math.max(0, 100 - avgSnoozeRate),
        sleepAdherence: 80,
      });
      avgHabitScore = calculatedScore.overall_score;
    }

    res.status(200).json({
      success: true,
      message: 'Admin Dashboard Telemetry',
      data: {
        role: req.user?.role,
        userId: req.user?.userId,
        email: req.user?.email,
        platformMetrics: {
          totalUsers: totalUsersCount,
          activeUsers: activeUsersCount,
          avgHabitScore,
          avgWakeUpConsistency: avgWakeUpConsistency !== null ? `${avgWakeUpConsistency}%` : 'No data yet',
          avgChallengeAccuracy: avgChallengeAccuracy !== null ? `${avgChallengeAccuracy}%` : 'No data yet',
          avgSnoozeRate: `${avgSnoozeRate}%`,
        },
        challengeStats: {
          totalChallenges: totalChallengesCount,
          totalChallengeAttempts: totalAttemptsCount,
          platformAccuracy: avgChallengeAccuracy !== null ? `${avgChallengeAccuracy}%` : 'No data yet',
        },
        dashboardInfo: {
          title: 'System Management & Platform Overview',
          totalUsers: totalUsersCount,
          activeUsers: activeUsersCount,
          avgHabitScore: avgHabitScore !== null ? avgHabitScore : 'No data yet',
          avgWakeUpConsistency: avgWakeUpConsistency !== null ? `${avgWakeUpConsistency}%` : 'No data yet',
          avgChallengeAccuracy: avgChallengeAccuracy !== null ? `${avgChallengeAccuracy}%` : 'No data yet',
          avgSnoozeRate: `${avgSnoozeRate}%`,
          totalCoaches: totalCoachesCount,
          totalActiveAlarms: activeAlarmsCount,
          totalHabits: habitCount,
          totalChallenges: totalChallengesCount,
          totalAttempts: totalAttemptsCount,
          systemHealth: '100% Operational',
          rolesDistribution: {
            users: dbUsers.filter((u) => u.role === 'user').length,
            coaches: totalCoachesCount,
            admins: dbUsers.filter((u) => u.role === 'admin').length,
          },
        },
      },
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: err.message || 'Error fetching admin dashboard',
    });
  }
};

export const getCoachUserDetail = async (req: Request<{ targetUserId: string }>, res: Response): Promise<void> => {
  try {
    const { targetUserId } = req.params;
    const { getOverviewAnalytics, getWakeUpAnalytics, getChallengeAnalytics, getHabitAnalytics } = await import('../services/behavioralAnalytics.service.js');
    const { getAdaptiveDifficultyForUser } = await import('../services/adaptiveDifficulty.service.js');

    const overview = await getOverviewAnalytics(targetUserId);
    const wakeup = await getWakeUpAnalytics(targetUserId);
    const challenges = await getChallengeAnalytics(targetUserId);
    const habitsAnalyticsData = await getHabitAnalytics(targetUserId);
    const adaptive = await getAdaptiveDifficultyForUser(targetUserId);

    res.status(200).json({
      success: true,
      message: 'User Detailed Supervision Telemetry',
      data: {
        targetUserId,
        overview,
        wakeup,
        challenges,
        habits: habitsAnalyticsData,
        adaptiveDifficulty: adaptive,
      },
    });
  } catch (_err) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user telemetry detail',
    });
  }
};
