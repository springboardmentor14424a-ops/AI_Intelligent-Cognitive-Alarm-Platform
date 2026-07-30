import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Search, CheckCircle2, UserCheck } from 'lucide-react';

const CoachStudentsPage = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const students = [
    { id: '1', name: 'Alex Rivera', wakeTime: '06:30 AM', habitScore: 84, difficulty: 'Easy', risk: 'Low' },
    { id: '2', name: 'John Carter', wakeTime: '07:00 AM', habitScore: 72, difficulty: 'Medium', risk: 'Medium' },
    { id: '3', name: 'Sarah Lee', wakeTime: '05:45 AM', habitScore: 91, difficulty: 'Medium', risk: 'Low' },
    { id: '4', name: 'Marcus Vance', wakeTime: '08:00 AM', habitScore: 58, difficulty: 'Hard', risk: 'High' },
    { id: '5', name: 'Elena Rostova', wakeTime: '06:15 AM', habitScore: 78, difficulty: 'Easy', risk: 'Low' }
  ];

  const filtered = students.filter(s => s.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Assigned Students Roster</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Full directory of students under active sleep & wakefulness coaching.
          </p>
        </div>

        <div className="relative w-full sm:w-64">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search student..."
            className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-blue-500"
          />
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-600 tracking-wider uppercase">
                <th className="py-3 px-4 sm:px-6">Student</th>
                <th className="py-3 px-4 sm:px-6">Wake Time</th>
                <th className="py-3 px-4 sm:px-6">Habit Score</th>
                <th className="py-3 px-4 sm:px-6">Challenge Difficulty</th>
                <th className="py-3 px-4 sm:px-6">Risk</th>
                <th className="py-3 px-4 sm:px-6">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((row) => (
                <tr key={row.id} className="even:bg-slate-50/50 hover:bg-slate-100/40 transition-colors">
                  <td className="py-3.5 px-4 sm:px-6">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-semibold text-xs flex items-center justify-center border border-blue-200">
                        {row.name.charAt(0)}
                      </div>
                      <span className="font-semibold text-slate-900">{row.name}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 sm:px-6 text-slate-700 font-medium">{row.wakeTime}</td>
                  <td className="py-3.5 px-4 sm:px-6 font-bold text-slate-800">{row.habitScore}</td>
                  <td className="py-3.5 px-4 sm:px-6">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-100">
                      {row.difficulty}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 sm:px-6">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      row.risk === 'Low' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                      row.risk === 'Medium' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                      'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}>
                      {row.risk}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 sm:px-6">
                    <button 
                      onClick={() => navigate(`/coach/student/${row.id}`)}
                      className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-lg shadow-xs transition-colors"
                    >
                      View Profile
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CoachStudentsPage;
