import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Mail, Shield, CheckCircle2, KeyRound, UserX, Edit3, Award, Clock } from 'lucide-react';
import StatCard from '../../components/StatCard';

const AdminUserDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [notice, setNotice] = useState(null);

  const showNotice = (msg) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 3000);
  };

  const usersMap = {
    '1': {
      id: '1',
      name: 'Alex Rivera',
      email: 'alex@alarm.io',
      role: 'Student',
      status: 'Active',
      joinedDate: 'Jan 15, 2026',
      assignedCoach: 'Dr. Aris Thorne',
      habitScore: '84/100',
      recentAlarms: [
        { time: '06:30 AM', challenge: 'Math Puzzle', status: 'Completed' },
        { time: '08:00 AM', challenge: 'Memory Game', status: 'Completed' }
      ]
    },
    '2': {
      id: '2',
      name: 'Dr. Aris Thorne',
      email: 'coach@alarm.io',
      role: 'Wellness Coach',
      status: 'Active',
      joinedDate: 'Nov 01, 2025',
      assignedCoach: 'N/A (Coach Role)',
      habitScore: '95/100',
      recentAlarms: [
        { time: '06:00 AM', challenge: 'Logic Puzzle', status: 'Completed' }
      ]
    },
    '3': {
      id: '3',
      name: 'System Ops Lead',
      email: 'admin@alarm.io',
      role: 'Administrator',
      status: 'Active',
      joinedDate: 'Sep 10, 2025',
      assignedCoach: 'N/A (Admin Role)',
      habitScore: '99/100',
      recentAlarms: []
    }
  };

  const user = usersMap[id] || usersMap['1'];

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      {notice && (
        <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-700 font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-blue-600" />
          <span>{notice}</span>
        </div>
      )}

      {/* Top Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button
          onClick={() => navigate('/admin/users')}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-white border border-slate-200 text-slate-700 hover:text-blue-600 rounded-lg text-xs font-semibold shadow-xs transition-all self-start sm:self-auto"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Users
        </button>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => showNotice(`Editing user ${user.name}...`)}
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-lg shadow-sm transition-colors flex items-center gap-1"
          >
            <Edit3 className="w-3.5 h-3.5" /> Edit User
          </button>
          <button 
            onClick={() => showNotice(`Reset password link dispatched to ${user.email}`)}
            className="px-3.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 font-medium text-xs rounded-lg border border-purple-200 transition-colors flex items-center gap-1"
          >
            <KeyRound className="w-3.5 h-3.5" /> Reset Password
          </button>
          <button 
            onClick={() => showNotice(`User ${user.name} access disabled`)}
            className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 font-medium text-xs rounded-lg border border-rose-200 transition-colors flex items-center gap-1"
          >
            <UserX className="w-3.5 h-3.5" /> Disable User
          </button>
        </div>
      </div>

      {/* User Details Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-6">
        <div className="flex items-center gap-4 pb-6 border-b border-slate-100">
          <div className="w-14 h-14 rounded-full bg-blue-100 text-blue-700 font-bold text-lg flex items-center justify-center border border-blue-200">
            {user.name.charAt(0)}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{user.name}</h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100 mt-1">
              {user.role} Role
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs sm:text-sm">
          <div>
            <span className="text-slate-400 font-medium block">Email Address</span>
            <span className="font-semibold text-slate-800">{user.email}</span>
          </div>
          <div>
            <span className="text-slate-400 font-medium block">Account Status</span>
            <span className="font-semibold text-emerald-600">{user.status}</span>
          </div>
          <div>
            <span className="text-slate-400 font-medium block">Joined Date</span>
            <span className="font-semibold text-slate-800">{user.joinedDate}</span>
          </div>
          <div>
            <span className="text-slate-400 font-medium block">Assigned Coach</span>
            <span className="font-semibold text-slate-800">{user.assignedCoach}</span>
          </div>
        </div>
      </div>

      {/* Habit Score & Alarm Activity */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <StatCard
          title="Habit Score Index"
          value={user.habitScore}
          subtext="Verified wakefulness score"
          icon={Award}
          badgeColor="bg-blue-50 text-blue-600"
        />

        <div className="md:col-span-2 bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
          <h2 className="text-sm font-bold text-slate-800 tracking-wide uppercase">Recent Alarm Activity</h2>
          <div className="divide-y divide-slate-100 text-xs">
            {user.recentAlarms.length > 0 ? (
              user.recentAlarms.map((a, idx) => (
                <div key={idx} className="py-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-semibold text-slate-800">{a.time}</span>
                    <span className="text-slate-400">• {a.challenge}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">
                    {a.status}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 py-2">No recent alarm activities recorded.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminUserDetailsPage;
