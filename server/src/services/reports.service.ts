import { getOverviewAnalytics, getWakeUpAnalytics, getChallengeAnalytics, getHabitAnalytics, getSnoozeAnalytics } from './behavioralAnalytics.service.js';

export type ReportType = 'habit_performance' | 'wake_up_performance' | 'challenge_performance' | 'productivity' | 'sleep_analytics' | 'full_comprehensive';
export type ExportFormat = 'json' | 'csv' | 'pdf' | 'html';

export interface ReportData {
  reportId: string;
  reportType: ReportType;
  generatedAt: string;
  userId: string;
  title: string;
  summary: string;
  metrics: Record<string, any>;
  tableData: any[];
}

export const generateReport = async (userId: string, reportType: ReportType): Promise<ReportData> => {
  const generatedAt = new Date().toISOString();
  const reportId = `REP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  switch (reportType) {
    case 'habit_performance': {
      const habitAnalytics = await getHabitAnalytics(userId);
      return {
        reportId,
        reportType,
        generatedAt,
        userId,
        title: 'Habit Adherence & Streak Performance Report',
        summary: `User maintains an average habit streak of ${habitAnalytics.averageStreak} days with ${habitAnalytics.activeHabits} active habits tracked.`,
        metrics: {
          totalHabits: habitAnalytics.totalHabits,
          activeHabits: habitAnalytics.activeHabits,
          averageStreak: habitAnalytics.averageStreak,
          longestStreak: habitAnalytics.longestStreak,
        },
        tableData: habitAnalytics.habitsBreakdown,
      };
    }

    case 'wake_up_performance': {
      const wakeupAnalytics = await getWakeUpAnalytics(userId);
      return {
        reportId,
        reportType,
        generatedAt,
        userId,
        title: 'Wake-Up Consistency & Verification Report',
        summary: `Wake-up verification rate stands at ${wakeupAnalytics.overallConsistency}% with an average delay of ${wakeupAnalytics.averageWakeUpDelayMinutes} minutes post alarm trigger.`,
        metrics: {
          overallConsistency: `${wakeupAnalytics.overallConsistency}%`,
          avgDelayMinutes: wakeupAnalytics.averageWakeUpDelayMinutes,
          onTimeCount: wakeupAnalytics.onTimeWakeUps,
          delayedCount: wakeupAnalytics.delayedWakeUps,
        },
        tableData: wakeupAnalytics.wakeUpHistory,
      };
    }

    case 'challenge_performance': {
      const challengeAnalytics = await getChallengeAnalytics(userId);
      return {
        reportId,
        reportType,
        generatedAt,
        userId,
        title: 'Cognitive Challenge Engine Performance Report',
        summary: `Overall challenge accuracy rate is ${challengeAnalytics.accuracyRate}% with an average response time of ${challengeAnalytics.averageTimeSeconds} seconds per attempt.`,
        metrics: {
          totalAttempts: challengeAnalytics.totalAttempts,
          accuracyRate: `${challengeAnalytics.accuracyRate}%`,
          averageTimeSeconds: challengeAnalytics.averageTimeSeconds,
        },
        tableData: challengeAnalytics.byCategory,
      };
    }

    case 'sleep_analytics': {
      const snoozeAnalytics = await getSnoozeAnalytics(userId);
      return {
        reportId,
        reportType,
        generatedAt,
        userId,
        title: 'Sleep Schedule & Snooze Reduction Report',
        summary: `Snooze reduction has reached ${snoozeAnalytics.snoozeReductionPercent}% relative to past baseline. Total time saved from snooze elimination: ${snoozeAnalytics.totalTimeLostMinutes} mins.`,
        metrics: {
          totalSnoozes7Days: snoozeAnalytics.totalSnoozesLast7Days,
          avgSnoozeDuration: `${snoozeAnalytics.averageSnoozeDuration} mins`,
          snoozeReductionPercent: `${snoozeAnalytics.snoozeReductionPercent}%`,
        },
        tableData: snoozeAnalytics.snoozePatternByDay,
      };
    }

    case 'productivity':
    case 'full_comprehensive':
    default: {
      const overview = await getOverviewAnalytics(userId);
      return {
        reportId,
        reportType: 'full_comprehensive',
        generatedAt,
        userId,
        title: 'Executive Cognitive & Habit Performance Report',
        summary: `Overall Habit Score is ${overview.habitScore.overallScore}/100 (${overview.habitScore.grade}). Cognitive readiness is fully optimal.`,
        metrics: {
          overallHabitScore: overview.habitScore.overallScore,
          grade: overview.habitScore.grade,
          wakeUpConsistency: `${overview.wakeUpConsistency}%`,
          challengeAccuracy: `${overview.challengeAccuracy}%`,
          snoozeReduction: `${overview.snoozeReductionRate}%`,
        },
        tableData: overview.weeklyTrend,
      };
    }
  }
};

export const exportReportToCsv = (report: ReportData): string => {
  let csv = `Report Title,${report.title}\n`;
  csv += `Report ID,${report.reportId}\n`;
  csv += `Generated At,${report.generatedAt}\n`;
  csv += `Summary,${report.summary.replace(/,/g, ' ')}\n\n`;

  csv += `METRICS\nKey,Value\n`;
  for (const [key, value] of Object.entries(report.metrics)) {
    csv += `${key},${value}\n`;
  }
  csv += `\nTABLE DATA\n`;
  if (report.tableData.length > 0) {
    const headers = Object.keys(report.tableData[0]);
    csv += headers.join(',') + '\n';
    for (const row of report.tableData) {
      csv += headers.map((h) => JSON.stringify(row[h] ?? '')).join(',') + '\n';
    }
  }
  return csv;
};

export const exportReportToHtmlDoc = (report: ReportData): string => {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${report.title}</title>
  <style>
    body { font-family: 'Segoe UI', system-ui, sans-serif; background: #0f172a; color: #f8fafc; padding: 40px; margin: 0; }
    .card { background: #1e293b; border-radius: 12px; padding: 24px; border: 1px solid #334155; margin-bottom: 24px; }
    h1 { color: #38bdf8; margin-top: 0; }
    .metric-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin: 20px 0; }
    .metric-box { background: #0f172a; padding: 16px; border-radius: 8px; border: 1px solid #334155; }
    .metric-val { font-size: 24px; font-weight: bold; color: #818cf8; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #334155; }
    th { background: #0f172a; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="card">
    <h1>${report.title}</h1>
    <p><strong>Report ID:</strong> ${report.reportId} | <strong>Date:</strong> ${report.generatedAt}</p>
    <p style="font-size: 16px; color: #cbd5e1;">${report.summary}</p>
  </div>
  <div class="card">
    <h2>Performance Metrics</h2>
    <div class="metric-grid">
      ${Object.entries(report.metrics)
        .map(([k, v]) => `<div class="metric-box"><div style="color: #94a3b8; text-transform: capitalize;">${k}</div><div class="metric-val">${v}</div></div>`)
        .join('')}
    </div>
  </div>
  <div class="card">
    <h2>Breakdown Data</h2>
    <table>
      <thead>
        <tr>
          ${report.tableData.length > 0 ? Object.keys(report.tableData[0]).map((h) => `<th>${h}</th>`).join('') : ''}
        </tr>
      </thead>
      <tbody>
        ${report.tableData
          .map((row) => `<tr>${Object.values(row).map((val) => `<td>${val}</td>`).join('')}</tr>`)
          .join('')}
      </tbody>
    </table>
  </div>
</body>
</html>`;
};
