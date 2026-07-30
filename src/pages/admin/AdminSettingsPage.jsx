import React, { useState } from 'react';
import { Settings, Save, RotateCcw, CheckCircle2 } from 'lucide-react';

const AdminSettingsPage = () => {
  const [notice, setNotice] = useState(null);

  const [platformName, setPlatformName] = useState('Intelligent Cognitive Alarm Platform');
  const [notifyLevel, setNotifyLevel] = useState('All Events');
  const [sessionTimeout, setSessionTimeout] = useState('30 Minutes');
  const [smtpServer, setSmtpServer] = useState('smtp.cognitivealarm.io');
  const [timezone, setTimezone] = useState('EST (Eastern Standard Time)');

  const handleSave = (e) => {
    e.preventDefault();
    setNotice('Platform settings saved successfully!');
    setTimeout(() => setNotice(null), 3000);
  };

  const handleReset = () => {
    setPlatformName('Intelligent Cognitive Alarm Platform');
    setNotifyLevel('All Events');
    setSessionTimeout('30 Minutes');
    setSmtpServer('smtp.cognitivealarm.io');
    setTimezone('EST (Eastern Standard Time)');
    setNotice('Settings reset to defaults.');
    setTimeout(() => setNotice(null), 3000);
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      {notice && (
        <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-700 font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-blue-600" />
          <span>{notice}</span>
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Platform Configuration & System Settings</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Global platform parameters, notification triggers, session security, and email dispatch options.
        </p>
      </div>

      <form onSubmit={handleSave} className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          
          {/* General Settings */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Platform Name</label>
            <input
              type="text"
              value={platformName}
              onChange={(e) => setPlatformName(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Notification Settings */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Notification Broadcasting Level</label>
            <select 
              value={notifyLevel}
              onChange={(e) => setNotifyLevel(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-blue-500"
            >
              <option value="All Events">All Events (Push + Email)</option>
              <option value="Critical Only">Critical Alarms & Breach Alerts Only</option>
            </select>
          </div>

          {/* Security Settings */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Security Session Timeout</label>
            <select 
              value={sessionTimeout}
              onChange={(e) => setSessionTimeout(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-blue-500"
            >
              <option value="15 Minutes">15 Minutes</option>
              <option value="30 Minutes">30 Minutes</option>
              <option value="60 Minutes">60 Minutes</option>
            </select>
          </div>

          {/* Email Configuration */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Email Relay Host (SMTP)</label>
            <input
              type="text"
              value={smtpServer}
              onChange={(e) => setSmtpServer(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Timezone */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">System Timezone</label>
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
            onClick={handleReset}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs rounded-lg transition-colors flex items-center gap-1"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset Defaults
          </button>
          <button 
            type="submit" 
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
          >
            <Save className="w-4 h-4" /> Save Platform Settings
          </button>
        </div>
      </form>
    </div>
  );
};

export default AdminSettingsPage;
