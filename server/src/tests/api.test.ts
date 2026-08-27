import assert from 'assert';
import { calculateAdaptiveDifficulty } from '../services/adaptiveDifficulty.service.js';
import { calculateHabitScore } from '../services/habitScore.service.js';
import { generateRecommendations } from '../services/recommendation.service.js';
import { getOverviewAnalytics, getWakeUpAnalytics, getChallengeAnalytics, getHabitAnalytics, getSnoozeAnalytics } from '../services/behavioralAnalytics.service.js';
import { generateReport, exportReportToCsv } from '../services/reports.service.js';
import { sendNotification, getUserNotifications, markNotificationAsRead } from '../services/notification.service.js';
import { generateChallenge } from '../services/challengeGenerator.service.js';

async function runAllUnitAndIntegrationTests() {
  console.log('===========================================================');
  console.log('🧪 RUNNING COMPLETE MILESTONE 3 TEST SUITE');
  console.log('===========================================================');

  let passed = 0;
  let failed = 0;

  const test = async (name: string, fn: () => void | Promise<void>) => {
    try {
      await fn();
      console.log(`  ✅ PASSED: ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`  ❌ FAILED: ${name} ->`, err.message);
      failed++;
    }
  };

  // 1. Adaptive Difficulty Engine Tests
  await test('Adaptive Difficulty — High Performance Escalation', () => {
    const output = calculateAdaptiveDifficulty({
      accuracy: 95,
      averageTimeSeconds: 5,
      totalAttempts: 10,
      incorrectAnswers: 0,
      snoozeCountLast7Days: 0,
      wakeUpSuccessRate: 98,
      difficultyPreference: 'medium',
    });
    assert.strictEqual(output.recommendedDifficulty, 'expert');
    assert.strictEqual(output.adjustmentType, 'increased');
    assert(output.factorsUsed.length > 0);
  });

  await test('Adaptive Difficulty — Low Accuracy Step Down', () => {
    const output = calculateAdaptiveDifficulty({
      accuracy: 40,
      averageTimeSeconds: 15,
      totalAttempts: 8,
      incorrectAnswers: 5,
      snoozeCountLast7Days: 0,
      wakeUpSuccessRate: 60,
      difficultyPreference: 'hard',
    });
    assert.strictEqual(output.recommendedDifficulty, 'medium');
    assert.strictEqual(output.adjustmentType, 'decreased');
  });

  await test('Adaptive Difficulty — Frequent Snooze Escalation', () => {
    const output = calculateAdaptiveDifficulty({
      accuracy: 80,
      averageTimeSeconds: 7,
      totalAttempts: 5,
      incorrectAnswers: 1,
      snoozeCountLast7Days: 4, // 4 snoozes -> force increase
      wakeUpSuccessRate: 85,
      difficultyPreference: 'medium',
    });
    assert.strictEqual(output.recommendedDifficulty, 'hard');
  });

  await test('Adaptive Difficulty — Consistent Wake-Up Escalation', () => {
    const output = calculateAdaptiveDifficulty({
      accuracy: 88,
      averageTimeSeconds: 6,
      totalAttempts: 10,
      incorrectAnswers: 1,
      snoozeCountLast7Days: 0,
      wakeUpSuccessRate: 96,
      difficultyPreference: 'easy',
    });
    assert(output.recommendedDifficulty === 'medium' || output.recommendedDifficulty === 'hard');
  });

  // 2. Habit Scoring Engine Tests (Exact 35/25/20/20 Weighting & Categories)
  await test('Habit Score — Exact Weighted 35/25/20/20 Formula Calculation', () => {
    const score = calculateHabitScore({
      wakeUpConsistency: 100, // 100 * 0.35 = 35
      challengeCompletion: 80, // 80 * 0.25 = 20
      snoozeReduction: 90,     // 90 * 0.20 = 18
      sleepAdherence: 80,      // 80 * 0.20 = 16
    });
    // Expected: 35 + 20 + 18 + 16 = 89
    assert.strictEqual(score.overall_score, 89);
    assert.strictEqual(score.score_category, 'Excellent');
  });

  await test('Habit Score — Categories Boundaries (Needs Improvement, Developing, Good, Excellent)', () => {
    const score1 = calculateHabitScore({ wakeUpConsistency: 30, challengeCompletion: 30, snoozeReduction: 30, sleepAdherence: 30 });
    assert.strictEqual(score1.score_category, 'Needs Improvement');

    const score2 = calculateHabitScore({ wakeUpConsistency: 50, challengeCompletion: 50, snoozeReduction: 50, sleepAdherence: 50 });
    assert.strictEqual(score2.score_category, 'Developing');

    const score3 = calculateHabitScore({ wakeUpConsistency: 70, challengeCompletion: 70, snoozeReduction: 70, sleepAdherence: 70 });
    assert.strictEqual(score3.score_category, 'Good');

    const score4 = calculateHabitScore({ wakeUpConsistency: 90, challengeCompletion: 90, snoozeReduction: 90, sleepAdherence: 90 });
    assert.strictEqual(score4.score_category, 'Excellent');
  });

  // 3. Recommendation Engine Tests
  await test('Recommendation Engine — Rule Triggering & Created At Timestamps', () => {
    const recs = generateRecommendations({
      snoozeCountLast7Days: 4,
      challengeAccuracy: 60,
      wakeUpConsistency: 65,
      sleepAdherence: 55,
      averageChallengeTime: 10,
    });
    assert(recs.length > 0);
    assert(recs.every((r) => r.title && r.description && r.category && r.priority && r.reason && r.created_at));
    const snoozeRec = recs.find((r) => r.category === 'Sleep Improvement' || r.category === 'sleep');
    assert(snoozeRec !== undefined);
  });

  // 4. Behavioral Analytics Workflows Tests
  await test('Behavioral Analytics — Overview, Wake-Up, Challenge, Habit, & Snooze Telemetry', async () => {
    const overview = await getOverviewAnalytics('test-user-id');
    assert(typeof overview.cognitiveHealthScore === 'number');
    assert(overview.habitScore.overall_score !== undefined);

    const wakeup = await getWakeUpAnalytics('test-user-id');
    assert(typeof wakeup.overallConsistency === 'number');

    const challenge = await getChallengeAnalytics('test-user-id');
    assert(typeof challenge.accuracyRate === 'number');

    const habit = await getHabitAnalytics('test-user-id');
    assert(typeof habit.totalHabits === 'number');

    const snooze = await getSnoozeAnalytics('test-user-id');
    assert(typeof snooze.totalSnoozesLast7Days === 'number');
  });

  // 5. Reports & Notifications Tests
  await test('Reports & Notifications — Generation & Delivery', async () => {
    const report = await generateReport('test-user-id', 'full_comprehensive');
    assert(report.reportId.startsWith('REP-'));
    const csv = exportReportToCsv(report);
    assert(csv.includes('Executive Cognitive & Habit Performance Report'));

    const notif = await sendNotification('test-user-123', 'bedtime', 'Test Bedtime', 'Sleep early');
    assert.strictEqual(notif.isRead, false);
  });

  console.log('===========================================================');
  console.log(`📊 TEST RESULTS: ${passed} PASSED, ${failed} FAILED.`);
  console.log('===========================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runAllUnitAndIntegrationTests().catch((err) => {
  console.error('Fatal Test Execution Error:', err);
  process.exit(1);
});
