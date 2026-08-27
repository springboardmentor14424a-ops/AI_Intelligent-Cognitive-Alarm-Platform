export interface HabitScoreComponents {
  wakeUpConsistency: number; // 0-100
  challengeCompletion: number; // 0-100
  snoozeReduction: number; // 0-100
  sleepAdherence: number; // 0-100
}

export type HabitScoreCategory = 'Needs Improvement' | 'Developing' | 'Good' | 'Excellent';

export interface HabitScoreResult {
  overall_score: number; // 0-100
  overallScore: number; // 0-100 for compatibility
  wake_up_consistency: number;
  challenge_completion: number;
  snooze_reduction: number;
  sleep_adherence: number;
  score_category: HabitScoreCategory;
  grade: HabitScoreCategory; // alias for compatibility
  score_breakdown: {
    wakeUpContribution: number;
    challengeContribution: number;
    snoozeContribution: number;
    sleepContribution: number;
  };
  weightedContribution: {
    wakeUpContribution: number;
    challengeContribution: number;
    snoozeContribution: number;
    sleepContribution: number;
  };
  summaryMessage: string;
}

/**
 * Calculates weighted Habit Score based on user behavioral telemetry.
 * Formula:
 * Habit Score = (Wake-Up Consistency * 0.35) + (Challenge Completion * 0.25) + (Snooze Reduction * 0.20) + (Sleep Schedule Adherence * 0.20)
 * Categories:
 * 0–39 = Needs Improvement
 * 40–59 = Developing
 * 60–79 = Good
 * 80–100 = Excellent
 */
export const calculateHabitScore = (components: HabitScoreComponents): HabitScoreResult => {
  const wakeUp = Math.min(100, Math.max(0, components.wakeUpConsistency || 0));
  const challenge = Math.min(100, Math.max(0, components.challengeCompletion || 0));
  const snooze = Math.min(100, Math.max(0, components.snoozeReduction || 0));
  const sleep = Math.min(100, Math.max(0, components.sleepAdherence || 0));

  const wakeUpContribution = Math.round(wakeUp * 0.35 * 10) / 10;
  const challengeContribution = Math.round(challenge * 0.25 * 10) / 10;
  const snoozeContribution = Math.round(snooze * 0.20 * 10) / 10;
  const sleepContribution = Math.round(sleep * 0.20 * 10) / 10;

  const overall_score = Math.round(wakeUpContribution + challengeContribution + snoozeContribution + sleepContribution);

  let score_category: HabitScoreCategory = 'Needs Improvement';
  if (overall_score >= 80) score_category = 'Excellent';
  else if (overall_score >= 60) score_category = 'Good';
  else if (overall_score >= 40) score_category = 'Developing';

  let summaryMessage = 'Solid habit adherence overall.';
  if (overall_score >= 80) summaryMessage = 'Outstanding morning discipline and sleep quality!';
  else if (overall_score >= 60) summaryMessage = 'Strong habit momentum. Keep optimizing snooze reduction.';
  else if (overall_score >= 40) summaryMessage = 'Building consistency. Focus on sleep schedule and wake-up verification.';
  else summaryMessage = 'Needs improvement. Focus on consistent sleep schedules and minimizing snoozes.';

  const score_breakdown = {
    wakeUpContribution,
    challengeContribution,
    snoozeContribution,
    sleepContribution,
  };

  return {
    overall_score,
    overallScore: overall_score,
    wake_up_consistency: wakeUp,
    challenge_completion: challenge,
    snooze_reduction: snooze,
    sleep_adherence: sleep,
    score_category,
    grade: score_category,
    score_breakdown,
    weightedContribution: score_breakdown,
    summaryMessage,
  };
};
