import React, { useState } from 'react';
import { Settings, Save, CheckCircle2 } from 'lucide-react';

const CoachSettingsPage = () => {
  const [notice, setNotice] = useState(null);
  const [autoFlag, setAutoFlag] = useState(true);

  const handleSave = (e) => {
    e.preventDefault();
    setNotice('Coach portal settings updated!');
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
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Coach Portal Settings</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Configure cohort monitoring alerts, risk detection sensitivity, and notification preferences.
        </p>
      </div>

      <form onSubmit={handleSave} className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Risk Alert Sensitivity</label>
            <select className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-blue-500">
              <option value="High">High (Flag after 2 consecutive snoozes)</option>
              <option value="Medium">Medium (Flag after 3 consecutive snoozes)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Automatic Intervention Dispatch</label>
            <select 
              value={autoFlag ? 'Enabled' : 'Disabled'}
              onChange={(e) => setAutoFlag(e.target.value === 'Enabled')}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-blue-500"
            >
              <option value="Enabled">Enabled (Send AI hygiene tips to high-risk students)</option>
              <option value="Disabled">Disabled</option>
            </select>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 flex justify-end">
          <button 
            type="submit" 
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
          >
            <Save className="w-4 h-4" /> Save Coach Settings
          </button>
        </div>
      </form>
    </div>
  );
};

export default CoachSettingsPage;
