export interface HabitScoreComponents {
  wakeUpConsistency: number; // 0-100
  challengeCompletion: number; // 0-100
  snoozeReduction: number; // 0-100
  sleepAdherence: number; // 0-100
}

export type HabitScoreCategory = 'Needs Improvement' | 'Developing' | 'Good' | 'Excellent';

export interface HabitScoreResult {
  hasSufficientData: boolean;
  habit_score: number; // 0-100
  overall_score: number; // alias
  overallScore: number; // alias
  components: {
    wake_up_consistency: number;
    challenge_completion: number;
    snooze_reduction: number;
    sleep_schedule_adherence: number;
  };
  weights: {
    wake_up_consistency: number;
    challenge_completion: number;
    snooze_reduction: number;
    sleep_schedule_adherence: number;
  };
  score_category: HabitScoreCategory;
  grade: HabitScoreCategory;
  summaryMessage: string;
}

/**
 * Calculates weighted Habit Score based on user behavioral telemetry.
 * Formula:
 * Habit Score = (Wake-Up Consistency * 0.35) + (Challenge Completion * 0.25) + (Snooze Reduction * 0.20) + (Sleep Schedule Adherence * 0.20)
 * Weights: Wake-Up 35%, Challenge 25%, Snooze 20%, Sleep 20%
 * Categories:
 * 0–39 = Needs Improvement
 * 40–59 = Developing
 * 60–79 = Good
 * 80–100 = Excellent
 */
export const calculateHabitScore = (
  components: HabitScoreComponents,
  hasData: boolean = true
): HabitScoreResult => {
  if (!hasData) {
    return {
      hasSufficientData: false,
      habit_score: 0,
      overall_score: 0,
      overallScore: 0,
      components: {
        wake_up_consistency: 0,
        challenge_completion: 0,
        snooze_reduction: 0,
        sleep_schedule_adherence: 0,
      },
      weights: {
        wake_up_consistency: 35,
        challenge_completion: 25,
        snooze_reduction: 20,
        sleep_schedule_adherence: 20,
      },
      score_category: 'Needs Improvement',
      grade: 'Needs Improvement',
      summaryMessage: 'Complete more wake-ups to generate your score.',
    };
  }

  const wakeUp = Math.min(100, Math.max(0, components.wakeUpConsistency || 0));
  const challenge = Math.min(100, Math.max(0, components.challengeCompletion || 0));
  const snooze = Math.min(100, Math.max(0, components.snoozeReduction || 0));
  const sleep = Math.min(100, Math.max(0, components.sleepAdherence || 0));

  const wakeUpContrib = wakeUp * 0.35;
  const challengeContrib = challenge * 0.25;
  const snoozeContrib = snooze * 0.20;
  const sleepContrib = sleep * 0.20;

  const habit_score = Math.round(wakeUpContrib + challengeContrib + snoozeContrib + sleepContrib);

  let score_category: HabitScoreCategory = 'Needs Improvement';
  if (habit_score >= 80) score_category = 'Excellent';
  else if (habit_score >= 60) score_category = 'Good';
  else if (habit_score >= 40) score_category = 'Developing';

  let summaryMessage = 'Solid habit adherence overall.';
  if (habit_score >= 80) summaryMessage = 'Outstanding morning discipline and sleep quality!';
  else if (habit_score >= 60) summaryMessage = 'Strong habit momentum. Keep optimizing snooze reduction.';
  else if (habit_score >= 40) summaryMessage = 'Building consistency. Focus on sleep schedule and wake-up verification.';
  else summaryMessage = 'Needs improvement. Focus on consistent sleep schedules and minimizing snoozes.';

  return {
    hasSufficientData: true,
    habit_score,
    overall_score: habit_score,
    overallScore: habit_score,
    components: {
      wake_up_consistency: wakeUp,
      challenge_completion: challenge,
      snooze_reduction: snooze,
      sleep_schedule_adherence: sleep,
    },
    weights: {
      wake_up_consistency: 35,
      challenge_completion: 25,
      snooze_reduction: 20,
      sleep_schedule_adherence: 20,
    },
    score_category,
    grade: score_category,
    summaryMessage,
  };
};

