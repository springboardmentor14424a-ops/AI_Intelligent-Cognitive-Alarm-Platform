export interface UserAdaptiveContext {
  difficultyPreference: 'Easy' | 'Moderate' | 'High' | 'Expert' | string;
  snoozeCountLast7Days?: number;
  successfulWakeupsLast7Days?: number;
}

export type ChallengeDifficulty = 'Easy' | 'Moderate' | 'High' | 'Expert';

/**
 * Calculates adaptive difficulty for a smart alarm based on user preference and recent behavior.
 * 
 * Rules:
 * 1. Base difficulty originates from the user's Profile difficultyPreference.
 * 2. High snooze frequency (> 2 snoozes) escalates challenge difficulty by +1 tier.
 * 3. High wake consistency (>= 5 consecutive wakeups) maintains current level or provides positive reinforcement.
 */
export const calculateSmartAdaptiveDifficulty = (
  context: UserAdaptiveContext
): ChallengeDifficulty => {
  const basePreference = (context.difficultyPreference || 'Moderate') as ChallengeDifficulty;
  const snoozeCount = context.snoozeCountLast7Days || 0;

  // Escalation rule matrix
  const difficultyTiers: ChallengeDifficulty[] = ['Easy', 'Moderate', 'High', 'Expert'];
  let currentTierIndex = difficultyTiers.indexOf(basePreference);
  if (currentTierIndex === -1) currentTierIndex = 1; // Fallback Moderate

  // If user frequently snoozes, bump difficulty level
  if (snoozeCount >= 3) {
    currentTierIndex = Math.min(difficultyTiers.length - 1, currentTierIndex + 2);
  } else if (snoozeCount >= 1) {
    currentTierIndex = Math.min(difficultyTiers.length - 1, currentTierIndex + 1);
  }

  return difficultyTiers[currentTierIndex];
};
