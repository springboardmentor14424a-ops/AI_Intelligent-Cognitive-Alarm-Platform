import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { CardSkeleton, TableSkeleton } from '../components/ui/SkeletonLoader';
import {
  FiUserCheck,
  FiUsers,
  FiAward,
  FiCalendar,
  FiFileText,
  FiPlus,
  FiCheckCircle,
  FiX,
  FiZap,
  FiAlertCircle,
  FiRefreshCw,
} from 'react-icons/fi';
import axios from 'axios';

export const CoachDashboard: React.FC = () => {
  const { user } = useAuth();
  const toast = useToast();

  const [trainees, setTrainees] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedTrainee, setSelectedTrainee] = useState<any>(null);
  const [traineeDetail, setTraineeDetail] = useState<any>(null);

  useEffect(() => {
    fetchCoachTelemetry();
  }, []);

  const fetchCoachTelemetry = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [usersRes, statsRes] = await Promise.allSettled([
        axios.get('/api/coach/users', { headers }),
        axios.get('/api/coach/statistics', { headers }),
      ]);

      if (usersRes.status === 'fulfilled' && usersRes.value.data?.success) {
        setTrainees(usersRes.value.data.data.users || []);
      }
      if (statsRes.status === 'fulfilled' && statsRes.value.data?.success) {
        setStats(statsRes.value.data.data);
      }
    } catch (err: any) {
      toast.error('Telemetry Error', 'Failed to fetch coach dashboard analytics');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTrainee = async (trainee: any) => {
    setSelectedTrainee(trainee);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`/api/coach/users/${trainee.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data?.success) {
        setTraineeDetail(res.data.data);
      }
    } catch (_err) {
      setTraineeDetail(null);
    }
  };

  const usersNeedingAttentionCount = trainees.filter((t) => t.status === 'Attention Needed').length;

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Welcome Header */}
        <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-amber-500/20 bg-gradient-to-r from-slate-900 via-amber-950/20 to-slate-900 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 mb-2">
                <FiUserCheck className="w-3.5 h-3.5" /> Coach Guidance Console • Live PostgreSQL Data
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
                Coach Portal - {user?.name}
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Authorized User Supervision, Habit Score Telemetry & Behavioral Analytics
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  fetchCoachTelemetry();
                  toast.success('Refreshed', 'Synced cohort telemetry');
                }}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all"
              >
                <FiRefreshCw className="w-4 h-4 text-amber-400" /> Sync Telemetry
              </button>
            </div>
          </div>
        </div>

        {/* Metric Cards */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Total Assigned Users */}
            <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">Assigned / Authorized Trainees</span>
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
                  <FiUsers className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-white">{stats?.assignedTraineesCount ?? trainees.length}</p>
              <p className="text-[11px] text-slate-500">Authorized Cohort Members</p>
            </div>

            {/* 2. Active Trainees with Activity */}
            <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">Trainees with Activity</span>
                <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
                  <FiAward className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-cyan-400">
                {trainees.filter((t) => t.hasActivity).length} / {trainees.length}
              </p>
              <p className="text-[11px] text-slate-500">Active Behavioral Records</p>
            </div>

            {/* 3. Trainees Needing Attention */}
            <div className="glass-panel p-5 rounded-2xl border border-rose-500/30 bg-rose-950/20 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-rose-400">Attention Needed</span>
                <div className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center">
                  <FiAlertCircle className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-rose-400">{usersNeedingAttentionCount} Trainees</p>
              <p className="text-[11px] text-rose-300">Snooze or Low Accuracy</p>
            </div>

            {/* 4. Platform Status */}
            <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">Database Sync</span>
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                  <FiCheckCircle className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-emerald-400">Connected</p>
              <p className="text-[11px] text-slate-500">PostgreSQL Live Sync</p>
            </div>
          </div>
        )}

        {/* User Progress Table */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <FiUsers className="text-amber-400" /> Authorized Trainee Behavioral Telemetry
          </h2>

          {loading ? (
            <TableSkeleton rows={5} />
          ) : trainees.length === 0 ? (
            <div className="glass-panel p-8 text-center text-slate-400 text-xs rounded-2xl">
              No data yet
            </div>
          ) : (
            <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900/80 border-b border-slate-800 text-slate-400 uppercase font-semibold">
                    <tr>
                      <th className="py-3.5 px-4">Trainee Name</th>
                      <th className="py-3.5 px-4">Habit Score</th>
                      <th className="py-3.5 px-4">Streak</th>
                      <th className="py-3.5 px-4">Wake-Up & Accuracy</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {trainees.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-900/40 transition-colors">
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-white block">{t.name}</span>
                          <span className="text-[10px] text-slate-400">{t.email}</span>
                        </td>
                        <td className="py-3.5 px-4 font-extrabold text-cyan-400">{t.habitScore}</td>
                        <td className="py-3.5 px-4 font-mono font-bold text-amber-400">{t.streak}</td>
                        <td className="py-3.5 px-4 font-bold text-slate-200">
                          {t.wakeUpConsistency !== 'No data yet' ? `${t.wakeUpConsistency} Wake` : 'No data yet'} • {t.challengeAccuracy !== 'No data yet' ? `${t.challengeAccuracy} Acc` : 'No data yet'}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              t.status === 'Optimal'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : t.status === 'Good'
                                ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                : t.status === 'Attention Needed'
                                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {t.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => handleSelectTrainee(t)}
                            className="px-3 py-1.5 rounded-lg text-slate-200 bg-amber-500/10 hover:bg-amber-500/20 text-xs font-semibold border border-amber-500/30 transition-colors"
                          >
                            Inspect Telemetry
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Trainee Detail Inspection Modal */}
        {selectedTrainee && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-2xl p-6 shadow-2xl space-y-6">
              <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-white">{selectedTrainee.name} — Behavioral Telemetry</h3>
                  <p className="text-xs text-slate-400">{selectedTrainee.email} • Status: {selectedTrainee.status}</p>
                </div>
                <button
                  onClick={() => setSelectedTrainee(null)}
                  className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800"
                >
                  <FiX className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <div className="text-[10px] text-slate-400">Habit Score</div>
                  <div className="text-lg font-bold text-cyan-400">
                    {traineeDetail?.overview?.hasSufficientData ? `${traineeDetail.overview.habitScore.overall_score} / 100` : 'No data yet'}
                  </div>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <div className="text-[10px] text-slate-400">Wake-Up Compliance</div>
                  <div className="text-lg font-bold text-blue-400">
                    {traineeDetail?.overview?.hasSufficientData ? `${traineeDetail.overview.wakeUpConsistency}%` : 'No data yet'}
                  </div>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <div className="text-[10px] text-slate-400">Challenge Accuracy</div>
                  <div className="text-lg font-bold text-indigo-400">
                    {traineeDetail?.overview?.hasSufficientData ? `${traineeDetail.overview.challengeAccuracy}%` : 'No data yet'}
                  </div>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <div className="text-[10px] text-slate-400">Active Alarms</div>
                  <div className="text-lg font-bold text-purple-400">
                    {traineeDetail?.overview?.totalAlarmsActive ?? 0}
                  </div>
                </div>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider">Adaptive Difficulty & Rationale</h4>
                <p className="text-xs text-slate-300">
                  {traineeDetail?.adaptiveDifficulty?.reason || 'No activity telemetry available yet for this user.'}
                </p>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setSelectedTrainee(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl transition-all"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};
