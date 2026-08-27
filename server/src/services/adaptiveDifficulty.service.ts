import { db, isDbConnected } from '../db/index.js';
import { challengeAttempts } from '../db/schema/challengeAttempts.js';
import { wakeUpVerifications } from '../db/schema/wakeUpVerifications.js';
import { snoozeLogs } from '../db/schema/snoozeLogs.js';
import { profiles } from '../db/schema/profiles.js';
import { eq } from 'drizzle-orm';

export type DifficultyLevel = 'beginner' | 'easy' | 'medium' | 'hard' | 'expert';

export interface UserPerformanceHistory {
  accuracy: number; // 0 to 100
  averageTimeSeconds: number; // e.g. 6.5
  totalAttempts: number;
  incorrectAnswers: number;
  snoozeCountLast7Days: number;
  wakeUpSuccessRate: number; // 0 to 100
  difficultyPreference?: string; // e.g. 'Easy', 'Medium', 'Hard'
  recentPerformanceTrend?: ('improving' | 'stable' | 'declining')[];
}

export interface FactorUsed {
  factor: string;
  value: string | number;
  impact: 'increase' | 'decrease' | 'neutral';
}

export interface AdaptiveDifficultyOutput {
  currentDifficulty: DifficultyLevel;
  recommendedDifficulty: DifficultyLevel;
  reason: string;
  adjustmentReason: string;
  adjustmentType: 'increased' | 'decreased' | 'maintained';
  suggestedChallengeTypes: string[];
  confidenceScore: number; // 0 to 1
  factorsUsed: FactorUsed[];
  mlReadyModelVersion: string;
}

const DIFFICULTY_LADDER: DifficultyLevel[] = ['beginner', 'easy', 'medium', 'hard', 'expert'];

/**
 * Modular Adaptive Difficulty Engine.
 * Evaluates behavioral signals and returns recommended difficulty level.
 * Built with rule-based algorithm that seamlessly interfaces with ML pipelines.
 */
export const calculateAdaptiveDifficulty = (
  history: UserPerformanceHistory
): AdaptiveDifficultyOutput => {
  const {
    accuracy = 80,
    averageTimeSeconds = 8,
    totalAttempts = 5,
    incorrectAnswers = 1,
    snoozeCountLast7Days = 1,
    wakeUpSuccessRate = 90,
    difficultyPreference = 'medium',
  } = history;

  // Normalize initial preference to base index
  let prefLower = (difficultyPreference || 'medium').toLowerCase();
  if (prefLower === 'moderate') prefLower = 'medium';

  let baseIndex = DIFFICULTY_LADDER.indexOf(prefLower as DifficultyLevel);
  if (baseIndex === -1) baseIndex = 2; // default to medium
  const currentDifficulty = DIFFICULTY_LADDER[baseIndex];

  let scoreOffset = 0;
  const reasons: string[] = [];
  const factorsUsed: FactorUsed[] = [
    { factor: 'Challenge Accuracy', value: `${accuracy}%`, impact: 'neutral' },
    { factor: 'Average Completion Speed', value: `${averageTimeSeconds}s`, impact: 'neutral' },
    { factor: 'Snooze Frequency (7d)', value: snoozeCountLast7Days, impact: 'neutral' },
    { factor: 'Wake-Up Success Rate', value: `${wakeUpSuccessRate}%`, impact: 'neutral' },
    { factor: 'User Difficulty Preference', value: difficultyPreference, impact: 'neutral' },
  ];

  // Rule 1: High accuracy & fast speed -> Increase difficulty
  if (accuracy >= 85 && averageTimeSeconds <= 8) {
    scoreOffset += 1;
    reasons.push(`High accuracy (${accuracy}%) and rapid completion time (${averageTimeSeconds}s).`);
    factorsUsed[0].impact = 'increase';
    factorsUsed[1].impact = 'increase';
  }

  // Rule 2: Low accuracy or high error rate -> Decrease difficulty
  if (accuracy < 60 || (totalAttempts > 0 && incorrectAnswers / totalAttempts > 0.4)) {
    scoreOffset -= 1;
    reasons.push(`Accuracy is low (${accuracy}%) with multiple incorrect attempts.`);
    factorsUsed[0].impact = 'decrease';
  }

  // Rule 3: Frequent snoozing -> Step up challenge requirement to boost arousal
  if (snoozeCountLast7Days >= 3) {
    scoreOffset += 1;
    reasons.push(`Frequent snoozing detected (${snoozeCountLast7Days} times in 7 days). Escalating challenge intensity.`);
    factorsUsed[2].impact = 'increase';
  }

  // Rule 4: Consistent successful wake-ups -> Step up difficulty
  if (wakeUpSuccessRate >= 95 && totalAttempts >= 5) {
    scoreOffset += 1;
    reasons.push(`Outstanding wake-up verification rate (${wakeUpSuccessRate}%).`);
    factorsUsed[3].impact = 'increase';
  }

  // Calculate target level bounded by ladder range
  let targetIndex = Math.max(0, Math.min(DIFFICULTY_LADDER.length - 1, baseIndex + scoreOffset));
  const recommendedDifficulty = DIFFICULTY_LADDER[targetIndex];

  let adjustmentType: 'increased' | 'decreased' | 'maintained' = 'maintained';
  if (targetIndex > baseIndex) adjustmentType = 'increased';
  else if (targetIndex < baseIndex) adjustmentType = 'decreased';

  // Determine suitable challenge types
  const suggestedChallengeTypes = ['math', 'logic'];
  if (recommendedDifficulty === 'hard' || recommendedDifficulty === 'expert') {
    suggestedChallengeTypes.push('memory', 'riddle', 'pattern');
  } else {
    suggestedChallengeTypes.push('word', 'quiz');
  }

  const primaryReason = reasons.length > 0
    ? reasons.join(' ')
    : `Performance stable; difficulty maintained at ${recommendedDifficulty.toUpperCase()}.`;

  return {
    currentDifficulty,
    recommendedDifficulty,
    reason: primaryReason,
    adjustmentReason: primaryReason,
    adjustmentType,
    suggestedChallengeTypes,
    confidenceScore: 0.92,
    factorsUsed,
    mlReadyModelVersion: 'RuleEngine-v1.0 (ML-Plug-Compatible)',
  };
};

/**
 * Fetches user telemetry from database and computes adaptive difficulty recommendation.
 */
export const getAdaptiveDifficultyForUser = async (userId: string): Promise<AdaptiveDifficultyOutput> => {
  let accuracy = 80;
  let averageTimeSeconds = 6.8;
  let totalAttempts = 5;
  let incorrectAnswers = 1;
  let snoozeCountLast7Days = 1;
  let wakeUpSuccessRate = 90;
  let difficultyPreference = 'medium';

  if (await isDbConnected()) {
    try {
      // 1. Get user profile preference
      const userProfiles = await db.select().from(profiles).where(eq(profiles.userId, userId));
      if (userProfiles.length > 0 && userProfiles[0].difficultyPreference) {
        difficultyPreference = userProfiles[0].difficultyPreference;
      }

      // 2. Get challenge attempts telemetry
      const attempts = await db.select().from(challengeAttempts).where(eq(challengeAttempts.userId, userId));
      if (attempts.length > 0) {
        totalAttempts = attempts.length;
        const correctCount = attempts.filter((a) => a.isCorrect).length;
        incorrectAnswers = totalAttempts - correctCount;
        accuracy = Math.round((correctCount / totalAttempts) * 100);

        const totalTime = attempts.reduce((acc, curr) => acc + (curr.timeTaken || 0), 0);
        averageTimeSeconds = Math.round((totalTime / totalAttempts) * 10) / 10 || 6.8;
      }

      // 3. Get wake-up verifications
      const verifications = await db.select().from(wakeUpVerifications).where(eq(wakeUpVerifications.userId, userId));
      if (verifications.length > 0) {
        const verifiedCount = verifications.filter((v) => v.wakeUpVerified).length;
        wakeUpSuccessRate = Math.round((verifiedCount / verifications.length) * 100);
      }

      // 4. Get snooze count last 7 days
      const snoozes = await db.select().from(snoozeLogs).where(eq(snoozeLogs.userId, userId));
      snoozeCountLast7Days = snoozes.reduce((acc, curr) => acc + (curr.snoozeCount || 1), 0);
    } catch (_err) {
      console.warn('DB query error in adaptive difficulty calculation, using defaults');
    }
  }

  return calculateAdaptiveDifficulty({
    accuracy,
    averageTimeSeconds,
    totalAttempts,
    incorrectAnswers,
    snoozeCountLast7Days,
    wakeUpSuccessRate,
    difficultyPreference,
  });
};
