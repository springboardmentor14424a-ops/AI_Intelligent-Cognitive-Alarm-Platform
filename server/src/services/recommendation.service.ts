import { db, isDbConnected } from '../db/index.js';
import { challengeAttempts } from '../db/schema/challengeAttempts.js';
import { wakeUpVerifications } from '../db/schema/wakeUpVerifications.js';
import { snoozeLogs } from '../db/schema/snoozeLogs.js';
import { sleepLogs } from '../db/schema/sleepLogs.js';
import { habits } from '../db/schema/habits.js';
import { eq } from 'drizzle-orm';

export interface UserTelemetryData {
  hasSufficientData: boolean;
  snoozeCountLast7Days: number;
  challengeAccuracy: number; // 0-100
  wakeUpConsistency: number; // 0-100
  sleepAdherence: number; // 0-100
  averageChallengeTime: number; // seconds
  productivityGoal?: string;
  currentDifficulty?: string;
  habitStreak?: number;
}

export interface RecommendationItem {
  id: string;
  category: string;
  title: string;
  description: string;
  reason: string; // Rationale for explainability
  priority: 'high' | 'medium' | 'low';
  actionableStep?: string;
  created_at: string;
}

/**
 * Modular Rule-Based Recommendation Engine.
 * Analyzes telemetry and generates personalized recommendations strictly based on real conditions.
 */
export const generateRecommendations = (data: UserTelemetryData): RecommendationItem[] => {
  if (!data.hasSufficientData) {
    return [];
  }

  const recommendations: RecommendationItem[] = [];
  const nowStr = new Date().toISOString();

  const {
    snoozeCountLast7Days = 0,
    challengeAccuracy = 0,
    wakeUpConsistency = 0,
    sleepAdherence = 0,
    averageChallengeTime = 0,
    productivityGoal = 'Maintain peak morning focus',
    currentDifficulty = 'Medium',
    habitStreak = 0,
  } = data;

  // 1. Sleep Improvement Recommendations
  if (sleepAdherence > 0 && sleepAdherence < 75) {
    recommendations.push({
      id: `rec-sleep-${Date.now()}-1`,
      category: 'Sleep Improvement',
      title: 'Maintain a Consistent Bedtime Schedule',
      description: 'Go to sleep and wake up within a 20-minute window every day, including weekends.',
      reason: `Sleep schedule adherence is currently at ${sleepAdherence}%. Irregular bedtimes cause circadian disruption.`,
      priority: 'high',
      actionableStep: 'Set a fixed bedtime reminder for 10:30 PM.',
      created_at: nowStr,
    });
  } else if (sleepAdherence >= 75) {
    recommendations.push({
      id: `rec-sleep-${Date.now()}-2`,
      category: 'Sleep Improvement',
      title: 'Maintain Optimal Sleep Rhythm',
      description: 'Your sleep schedule adherence is solid. Keep protecting your pre-sleep wind-down routine.',
      reason: `Sleep schedule adherence is high (${sleepAdherence}%).`,
      priority: 'low',
      actionableStep: 'Continue avoiding screens 30 minutes before bedtime.',
      created_at: nowStr,
    });
  }

  // 2. Wake-Up Optimization Suggestions
  if (snoozeCountLast7Days >= 3) {
    recommendations.push({
      id: `rec-snooze-${Date.now()}-1`,
      category: 'Wake-Up Optimization',
      title: 'Reduce Repeated Snoozing with Adaptive Puzzles',
      description: 'You snoozed 3+ times recently. Elevating morning puzzle difficulty prevents reflexive snoozing.',
      reason: `Frequent snoozing (${snoozeCountLast7Days} times recently) indicates morning REM disruption and sleep inertia.`,
      priority: 'high',
      actionableStep: 'Enable Smart Adaptive Difficulty in your alarm settings.',
      created_at: nowStr,
    });
  } else if (wakeUpConsistency > 0 && wakeUpConsistency < 75) {
    recommendations.push({
      id: `rec-wakeup-${Date.now()}-1`,
      category: 'Wake-Up Optimization',
      title: 'Establish a Fixed Morning Light & Hydration Routine',
      description: 'Combine immediate natural light exposure with hydration right after solving your alarm challenge.',
      reason: `Wake-up consistency is currently at ${wakeUpConsistency}%. Bright light halts melatonin secretion immediately.`,
      priority: 'high',
      actionableStep: 'Open curtains immediately after completing the wake-up verification puzzle.',
      created_at: nowStr,
    });
  }

  // 3. Habit Improvement Guidance (identifies weakest component)
  const compScores = [
    { name: 'Wake-Up Consistency', score: wakeUpConsistency, category: 'Habit Improvement' },
    { name: 'Challenge Completion', score: challengeAccuracy, category: 'Habit Improvement' },
    { name: 'Snooze Reduction', score: 100 - snoozeCountLast7Days * 12, category: 'Habit Improvement' },
    { name: 'Sleep Schedule Adherence', score: sleepAdherence, category: 'Habit Improvement' },
  ];
  compScores.sort((a, b) => a.score - b.score);
  const weakest = compScores[0];

  if (weakest.score < 70) {
    recommendations.push({
      id: `rec-habit-${Date.now()}-1`,
      category: 'Habit Improvement',
      title: `Optimize ${weakest.name}`,
      description: `Your ${weakest.name} score is currently your lowest habit component (${Math.max(0, Math.round(weakest.score))}%). Focused improvement here yields the largest Habit Score increase.`,
      reason: `${weakest.name} is detected as your primary bottleneck for behavioral consistency.`,
      priority: 'high',
      actionableStep: `Prioritize ${weakest.name.toLowerCase()} targets for the next 7 days.`,
      created_at: nowStr,
    });
  } else if (habitStreak >= 5) {
    recommendations.push({
      id: `rec-habit-${Date.now()}-2`,
      category: 'Habit Improvement',
      title: 'Maintain Your Current Habit Routine',
      description: `You have built a strong habit streak of ${habitStreak} days! Stack a new morning focus ritual onto this foundation.`,
      reason: `Consistent habit completion (${habitStreak}-day streak) strengthens neural habit loops.`,
      priority: 'low',
      actionableStep: 'Keep completing your daily morning habits.',
      created_at: nowStr,
    });
  }

  // 4. Productivity Recommendations
  if (productivityGoal) {
    recommendations.push({
      id: `rec-prod-${Date.now()}-1`,
      category: 'Productivity',
      title: 'Align Awakening Routine with Productivity Goal',
      description: `Your goal is "${productivityGoal}". Achieving top morning wake-up consistency creates an immediate focus window.`,
      reason: `Morning behavioral discipline directly correlates with achieving your productivity goal: "${productivityGoal}".`,
      priority: 'medium',
      actionableStep: 'Schedule 30 minutes of deep focus work within 1 hour of waking up.',
      created_at: nowStr,
    });
  }

  // 5. Personalized Challenge Recommendations
  if (challengeAccuracy > 0 && challengeAccuracy < 65) {
    recommendations.push({
      id: `rec-diff-${Date.now()}-1`,
      category: 'Personalized Challenges',
      title: 'Temporarily Lower Challenge Difficulty',
      description: 'Step down your puzzle difficulty to Easy or Moderate to build confidence and reduce morning friction.',
      reason: `Recent challenge accuracy is low (${challengeAccuracy}%), leading to multiple failed attempts during wake-up.`,
      priority: 'medium',
      actionableStep: 'Select Easy Math or Word puzzles in your alarm settings.',
      created_at: nowStr,
    });
  } else if (challengeAccuracy >= 85 && averageChallengeTime <= 10) {
    recommendations.push({
      id: `rec-diff-${Date.now()}-2`,
      category: 'Personalized Challenges',
      title: 'Increase Cognitive Challenge Difficulty',
      description: 'Your accuracy is consistently high (85%+). Elevate puzzle difficulty to Hard or Expert to maximize cognitive arousal.',
      reason: `Rapid solving speed (${averageChallengeTime}s avg) and accuracy (${challengeAccuracy}%) show mastery of ${currentDifficulty} level.`,
      priority: 'medium',
      actionableStep: 'Try Memory Matrix or Pattern puzzles for tomorrow morning.',
      created_at: nowStr,
    });
  }

  return recommendations;
};

/**
 * Fetches user telemetry from database and generates personalized recommendations based strictly on real DB records.
 */
export const getRecommendationsForUser = async (userId: string): Promise<RecommendationItem[]> => {
  let snoozeCountLast7Days = 0;
  let challengeAccuracy = 0;
  let wakeUpConsistency = 0;
  let sleepAdherence = 0;
  let averageChallengeTime = 0;
  let currentDifficulty = 'Medium';
  let habitStreak = 0;
  let productivityGoal = 'Maintain peak morning focus';
  let hasSufficientData = false;

  if (await isDbConnected()) {
    try {
      // Challenge attempts
      const attempts = await db.select().from(challengeAttempts).where(eq(challengeAttempts.userId, userId));
      if (attempts.length > 0) {
        hasSufficientData = true;
        const correct = attempts.filter((a) => a.isCorrect).length;
        challengeAccuracy = Math.round((correct / attempts.length) * 100);
        const totalTime = attempts.reduce((acc, curr) => acc + (curr.timeTaken || 0), 0);
        averageChallengeTime = Math.round((totalTime / attempts.length) * 10) / 10 || 0;
      }

      // Wake-up verifications
      const verifications = await db.select().from(wakeUpVerifications).where(eq(wakeUpVerifications.userId, userId));
      if (verifications.length > 0) {
        hasSufficientData = true;
        const verified = verifications.filter((v) => v.wakeUpVerified).length;
        wakeUpConsistency = Math.round((verified / verifications.length) * 100);
      }

      // Snooze logs
      const snoozes = await db.select().from(snoozeLogs).where(eq(snoozeLogs.userId, userId));
      if (snoozes.length > 0) {
        hasSufficientData = true;
        snoozeCountLast7Days = snoozes.reduce((acc, curr) => acc + (curr.snoozeCount || 1), 0);
      }

      // Habits
      const userHabits = await db.select().from(habits).where(eq(habits.userId, userId));
      if (userHabits.length > 0) {
        hasSufficientData = true;
        habitStreak = Math.max(...userHabits.map((h) => h.currentStreak || 0), 0);
      }

      // Sleep logs
      const sleeps = await db.select().from(sleepLogs).where(eq(sleepLogs.userId, userId));
      if (sleeps.length > 0) {
        hasSufficientData = true;
        const optimal = sleeps.filter((s) => Number(s.sleepDurationHours) >= 7).length;
        sleepAdherence = Math.round((optimal / sleeps.length) * 100);
      }
    } catch (_err) {
      console.warn('DB error reading user telemetry for recommendations');
    }
  }

  return generateRecommendations({
    hasSufficientData,
    snoozeCountLast7Days,
    challengeAccuracy,
    wakeUpConsistency,
    sleepAdherence,
    averageChallengeTime,
    currentDifficulty,
    productivityGoal,
    habitStreak,
  });
};

export const getRecommendationsByCategory = async (
  userId: string,
  categoryParam: string
): Promise<RecommendationItem[]> => {
  const allRecs = await getRecommendationsForUser(userId);
  const normalizedCategory = categoryParam.toLowerCase().replace(/[-_]/g, '');

  return allRecs.filter((rec) => {
    const recCat = rec.category.toLowerCase().replace(/[-_]/g, '');
    if (normalizedCategory === 'sleep') return recCat.includes('sleep');
    if (normalizedCategory === 'wakeup') return recCat.includes('wakeup') || recCat.includes('wake');
    if (normalizedCategory === 'habit' || normalizedCategory === 'habits') return recCat.includes('habit');
    if (normalizedCategory === 'productivity') return recCat.includes('productiv');
    if (normalizedCategory === 'challenge' || normalizedCategory === 'challenges') return recCat.includes('challenge');
    return recCat === normalizedCategory;
  });
};

