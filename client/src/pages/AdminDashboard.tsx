import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/authService';
import { useToast } from '../components/Toast';
import { CardSkeleton, TableSkeleton } from '../components/ui/SkeletonLoader';
import {
  FiShield,
  FiUsers,
  FiServer,
  FiCpu,
  FiUserCheck,
  FiActivity,
  FiBarChart2,
  FiTerminal,
  FiCheckCircle,
  FiRefreshCw,
  FiSettings,
  FiLock,
} from 'react-icons/fi';

export const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const toast = useToast();

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Mock Recent System Logs
  const systemLogs = [
    { id: '1', level: 'INFO', message: 'Drizzle ORM schema validation completed', time: '10:14:02' },
    { id: '2', level: 'SUCCESS', message: 'JWT Auth token issued for Admin session', time: '10:14:30' },
    { id: '3', level: 'INFO', message: 'PostgreSQL database pool connected on port 5432', time: '10:15:00' },
    { id: '4', level: 'SUCCESS', message: 'Alarm engine dispatched scheduled notification', time: '10:15:22' },
  ];

  // Mock Registered Users
  const recentUsersList = [
    { id: 'u1', name: 'Demo User', email: 'user@cognitivealarm.com', role: 'user', date: '2026-08-01' },
    { id: 'u2', name: 'Demo Coach', email: 'coach@cognitivealarm.com', role: 'coach', date: '2026-08-01' },
    { id: 'u3', name: 'Demo Admin', email: 'admin@cognitivealarm.com', role: 'admin', date: '2026-08-01' },
    { id: 'u4', name: 'Sarah Jenkins', email: 'sarah.j@example.com', role: 'user', date: '2026-08-02' },
  ];

  useEffect(() => {
    fetchAdminTelemetry();
  }, []);

  const fetchAdminTelemetry = async () => {
    setLoading(true);
    try {
      const res = await authService.getDashboardData('admin');
      if (res.success) {
        setData(res.data);
      }
    } catch (err: any) {
      toast.error('Telemetry Error', 'Failed to load administrative statistics');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Welcome Header */}
        <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-rose-500/20 bg-gradient-to-r from-slate-900 via-rose-950/20 to-slate-900 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20 mb-2">
                <FiShield className="w-3.5 h-3.5" /> Platform Administration
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
                Admin Console - {user?.name}
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                System Telemetry, User Governance & Database Health Overview
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  fetchAdminTelemetry();
                  toast.success('Refreshed', 'Telemetry synced');
                }}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all"
              >
                <FiRefreshCw className="w-4 h-4 text-rose-400" /> Sync Telemetry
              </button>
            </div>
          </div>
        </div>

        {/* 4 Main Metric Cards */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Total Users */}
            <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">Total Registered Users</span>
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
                  <FiUsers className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-white">{data?.dashboardInfo?.totalUsers || 142}</p>
              <p className="text-[11px] text-slate-500">Across Platform</p>
            </div>

            {/* 2. Total Coaches */}
            <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">Total Coaches</span>
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
                  <FiUserCheck className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-amber-400">{data?.dashboardInfo?.rolesDistribution?.coaches || 18}</p>
              <p className="text-[11px] text-slate-500">Active Supervisors</p>
            </div>

            {/* 3. Total Active Alarms */}
            <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">Active Alarms</span>
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                  <FiActivity className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-emerald-400">384 Active</p>
              <p className="text-[11px] text-slate-500">Scheduled Operations</p>
            </div>

            {/* 4. Platform Statistics & System Health */}
            <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">System Health</span>
                <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center">
                  <FiServer className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-rose-300">100% Operational</p>
              <p className="text-[11px] text-slate-500">PostgreSQL + Express API</p>
            </div>
          </div>
        )}

        {/* Dummy SVG Analytics Charts & System Health */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* User Growth & Platform Statistics Chart */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FiBarChart2 className="text-blue-400" /> Platform Growth & Activity Telemetry
              </h3>
              <span className="text-[10px] text-slate-500 font-mono">Real-time Analytics</span>
            </div>

            {/* SVG Visual Graph */}
            <div className="h-48 w-full bg-slate-900/60 rounded-xl p-4 border border-slate-800/80 flex flex-col justify-between">
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>Active Users (30 Days)</span>
                <span className="text-emerald-400">+18% MoM</span>
              </div>
              <svg className="w-full h-32 text-blue-500" viewBox="0 0 300 100" fill="none">
                <path
                  d="M0 80 Q 50 60, 100 70 T 200 30 T 300 10 L 300 100 L 0 100 Z"
                  fill="rgba(59, 130, 246, 0.15)"
                />
                <path
                  d="M0 80 Q 50 60, 100 70 T 200 30 T 300 10"
                  stroke="#3b82f6"
                  strokeWidth="3"
                  fill="none"
                />
              </svg>
              <div className="flex justify-between text-[10px] text-slate-400 font-mono pt-1">
                <span>Week 1</span>
                <span>Week 2</span>
                <span>Week 3</span>
                <span>Week 4</span>
              </div>
            </div>
          </div>

          {/* System Logs Console Viewer */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FiTerminal className="text-rose-400" /> System Logs Console
              </h3>
              <span className="text-[10px] text-slate-500 font-mono">Live Logs</span>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-900 font-mono text-xs space-y-2 h-48 overflow-y-auto">
              {systemLogs.map((log) => (
                <div key={log.id} className="flex items-start gap-2">
                  <span className="text-slate-500 text-[10px]">{log.time}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                      log.level === 'SUCCESS' ? 'bg-emerald-950 text-emerald-400' : 'bg-blue-950 text-blue-400'
                    }`}
                  >
                    {log.level}
                  </span>
                  <span className="text-slate-300 text-[11px] truncate">{log.message}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Users Table */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <FiUsers className="text-rose-400" /> Registered Accounts Directory
          </h2>

          {loading ? (
            <TableSkeleton rows={4} />
          ) : (
            <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900/80 border-b border-slate-800 text-slate-400 uppercase font-semibold">
                    <tr>
                      <th className="py-3.5 px-4">User Name</th>
                      <th className="py-3.5 px-4">Email</th>
                      <th className="py-3.5 px-4">Role</th>
                      <th className="py-3.5 px-4">Joined Date</th>
                      <th className="py-3.5 px-4 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {recentUsersList.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-900/40 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-white">{u.name}</td>
                        <td className="py-3.5 px-4 text-slate-300">{u.email}</td>
                        <td className="py-3.5 px-4 capitalize">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              u.role === 'admin'
                                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                : u.role === 'coach'
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                            }`}
                          >
                            {u.role}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-400">{u.date}</td>
                        <td className="py-3.5 px-4 text-right">
                          <span className="text-emerald-400 font-semibold flex items-center justify-end gap-1 text-[11px]">
                            <FiCheckCircle className="w-3.5 h-3.5" /> Active
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};
