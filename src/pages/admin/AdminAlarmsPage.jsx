import React, { useState } from 'react';
import { AlarmClock, CheckCircle2, Clock } from 'lucide-react';

const AdminAlarmsPage = () => {
  const [notice, setNotice] = useState(null);

  const showNotice = (msg) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 3000);
  };

  const alarms = [
    { name: 'Morning Routine', user: 'Alex Rivera', time: '06:30 AM', challenge: 'Math Puzzle', status: 'Active' },
    { name: 'Workout Alarm', user: 'John Carter', time: '07:00 AM', challenge: 'Memory Game', status: 'Active' },
    { name: 'Early Focus', user: 'Sarah Lee', time: '05:45 AM', challenge: 'Logic Puzzle', status: 'Active' }
  ];

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      {notice && (
        <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-700 font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-blue-600" />
          <span>{notice}</span>
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Platform Alarm Management</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Global overview of scheduled alarms and active cognitive verification locks across system users.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {alarms.map((a, idx) => (
          <div key={idx} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 text-sm">{a.name}</span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                {a.status}
              </span>
            </div>
            <span className="text-2xl font-extrabold text-blue-600 block">{a.time}</span>
            <div className="text-xs text-slate-500 space-y-1 pt-2 border-t border-slate-100">
              <div className="flex justify-between"><span>User:</span> <strong className="text-slate-800">{a.user}</strong></div>
              <div className="flex justify-between"><span>Verification:</span> <strong className="text-slate-800">{a.challenge}</strong></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminAlarmsPage;
