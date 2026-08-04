import React, { useState } from 'react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { useToast } from '../components/Toast';
import { FiSettings, FiBell, FiMoon, FiVolume2, FiShield, FiCheck } from 'react-icons/fi';

export const SettingsPage: React.FC = () => {
  const toast = useToast();

  const [soundEnabled, setSoundEnabled] = useState(true);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [darkMode, setDarkMode] = useState(true);

  const handleSave = () => {
    toast.success('Settings Saved', 'Application preferences have been updated');
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-slate-800">
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-3">
            <FiSettings className="text-indigo-400" /> Platform Settings
          </h1>
          <p className="text-xs text-slate-400 mt-1">Configure alarm preferences, notifications, and theme settings.</p>
        </div>

        <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-slate-800 space-y-6">
          {/* Sound & Alarm Preferences */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <FiVolume2 className="text-blue-400" /> Alarm & Audio Preferences
            </h3>

            <div className="flex items-center justify-between p-4 rounded-xl bg-slate-900/60 border border-slate-800">
              <div>
                <p className="text-sm font-semibold text-white">Default Alarm Sound</p>
                <p className="text-xs text-slate-400">Play audio chime when alarm triggers</p>
              </div>
              <button
                onClick={() => setSoundEnabled((p) => !p)}
                className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
                  soundEnabled ? 'bg-blue-600 justify-end' : 'bg-slate-700 justify-start'
                }`}
              >
                <span className="w-4 h-4 rounded-full bg-white shadow-md" />
              </button>
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl bg-slate-900/60 border border-slate-800">
              <div>
                <p className="text-sm font-semibold text-white">Haptic Vibration</p>
                <p className="text-xs text-slate-400">Enable device vibration feedback</p>
              </div>
              <button
                onClick={() => setVibrationEnabled((p) => !p)}
                className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
                  vibrationEnabled ? 'bg-blue-600 justify-end' : 'bg-slate-700 justify-start'
                }`}
              >
                <span className="w-4 h-4 rounded-full bg-white shadow-md" />
              </button>
            </div>
          </div>

          {/* Notifications */}
          <div className="space-y-4 pt-4 border-t border-slate-800">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <FiBell className="text-amber-400" /> Notifications & Alerts
            </h3>

            <div className="flex items-center justify-between p-4 rounded-xl bg-slate-900/60 border border-slate-800">
              <div>
                <p className="text-sm font-semibold text-white">Email Digest & Routine Reports</p>
                <p className="text-xs text-slate-400">Receive weekly cognitive routine reports</p>
              </div>
              <button
                onClick={() => setEmailAlerts((p) => !p)}
                className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
                  emailAlerts ? 'bg-amber-600 justify-end' : 'bg-slate-700 justify-start'
                }`}
              >
                <span className="w-4 h-4 rounded-full bg-white shadow-md" />
              </button>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 flex justify-end">
            <button
              onClick={handleSave}
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center gap-2 transition-all shadow-lg shadow-blue-500/20"
            >
              <FiCheck className="w-4 h-4" /> Save Settings
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};
