import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { CardSkeleton, TableSkeleton } from '../components/ui/SkeletonLoader';
import axios from 'axios';
import {
  FiShield,
  FiUsers,
  FiUserCheck,
  FiActivity,
  FiBarChart2,
  FiTerminal,
  FiCheckCircle,
  FiRefreshCw,
  FiAward,
  FiClock,
  FiXCircle,
  FiCheck,
  FiX,
  FiUser,
} from 'react-icons/fi';

export const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const toast = useToast();

  const [stats, setStats] = useState<any>(null);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [coachesList, setCoachesList] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'users' | 'coaches'>('users');

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [statsRes, usersRes, coachesRes] = await Promise.allSettled([
        axios.get('/api/admin/statistics', { headers }),
        axios.get('/api/admin/users', { headers }),
        axios.get('/api/admin/coaches', { headers }),
      ]);

      if (statsRes.status === 'fulfilled' && statsRes.value.data?.success) {
        setStats(statsRes.value.data.data);
      }
      if (usersRes.status === 'fulfilled' && usersRes.value.data?.success) {
        setUsersList(usersRes.value.data.data.users || []);
      }
      if (coachesRes.status === 'fulfilled' && coachesRes.value.data?.success) {
        setCoachesList(coachesRes.value.data.data.coaches || []);
      }
    } catch (_err: any) {
      toast.error('Telemetry Error', 'Failed to load administrative statistics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleUpdateCoachStatus = async (coachId: string, status: 'active' | 'rejected') => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.put(
        `/api/admin/coaches/${coachId}/status`,
        { status },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data?.success) {
        toast.success('Coach Updated', `Coach status changed to ${status.toUpperCase()}`);
        fetchAdminData();
      }
    } catch (err: any) {
      toast.error('Action Failed', err.response?.data?.message || 'Could not update coach status');
    }
  };

  const pendingCoaches = coachesList.filter((c) => c.status === 'pending');

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
                Real-time Aggregate PostgreSQL Telemetry, Coach Approval Workflow & Accounts Supervision
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  fetchAdminData();
                  toast.success('Refreshed', 'Synced from PostgreSQL');
                }}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all"
              >
                <FiRefreshCw className="w-4 h-4 text-rose-400" /> Sync Telemetry
              </button>
            </div>
          </div>
        </div>

        {/* Aggregated Real Platform Metric Cards */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Total & Active Users */}
            <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">Total Registered Accounts</span>
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
                  <FiUsers className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-white">{stats?.totalUsers ?? usersList.length} Users</p>
              <p className="text-[11px] text-emerald-400 font-semibold">{stats?.activeUsers ?? usersList.length} Active Accounts</p>
            </div>

            {/* 2. Total & Pending Coaches */}
            <div className="glass-panel p-5 rounded-2xl border border-amber-500/30 bg-amber-950/10 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-amber-400">Coaches & Pending Approvals</span>
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <FiUserCheck className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-amber-300">{stats?.totalCoaches ?? coachesList.length} Total Coaches</p>
              <p className="text-[11px] text-rose-400 font-semibold">{pendingCoaches.length} Pending Approval</p>
            </div>

            {/* 3. Platform Avg Habit Score */}
            <div className="glass-panel p-5 rounded-2xl border border-cyan-500/30 bg-cyan-950/20 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-cyan-400">Platform Avg Habit Score</span>
                <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                  <FiAward className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-cyan-300">
                {stats?.avgHabitScore !== null && stats?.avgHabitScore !== undefined ? `${stats.avgHabitScore} / 100` : 'No data yet'}
              </p>
              <p className="text-[11px] text-slate-400">Calculated from PostgreSQL</p>
            </div>

            {/* 4. Active Alarms & Attempts */}
            <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">Active Alarms & Activity</span>
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
                  <FiClock className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-purple-300">{stats?.activeAlarms ?? 0} Active Alarms</p>
              <p className="text-[11px] text-slate-400">{stats?.totalChallengeAttempts ?? 0} Total Challenge Attempts</p>
            </div>
          </div>
        )}

        {/* Pending Coach Approvals Section */}
        {pendingCoaches.length > 0 && (
          <div className="glass-panel p-6 rounded-2xl border border-rose-500/40 bg-rose-950/20 space-y-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <FiUserCheck className="text-amber-400" /> Pending Coach Approvals ({pendingCoaches.length})
            </h2>
            <div className="space-y-3">
              {pendingCoaches.map((c) => (
                <div key={c.id} className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div>
                    <h3 className="font-bold text-white text-sm">{c.name}</h3>
                    <p className="text-xs text-slate-400">{c.email} • Registered: {new Date(c.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleUpdateCoachStatus(c.id, 'active')}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 transition-all"
                    >
                      <FiCheck className="w-3.5 h-3.5" /> Approve
                    </button>
                    <button
                      onClick={() => handleUpdateCoachStatus(c.id, 'rejected')}
                      className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1 transition-all"
                    >
                      <FiX className="w-3.5 h-3.5" /> Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Accounts Directory Tabs & Table */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <FiUsers className="text-rose-400" /> Registered Accounts Directory
            </h2>
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab('users')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'users' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
              >
                All Users ({usersList.length})
              </button>
              <button
                onClick={() => setActiveTab('coaches')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'coaches' ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
              >
                Coaches ({coachesList.length})
              </button>
            </div>
          </div>

          {loading ? (
            <TableSkeleton rows={5} />
          ) : activeTab === 'users' ? (
            usersList.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs glass-panel rounded-2xl">No data yet</div>
            ) : (
              <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900/80 border-b border-slate-800 text-slate-400 uppercase font-semibold">
                      <tr>
                        <th className="py-3.5 px-4">User Name</th>
                        <th className="py-3.5 px-4">Email</th>
                        <th className="py-3.5 px-4">Role</th>
                        <th className="py-3.5 px-4">Registration Date</th>
                        <th className="py-3.5 px-4 text-right">Account Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {usersList.map((u) => (
                        <tr key={u.id} className="hover:bg-slate-900/40 transition-colors">
                          <td className="py-3.5 px-4 font-bold text-white">{u.name}</td>
                          <td className="py-3.5 px-4 text-slate-300">{u.email}</td>
                          <td className="py-3.5 px-4 capitalize">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${u.role === 'admin'
                                  ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                  : u.role === 'coach'
                                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                    : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                }`}
                            >
                              {u.role}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-slate-400">
                            {new Date(u.createdAt).toLocaleDateString()}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold capitalize ${u.status === 'active'
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : u.status === 'pending'
                                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                }`}
                            >
                              {u.status || 'active'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          ) : coachesList.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs glass-panel rounded-2xl">No data yet</div>
          ) : (
            <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900/80 border-b border-slate-800 text-slate-400 uppercase font-semibold">
                    <tr>
                      <th className="py-3.5 px-4">Coach Name</th>
                      <th className="py-3.5 px-4">Email</th>
                      <th className="py-3.5 px-4">Role</th>
                      <th className="py-3.5 px-4">Registration Date</th>
                      <th className="py-3.5 px-4 text-right">Account Status & Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {coachesList.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-900/40 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-white">{c.name}</td>
                        <td className="py-3.5 px-4 text-slate-300">{c.email}</td>
                        <td className="py-3.5 px-4 capitalize">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            {c.role}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-400">
                          {new Date(c.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {c.status === 'pending' ? (
                            <div className="flex justify-end gap-1.5">
                              <button
                                onClick={() => handleUpdateCoachStatus(c.id, 'active')}
                                className="px-2 py-1 rounded bg-emerald-600 text-white font-bold text-[10px]"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleUpdateCoachStatus(c.id, 'rejected')}
                                className="px-2 py-1 rounded bg-rose-600 text-white font-bold text-[10px]"
                              >
                                Reject
                              </button>
                            </div>
                          ) : (
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold capitalize ${c.status === 'active'
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                }`}
                            >
                              {c.status}
                            </span>
                          )}
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
