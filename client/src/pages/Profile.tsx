import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { profileService } from '../services/profileService';
import { Profile } from '../types';
import { useToast } from '../components/Toast';
import { FormInput } from '../components/FormInput';
import { LoadingButton } from '../components/LoadingButton';
import { CardSkeleton } from '../components/ui/SkeletonLoader';
import {
  FiUser,
  FiMail,
  FiClock,
  FiMoon,
  FiGlobe,
  FiTarget,
  FiZap,
  FiSave,
  FiEdit,
  FiX,
  FiSliders,
  FiCheckCircle,
} from 'react-icons/fi';

export const ProfilePage: React.FC = () => {
  const { user } = useAuth();
  const toast = useToast();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Form State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [wakeUpTime, setWakeUpTime] = useState('07:00 AM');
  const [sleepTime, setSleepTime] = useState('11:00 PM');
  const [sleepDuration, setSleepDuration] = useState('8 Hours');
  const [timezone, setTimezone] = useState('UTC');
  const [productivityGoal, setProductivityGoal] = useState('');
  const [difficultyPreference, setDifficultyPreference] = useState('Moderate');
  const [habitPreferences, setHabitPreferences] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  const populateState = (p: Profile) => {
    setFullName(p.fullName || user?.name || '');
    setEmail(p.email || user?.email || '');
    setWakeUpTime(p.wakeUpTime || '07:00 AM');
    setSleepTime(p.sleepTime || '11:00 PM');
    setSleepDuration(p.sleepDuration || '8 Hours');
    setTimezone(p.timezone || 'UTC');
    setProductivityGoal(p.productivityGoal || 'Maintain peak morning focus');
    setDifficultyPreference(p.difficultyPreference || 'Moderate');
    setHabitPreferences(p.habitPreferences || 'Morning Hydration, Digital Sunset');
  };

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await profileService.getProfile();
      if (res.success && res.data) {
        setProfile(res.data.profile);
        populateState(res.data.profile);
      }
    } catch (err) {
      toast.error('Profile Error', 'Failed to load user profile');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEditing = () => {
    if (profile) {
      populateState(profile);
    }
    setIsEditing(false);
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
        sleepDuration,
        timezone,
        productivityGoal,
        difficultyPreference,
        habitPreferences,
      });

      if (res.success && res.data) {
        setProfile(res.data.profile);
        populateState(res.data.profile);
        setIsEditing(false);
        toast.success('Profile Saved', 'Your profile updates have been successfully saved');
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
        {/* Header Banner */}
        <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-indigo-500/20 bg-gradient-to-r from-slate-900 via-indigo-950/30 to-slate-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-2xl shadow-xl shadow-blue-500/20 border border-blue-400/20">
              {fullName?.charAt(0) || user?.name.charAt(0)}
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-white">{fullName || user?.name}</h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Role: <span className="text-indigo-400 font-semibold uppercase">{user?.role}</span> • Account ID: {user?.id.substring(0, 12)}...
              </p>
            </div>
          </div>

          {!loading && (
            <div>
              {!isEditing ? (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all flex items-center gap-2 shadow-lg shadow-indigo-600/20"
                >
                  <FiEdit className="w-4 h-4" /> Edit Profile
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleCancelEditing}
                  className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all flex items-center gap-2 border border-slate-700"
                >
                  <FiX className="w-4 h-4" /> Cancel Editing
                </button>
              )}
            </div>
          )}
        </div>

        {/* Profile Content */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <CardSkeleton count={4} />
          </div>
        ) : !isEditing ? (
          /* READ / VIEW MODE */
          <div className="space-y-6">
            <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-6">
              <div className="border-b border-slate-800 pb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <FiUser className="text-indigo-400" /> Identity & Contact Profile
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">Basic user account and baseline credentials.</p>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                  <FiCheckCircle className="w-3.5 h-3.5" /> Verified Profile
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
                <div>
                  <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold block mb-1">Full Name</span>
                  <p className="font-semibold text-white bg-slate-900/60 p-3 rounded-xl border border-slate-800 flex items-center gap-2">
                    <FiUser className="text-blue-400 w-4 h-4" /> {fullName}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold block mb-1">Email Address</span>
                  <p className="font-semibold text-white bg-slate-900/60 p-3 rounded-xl border border-slate-800 flex items-center gap-2">
                    <FiMail className="text-indigo-400 w-4 h-4" /> {email}
                  </p>
                </div>
              </div>
            </div>

            {/* Schedule & Routine */}
            <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-6">
              <div className="border-b border-slate-800 pb-4">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <FiClock className="text-amber-400" /> Sleep Schedule & Time Zone
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">Sleep rhythm and preferred wake-up timings.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-sm">
                <div>
                  <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold block mb-1">Preferred Wake-up Time</span>
                  <p className="font-semibold text-amber-300 bg-slate-900/60 p-3 rounded-xl border border-slate-800 flex items-center gap-2">
                    <FiClock className="w-4 h-4 text-amber-400" /> {wakeUpTime}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold block mb-1">Target Sleep Time</span>
                  <p className="font-semibold text-indigo-300 bg-slate-900/60 p-3 rounded-xl border border-slate-800 flex items-center gap-2">
                    <FiMoon className="w-4 h-4 text-indigo-400" /> {sleepTime}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold block mb-1">Target Sleep Duration</span>
                  <p className="font-semibold text-sky-300 bg-slate-900/60 p-3 rounded-xl border border-slate-800 flex items-center gap-2">
                    <FiMoon className="w-4 h-4 text-sky-400" /> {sleepDuration}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold block mb-1">Time Zone</span>
                  <p className="font-semibold text-white bg-slate-900/60 p-3 rounded-xl border border-slate-800 flex items-center gap-2">
                    <FiGlobe className="w-4 h-4 text-emerald-400" /> {timezone}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold block mb-1">Difficulty Preference</span>
                  <p className="font-semibold text-amber-400 bg-slate-900/60 p-3 rounded-xl border border-slate-800 flex items-center gap-2">
                    <FiZap className="w-4 h-4 text-amber-400" /> {difficultyPreference}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold block mb-1">Habit Preferences</span>
                  <p className="font-semibold text-white bg-slate-900/60 p-3 rounded-xl border border-slate-800 flex items-center gap-2">
                    <FiSliders className="w-4 h-4 text-purple-400" /> {habitPreferences || 'Standard Habits'}
                  </p>
                </div>
              </div>
            </div>

            {/* Productivity Goal */}
            <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
              <div className="border-b border-slate-800 pb-3">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <FiTarget className="text-blue-400" /> Productivity Goals
                </h2>
              </div>
              <p className="text-sm text-slate-300 leading-relaxed bg-slate-900/60 p-4 rounded-xl border border-slate-800">
                {productivityGoal || 'No goal set yet.'}
              </p>
            </div>
          </div>
        ) : (
          /* EDIT MODE FORM */
          <form onSubmit={handleSaveProfile} className="glass-panel p-6 sm:p-8 rounded-2xl border border-indigo-500/30 space-y-6 bg-slate-900/90">
            <div className="border-b border-slate-800 pb-4 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <FiEdit className="text-indigo-400" /> Edit Profile Details
                </h2>
                <p className="text-xs text-slate-400 mt-1">Update your waking schedule, sleep goals, and cognitive preferences.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <FormInput
                label="Full Name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                icon={<FiUser className="w-4 h-4" />}
                required
              />

              <FormInput
                label="Email Address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                icon={<FiMail className="w-4 h-4" />}
                required
              />

              <FormInput
                label="Preferred Wake-up Time"
                value={wakeUpTime}
                onChange={(e) => setWakeUpTime(e.target.value)}
                icon={<FiClock className="w-4 h-4" />}
                placeholder="07:00 AM"
                required
              />

              <FormInput
                label="Sleep Time Target"
                value={sleepTime}
                onChange={(e) => setSleepTime(e.target.value)}
                icon={<FiMoon className="w-4 h-4" />}
                placeholder="11:00 PM"
                required
              />

              <FormInput
                label="Sleep Duration"
                value={sleepDuration}
                onChange={(e) => setSleepDuration(e.target.value)}
                icon={<FiMoon className="w-4 h-4" />}
                placeholder="8 Hours"
                required
              />

              <FormInput
                label="Time Zone"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                icon={<FiGlobe className="w-4 h-4" />}
                placeholder="UTC"
                required
              />

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center gap-1">
                  <FiZap className="w-3.5 h-3.5 text-amber-400" /> Difficulty Preference
                </label>
                <select
                  value={difficultyPreference}
                  onChange={(e) => setDifficultyPreference(e.target.value)}
                  className="w-full text-sm rounded-xl py-3 px-3 glass-input bg-slate-900 border border-slate-700 text-white"
                >
                  <option value="Easy">Easy (Gentle awakening)</option>
                  <option value="Moderate">Moderate (Standard cognitive routine)</option>
                  <option value="High">High (Strict discipline)</option>
                  <option value="Expert">Expert (Peak cognitive challenge)</option>
                </select>
              </div>

              <FormInput
                label="Habit Preferences"
                value={habitPreferences}
                onChange={(e) => setHabitPreferences(e.target.value)}
                icon={<FiSliders className="w-4 h-4" />}
                placeholder="Morning Hydration, Digital Sunset"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center gap-1">
                <FiTarget className="w-3.5 h-3.5 text-blue-400" /> Productivity Goals
              </label>
              <textarea
                value={productivityGoal}
                onChange={(e) => setProductivityGoal(e.target.value)}
                rows={3}
                className="w-full text-sm rounded-xl p-3 glass-input bg-slate-900 border border-slate-700 text-white"
                placeholder="Describe your daily morning routine goal..."
              />
            </div>

            <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleCancelEditing}
                className="px-5 py-2.5 text-xs font-bold rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <LoadingButton
                type="submit"
                isLoading={saving}
                loadingText="Saving Profile..."
                className="px-6 py-2.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/20"
              >
                <FiSave className="w-4 h-4 mr-1.5" /> Save Changes
              </LoadingButton>
            </div>
          </form>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ProfilePage;
