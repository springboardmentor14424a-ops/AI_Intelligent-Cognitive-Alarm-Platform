import React, { useState } from 'react';
import { AlarmClock, Plus, Trash2, Edit3, Brain, CheckCircle2 } from 'lucide-react';

const UserAlarmsPage = () => {
  const [alarms, setAlarms] = useState([
    {
      id: 1,
      name: 'Morning Routine',
      time: '06:30 AM',
      repeat: 'Mon, Tue, Wed, Thu, Fri',
      challenge: 'Math Puzzle',
      status: 'Active'
    },
    {
      id: 2,
      name: 'Workout Alarm',
      time: '08:00 AM',
      repeat: 'Sat, Sun',
      challenge: 'Memory Game',
      status: 'Active'
    },
    {
      id: 3,
      name: 'Reading & Reflection',
      time: '07:15 AM',
      repeat: 'Mon, Wed, Fri',
      challenge: 'Logic Puzzle',
      status: 'Paused'
    }
  ]);

  const [notice, setNotice] = useState(null);

  const showNotice = (msg) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 3000);
  };

  const toggleAlarmStatus = (id) => {
    setAlarms(alarms.map(a => a.id === id ? { ...a, status: a.status === 'Active' ? 'Paused' : 'Active' } : a));
    showNotice('Alarm status updated');
  };

  const deleteAlarm = (id) => {
    setAlarms(alarms.filter(a => a.id !== id));
    showNotice('Alarm deleted');
  };

  return (
    <div className="space-y-6">
      {notice && (
        <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-700 font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-blue-600" />
          <span>{notice}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">My Alarms</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Configure smart wake-up schedules with cognitive challenge verification locks.
          </p>
        </div>

        <button 
          onClick={() => showNotice('Create alarm modal opened')}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-lg shadow-sm transition-colors flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Add New Alarm
        </button>
      </div>

      {/* Alarm Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {alarms.map((alarm) => (
          <div key={alarm.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">{alarm.name}</h3>
                  <span className="text-3xl font-extrabold text-slate-900 block mt-1">{alarm.time}</span>
                </div>
                <button
                  onClick={() => toggleAlarmStatus(alarm.id)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                    alarm.status === 'Active'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-slate-100 text-slate-500 border-slate-200'
                  }`}
                >
                  {alarm.status}
                </button>
              </div>

              <div className="mt-4 space-y-1.5 text-xs text-slate-600">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Repeat Schedule:</span>
                  <span className="font-semibold text-slate-800">{alarm.repeat}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Verification Challenge:</span>
                  <span className="font-semibold text-blue-600 flex items-center gap-1">
                    <Brain className="w-3.5 h-3.5 text-purple-600" /> {alarm.challenge}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-end gap-2 text-xs">
              <button 
                onClick={() => showNotice(`Editing alarm: ${alarm.name}`)}
                className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium rounded-lg transition-colors flex items-center gap-1"
              >
                <Edit3 className="w-3.5 h-3.5 text-slate-500" /> Edit
              </button>
              <button 
                onClick={() => deleteAlarm(alarm.id)}
                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 font-medium rounded-lg transition-colors flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default UserAlarmsPage;
