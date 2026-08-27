import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { alarmService, CreateAlarmPayload } from '../services/alarmService';
import { Alarm, RepeatType } from '../types';
import { useToast } from '../components/Toast';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { EmptyState } from '../components/ui/EmptyState';
import { CardSkeleton } from '../components/ui/SkeletonLoader';
import { LoadingButton } from '../components/LoadingButton';
import { FormInput } from '../components/FormInput';
import {
  FiClock,
  FiPlus,
  FiTrash2,
  FiEdit,
  FiZap,
  FiVolume2,
  FiActivity,
  FiToggleLeft,
  FiToggleRight,
  FiX,
  FiSliders,
  FiCheckCircle,
  FiCalendar,
  FiCpu,
} from 'react-icons/fi';
import { ActiveAlarmModal } from '../components/challenges/ActiveAlarmModal';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const AlarmsPage: React.FC = () => {
  const toast = useToast();

  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [nextAlarm, setNextAlarm] = useState<Alarm | null>(null);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAlarm, setEditingAlarm] = useState<Alarm | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);
  const [testAlarmTarget, setTestAlarmTarget] = useState<Alarm | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form Fields
  const [alarmTitle, setAlarmTitle] = useState('');
  const [alarmTime, setAlarmTime] = useState('07:00 AM');
  const [repeatType, setRepeatType] = useState<RepeatType>('daily');
  const [repeatDays, setRepeatDays] = useState<string[]>(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
  const [difficultyLevel, setDifficultyLevel] = useState('Moderate');
  const [sound, setSound] = useState('Gentle Chime');
  const [vibration, setVibration] = useState(true);
  const [snooze, setSnooze] = useState(5);
  const [activeStatus, setActiveStatus] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchAlarms();
  }, []);

  const fetchAlarms = async () => {
    setLoading(true);
    try {
      const [allRes, nextRes] = await Promise.all([
        alarmService.getAlarms(),
        alarmService.checkNextAlarm(),
      ]);

      if (allRes.success && allRes.data) {
        setAlarms(allRes.data.alarms);
      }
      if (nextRes.success && nextRes.data) {
        setNextAlarm(nextRes.data.nextAlarm);
      }
    } catch (err) {
      toast.error('Alarm Error', 'Failed to load alarm list');
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingAlarm(null);
    setAlarmTitle('');
    setAlarmTime('07:00 AM');
    setRepeatType('daily');
    setRepeatDays(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
    setDifficultyLevel('Moderate');
    setSound('Gentle Chime');
    setVibration(true);
    setSnooze(5);
    setActiveStatus(true);
    setShowAddModal(true);
  };

  const openEditModal = (a: Alarm) => {
    setEditingAlarm(a);
    setAlarmTitle(a.alarmTitle);
    setAlarmTime(a.alarmTime);
    setRepeatType(a.repeatType);
    setRepeatDays(a.repeatDays || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
    setDifficultyLevel(a.difficultyLevel || 'Moderate');
    setSound(a.sound);
    setVibration(a.vibration);
    setSnooze(a.snooze || 5);
    setActiveStatus(a.activeStatus);
    setShowAddModal(true);
  };

  const handleToggleEnableDisable = async (id: string, currentStatus: boolean) => {
    try {
      const res = currentStatus
        ? await alarmService.disableAlarm(id)
        : await alarmService.enableAlarm(id);

      if (res.success && res.data) {
        const updated = res.data.alarm;
        setAlarms((prev) => prev.map((a) => (a.id === id ? updated : a)));
        toast.info(updated.activeStatus ? 'Alarm Enabled' : 'Alarm Disabled', updated.alarmTitle);
        // Refresh next alarm preview
        const nextRes = await alarmService.checkNextAlarm();
        if (nextRes.success && nextRes.data) setNextAlarm(nextRes.data.nextAlarm);
      }
    } catch (err) {
      toast.error('Toggle Failed', 'Could not change alarm state');
    }
  };

  const toggleDaySelection = (day: string) => {
    setRepeatDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleSaveAlarm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!alarmTitle.trim()) {
      toast.error('Validation Error', 'Please specify an alarm title');
      return;
    }

    setIsSaving(true);
    try {
      if (editingAlarm) {
        const res = await alarmService.updateAlarm(editingAlarm.id, {
          alarmTitle: alarmTitle.trim(),
          alarmTime,
          repeatType,
          repeatDays,
          difficultyLevel,
          sound,
          vibration,
          snooze,
          activeStatus,
        });

        if (res.success && res.data) {
          setAlarms((prev) => prev.map((a) => (a.id === editingAlarm.id ? res.data!.alarm : a)));
          toast.success('Alarm Updated', 'Alarm configuration updated successfully');
          setShowAddModal(false);
        }
      } else {
        const payload: CreateAlarmPayload = {
          alarmTitle: alarmTitle.trim(),
          alarmTime,
          repeatType,
          repeatDays,
          difficultyLevel,
          sound,
          vibration,
          snooze,
          activeStatus,
        };

        const res = await alarmService.createAlarm(payload);
        if (res.success && res.data) {
          setAlarms((prev) => [res.data!.alarm, ...prev]);
          toast.success('Alarm Created', 'New cognitive alarm scheduled successfully');
          setShowAddModal(false);
        }
      }
      const nextRes = await alarmService.checkNextAlarm();
      if (nextRes.success && nextRes.data) setNextAlarm(nextRes.data.nextAlarm);
    } catch (err) {
      toast.error('Save Error', 'Failed to save alarm schedule');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await alarmService.deleteAlarm(deleteTarget.id);
      if (res.success) {
        setAlarms((prev) => prev.filter((a) => a.id !== deleteTarget.id));
        toast.success('Alarm Deleted', `Removed "${deleteTarget.title}"`);
        const nextRes = await alarmService.checkNextAlarm();
        if (nextRes.success && nextRes.data) setNextAlarm(nextRes.data.nextAlarm);
      }
    } catch (err) {
      toast.error('Delete Error', 'Failed to delete alarm');
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  const getRepeatBadge = (type: RepeatType) => {
    switch (type) {
      case 'daily':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">Daily</span>;
      case 'weekdays':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">Weekdays</span>;
      case 'weekend':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">Weekend</span>;
      case 'smart_adaptive':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1"><FiZap className="w-3 h-3" /> Smart Adaptive</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">One-Time</span>;
    }
  };

  const activeAlarmsCount = alarms.filter((a) => a.activeStatus).length;

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header Banner */}
        <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-indigo-500/20 bg-gradient-to-r from-slate-900 via-indigo-950/30 to-slate-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-blue-500/20 text-blue-400 font-bold">
                <FiClock className="w-5 h-5" />
              </span>
              <h1 className="text-2xl font-extrabold text-white">Alarm Scheduling System</h1>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Configure morning awakening timers, smart adaptive challenges, and recurring schedule routines.
            </p>
          </div>

          <button
            onClick={openAddModal}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all flex items-center gap-2 shadow-lg shadow-blue-600/20"
          >
            <FiPlus className="w-4 h-4" /> Schedule Alarm
          </button>
        </div>

        {/* Next Alarm Banner */}
        {nextAlarm && (
          <div className="glass-panel p-6 rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-950/30 via-slate-900 to-indigo-950/30 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xl border border-amber-500/30">
                <FiClock className="w-7 h-7" />
              </div>
              <div>
                <span className="text-[10px] font-extrabold text-amber-400 uppercase tracking-widest block">Up Next</span>
                <h2 className="text-2xl font-black text-white">{nextAlarm.alarmTime}</h2>
                <p className="text-xs text-slate-400 mt-0.5">{nextAlarm.alarmTitle} • {nextAlarm.repeatType.replace('_', ' ')}</p>
              </div>
            </div>

            <div className="hidden sm:flex items-center gap-3">
              {getRepeatBadge(nextAlarm.repeatType)}
              <span className="text-xs font-semibold px-3 py-1 rounded-xl bg-slate-900 border border-slate-800 text-slate-300">
                Difficulty: {nextAlarm.difficultyLevel || 'Moderate'}
              </span>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Alarms</p>
              <p className="text-2xl font-black text-white mt-1">{alarms.length}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold">
              <FiClock className="w-6 h-6" />
            </div>
          </div>

          <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Alarms</p>
              <p className="text-2xl font-black text-emerald-400 mt-1">{activeAlarmsCount}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
              <FiCheckCircle className="w-6 h-6" />
            </div>
          </div>

          <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Adaptive Engines</p>
              <p className="text-2xl font-black text-amber-400 mt-1">
                {alarms.filter((a) => a.repeatType === 'smart_adaptive').length} Active
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold">
              <FiZap className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Alarm List */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <CardSkeleton count={6} />
          </div>
        ) : alarms.length === 0 ? (
          <EmptyState
            title="No Alarms Configured"
            description="Create your first cognitive alarm schedule to start waking up with morning discipline."
            actionLabel="Schedule First Alarm"
            onAction={openAddModal}
            icon={<FiClock className="w-8 h-8 text-blue-400" />}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {alarms.map((a) => (
              <div
                key={a.id}
                className={`glass-panel p-6 rounded-2xl border transition-all relative group flex flex-col justify-between ${
                  a.activeStatus ? 'border-slate-800 hover:border-blue-500/40' : 'border-slate-800/60 opacity-60'
                }`}
              >
                <div>
                  {/* Top bar: Badge & Toggle */}
                  <div className="flex items-center justify-between gap-2 mb-4">
                    {getRepeatBadge(a.repeatType)}
                    <button
                      onClick={() => handleToggleEnableDisable(a.id, a.activeStatus)}
                      className="p-1 rounded-lg text-lg transition-colors"
                      title={a.activeStatus ? 'Disable Alarm' : 'Enable Alarm'}
                    >
                      {a.activeStatus ? (
                        <FiToggleRight className="w-7 h-7 text-emerald-400" />
                      ) : (
                        <FiToggleLeft className="w-7 h-7 text-slate-500" />
                      )}
                    </button>
                  </div>

                  {/* Main Time & Title */}
                  <div className="mb-4">
                    <h3 className="text-3xl font-black text-white tracking-tight">{a.alarmTime}</h3>
                    <p className="text-sm font-semibold text-slate-300 mt-1 truncate">{a.alarmTitle}</p>
                  </div>

                  {/* Settings Tags */}
                  <div className="grid grid-cols-2 gap-2 text-[11px] font-semibold mb-4">
                    <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center gap-1.5 text-slate-300">
                      <FiVolume2 className="text-indigo-400 w-3.5 h-3.5" />
                      <span className="truncate">{a.sound}</span>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center gap-1.5 text-slate-300">
                      <FiZap className="text-amber-400 w-3.5 h-3.5" />
                      <span>{a.difficultyLevel || 'Moderate'}</span>
                    </div>
                  </div>

                  {/* Snooze & Vibration */}
                  <div className="flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800/60 pt-3">
                    <span>Snooze: {a.snooze || 5} min</span>
                    <span>Vibration: {a.vibration ? 'ON' : 'OFF'}</span>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="pt-4 mt-4 border-t border-slate-800 flex items-center justify-between">
                  <button
                    onClick={() => setTestAlarmTarget(a)}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 transition-colors flex items-center gap-1.5"
                    title="Test active alarm anti-snooze challenge workflow"
                  >
                    <FiCpu className="w-3.5 h-3.5" /> Test Wake-Up
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openEditModal(a)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors flex items-center gap-1"
                    >
                      <FiEdit className="w-3.5 h-3.5" /> Edit
                    </button>
                    <button
                      onClick={() => setDeleteTarget({ id: a.id, title: a.alarmTitle })}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-400 hover:bg-rose-500/10 transition-colors flex items-center gap-1"
                    >
                      <FiTrash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Active Alarm Challenge Simulation Modal */}
        {testAlarmTarget && (
          <ActiveAlarmModal
            alarm={testAlarmTarget}
            onDismiss={() => setTestAlarmTarget(null)}
          />
        )}

        {/* Add/Edit Alarm Modal */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
            <div className="glass-panel w-full max-w-lg p-6 rounded-2xl border border-slate-800 bg-slate-900/95 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <FiClock className="text-blue-400" />
                  {editingAlarm ? 'Edit Alarm Schedule' : 'Schedule New Alarm'}
                </h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  <FiX className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveAlarm} className="space-y-4">
                <FormInput
                  label="Alarm Label / Title"
                  value={alarmTitle}
                  onChange={(e) => setAlarmTitle(e.target.value)}
                  placeholder="e.g. Primary Morning Awakening"
                  required
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormInput
                    label="Alarm Time (e.g. 07:00 AM)"
                    value={alarmTime}
                    onChange={(e) => setAlarmTime(e.target.value)}
                    placeholder="07:00 AM"
                    required
                  />

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                      Repeat Pattern
                    </label>
                    <select
                      value={repeatType}
                      onChange={(e) => setRepeatType(e.target.value as RepeatType)}
                      className="w-full text-xs rounded-xl py-3 px-3 glass-input bg-slate-900 border border-slate-700 text-white"
                    >
                      <option value="daily">Daily</option>
                      <option value="weekdays">Weekdays (Mon-Fri)</option>
                      <option value="weekend">Weekend (Sat-Sun)</option>
                      <option value="one_time">One-Time Only</option>
                      <option value="smart_adaptive">⚡ Smart Adaptive (Rule-Based)</option>
                    </select>
                  </div>
                </div>

                {/* Day selector */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                    Active Days
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {WEEKDAYS.map((day) => {
                      const selected = repeatDays.includes(day);
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => toggleDaySelection(day)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            selected
                              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                              : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                          }`}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                      Difficulty Level
                    </label>
                    <select
                      value={difficultyLevel}
                      onChange={(e) => setDifficultyLevel(e.target.value)}
                      className="w-full text-xs rounded-xl py-3 px-3 glass-input bg-slate-900 border border-slate-700 text-white"
                    >
                      <option value="Easy">Easy (Gentle awakening)</option>
                      <option value="Moderate">Moderate (Standard)</option>
                      <option value="High">High (Strict discipline)</option>
                      <option value="Expert">Expert (Peak challenge)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                      Alarm Sound Tone
                    </label>
                    <select
                      value={sound}
                      onChange={(e) => setSound(e.target.value)}
                      className="w-full text-xs rounded-xl py-3 px-3 glass-input bg-slate-900 border border-slate-700 text-white"
                    >
                      <option value="Gentle Chime">Gentle Chime</option>
                      <option value="Cyber Pulse">Cyber Pulse</option>
                      <option value="Zen Flute">Zen Flute</option>
                      <option value="Cosmic Alarm">Cosmic Alarm</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormInput
                    label="Snooze Duration (Minutes)"
                    type="number"
                    value={snooze}
                    onChange={(e) => setSnooze(parseInt(e.target.value, 10) || 5)}
                    min={1}
                    max={30}
                  />

                  <div className="flex items-center gap-3 pt-6">
                    <input
                      type="checkbox"
                      id="vibration-toggle"
                      checked={vibration}
                      onChange={(e) => setVibration(e.target.checked)}
                      className="w-4 h-4 rounded text-blue-600 bg-slate-800 border-slate-700"
                    />
                    <label htmlFor="vibration-toggle" className="text-xs font-semibold text-slate-300">
                      Enable Vibration
                    </label>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <input
                    type="checkbox"
                    id="alarm-active-toggle"
                    checked={activeStatus}
                    onChange={(e) => setActiveStatus(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 bg-slate-800 border-slate-700"
                  />
                  <label htmlFor="alarm-active-toggle" className="text-xs font-semibold text-slate-300">
                    Activate Alarm Immediately
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
                    loadingText="Scheduling..."
                    className="px-5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-500"
                  >
                    {editingAlarm ? 'Update Alarm' : 'Save Alarm'}
                  </LoadingButton>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation */}
        {deleteTarget && (
          <ConfirmModal
            isOpen={true}
            title="Delete Alarm Schedule"
            message={`Are you sure you want to delete "${deleteTarget.title}"?`}
            confirmText="Delete Alarm"
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

export default AlarmsPage;
