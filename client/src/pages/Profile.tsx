import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { profileService } from '../services/profileService';
import { Profile } from '../types';
import { useToast } from '../components/Toast';
import { FormInput } from '../components/FormInput';
import { LoadingButton } from '../components/LoadingButton';
import { SkeletonLoader } from '../components/ui/SkeletonLoader';
import { FiUser, FiMail, FiClock, FiMoon, FiGlobe, FiTarget, FiZap, FiSave } from 'react-icons/fi';

export const ProfilePage: React.FC = () => {
  const { user } = useAuth();
  const toast = useToast();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [wakeUpTime, setWakeUpTime] = useState('07:00 AM');
  const [sleepTime, setSleepTime] = useState('11:00 PM');
  const [timezone, setTimezone] = useState('UTC');
  const [productivityGoal, setProductivityGoal] = useState('');
  const [difficultyPreference, setDifficultyPreference] = useState('Moderate');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await profileService.getProfile();
      if (res.success && res.data) {
        const p = res.data.profile;
        setProfile(p);
        setFullName(p.fullName || user?.name || '');
        setEmail(p.email || user?.email || '');
        setWakeUpTime(p.wakeUpTime || '07:00 AM');
        setSleepTime(p.sleepTime || '11:00 PM');
        setTimezone(p.timezone || 'UTC');
        setProductivityGoal(p.productivityGoal || 'Maintain peak morning focus');
        setDifficultyPreference(p.difficultyPreference || 'Moderate');
      }
    } catch (err) {
      toast.error('Profile Error', 'Failed to load user profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await profileService.updateProfile({
        fullName,
        email,
        wakeUpTime,
        sleepTime,
        timezone,
        productivityGoal,
        difficultyPreference,
      });

      if (res.success && res.data) {
        setProfile(res.data.profile);
        toast.success('Profile Updated', 'Your profile preferences have been saved');
      }
    } catch (err) {
      toast.error('Update Failed', 'Could not save profile changes');
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-indigo-500/20 bg-gradient-to-r from-slate-900 via-indigo-950/20 to-slate-900">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-2xl shadow-xl shadow-blue-500/20 border border-blue-400/20">
              {user?.name.charAt(0)}
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-white">{fullName || user?.name}</h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Role: <span className="text-indigo-400 font-semibold uppercase">{user?.role}</span> • Account ID: {user?.id.substring(0, 12)}...
              </p>
            </div>
          </div>
        </div>

        {/* Profile Form */}
        {loading ? (
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
            <SkeletonLoader count={5} className="h-10 w-full" />
          </div>
        ) : (
          <form onSubmit={handleSaveProfile} className="glass-panel p-6 sm:p-8 rounded-2xl border border-slate-800 space-y-6">
            <div className="border-b border-slate-800 pb-4">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <FiUser className="text-indigo-400" /> Account & Cognitive Preferences
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Customize your wake/sleep routine and productivity goals for cognitive optimization.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <FormInput
                label="Full Name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                icon={<FiUser className="w-4 h-4" />}
              />

              <FormInput
                label="Email Address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                icon={<FiMail className="w-4 h-4" />}
              />

              <FormInput
                label="Wake Up Time Target"
                value={wakeUpTime}
                onChange={(e) => setWakeUpTime(e.target.value)}
                icon={<FiClock className="w-4 h-4" />}
                placeholder="07:00 AM"
              />

              <FormInput
                label="Sleep Time Target"
                value={sleepTime}
                onChange={(e) => setSleepTime(e.target.value)}
                icon={<FiMoon className="w-4 h-4" />}
                placeholder="11:00 PM"
              />

              <FormInput
                label="Timezone"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                icon={<FiGlobe className="w-4 h-4" />}
                placeholder="UTC-5 (EST)"
              />

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center gap-1">
                  <FiZap className="w-3.5 h-3.5 text-amber-400" /> Difficulty Preference
                </label>
                <select
                  value={difficultyPreference}
                  onChange={(e) => setDifficultyPreference(e.target.value)}
                  className="w-full text-sm rounded-xl py-3 px-3 glass-input bg-slate-900"
                >
                  <option value="Easy">Easy (Gentle awakening)</option>
                  <option value="Moderate">Moderate (Standard cognitive routine)</option>
                  <option value="High">High (Strict discipline)</option>
                  <option value="Expert">Expert (Peak cognitive challenge)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center gap-1">
                <FiTarget className="w-3.5 h-3.5 text-blue-400" /> Productivity Goal
              </label>
              <textarea
                value={productivityGoal}
                onChange={(e) => setProductivityGoal(e.target.value)}
                rows={3}
                className="w-full text-sm rounded-xl p-3 glass-input"
                placeholder="Describe your daily morning routine goal..."
              />
            </div>

            <div className="pt-4 border-t border-slate-800 flex justify-end">
              <LoadingButton
                type="submit"
                isLoading={saving}
                loadingText="Saving Profile..."
                className="px-6 py-3 text-sm font-semibold"
              >
                <FiSave className="w-4 h-4 mr-2" /> Save Profile
              </LoadingButton>
            </div>
          </form>
        )}
      </div>
    </DashboardLayout>
  );
};
