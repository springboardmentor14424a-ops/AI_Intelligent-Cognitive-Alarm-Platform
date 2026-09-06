import React, { useState, useEffect } from 'react';
import { Navbar } from '../components/layout/Navbar';
import { AnalyticsChart } from '../components/ui/AnalyticsChart';
import { ReportsModal } from '../components/ReportsModal';
import { EmptyState } from '../components/ui/EmptyState';
import {
  FiTrendingUp,
  FiClock,
  FiCheckCircle,
  FiZap,
  FiMoon,
  FiAward,
  FiFileText,
  FiRefreshCw,
  FiCompass,
  FiTarget,
  FiCpu,
  FiAlertCircle,
} from 'react-icons/fi';
import axios from 'axios';

export const UserAnalytics: React.FC = () => {
  const [overview, setOverview] = useState<any | null>(null);
  const [wakeupData, setWakeupData] = useState<any | null>(null);
  const [challengeData, setChallengeData] = useState<any | null>(null);
  const [habitData, setHabitData] = useState<any | null>(null);
  const [snoozeData, setSnoozeData] = useState<any | null>(null);
  const [adaptiveDiff, setAdaptiveDiff] = useState<any | null>(null);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isReportsOpen, setIsReportsOpen] = useState(false);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [ovRes, wkRes, chRes, hbRes, snRes, adRes, recRes] = await Promise.allSettled([
        axios.get('/api/analytics/overview', { headers }),
        axios.get('/api/analytics/wakeup', { headers }),
        axios.get('/api/analytics/challenges', { headers }),
        axios.get('/api/analytics/habits', { headers }),
        axios.get('/api/analytics/snooze', { headers }),
        axios.get('/api/analytics/adaptive-difficulty', { headers }),
        axios.get('/api/recommendations', { headers }),
      ]);

      if (ovRes.status === 'fulfilled') setOverview(ovRes.value.data?.data);
      if (wkRes.status === 'fulfilled') setWakeupData(wkRes.value.data?.data);
      if (chRes.status === 'fulfilled') setChallengeData(chRes.value.data?.data);
      if (hbRes.status === 'fulfilled') setHabitData(hbRes.value.data?.data);
      if (snRes.status === 'fulfilled') setSnoozeData(snRes.value.data?.data);
      if (adRes.status === 'fulfilled') setAdaptiveDiff(adRes.value.data?.data);
      if (recRes.status === 'fulfilled') setRecommendations(recRes.value.data?.data?.recommendations || []);
    } catch (_err) {
      console.warn('Telemetry fetch error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const hasData = overview?.hasSufficientData ?? false;

  const weeklyScoreData = overview?.weeklyTrend?.map((t: any) => ({
    label: t.day,
    value: t.habitScore,
  })) || [];

  const wakeupDelayData = wakeupData?.wakeUpHistory?.map((w: any) => ({
    label: w.date ? w.date.slice(5) : 'Day',
    value: w.delayMinutes,
  })) || [];

  const challengeAccuracyData = challengeData?.byCategory?.map((c: any) => ({
    label: c.type.toUpperCase(),
    value: c.accuracy,
  })) || [];

  const snoozeTrendData = snoozeData?.snoozePatternByDay?.map((s: any) => ({
    label: s.day,
    value: s.snoozeCount,
  })) || [];

  const getScoreCategoryBadge = (category?: string) => {
    switch (category) {
      case 'Excellent':
        return <span className="px-2.5 py-1 text-xs font-extrabold rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">Excellent (80-100)</span>;
      case 'Good':
        return <span className="px-2.5 py-1 text-xs font-extrabold rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30">Good (60-79)</span>;
      case 'Developing':
        return <span className="px-2.5 py-1 text-xs font-extrabold rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">Developing (40-59)</span>;
      case 'Needs Improvement':
        return <span className="px-2.5 py-1 text-xs font-extrabold rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30">Needs Improvement (0-39)</span>;
      default:
        return <span className="px-2.5 py-1 text-xs font-extrabold rounded-lg bg-slate-800 text-slate-400 border border-slate-700">No data yet</span>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/60 p-6 rounded-2xl border border-slate-800 shadow-xl backdrop-blur">
          <div>
            <div className="flex items-center gap-2 text-cyan-400 font-semibold text-xs uppercase tracking-wider mb-1">
              <FiTrendingUp className="w-4 h-4" /> Milestone 3 — Habit Tracking & Recommendation Engine
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Habit Tracking Dashboard</h1>
            <p className="text-sm text-slate-400 mt-1">Real-time weighted scoring, adaptive difficulty evaluation, and personalized behavioral guidance</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchAnalytics}
              className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition-colors"
              title="Refresh Telemetry"
            >
              <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setIsReportsOpen(true)}
              className="px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-sm rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-cyan-500/20"
            >
              <FiFileText className="w-4 h-4" /> Export Report
            </button>
          </div>
        </div>

        {!hasData && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-center gap-3 text-amber-300 text-xs">
            <FiAlertCircle className="w-5 h-5 flex-shrink-0" />
            <div>
              <span className="font-bold">No sufficient activity data yet.</span> Complete morning wake-up challenges and daily habit targets to calculate your live behavioral metrics.
            </div>
          </div>
        )}

        {/* Top Summary Cards with Habit Score & Breakdown */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Overall Habit Score Card */}
          <div className="bg-gradient-to-b from-cyan-950/40 via-slate-900 to-slate-900 border border-cyan-500/30 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
            <div className="flex justify-between items-center text-slate-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-cyan-400">Weighted Habit Score</span>
              <FiAward className="w-5 h-5 text-cyan-400" />
            </div>
            <div className="text-3xl font-black text-white">
              {hasData ? `${overview?.habitScore?.overall_score} / 100` : 'No data yet'}
            </div>
            <div className="mt-3">
              {getScoreCategoryBadge(hasData ? overview?.habitScore?.score_category : undefined)}
            </div>
            <div className="text-[10px] text-slate-400 mt-2">
              Formula: 35% Wake + 25% Challenge + 20% Snooze + 20% Sleep
            </div>
          </div>

          {/* Wake-Up Consistency */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-2">
            <div className="flex justify-between items-center text-slate-400">
              <span className="text-xs font-semibold uppercase tracking-wider">Wake-Up Consistency</span>
              <FiCheckCircle className="w-5 h-5 text-cyan-400" />
            </div>
            <div className="text-3xl font-black text-white">
              {hasData ? `${overview?.wakeUpConsistency}%` : 'No data yet'}
            </div>
            <div className="text-xs text-cyan-400 font-semibold">Weight: 35%</div>
            <div className="text-[11px] text-slate-400">Avg Delay: {hasData ? `${wakeupData?.averageWakeUpDelayMinutes || 0} mins` : 'No data yet'}</div>
          </div>

          {/* Challenge Completion & Accuracy */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-2">
            <div className="flex justify-between items-center text-slate-400">
              <span className="text-xs font-semibold uppercase tracking-wider">Challenge Accuracy</span>
              <FiZap className="w-5 h-5 text-indigo-400" />
            </div>
            <div className="text-3xl font-black text-white">
              {hasData ? `${overview?.challengeAccuracy}%` : 'No data yet'}
            </div>
            <div className="text-xs text-indigo-400 font-semibold">Weight: 25%</div>
            <div className="text-[11px] text-slate-400">Avg Speed: {hasData ? `${challengeData?.averageTimeSeconds || 0}s` : 'No data yet'}</div>
          </div>

          {/* Snooze Reduction */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-2">
            <div className="flex justify-between items-center text-slate-400">
              <span className="text-xs font-semibold uppercase tracking-wider">Snooze Reduction</span>
              <FiMoon className="w-5 h-5 text-purple-400" />
            </div>
            <div className="text-3xl font-black text-white">
              {hasData ? `${overview?.snoozeReductionRate}%` : 'No data yet'}
            </div>
            <div className="text-xs text-purple-400 font-semibold">Weight: 20%</div>
            <div className="text-[11px] text-slate-400">{hasData ? `${snoozeData?.totalSnoozesLast7Days || 0} snoozes this week` : 'No data yet'}</div>
          </div>

          {/* Sleep Schedule Adherence */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-2">
            <div className="flex justify-between items-center text-slate-400">
              <span className="text-xs font-semibold uppercase tracking-wider">Sleep Adherence</span>
              <FiTarget className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="text-3xl font-black text-white">
              {hasData ? `${overview?.sleepAdherenceRate}%` : 'No data yet'}
            </div>
            <div className="text-xs text-emerald-400 font-semibold">Weight: 20%</div>
            <div className="text-[11px] text-slate-400">Streak: {hasData ? `${habitData?.averageStreak || 0} Days` : 'No data yet'}</div>
          </div>
        </div>

        {/* Adaptive Difficulty Engine Banner */}
        {adaptiveDiff && (
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950/50 to-slate-900 border border-indigo-500/30 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800/80 pb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <FiCpu className="w-4 h-4 text-indigo-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                    Adaptive Difficulty Engine • {adaptiveDiff.mlReadyModelVersion}
                  </span>
                </div>
                <h3 className="text-xl font-black text-white">
                  Current: <span className="text-slate-400 uppercase">{adaptiveDiff.currentDifficulty || 'Medium'}</span> → Recommended: <span className="text-indigo-400 uppercase">{adaptiveDiff.recommendedDifficulty}</span>
                </h3>
              </div>
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 capitalize">
                  Adjustment: {adaptiveDiff.adjustmentType}
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Confidence: {Math.round((adaptiveDiff.confidenceScore || 0.92) * 100)}%
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed font-medium">
              💡 <span className="font-bold">Rationale:</span> {adaptiveDiff.reason || adaptiveDiff.adjustmentReason}
            </p>

            {/* Factors Used Table */}
            {adaptiveDiff.factorsUsed && (
              <div className="pt-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Evaluated Behavioral Signals:</span>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {adaptiveDiff.factorsUsed.map((f: any, idx: number) => (
                    <div key={idx} className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 text-xs">
                      <span className="text-[10px] text-slate-500 block font-semibold truncate">{f.factor}</span>
                      <span className="font-bold text-white block mt-0.5">{f.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Personalized Recommendations Engine Section */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <FiCompass className="text-cyan-400" /> Personalized Recommendations Engine
            </h2>
            <span className="text-xs text-cyan-400 font-semibold">{recommendations.length} Active Recommendations</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recommendations.length === 0 ? (
              <div className="col-span-full py-8 text-center text-slate-400 text-xs">
                No active recommendations. Keep building consistency!
              </div>
            ) : (
              recommendations.map((rec) => (
                <div key={rec.id} className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-3 flex flex-col justify-between hover:border-cyan-500/40 transition-colors">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                        {rec.category}
                      </span>
                      <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded ${
                        rec.priority === 'high' ? 'bg-rose-500/20 text-rose-400' : rec.priority === 'medium' ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {rec.priority} Priority
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-white">{rec.title}</h3>
                    <p className="text-xs text-slate-300 mt-1.5">{rec.description}</p>
                    <p className="text-[11px] text-slate-400 mt-2 bg-slate-900/80 p-2 rounded-lg border border-slate-800 italic">
                      <span className="font-semibold text-slate-300">Reason:</span> {rec.reason}
                    </p>
                  </div>
                  {rec.actionableStep && (
                    <div className="pt-2 border-t border-slate-900 text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                      🎯 Action: {rec.actionableStep}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Analytics Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AnalyticsChart
            title="Habit Score Weekly Trajectory (0-100)"
            data={weeklyScoreData}
            color="cyan"
            type="area"
            height={200}
          />

          <AnalyticsChart
            title="Wake-Up Delay Trend (Minutes Post Alarm)"
            data={wakeupDelayData}
            color="emerald"
            type="bar"
            height={200}
            maxValue={12}
          />

          <AnalyticsChart
            title="Challenge Performance by Category (%)"
            data={challengeAccuracyData}
            color="indigo"
            type="bar"
            height={200}
            maxValue={100}
          />

          <AnalyticsChart
            title="Snooze Occurrences Trend (Last 7 Days)"
            data={snoozeTrendData}
            color="purple"
            type="bar"
            height={200}
            maxValue={3}
          />
        </div>

        {/* Detailed Breakdown Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Active Habits Breakdown */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider mb-4 flex items-center gap-2">
              <FiCheckCircle className="w-4 h-4 text-emerald-400" /> Active Habits Streak Breakdown
            </h3>
            <div className="space-y-4">
              {habitData?.habitsBreakdown?.map((h: any) => (
                <div key={h.id} className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex justify-between items-center">
                  <div>
                    <h4 className="text-xs font-semibold text-slate-200">{h.name}</h4>
                    <span className="text-[10px] text-slate-400">Adherence: {h.adherenceRate}%</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-extrabold text-cyan-400">{h.streak} Days</span>
                    <span className="text-[10px] text-slate-500 block">Target: {h.target} days/wk</span>
                  </div>
                </div>
              )) || <div className="text-slate-400 text-xs">No habit telemetry recorded.</div>}
            </div>
          </div>

          {/* Wake-Up History */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider mb-4 flex items-center gap-2">
              <FiClock className="w-4 h-4 text-cyan-400" /> Alarm & Verification Log
            </h3>
            <div className="space-y-3">
              {wakeupData?.wakeUpHistory?.map((w: any, idx: number) => (
                <div key={idx} className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex justify-between items-center">
                  <div>
                    <div className="text-xs font-semibold text-slate-200">{w.date} scheduled at {w.scheduledTime}</div>
                    <div className="text-[10px] text-slate-400">Verified at {w.actualVerifiedTime}</div>
                  </div>
                  <span className={`px-2.5 py-1 text-[10px] font-bold rounded-lg ${w.verified ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                    {w.verified ? `Verified (${w.delayMinutes}m delay)` : 'Unverified'}
                  </span>
                </div>
              )) || <div className="text-slate-400 text-xs">No wake-up log recorded.</div>}
            </div>
          </div>
        </div>
      </main>

      <ReportsModal isOpen={isReportsOpen} onClose={() => setIsReportsOpen(false)} />
    </div>
  );
};
