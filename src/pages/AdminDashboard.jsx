import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import StatCard from '../components/StatCard';
import { 
  Users, 
  AlarmClock, 
  Activity, 
  ShieldCheck, 
  Plus, 
  FileText, 
  Download, 
  Megaphone, 
  CheckCircle2, 
  ArrowRight,
  Puzzle,
  Edit3,
  Eye,
  UserX
} from 'lucide-react';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [notice, setNotice] = useState(null);

  const showNotice = (msg) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 3000);
  };

  // Section 1: Side-by-Side Data
  const recentRegistrations = [
    { id: '1', name: 'Alex Rivera', role: 'Student', date: 'Today', status: 'Active' },
    { id: '2', name: 'Dr. Aris Thorne', role: 'Coach', date: 'Yesterday', status: 'Active' },
    { id: '3', name: 'John Carter', role: 'Student', date: '27 Jul', status: 'Active' },
    { id: '4', name: 'Sarah Lee', role: 'Student', date: '26 Jul', status: 'Active' },
    { id: '5', name: 'Marcus Vance', role: 'Student', date: '25 Jul', status: 'Pending' }
  ];

  const recentAlarmActivity = [
    { id: 1, name: 'Morning Focus', user: 'Alex Rivera', time: '06:30 AM', status: 'Completed' },
    { id: 2, name: 'Workout Alarm', user: 'John Carter', time: '07:00 AM', status: 'Completed' },
    { id: 3, name: 'Early Prep', user: 'Sarah Lee', time: '05:45 AM', status: 'Completed' },
    { id: 4, name: 'Reading Alarm', user: 'Elena Rostova', time: '08:30 AM', status: 'Dismissed' },
    { id: 5, name: 'Focus Routine', user: 'Marcus Vance', time: '07:15 AM', status: 'Missed' }
  ];

  // Section 2: User Management Table
  const userManagementList = [
    { id: '1', name: 'Alex Rivera', role: 'Student', status: 'Active', lastLogin: '10 min ago' },
    { id: '2', name: 'Dr. Aris Thorne', role: 'Coach', status: 'Active', lastLogin: '1 hour ago' },
    { id: '3', name: 'System Ops Lead', role: 'Administrator', status: 'Active', lastLogin: 'Just now' },
    { id: '4', name: 'John Carter', role: 'Student', status: 'Active', lastLogin: '3 hours ago' },
    { id: '5', name: 'Sarah Lee', role: 'Student', status: 'Active', lastLogin: 'Yesterday' }
  ];

  // Section 3: Challenge Library
  const challengeLibrary = [
    { id: '1', title: 'Math Puzzle', category: 'Arithmetic', difficulty: 'Easy', activeUsers: 84 },
    { id: '2', title: 'Memory Game', category: 'Spatial Matrix', difficulty: 'Medium', activeUsers: 62 },
    { id: '3', title: 'Logic Puzzle', category: 'Deduction', difficulty: 'Medium', activeUsers: 45 },
    { id: '4', title: 'Pattern Match', category: 'Visual Alignment', difficulty: 'Hard', activeUsers: 29 }
  ];

  // Section 5: Platform Notifications
  const announcements = [
    'System maintenance scheduled on Sunday from 02:00 AM to 04:00 AM EST.',
    'New challenge pack (Anagram Word Games) added to Challenge Library.',
    'Wellness Coach dashboard UI updated with Student Details monitoring.'
  ];

  return (
    <div className="space-y-6">
      {notice && (
        <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-700 font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-blue-600" />
          <span>{notice}</span>
        </div>
      )}

      {/* Welcome Section */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Welcome Back, System Ops Lead 👋
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
            Monitor the platform, manage users, and oversee alarm activities.
          </p>
        </div>
        <button
          onClick={() => navigate('/admin/users')}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-lg shadow-sm transition-colors self-start md:self-auto flex items-center gap-1.5"
        >
          Manage Users <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Top KPI Cards (4 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Registered Users"
          value="150"
          subtext="+12 registered this week"
          icon={Users}
          badgeColor="bg-blue-50 text-blue-600"
        />

        <StatCard
          title="Today's Alarms"
          value="320"
          subtext="28 completed today"
          icon={AlarmClock}
          badgeColor="bg-purple-50 text-purple-600"
        />

        <StatCard
          title="Active Users"
          value="108"
          subtext="Currently online"
          icon={Activity}
          badgeColor="bg-emerald-50 text-emerald-600"
        />

        <StatCard
          title="System Health"
          value="99.8%"
          subtext="All microservices healthy"
          icon={ShieldCheck}
          badgeColor="bg-amber-50 text-amber-600"
        />
      </div>

      {/* Section 1: Platform Overview (Side-by-Side Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        
        {/* Card 1: Recent User Registrations */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800 tracking-wide uppercase">Recent User Registrations</h2>
            <button 
              onClick={() => navigate('/admin/users')}
              className="text-xs text-blue-600 font-semibold hover:underline"
            >
              View All
            </button>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            {recentRegistrations.map((u) => (
              <div key={u.id} className="py-2.5 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-slate-900">{u.name}</h3>
                  <span className="text-slate-400">{u.role} • Registered {u.date}</span>
                </div>
                <button 
                  onClick={() => navigate(`/admin/user/${u.id}`)}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-700 font-medium rounded-md transition-colors"
                >
                  View
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Card 2: Recent Alarm Activity */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800 tracking-wide uppercase">Recent Alarm Activity</h2>
            <button 
              onClick={() => navigate('/admin/alarms')}
              className="text-xs text-blue-600 font-semibold hover:underline"
            >
              View Activity Log
            </button>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            {recentAlarmActivity.map((a) => (
              <div key={a.id} className="py-2.5 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-slate-900">{a.name} <span className="font-normal text-slate-400">({a.user})</span></h3>
                  <span className="text-slate-400">{a.time}</span>
                </div>
                <span className={`px-2 py-0.5 rounded-full font-semibold ${
                  a.status === 'Completed' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                }`}>
                  {a.status}
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Section 2: User Management Table */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-slate-800 tracking-wide uppercase">User Management</h2>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-600 tracking-wider uppercase">
                  <th className="py-3 px-4 sm:px-6">Avatar</th>
                  <th className="py-3 px-4 sm:px-6">Name</th>
                  <th className="py-3 px-4 sm:px-6">Role</th>
                  <th className="py-3 px-4 sm:px-6">Status</th>
                  <th className="py-3 px-4 sm:px-6">Last Login</th>
                  <th className="py-3 px-4 sm:px-6">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {userManagementList.map((row) => (
                  <tr key={row.id} className="even:bg-slate-50/50 hover:bg-slate-100/40 transition-colors">
                    <td className="py-3 px-4 sm:px-6">
                      <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-semibold text-xs flex items-center justify-center border border-blue-200">
                        {row.name.charAt(0)}
                      </div>
                    </td>
                    <td className="py-3 px-4 sm:px-6 font-semibold text-slate-900">{row.name}</td>
                    <td className="py-3 px-4 sm:px-6">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        row.role === 'Student' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                        row.role === 'Coach' ? 'bg-purple-50 text-purple-700 border border-purple-100' :
                        'bg-emerald-50 text-emerald-700 border border-emerald-100'
                      }`}>
                        {row.role}
                      </span>
                    </td>
                    <td className="py-3 px-4 sm:px-6">
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">
                        {row.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 sm:px-6 text-slate-500">{row.lastLogin}</td>
                    <td className="py-3 px-4 sm:px-6">
                      <div className="flex items-center gap-1.5">
                        <button 
                          onClick={() => navigate(`/admin/user/${row.id}`)}
                          className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-md shadow-xs transition-colors flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3" /> View
                        </button>
                        <button 
                          onClick={() => showNotice(`Editing user ${row.name}`)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs rounded-md transition-colors flex items-center gap-1"
                        >
                          <Edit3 className="w-3 h-3" /> Edit
                        </button>
                        <button 
                          onClick={() => showNotice(`Disabled user ${row.name}`)}
                          className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 font-medium text-xs rounded-md transition-colors flex items-center gap-1"
                        >
                          <UserX className="w-3 h-3" /> Disable
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Section 3: Challenge Library */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-800 tracking-wide uppercase">Challenge Library</h2>
          <button 
            onClick={() => navigate('/admin/challenges')}
            className="text-xs text-blue-600 font-semibold hover:underline"
          >
            Manage All
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {challengeLibrary.map((c) => (
            <div key={c.id} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-100">
                    {c.difficulty}
                  </span>
                  <Puzzle className="w-4 h-4 text-purple-600" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm">{c.title}</h3>
                <span className="text-xs text-slate-500 mt-0.5 block">{c.category} • {c.activeUsers} Active Users</span>
              </div>

              <div className="mt-4 pt-2 border-t border-slate-100 flex items-center gap-2">
                <button 
                  onClick={() => navigate(`/admin/challenge/${c.id}`)}
                  className="flex-1 py-1 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-md transition-colors text-center"
                >
                  View
                </button>
                <button 
                  onClick={() => showNotice(`Edit challenge ${c.title}`)}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs rounded-md transition-colors"
                >
                  Edit
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Section 4: Quick Actions */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-slate-800 tracking-wide uppercase">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button 
            onClick={() => showNotice('Add New User modal opened')}
            className="p-3.5 bg-white border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 rounded-xl shadow-sm text-xs font-bold text-slate-800 transition-all flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4 text-blue-600" /> Add New User
          </button>

          <button 
            onClick={() => showNotice('Create Challenge workflow initiated')}
            className="p-3.5 bg-white border border-slate-200 hover:border-purple-300 hover:bg-purple-50/50 rounded-xl shadow-sm text-xs font-bold text-slate-800 transition-all flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4 text-purple-600" /> Create Challenge
          </button>

          <button 
            onClick={() => navigate('/admin/reports')}
            className="p-3.5 bg-white border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50 rounded-xl shadow-sm text-xs font-bold text-slate-800 transition-all flex items-center justify-center gap-2"
          >
            <FileText className="w-4 h-4 text-emerald-600" /> Generate Report
          </button>

          <button 
            onClick={() => showNotice('Platform data export started...')}
            className="p-3.5 bg-white border border-slate-200 hover:border-amber-300 hover:bg-amber-50/50 rounded-xl shadow-sm text-xs font-bold text-slate-800 transition-all flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4 text-amber-600" /> Export Data
          </button>
        </div>
      </div>

      {/* Section 5 & Section 6 Layout (2 Columns) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        
        {/* Section 5: Platform Notifications */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800 tracking-wide uppercase">Platform Notifications</h2>
            <button 
              onClick={() => navigate('/admin/notifications')}
              className="text-xs text-blue-600 font-semibold hover:underline"
            >
              Manage
            </button>
          </div>

          <div className="space-y-2.5">
            {announcements.map((ann, idx) => (
              <div key={idx} className="p-3 bg-slate-50 border border-slate-100 rounded-lg text-xs text-slate-700 flex items-start gap-2.5">
                <Megaphone className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <span className="font-medium">{ann}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Section 6: Recent Activity Timeline */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
          <h2 className="text-sm font-bold text-slate-800 tracking-wide uppercase">Recent Activity Timeline</h2>
          
          <div className="space-y-3 text-xs">
            <div>
              <span className="font-semibold text-slate-400 block mb-1">Today</span>
              <ul className="space-y-1.5 pl-2">
                <li className="flex items-center gap-2 text-slate-700 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>New student registered (Alex Rivera)</span>
                </li>
                <li className="flex items-center gap-2 text-slate-700 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Coach assigned (Dr. Aris Thorne)</span>
                </li>
                <li className="flex items-center gap-2 text-slate-700 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>New Challenge created (Word Game Anagrams)</span>
                </li>
              </ul>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <span className="font-semibold text-slate-400 block mb-1">Yesterday</span>
              <ul className="space-y-1.5 pl-2">
                <li className="flex items-center gap-2 text-slate-700 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Alarm schedule updated for cohort</span>
                </li>
                <li className="flex items-center gap-2 text-slate-700 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>User password reset requested</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};

export default AdminDashboard;
