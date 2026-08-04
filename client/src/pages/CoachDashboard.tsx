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
  FiMessageSquare,
  FiCheckCircle,
} from 'react-icons/fi';

export const CoachDashboard: React.FC = () => {
  const { user } = useAuth();
  const toast = useToast();

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Mock Trainees Progress Table Data
  const traineesList = [
    { id: '1', name: 'Alex Johnson', email: 'alex.j@example.com', streak: 12, compliance: '94%', lastActive: '10 mins ago', status: 'Optimal' },
    { id: '2', name: 'Sarah Miller', email: 'sarah.m@example.com', streak: 8, compliance: '88%', lastActive: '1 hour ago', status: 'Good' },
    { id: '3', name: 'Michael Chen', email: 'm.chen@example.com', streak: 15, compliance: '98%', lastActive: 'Just now', status: 'Optimal' },
    { id: '4', name: 'Emily Davis', email: 'e.davis@example.com', streak: 3, compliance: '65%', lastActive: 'Yesterday', status: 'Attention Needed' },
    { id: '5', name: 'David Wilson', email: 'd.wilson@example.com', streak: 6, compliance: '82%', lastActive: '4 hours ago', status: 'Good' },
  ];

  useEffect(() => {
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

    fetchCoachTelemetry();
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Welcome Header */}
        <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-amber-500/20 bg-gradient-to-r from-slate-900 via-amber-950/20 to-slate-900 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 mb-2">
                <FiUserCheck className="w-3.5 h-3.5" /> Coach Guidance Console
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
                Coach Portal - {user?.name}
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Trainee Supervision & Habit Adherence Telemetry
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

        {/* 4 Required Metric Cards */}
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
                <span className="text-xs font-semibold text-slate-400">Total Assigned Users</span>
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
                  <FiUsers className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-white">{data?.dashboardInfo?.assignedTraineesCount || 12}</p>
              <p className="text-[11px] text-slate-500">Active Cohort Trainees</p>
            </div>

            {/* 2. Active Users */}
            <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">Active Today</span>
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                  <FiCheckCircle className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-emerald-400">10 / 12</p>
              <p className="text-[11px] text-slate-500">83% Engagement Rate</p>
            </div>

            {/* 3. Habit Performance */}
            <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">Habit Performance</span>
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
                  <FiActivity className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-blue-300">92% Compliance</p>
              <p className="text-[11px] text-slate-500">+4% Improvement this week</p>
            </div>

            {/* 4. Sleep Statistics */}
            <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">Sleep Statistics</span>
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                  <FiAward className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-indigo-300">7.6 hrs Avg</p>
              <p className="text-[11px] text-slate-500">Optimal Rest Consistency</p>
            </div>
          </div>
        )}

        {/* Main Grid: User Progress Table & Reports/Sessions Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* User Progress Table */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <FiUsers className="text-amber-400" /> Trainee Progress & Adherence Roster
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
                        <th className="py-3.5 px-4">Current Streak</th>
                        <th className="py-3.5 px-4">Compliance</th>
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
                          <td className="py-3.5 px-4 font-mono font-bold text-amber-400">{t.streak} Days 🔥</td>
                          <td className="py-3.5 px-4 font-bold text-slate-200">{t.compliance}</td>
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
                              onClick={() => toast.info('Coach Notes', `Opening guidance session for ${t.name}`)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 transition-colors"
                              title="Message Trainee"
                            >
                              <FiMessageSquare className="w-4 h-4" />
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
                    <p className="font-bold text-white">Sarah Miller</p>
                    <p className="text-[10px] text-slate-400">Sleep Schedule Calibration</p>
                  </div>
                  <span className="px-2 py-1 rounded bg-slate-800 text-slate-300 font-mono text-[10px]">Tomorrow 10:00 AM</span>
                </div>
              </div>
            </div>

            {/* Recent Reports */}
            <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FiFileText className="text-blue-400" /> Recent Reports
              </h3>
              <div className="space-y-2 text-xs">
                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                  <span className="text-slate-300">Weekly Trainee Summary</span>
                  <span className="text-emerald-400 font-semibold">Generated</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                  <span className="text-slate-300">Alarm Compliance Audit</span>
                  <span className="text-blue-400 font-semibold">Verified</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};
