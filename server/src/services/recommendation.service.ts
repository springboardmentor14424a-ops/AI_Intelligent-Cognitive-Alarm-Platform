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
  category: 'Sleep Improvement' | 'Wake-up Optimization' | 'Habit Improvement' | 'Productivity' | 'Challenge Difficulty' | 'sleep' | 'wakeup' | 'habit' | 'challenge' | 'productivity';
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
    currentDifficulty = 'Medium',
    habitStreak = 0,
  } = data;

  // 1. High Snooze Rate -> Recommend reducing snooze usage and improving sleep schedule
  if (snoozeCountLast7Days >= 3) {
    recommendations.push({
      id: `rec-snooze-${Date.now()}-1`,
      category: 'Sleep Improvement',
      title: 'Advance Bedtime by 30 Minutes',
      description: 'You snoozed 3+ times this week. Shift your sleep onset 30 minutes earlier to prevent morning sleep inertia.',
      reason: `Frequent snoozing (${snoozeCountLast7Days} times recently) indicates morning REM disruption and sleep deficit.`,
      priority: 'high',
      actionableStep: 'Set a Digital Sunset alarm at 10:15 PM and turn off screens.',
      created_at: nowStr,
    });
    recommendations.push({
      id: `rec-snooze-${Date.now()}-2`,
      category: 'Wake-up Optimization',
      title: 'Reduce Snooze Usage with High-Focus Challenge',
      description: 'Switching your morning puzzle to Hard or Logic mode prevents reflexive snoozing by requiring immediate prefrontal activation.',
      reason: 'Passive alarms allow easy snooze overrides. High cognitive demand forces immediate mental clarity.',
      priority: 'high',
      actionableStep: 'Enable Smart Adaptive Difficulty for your morning alarm.',
      created_at: nowStr,
    });
  }

  // 2. Low Challenge Accuracy -> Recommend temporarily lowering challenge difficulty
  if (challengeAccuracy > 0 && challengeAccuracy < 65) {
    recommendations.push({
      id: `rec-diff-${Date.now()}-1`,
      category: 'Challenge Difficulty',
      title: 'Temporarily Lower Challenge Difficulty',
      description: 'Step down your puzzle difficulty to Beginner or Easy to build confidence and reduce morning friction.',
      reason: `Recent challenge accuracy is low (${challengeAccuracy}%), leading to multiple failed attempts during wake-up.`,
      priority: 'medium',
      actionableStep: 'Select Easy Math or Word puzzles in your alarm settings.',
      created_at: nowStr,
    });
  }

  // 3. High Challenge Accuracy -> Recommend increasing challenge difficulty
  if (challengeAccuracy >= 88 && averageChallengeTime <= 8) {
    recommendations.push({
      id: `rec-diff-${Date.now()}-2`,
      category: 'Challenge Difficulty',
      title: 'Increase Cognitive Challenge Difficulty',
      description: 'Your accuracy is consistently high (88%+). Elevate puzzle difficulty to Hard or Expert to maximize cognitive arousal.',
      reason: `Rapid solving speed (${averageChallengeTime}s avg) and accuracy (${challengeAccuracy}%) show mastery of ${currentDifficulty} level.`,
      priority: 'medium',
      actionableStep: 'Try Memory Matrix or Pattern puzzles for tomorrow morning.',
      created_at: nowStr,
    });
  }

  // 4. Low Sleep Schedule Adherence -> Recommend maintaining a consistent bedtime
  if (sleepAdherence > 0 && sleepAdherence < 70) {
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
  }

  // 5. Low Wake-up Consistency -> Recommend establishing a fixed wake-up routine
  if (wakeUpConsistency > 0 && wakeUpConsistency < 75) {
    recommendations.push({
      id: `rec-wakeup-${Date.now()}-1`,
      category: 'Wake-up Optimization',
      title: 'Establish a Fixed Wake-up Routine',
      description: 'Combine immediate natural light exposure with hydration right after solving your alarm challenge.',
      reason: `Wake-up consistency is currently at ${wakeUpConsistency}%. Bright light halts melatonin secretion immediately.`,
      priority: 'high',
      actionableStep: 'Open curtains immediately after completing the wake-up verification puzzle.',
      created_at: nowStr,
    });
  }

  // 6. Habit Streak Improving -> Recommend maintaining current routine
  if (habitStreak >= 5) {
    recommendations.push({
      id: `rec-habit-${Date.now()}-1`,
      category: 'Habit Improvement',
      title: 'Maintain Your Current Habit Routine',
      description: `You have built a strong habit streak of ${habitStreak} days! Stack a new morning focus ritual onto this foundation.`,
      reason: `Consistent habit completion (${habitStreak}-day streak) strengthens neural habit loops.`,
      priority: 'low',
      actionableStep: 'Keep completing your daily hydration and cognitive morning habits.',
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
    habitStreak,
  });
};
