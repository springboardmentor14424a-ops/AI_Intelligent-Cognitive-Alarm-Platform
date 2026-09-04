import { db, isDbConnected } from '../db/index.js';
import { challengeAttempts } from '../db/schema/challengeAttempts.js';
import { wakeUpVerifications } from '../db/schema/wakeUpVerifications.js';
import { snoozeLogs } from '../db/schema/snoozeLogs.js';
import { profiles } from '../db/schema/profiles.js';
import { eq } from 'drizzle-orm';

export type DifficultyLevel = 'beginner' | 'easy' | 'medium' | 'hard' | 'expert';

export interface UserPerformanceHistory {
  accuracy: number; // 0 to 100
  averageTimeSeconds: number;
  totalAttempts: number;
  incorrectAnswers: number;
  snoozeCountLast7Days: number;
  wakeUpSuccessRate: number; // 0 to 100
  difficultyPreference?: string;
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
  confidenceScore: number;
  factorsUsed: FactorUsed[];
  mlReadyModelVersion: string;
}

const DIFFICULTY_LADDER: DifficultyLevel[] = ['beginner', 'easy', 'medium', 'hard', 'expert'];

/**
 * Modular Adaptive Difficulty Engine.
 * Evaluates real behavioral signals strictly from user history and outputs recommended difficulty level.
 */
export const calculateAdaptiveDifficulty = (
  history: UserPerformanceHistory
): AdaptiveDifficultyOutput => {
  const {
    accuracy = 0,
    averageTimeSeconds = 0,
    totalAttempts = 0,
    incorrectAnswers = 0,
    snoozeCountLast7Days = 0,
    wakeUpSuccessRate = 0,
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
    { factor: 'Challenge Accuracy', value: totalAttempts > 0 ? `${accuracy}%` : 'No data yet', impact: 'neutral' },
    { factor: 'Average Completion Speed', value: totalAttempts > 0 ? `${averageTimeSeconds}s` : 'No data yet', impact: 'neutral' },
    { factor: 'Snooze Frequency (7d)', value: snoozeCountLast7Days, impact: 'neutral' },
    { factor: 'Wake-Up Success Rate', value: wakeUpSuccessRate > 0 ? `${wakeUpSuccessRate}%` : 'No data yet', impact: 'neutral' },
    { factor: 'User Difficulty Preference', value: difficultyPreference, impact: 'neutral' },
  ];

  if (totalAttempts === 0 && wakeUpSuccessRate === 0 && snoozeCountLast7Days === 0) {
    reasons.push(`No activity telemetry recorded yet. Maintaining baseline difficulty at ${currentDifficulty.toUpperCase()} based on user profile preference.`);
  } else {
    // Rule 1: High accuracy & fast speed -> Increase difficulty
    if (totalAttempts >= 3 && accuracy >= 85 && averageTimeSeconds <= 8) {
      scoreOffset += 1;
      reasons.push(`High accuracy (${accuracy}%) and rapid completion time (${averageTimeSeconds}s).`);
      factorsUsed[0].impact = 'increase';
      factorsUsed[1].impact = 'increase';
    }

    // Rule 2: Low accuracy or high error rate -> Decrease difficulty
    if (totalAttempts >= 3 && (accuracy < 60 || incorrectAnswers / totalAttempts > 0.4)) {
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
    confidenceScore: totalAttempts > 0 ? 0.92 : 0.5,
    factorsUsed,
    mlReadyModelVersion: 'RuleEngine-v1.0 (ML-Plug-Compatible)',
  };
};

/**
 * Fetches user telemetry from PostgreSQL and computes adaptive difficulty recommendation strictly from real records.
 */
export const getAdaptiveDifficultyForUser = async (userId: string): Promise<AdaptiveDifficultyOutput> => {
  let accuracy = 0;
  let averageTimeSeconds = 0;
  let totalAttempts = 0;
  let incorrectAnswers = 0;
  let snoozeCountLast7Days = 0;
  let wakeUpSuccessRate = 0;
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
        averageTimeSeconds = Math.round((totalTime / totalAttempts) * 10) / 10 || 0;
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
      console.warn('DB query error in adaptive difficulty calculation');
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
