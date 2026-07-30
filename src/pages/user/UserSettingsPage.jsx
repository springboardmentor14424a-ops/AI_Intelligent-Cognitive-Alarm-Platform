import React, { useState } from 'react';
import { Settings, Save, X, CheckCircle2 } from 'lucide-react';

const UserSettingsPage = () => {
  const [theme, setTheme] = useState('Light');
  const [notifications, setNotifications] = useState('Enabled');
  const [alarmSound, setAlarmSound] = useState('Gentle Chime');
  const [difficulty, setDifficulty] = useState('Easy');
  const [language, setLanguage] = useState('English');
  const [timezone, setTimezone] = useState('EST (Eastern Standard Time)');
  const [savedNotice, setSavedNotice] = useState(false);

  const handleSave = (e) => {
    e.preventDefault();
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 3000);
  };

  return (
    <div className="space-y-6">
      {savedNotice && (
        <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-700 font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-blue-600" />
          <span>Settings saved successfully!</span>
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Application Settings</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Customize your interface, alarm audio tones, and challenge difficulty thresholds.
        </p>
      </div>

      {/* Settings Form */}
      <form onSubmit={handleSave} className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          
          {/* Theme Option */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">UI Theme</label>
            <select 
              value={theme} 
              onChange={(e) => setTheme(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-blue-500"
            >
              <option value="Light">Light Theme (Minimal)</option>
            </select>
          </div>

          {/* Notifications */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Notifications</label>
            <select 
              value={notifications} 
              onChange={(e) => setNotifications(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-blue-500"
            >
              <option value="Enabled">Enabled (Push & Bedtime Alerts)</option>
              <option value="Disabled">Disabled</option>
            </select>
          </div>

          {/* Alarm Sound */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Alarm Sound Tone</label>
            <select 
              value={alarmSound} 
              onChange={(e) => setAlarmSound(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-blue-500"
            >
              <option value="Gentle Chime">Gentle Chime</option>
              <option value="Pulse Radar">Pulse Radar</option>
              <option value="Energizing Beacon">Energizing Beacon</option>
            </select>
          </div>

          {/* Challenge Difficulty */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Cognitive Challenge Difficulty</label>
            <select 
              value={difficulty} 
              onChange={(e) => setDifficulty(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-blue-500"
            >
              <option value="Easy">Easy (1 Step Arithmetic / 4 Matrix Tiles)</option>
              <option value="Medium">Medium (2 Step Equations / 6 Matrix Tiles)</option>
              <option value="Hard">Hard (3 Step Logic Equations / 8 Matrix Tiles)</option>
            </select>
          </div>

          {/* Language */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Language</label>
            <select 
              value={language} 
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-blue-500"
            >
              <option value="English">English</option>
              <option value="Spanish">Spanish</option>
              <option value="French">French</option>
            </select>
          </div>

          {/* Timezone */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Timezone</label>
            <select 
              value={timezone} 
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-blue-500"
            >
              <option value="EST (Eastern Standard Time)">EST (Eastern Standard Time)</option>
              <option value="PST (Pacific Standard Time)">PST (Pacific Standard Time)</option>
              <option value="UTC (Coordinated Universal Time)">UTC</option>
            </select>
          </div>

        </div>

        {/* Buttons */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
          <button 
            type="button" 
            onClick={() => setSavedNotice(false)}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs rounded-lg transition-colors flex items-center gap-1"
          >
            <X className="w-3.5 h-3.5" /> Cancel
          </button>
          <button 
            type="submit" 
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
          >
            <Save className="w-4 h-4" /> Save Settings
          </button>
        </div>
      </form>
    </div>
  );
};

export default UserSettingsPage;
