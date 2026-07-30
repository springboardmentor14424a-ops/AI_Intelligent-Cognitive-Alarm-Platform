import React, { useState } from 'react';
import { Calendar, Video, Clock, CheckCircle2 } from 'lucide-react';

const CoachSchedulePage = () => {
  const [notice, setNotice] = useState(null);

  const showNotice = (msg) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 3000);
  };

  const sessions = [
    { student: 'Alex Rivera', date: 'Today', time: '04:00 PM', status: 'Confirmed' },
    { student: 'John Carter', date: 'Tomorrow', time: '10:30 AM', status: 'Pending' },
    { student: 'Sarah Lee', date: 'Friday', time: '02:00 PM', status: 'Confirmed' }
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
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Coach Meeting Schedule</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Manage upcoming 1-on-1 sleep coaching consultations with assigned students.
        </p>
      </div>

      <div className="space-y-3">
        {sessions.map((s, idx) => (
          <div key={idx} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                <Video className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">{s.student}</h3>
                <span className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" /> {s.date} • {s.time}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button 
                onClick={() => showNotice(`Launching session with ${s.student}...`)}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-lg shadow-sm transition-colors"
              >
                Start Session
              </button>
              <button 
                onClick={() => showNotice(`Reschedule sent for ${s.student}`)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs rounded-lg transition-colors"
              >
                Reschedule
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CoachSchedulePage;
