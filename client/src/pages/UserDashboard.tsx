import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { alarmService } from '../services/alarmService';
import { habitService } from '../services/habitService';
import { profileService } from '../services/profileService';
import { Alarm, Habit, Profile, RepeatType } from '../types';
import { useToast } from '../components/Toast';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { EmptyState } from '../components/ui/EmptyState';
import { CardSkeleton, TableSkeleton } from '../components/ui/SkeletonLoader';
import { LoadingButton } from '../components/LoadingButton';
import { FormInput } from '../components/FormInput';
import axios from 'axios';
import {
  FiClock,
  FiCheckSquare,
  FiZap,
  FiMoon,
  FiPlus,
  FiTrash2,
  FiUser,
  FiActivity,
  FiPlusCircle,
  FiCheck,
  FiX,
  FiAward,
  FiTrendingUp,
  FiCompass,
  FiAlertCircle,
} from 'react-icons/fi';

export const UserDashboard: React.FC = () => {
  const { user } = useAuth();
  const toast = useToast();

  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [overview, setOverview] = useState<any | null>(null);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Modals state
  const [showAddAlarm, setShowAddAlarm] = useState(false);
  const [showAddHabit, setShowAddHabit] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'alarm' | 'habit'; id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form states
  const [newAlarmTitle, setNewAlarmTitle] = useState('');
  const [newAlarmTime, setNewAlarmTime] = useState('07:00 AM');
  const [newAlarmRepeat, setNewAlarmRepeat] = useState<RepeatType>('daily');
  const [isSavingAlarm, setIsSavingAlarm] = useState(false);

  const [newHabitName, setNewHabitName] = useState('');
  const [newHabitTarget, setNewHabitTarget] = useState(7);
  const [isSavingHabit, setIsSavingHabit] = useState(false);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [alarmRes, habitRes, profileRes, ovRes, recRes] = await Promise.allSettled([
        alarmService.getAlarms(),
        habitService.getHabits(),
        profileService.getProfile(),
        axios.get('/api/analytics/overview', { headers }),
        axios.get('/api/recommendations', { headers }),
      ]);

      if (alarmRes.status === 'fulfilled' && alarmRes.value.success && alarmRes.value.data) setAlarms(alarmRes.value.data.alarms);
      if (habitRes.status === 'fulfilled' && habitRes.value.success && habitRes.value.data) setHabits(habitRes.value.data.habits);
      if (profileRes.status === 'fulfilled' && profileRes.value.success && profileRes.value.data) setProfile(profileRes.value.data.profile);
      if (ovRes.status === 'fulfilled') setOverview(ovRes.value.data?.data);
      if (recRes.status === 'fulfilled') setRecommendations(recRes.value.data?.data?.recommendations || []);
    } catch (_err: any) {
      toast.error('Data Fetch Error', 'Failed to load user dashboard resources');
    } finally {
      setLoading(false);
    }
  };

  // Alarm Operations
  const handleToggleAlarm = async (id: string) => {
    try {
      const res = await alarmService.toggleAlarm(id);
      if (res.success && res.data) {
        setAlarms((prev) => prev.map((a) => (a.id === id ? res.data!.alarm : a)));
        toast.info(res.data.alarm.activeStatus ? 'Alarm Activated' : 'Alarm Deactivated', res.data.alarm.alarmTitle);
      }
    } catch (err) {
      toast.error('Action Failed', 'Could not toggle alarm status');
    }
  };

  const handleCreateAlarm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAlarmTitle.trim()) {
      toast.error('Validation Error', 'Please enter an alarm title');
      return;
    }
    setIsSavingAlarm(true);
    try {
      const res = await alarmService.createAlarm({
        alarmTitle: newAlarmTitle.trim(),
        alarmTime: newAlarmTime,
        repeatType: newAlarmRepeat,
        activeStatus: true,
      });
      if (res.success && res.data) {
        setAlarms((prev) => [res.data!.alarm, ...prev]);
        toast.success('Alarm Added', `Scheduled for ${newAlarmTime}`);
        setNewAlarmTitle('');
        setShowAddAlarm(false);
      }
    } catch (err) {
      toast.error('Creation Error', 'Failed to add alarm');
    } finally {
      setIsSavingAlarm(false);
    }
  };

  // Habit Operations
  const handleCreateHabit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHabitName.trim()) {
      toast.error('Validation Error', 'Please enter a habit name');
      return;
    }
    setIsSavingHabit(true);
    try {
      const res = await habitService.createHabit({
        habitName: newHabitName.trim(),
        targetDays: Number(newHabitTarget),
        currentStreak: 1,
      });
      if (res.success && res.data) {
        setHabits((prev) => [res.data!.habit, ...prev]);
        toast.success('Habit Tracked', `Added "${newHabitName}"`);
        setNewHabitName('');
        setShowAddHabit(false);
      }
    } catch (err) {
      toast.error('Creation Error', 'Failed to add habit');
    } finally {
      setIsSavingHabit(false);
    }
  };

  const handleIncrementStreak = async (habit: Habit) => {
    try {
      const updatedStreak = habit.currentStreak + 1;
      const res = await habitService.updateHabit(habit.id, { currentStreak: updatedStreak });
      if (res.success && res.data) {
        setHabits((prev) => prev.map((h) => (h.id === habit.id ? res.data!.habit : h)));
        toast.success('Streak Extended!', `${habit.habitName} is now at ${updatedStreak} days 🔥`);
      }
    } catch (err) {
      toast.error('Update Error', 'Could not update habit streak');
    }
  };

  // Delete Confirmation Handler
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      if (deleteTarget.type === 'alarm') {
        await alarmService.deleteAlarm(deleteTarget.id);
        setAlarms((prev) => prev.filter((a) => a.id !== deleteTarget.id));
        toast.success('Alarm Removed', `Deleted "${deleteTarget.name}"`);
      } else {
        await habitService.deleteHabit(deleteTarget.id);
        setHabits((prev) => prev.filter((h) => h.id !== deleteTarget.id));
        toast.success('Habit Removed', `Deleted "${deleteTarget.name}"`);
      }
    } catch (err) {
      toast.error('Delete Error', 'Operation failed');
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  const highestStreak = habits.length > 0 ? Math.max(...habits.map((h) => h.currentStreak)) : 0;
  const nextAlarm = alarms.find((a) => a.activeStatus);
  const hasData = overview?.hasSufficientData ?? true;

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Welcome Header */}
        <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-blue-500/20 bg-gradient-to-r from-slate-900 via-blue-950/30 to-slate-900 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 mb-2">
                <FiUser className="w-3.5 h-3.5" /> User Portal • Milestone 3
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
                Good day, {user?.name}!
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Cognitive Readiness Overview • Scheduled Wake Time:{' '}
                <span className="text-blue-300 font-semibold">{profile?.wakeUpTime || '07:00 AM'}</span>
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAddAlarm(true)}
                className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-lg shadow-blue-500/20"
              >
                <FiPlus className="w-4 h-4" /> Add Alarm
              </button>
              <button
                onClick={() => setShowAddHabit(true)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all"
              >
                <FiPlusCircle className="w-4 h-4 text-emerald-400" /> Track Habit
              </button>
            </div>
          </div>
        </div>

        {/* Empty state notice if new user */}
        {!hasData && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-center gap-3 text-amber-300 text-xs">
            <FiAlertCircle className="w-5 h-5 flex-shrink-0" />
            <div>
              <span className="font-bold">No sufficient activity data yet.</span> Complete morning wake-up verifications to unlock personalized cognitive analytics and difficulty adaptations.
            </div>
          </div>
        )}

        {/* 5 Required Cards: Habit Score, Wake-Up Consistency, Challenge Accuracy, Snooze Rate, Current Streak */}
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
            {/* 1. Habit Score Card */}
            <div className="glass-panel p-5 rounded-2xl border border-cyan-500/30 space-y-2 bg-gradient-to-b from-cyan-950/20 to-slate-900 shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-cyan-400">Habit Score</span>
                <FiAward className="w-5 h-5 text-cyan-400" />
              </div>
              <p className="text-2xl font-extrabold text-white">
                {overview?.hasSufficientData ? `${overview?.habitScore?.overall_score} / 100` : 'No data yet'}
              </p>
              <p className="text-[11px] text-cyan-300 font-medium truncate">
                Grade: {overview?.hasSufficientData ? overview?.habitScore?.score_category : 'No data yet'}
              </p>
            </div>

            {/* 2. Wake-Up Consistency */}
            <div className="glass-panel p-5 rounded-2xl border border-blue-500/30 space-y-2 bg-gradient-to-b from-blue-950/20 to-slate-900">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-blue-400">Wake-Up Consistency</span>
                <FiClock className="w-5 h-5 text-blue-400" />
              </div>
              <p className="text-2xl font-bold text-white">
                {overview?.hasSufficientData ? `${overview?.wakeUpConsistency}%` : 'No data yet'}
              </p>
              <p className="text-[11px] text-blue-300/80 truncate">
                35% Weighted Component
              </p>
            </div>

            {/* 3. Challenge Accuracy */}
            <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">Challenge Accuracy</span>
                <FiZap className="w-5 h-5 text-indigo-400" />
              </div>
              <p className="text-2xl font-bold text-emerald-400">
                {overview?.hasSufficientData ? `${overview?.challengeAccuracy}%` : 'No data yet'}
              </p>
              <p className="text-[11px] text-slate-500">25% Weighted Component</p>
            </div>

            {/* 4. Snooze Rate */}
            <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">Snooze Reduction</span>
                <FiMoon className="w-5 h-5 text-purple-400" />
              </div>
              <p className="text-2xl font-bold text-purple-300">
                {overview?.hasSufficientData ? `${overview?.snoozeReductionRate}%` : 'No data yet'}
              </p>
              <p className="text-[11px] text-slate-500">20% Weighted Component</p>
            </div>

            {/* 5. Current Habit Streak */}
            <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">Current Streak</span>
                <FiCheckSquare className="w-5 h-5 text-amber-400" />
              </div>
              <p className="text-2xl font-bold text-amber-300">{habits.length > 0 ? `${highestStreak} Days` : 'No data yet'}</p>
              <p className="text-[11px] text-slate-500">{habits.length} Habits Tracked</p>
            </div>
          </div>
        )}

        {/* Recommended Action Section & Recent Behavior */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recommended Action Section */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <FiCompass className="text-cyan-400" /> Recommended Actions Engine
            </h2>

            {recommendations.length === 0 ? (
              <div className="text-xs text-slate-400 py-4">No active recommendations. Complete more activities to generate insights.</div>
            ) : (
              <div className="space-y-3">
                {recommendations.slice(0, 3).map((rec) => (
                  <div key={rec.id} className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                        {rec.category}
                      </span>
                      <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded ${
                        rec.priority === 'high' ? 'bg-rose-500/20 text-rose-400' : 'bg-amber-500/20 text-amber-400'
                      }`}>
                        {rec.priority}
                      </span>
                    </div>
                    <h3 className="font-bold text-white text-xs">{rec.title}</h3>
                    <p className="text-slate-300 text-[11px]">{rec.description}</p>
                    <p className="text-[10px] text-slate-400 italic">Reason: {rec.reason}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Behavior & Alarms Section */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <FiActivity className="text-blue-400" /> Recent Behavior & Awakening Routine
            </h2>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex justify-between items-center">
                <div>
                  <span className="font-bold text-white block">Scheduled Awakening</span>
                  <span className="text-[10px] text-slate-400">{nextAlarm ? nextAlarm.alarmTitle : 'No Alarm Set'}</span>
                </div>
                <span className="font-mono text-sm font-bold text-blue-300">{nextAlarm ? nextAlarm.alarmTime : '--:--'}</span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex justify-between items-center">
                <div>
                  <span className="font-bold text-white block">Sleep Schedule Adherence</span>
                  <span className="text-[10px] text-slate-400">Target Bedtime: 11:00 PM</span>
                </div>
                <span className="font-bold text-emerald-400">
                  {overview?.hasSufficientData ? `${overview?.sleepAdherenceRate}% Rate` : 'No data yet'}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex justify-between items-center">
                <div>
                  <span className="font-bold text-white block">Cognitive Puzzle Accuracy</span>
                  <span className="text-[10px] text-slate-400">Math & Logic Challenges</span>
                </div>
                <span className="font-bold text-indigo-300">
                  {overview?.hasSufficientData ? `${overview?.challengeAccuracy}%` : 'No data yet'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Alarm & Habit Modals */}
        {showAddAlarm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <div className="glass-panel max-w-md w-full p-6 rounded-2xl border border-slate-800 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <FiClock className="text-blue-400" /> Schedule New Alarm
                </h3>
                <button onClick={() => setShowAddAlarm(false)} className="text-slate-400 hover:text-white">
                  <FiX className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleCreateAlarm} className="space-y-4">
                <FormInput
                  label="Alarm Title"
                  placeholder="e.g. Morning Awakening"
                  value={newAlarmTitle}
                  onChange={(e) => setNewAlarmTitle(e.target.value)}
                />
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">Alarm Time</label>
                  <input
                    type="text"
                    value={newAlarmTime}
                    onChange={(e) => setNewAlarmTime(e.target.value)}
                    className="w-full text-sm rounded-xl py-2.5 px-3 glass-input"
                    placeholder="07:00 AM"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">Repeat Type</label>
                  <select
                    value={newAlarmRepeat}
                    onChange={(e) => setNewAlarmRepeat(e.target.value as RepeatType)}
                    className="w-full text-sm rounded-xl py-2.5 px-3 glass-input bg-slate-900"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekdays">Weekdays (Mon-Fri)</option>
                    <option value="weekend">Weekend (Sat-Sun)</option>
                    <option value="one_time">One Time</option>
                  </select>
                </div>
                <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowAddAlarm(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <LoadingButton type="submit" isLoading={isSavingAlarm} className="text-xs py-2 px-4">
                    Save Alarm
                  </LoadingButton>
                </div>
              </form>
            </div>
          </div>
        )}

        {showAddHabit && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <div className="glass-panel max-w-md w-full p-6 rounded-2xl border border-slate-800 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <FiCheckSquare className="text-emerald-400" /> Create Habit Goal
                </h3>
                <button onClick={() => setShowAddHabit(false)} className="text-slate-400 hover:text-white">
                  <FiX className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleCreateHabit} className="space-y-4">
                <FormInput
                  label="Habit Name"
                  placeholder="e.g. 10-Minute Morning Hydration"
                  value={newHabitName}
                  onChange={(e) => setNewHabitName(e.target.value)}
                />
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">Target Days Per Week</label>
                  <input
                    type="number"
                    min={1}
                    max={7}
                    value={newHabitTarget}
                    onChange={(e) => setNewHabitTarget(Number(e.target.value))}
                    className="w-full text-sm rounded-xl py-2.5 px-3 glass-input"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowAddHabit(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <LoadingButton type="submit" isLoading={isSavingHabit} className="text-xs py-2 px-4">
                    Save Habit
                  </LoadingButton>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Main Grid: Alarms Table & Habit Tracker */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Alarms Management Table */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <FiClock className="text-blue-400" /> Upcoming Alarms
              </h2>
              <button
                onClick={() => setShowAddAlarm(true)}
                className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1"
              >
                <FiPlus /> New Alarm
              </button>
            </div>

            {loading ? (
              <TableSkeleton />
            ) : alarms.length === 0 ? (
              <EmptyState
                title="No Alarms Scheduled"
                description="Set up your first cognitive awakening alarm schedule."
                actionText="Create Alarm"
                onAction={() => setShowAddAlarm(true)}
              />
            ) : (
              <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900/80 border-b border-slate-800 text-slate-400 uppercase font-semibold">
                      <tr>
                        <th className="py-3.5 px-4">Title & Sound</th>
                        <th className="py-3.5 px-4">Time</th>
                        <th className="py-3.5 px-4">Repeat</th>
                        <th className="py-3.5 px-4">Active</th>
                        <th className="py-3.5 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {alarms.map((alarm) => (
                        <tr key={alarm.id} className="hover:bg-slate-900/40 transition-colors">
                          <td className="py-3.5 px-4">
                            <span className="font-bold text-white block">{alarm.alarmTitle}</span>
                            <span className="text-[10px] text-slate-400">🎵 {alarm.sound}</span>
                          </td>
                          <td className="py-3.5 px-4 font-mono font-bold text-blue-300 text-sm">{alarm.alarmTime}</td>
                          <td className="py-3.5 px-4 capitalize">
                            <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[10px] font-medium border border-slate-700">
                              {alarm.repeatType}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <button
                              onClick={() => handleToggleAlarm(alarm.id)}
                              className={`w-10 h-5 flex items-center rounded-full p-1 transition-colors ${
                                alarm.activeStatus ? 'bg-blue-600 justify-end' : 'bg-slate-700 justify-start'
                              }`}
                            >
                              <span className="w-3.5 h-3.5 rounded-full bg-white shadow-md" />
                            </button>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={() => setDeleteTarget({ type: 'alarm', id: alarm.id, name: alarm.alarmTitle })}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                              title="Delete Alarm"
                            >
                              <FiTrash2 className="w-4 h-4" />
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

          {/* Habit Progress & Profile Summary */}
          <div className="space-y-6">
            {/* Habits Progress Panel */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <FiCheckSquare className="text-emerald-400" /> Habit Progress
                </h2>
                <button
                  onClick={() => setShowAddHabit(true)}
                  className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1"
                >
                  <FiPlus /> Add
                </button>
              </div>

              {loading ? (
                <TableSkeleton rows={3} />
              ) : habits.length === 0 ? (
                <EmptyState
                  title="No Habits Tracked"
                  description="Add daily behavioral habits to monitor your cognitive routine."
                  actionText="Add Habit"
                  onAction={() => setShowAddHabit(true)}
                />
              ) : (
                <div className="space-y-3">
                  {habits.map((habit) => (
                    <div
                      key={habit.id}
                      className="glass-panel p-4 rounded-2xl border border-slate-800 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-white truncate">{habit.habitName}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-amber-400 font-semibold">{habit.currentStreak} Day Streak 🔥</span>
                          <span className="text-[10px] text-slate-500">• Goal: {habit.targetDays} days/wk</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleIncrementStreak(habit)}
                          className="p-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition-all text-xs font-semibold flex items-center gap-1"
                          title="Complete Habit for Today"
                        >
                          <FiCheck className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget({ type: 'habit', id: habit.id, name: habit.habitName })}
                          className="p-2 rounded-xl text-slate-500 hover:text-rose-400 transition-colors"
                        >
                          <FiTrash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Profile Summary Card */}
            <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Profile Summary</h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">Productivity Goal:</span>
                  <span className="font-semibold text-white truncate max-w-[160px]">{profile?.productivityGoal || 'Morning Focus'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">Difficulty:</span>
                  <span className="font-semibold text-blue-400">{profile?.difficultyPreference || 'Moderate'}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Timezone:</span>
                  <span className="font-mono text-slate-300">{profile?.timezone || 'UTC'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        title={`Delete ${deleteTarget?.type === 'alarm' ? 'Alarm' : 'Habit'}`}
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </DashboardLayout>
  );
};
