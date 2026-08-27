import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/authService';
import { useToast } from '../components/Toast';
import { CardSkeleton, TableSkeleton } from '../components/ui/SkeletonLoader';
import {
  FiUserCheck,
  FiUsers,
  FiActivity,
  FiAward,
  FiCalendar,
  FiFileText,
  FiPlus,
  FiCheckCircle,
  FiX,
  FiZap,
  FiMoon,
  FiAlertCircle,
} from 'react-icons/fi';
import axios from 'axios';

export const CoachDashboard: React.FC = () => {
  const { user } = useAuth();
  const toast = useToast();

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedTrainee, setSelectedTrainee] = useState<any>(null);
  const [traineeDetail, setTraineeDetail] = useState<any>(null);

  // Trainees Progress & Behavioral Telemetry
  const traineesList = [
    { id: '1', name: 'Alex Johnson', email: 'alex.j@example.com', habitScore: 88, streak: 12, compliance: '94%', challengeCompletion: '95%', challengeAccuracy: '90%', snoozeCount: 1, status: 'Optimal' },
    { id: '2', name: 'Sarah Miller', email: 'sarah.m@example.com', habitScore: 82, streak: 8, compliance: '88%', challengeCompletion: '88%', challengeAccuracy: '82%', snoozeCount: 2, status: 'Good' },
    { id: '3', name: 'Michael Chen', email: 'm.chen@example.com', habitScore: 94, streak: 15, compliance: '98%', challengeCompletion: '96%', challengeAccuracy: '94%', snoozeCount: 0, status: 'Optimal' },
    { id: '4', name: 'Emily Davis', email: 'e.davis@example.com', habitScore: 58, streak: 3, compliance: '65%', challengeCompletion: '70%', challengeAccuracy: '68%', snoozeCount: 5, status: 'Attention Needed' },
    { id: '5', name: 'David Wilson', email: 'd.wilson@example.com', habitScore: 78, streak: 6, compliance: '82%', challengeCompletion: '86%', challengeAccuracy: '84%', snoozeCount: 2, status: 'Good' },
  ];

  useEffect(() => {
    fetchCoachTelemetry();
  }, []);

  const fetchCoachTelemetry = async () => {
    setLoading(true);
    try {
      const res = await authService.getDashboardData('coach');
      if (res.success) {
        setData(res.data);
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
      const res = await axios.get(`/api/dashboard/coach/user/${trainee.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data?.success) {
        setTraineeDetail(res.data.data);
      }
    } catch (_err) {
      // Use fallback
      setTraineeDetail(null);
    }
  };

  const usersNeedingAttentionCount = traineesList.filter((t) => t.status === 'Attention Needed' || t.snoozeCount > 3).length;

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Welcome Header */}
        <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-amber-500/20 bg-gradient-to-r from-slate-900 via-amber-950/20 to-slate-900 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 mb-2">
                <FiUserCheck className="w-3.5 h-3.5" /> Coach Guidance Console • Milestone 3
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
                Coach Portal - {user?.name}
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Trainee Supervision, Habit Score Telemetry & Behavioral Analytics
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => toast.info('Coach Action', 'Assign Trainee modal ready')}
                className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-lg shadow-amber-500/20"
              >
                <FiPlus className="w-4 h-4" /> Assign Trainee
              </button>
              <button
                onClick={() => toast.info('Coach Action', 'Export Reports generated')}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all"
              >
                <FiFileText className="w-4 h-4 text-amber-400" /> Export Reports
              </button>
            </div>
          </div>
        </div>

        {/* Metric Cards */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* 1. Total Assigned Users */}
            <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">Assigned Trainees</span>
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
                  <FiUsers className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-white">{data?.dashboardInfo?.assignedTraineesCount || 12}</p>
              <p className="text-[11px] text-slate-500">Active Cohort Trainees</p>
            </div>

            {/* 2. Avg Habit Score */}
            <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">Avg Habit Score</span>
                <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
                  <FiAward className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-cyan-400">82 / 100</p>
              <p className="text-[11px] text-slate-500">Cohort Average</p>
            </div>

            {/* 3. Wake-Up Consistency */}
            <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">Wake-Up Consistency</span>
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
                  <FiCheckCircle className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-blue-300">88% Avg</p>
              <p className="text-[11px] text-slate-500">+4% Improvement this week</p>
            </div>

            {/* 4. Challenge Accuracy */}
            <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">Challenge Accuracy</span>
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                  <FiZap className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-indigo-300">86% Avg</p>
              <p className="text-[11px] text-slate-500">Across Math & Logic</p>
            </div>

            {/* 5. Users Needing Attention */}
            <div className="glass-panel p-5 rounded-2xl border border-rose-500/30 bg-rose-950/20 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-rose-400">Attention Needed</span>
                <div className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center">
                  <FiAlertCircle className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-rose-400">{usersNeedingAttentionCount} Trainees</p>
              <p className="text-[11px] text-rose-300">High Snooze or Low Score</p>
            </div>
          </div>
        )}

        {/* Main Grid: User Progress Table & Reports/Sessions Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* User Progress Table */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <FiUsers className="text-amber-400" /> Trainee Behavioral Telemetry & Habit Roster
            </h2>

            {loading ? (
              <TableSkeleton rows={5} />
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
                      {traineesList.map((t) => (
                        <tr key={t.id} className="hover:bg-slate-900/40 transition-colors">
                          <td className="py-3.5 px-4">
                            <span className="font-bold text-white block">{t.name}</span>
                            <span className="text-[10px] text-slate-400">{t.email}</span>
                          </td>
                          <td className="py-3.5 px-4 font-extrabold text-cyan-400">{t.habitScore} / 100</td>
                          <td className="py-3.5 px-4 font-mono font-bold text-amber-400">{t.streak} Days 🔥</td>
                          <td className="py-3.5 px-4 font-bold text-slate-200">
                            {t.compliance} Wake • {t.challengeAccuracy} Acc
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                t.status === 'Optimal'
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : t.status === 'Good'
                                  ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
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

          {/* Recent Reports & Upcoming Sessions */}
          <div className="space-y-6">
            {/* Upcoming Coaching Sessions */}
            <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FiCalendar className="text-amber-400" /> Upcoming Sessions
              </h3>
              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-white">Alex Johnson</p>
                    <p className="text-[10px] text-slate-400">Weekly Habit Review</p>
                  </div>
                  <span className="px-2 py-1 rounded bg-amber-500/10 text-amber-400 font-mono text-[10px]">Today 04:00 PM</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-white">Emily Davis</p>
                    <p className="text-[10px] text-slate-400">Snooze Reduction Calibration</p>
                  </div>
                  <span className="px-2 py-1 rounded bg-rose-500/10 text-rose-400 font-mono text-[10px]">Tomorrow 10:00 AM</span>
                </div>
              </div>
            </div>

            {/* Recent Behavioral Reports */}
            <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FiFileText className="text-blue-400" /> Cohort Telemetry Summaries
              </h3>
              <div className="space-y-2 text-xs">
                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                  <span className="text-slate-300">Weekly Habit Score Report</span>
                  <span className="text-emerald-400 font-semibold">Generated</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                  <span className="text-slate-300">Snooze Pattern Audit</span>
                  <span className="text-blue-400 font-semibold">Verified</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Trainee Detail Supervision Modal */}
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
                  <div className="text-lg font-bold text-cyan-400">{traineeDetail?.overview?.habitScore?.overall_score || selectedTrainee.habitScore} / 100</div>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <div className="text-[10px] text-slate-400">Wake-Up Compliance</div>
                  <div className="text-lg font-bold text-blue-400">{selectedTrainee.compliance}</div>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <div className="text-[10px] text-slate-400">Challenge Accuracy</div>
                  <div className="text-lg font-bold text-indigo-400">{selectedTrainee.challengeAccuracy}</div>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <div className="text-[10px] text-slate-400">Recent Snoozes</div>
                  <div className="text-lg font-bold text-rose-400">{selectedTrainee.snoozeCount} Snoozes</div>
                </div>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider">Adaptive Difficulty & Recommendation</h4>
                <p className="text-xs text-slate-300">
                  {traineeDetail?.adaptiveDifficulty?.reason ||
                    'Trainee demonstrates high accuracy on math and logic cognitive challenges. Recommend upgrading to Smart Adaptive Hard challenge mode.'}
                </p>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    toast.success('Recommendation Sent', `Sent habit optimization note to ${selectedTrainee.name}`);
                    setSelectedTrainee(null);
                  }}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl transition-all"
                >
                  Send Coaching Recommendation
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};
