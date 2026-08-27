import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { habitService, CreateHabitPayload } from '../services/habitService';
import { Habit } from '../types';
import { useToast } from '../components/Toast';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { EmptyState } from '../components/ui/EmptyState';
import { CardSkeleton } from '../components/ui/SkeletonLoader';
import { LoadingButton } from '../components/LoadingButton';
import { FormInput } from '../components/FormInput';
import {
  FiCheckSquare,
  FiPlus,
  FiTrash2,
  FiEdit,
  FiZap,
  FiAward,
  FiCalendar,
  FiToggleLeft,
  FiToggleRight,
  FiX,
  FiCheck,
  FiActivity,
} from 'react-icons/fi';

export const HabitsPage: React.FC = () => {
  const toast = useToast();

  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form fields
  const [habitName, setHabitName] = useState('');
  const [targetDays, setTargetDays] = useState(7);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [isEnabled, setIsEnabled] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchHabits();
  }, []);

  const fetchHabits = async () => {
    setLoading(true);
    try {
      const res = await habitService.getHabits();
      if (res.success && res.data) {
        setHabits(res.data.habits);
      }
    } catch (err) {
      toast.error('Habit Fetch Error', 'Failed to load habit list');
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingHabit(null);
    setHabitName('');
    setTargetDays(7);
    setCurrentStreak(0);
    setIsEnabled(true);
    setShowAddModal(true);
  };

  const openEditModal = (h: Habit) => {
    setEditingHabit(h);
    setHabitName(h.habitName);
    setTargetDays(h.targetDays);
    setCurrentStreak(h.currentStreak);
    setIsEnabled(h.isEnabled !== undefined ? h.isEnabled : true);
    setShowAddModal(true);
  };

  const handleToggleStatus = async (id: string) => {
    try {
      const res = await habitService.toggleHabit(id);
      if (res.success && res.data) {
        const updated = res.data.habit;
        setHabits((prev) => prev.map((h) => (h.id === id ? updated : h)));
        toast.info(updated.isEnabled ? 'Habit Enabled' : 'Habit Disabled', updated.habitName);
      }
    } catch (err) {
      toast.error('Toggle Failed', 'Could not update habit status');
    }
  };

  const handleSaveHabit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!habitName.trim()) {
      toast.error('Validation Error', 'Habit name is required');
      return;
    }

    setIsSaving(true);
    try {
      if (editingHabit) {
        const res = await habitService.updateHabit(editingHabit.id, {
          habitName: habitName.trim(),
          targetDays,
          currentStreak,
          isEnabled,
        });

        if (res.success && res.data) {
          setHabits((prev) => prev.map((h) => (h.id === editingHabit.id ? res.data!.habit : h)));
          toast.success('Habit Updated', 'Habit successfully updated');
          setShowAddModal(false);
        }
      } else {
        const payload: CreateHabitPayload = {
          habitName: habitName.trim(),
          targetDays,
          currentStreak,
          isEnabled,
        };

        const res = await habitService.createHabit(payload);
        if (res.success && res.data) {
          setHabits((prev) => [res.data!.habit, ...prev]);
          toast.success('Habit Created', 'New habit target added successfully');
          setShowAddModal(false);
        }
      }
    } catch (err) {
      toast.error('Save Failed', 'Could not save habit');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await habitService.deleteHabit(deleteTarget.id);
      if (res.success) {
        setHabits((prev) => prev.filter((h) => h.id !== deleteTarget.id));
        toast.success('Habit Deleted', `Removed ${deleteTarget.name}`);
      }
    } catch (err) {
      toast.error('Delete Failed', 'Could not remove habit');
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  const activeHabitsCount = habits.filter((h) => h.isEnabled !== false).length;
  const maxStreak = habits.reduce((max, h) => Math.max(max, h.currentStreak || 0), 0);

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header Banner */}
        <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-indigo-500/20 bg-gradient-to-r from-slate-900 via-indigo-950/30 to-slate-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 font-bold">
                <FiCheckSquare className="w-5 h-5" />
              </span>
              <h1 className="text-2xl font-extrabold text-white">Habit Management</h1>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Track daily morning rituals, maintain active streaks, and optimize cognitive discipline.
            </p>
          </div>

          <button
            onClick={openAddModal}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all flex items-center gap-2 shadow-lg shadow-emerald-600/20"
          >
            <FiPlus className="w-4 h-4" /> Add New Habit
          </button>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Habits</p>
              <p className="text-2xl font-black text-white mt-1">{habits.length}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold">
              <FiCheckSquare className="w-6 h-6" />
            </div>
          </div>

          <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Habits</p>
              <p className="text-2xl font-black text-emerald-400 mt-1">{activeHabitsCount}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
              <FiZap className="w-6 h-6" />
            </div>
          </div>

          <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Highest Streak</p>
              <p className="text-2xl font-black text-amber-400 mt-1">{maxStreak} Days</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold">
              <FiAward className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Habit List */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <CardSkeleton count={6} />
          </div>
        ) : habits.length === 0 ? (
          <EmptyState
            title="No Habits Created Yet"
            description="Start building consistency by adding your first daily wake-up or morning focus habit."
            actionLabel="Create First Habit"
            onAction={openAddModal}
            icon={<FiCheckSquare className="w-8 h-8 text-emerald-400" />}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {habits.map((h) => {
              const active = h.isEnabled !== false;
              const progressPct = Math.min(100, Math.round(((h.currentStreak || 0) / (h.targetDays || 1)) * 100));

              return (
                <div
                  key={h.id}
                  className={`glass-panel p-6 rounded-2xl border transition-all relative group flex flex-col justify-between ${
                    active ? 'border-slate-800 hover:border-emerald-500/40' : 'border-slate-800/60 opacity-60'
                  }`}
                >
                  <div>
                    {/* Header: Title & Enable Switch */}
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="min-w-0 flex-1">
                        <h3 className="text-base font-bold text-white truncate">{h.habitName}</h3>
                        <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                          <FiCalendar className="w-3 h-3 text-slate-500" /> Target: {h.targetDays} Days
                        </p>
                      </div>

                      <button
                        onClick={() => handleToggleStatus(h.id)}
                        className={`p-1.5 rounded-lg text-lg transition-colors ${
                          active ? 'text-emerald-400 hover:bg-emerald-500/10' : 'text-slate-500 hover:bg-slate-800'
                        }`}
                        title={active ? 'Disable Habit' : 'Enable Habit'}
                      >
                        {active ? <FiToggleRight className="w-6 h-6 text-emerald-400" /> : <FiToggleLeft className="w-6 h-6 text-slate-500" />}
                      </button>
                    </div>

                    {/* Streak Badge */}
                    <div className="my-4 p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                      <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider flex items-center gap-1.5">
                        <FiZap className="text-amber-400 w-3.5 h-3.5" /> Current Streak
                      </span>
                      <span className="text-sm font-black text-amber-400 bg-amber-400/10 px-2.5 py-0.5 rounded-full border border-amber-400/20">
                        {h.currentStreak} Days 🔥
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1.5 mb-4">
                      <div className="flex justify-between text-[11px] font-semibold">
                        <span className="text-slate-400">Target Progress</span>
                        <span className="text-emerald-400">{progressPct}%</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-4 border-t border-slate-800/80 flex items-center justify-end gap-2">
                    <button
                      onClick={() => openEditModal(h)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors flex items-center gap-1"
                    >
                      <FiEdit className="w-3.5 h-3.5" /> Edit
                    </button>

                    <button
                      onClick={() => setDeleteTarget({ id: h.id, name: h.habitName })}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-400 hover:bg-rose-500/10 transition-colors flex items-center gap-1"
                    >
                      <FiTrash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Add/Edit Modal */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
            <div className="glass-panel w-full max-w-md p-6 rounded-2xl border border-slate-800 bg-slate-900/95 space-y-6 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <FiCheckSquare className="text-emerald-400" />
                  {editingHabit ? 'Edit Habit Target' : 'Create New Habit'}
                </h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  <FiX className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveHabit} className="space-y-4">
                <FormInput
                  label="Habit Name"
                  value={habitName}
                  onChange={(e) => setHabitName(e.target.value)}
                  placeholder="e.g. Morning Hydration 500ml"
                  required
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormInput
                    label="Target Days Goal"
                    type="number"
                    value={targetDays}
                    onChange={(e) => setTargetDays(parseInt(e.target.value, 10) || 1)}
                    min={1}
                    max={365}
                    required
                  />

                  <FormInput
                    label="Current Streak (Days)"
                    type="number"
                    value={currentStreak}
                    onChange={(e) => setCurrentStreak(parseInt(e.target.value, 10) || 0)}
                    min={0}
                  />
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <input
                    type="checkbox"
                    id="habit-enabled-toggle"
                    checked={isEnabled}
                    onChange={(e) => setIsEnabled(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 bg-slate-800 border-slate-700"
                  />
                  <label htmlFor="habit-enabled-toggle" className="text-xs font-semibold text-slate-300">
                    Enable this habit immediately
                  </label>
                </div>

                <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>

                  <LoadingButton
                    type="submit"
                    isLoading={isSaving}
                    loadingText="Saving..."
                    className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500"
                  >
                    {editingHabit ? 'Update Habit' : 'Create Habit'}
                  </LoadingButton>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteTarget && (
          <ConfirmModal
            isOpen={true}
            title="Delete Habit"
            message={`Are you sure you want to delete "${deleteTarget.name}"? This action cannot be undone.`}
            confirmText="Delete Habit"
            confirmVariant="danger"
            isLoading={isDeleting}
            onConfirm={handleDeleteConfirm}
            onClose={() => setDeleteTarget(null)}
          />
        )}
      </div>
    </DashboardLayout>
  );
};

export default HabitsPage;
