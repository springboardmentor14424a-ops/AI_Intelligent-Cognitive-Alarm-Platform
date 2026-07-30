import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import StatCard from '../components/StatCard';
import { 
  Users, 
  UserCheck, 
  Activity, 
  AlertTriangle, 
  Plus, 
  Send, 
  FileText, 
  Download, 
  Calendar, 
  Video, 
  Clock, 
  CheckCircle2, 
  ArrowRight,
  ClipboardList
} from 'lucide-react';

const CoachDashboard = () => {
  const navigate = useNavigate();
  const [notice, setNotice] = useState(null);

  const showNotice = (msg) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 3000);
  };

  // Modern Cards for Students Requiring Attention
  const attentionStudents = [
    { id: '1', name: 'Alex Rivera', wakeTime: '06:30 AM', habitScore: 84, risk: 'Low Risk', lastActive: 'Today' },
    { id: '2', name: 'John Carter', wakeTime: '07:00 AM', habitScore: 72, risk: 'Medium Risk', lastActive: 'Yesterday' },
    { id: '3', name: 'Sarah Lee', wakeTime: '05:45 AM', habitScore: 91, risk: 'Low Risk', lastActive: 'Today' }
  ];

  // Assigned Students Table Data
  const assignedStudentsTable = [
    { id: '1', name: 'Alex Rivera', wakeTime: '06:30 AM', habitScore: 84, difficulty: 'Easy', risk: 'Low' },
    { id: '2', name: 'John Carter', wakeTime: '07:00 AM', habitScore: 72, difficulty: 'Medium', risk: 'Medium' },
    { id: '3', name: 'Sarah Lee', wakeTime: '05:45 AM', habitScore: 91, difficulty: 'Medium', risk: 'Low' },
    { id: '4', name: 'Marcus Vance', wakeTime: '08:00 AM', habitScore: 58, difficulty: 'Hard', risk: 'High' }
  ];

  // Coach Note Cards
  const coachNotes = [
    { id: 1, text: 'Alex has maintained excellent consistency this week.' },
    { id: 2, text: 'John should reduce snoozing and sleep before 11 PM.' },
    { id: 3, text: 'Sarah is ready for Medium challenge difficulty.' }
  ];

  // Upcoming Sessions
  const upcomingSessions = [
    { id: 1, student: 'Alex Rivera', date: 'Today', time: '04:00 PM', status: 'Confirmed' },
    { id: 2, student: 'John Carter', date: 'Tomorrow', time: '10:30 AM', status: 'Pending' }
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
            Welcome Back, Dr. Aris Thorne 👋
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
            Monitor student progress and provide personalized recommendations.
          </p>
        </div>
        <button
          onClick={() => navigate('/coach/students')}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-lg shadow-sm transition-colors self-start md:self-auto flex items-center gap-1.5"
        >
          View All Students <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Top KPI Cards (4 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Assigned Students"
          value="42"
          subtext="Active in program"
          icon={Users}
          badgeColor="bg-blue-50 text-blue-600"
        />

        <StatCard
          title="Today's Check-ins"
          value="18"
          subtext="Students woken on-time"
          icon={UserCheck}
          badgeColor="bg-emerald-50 text-emerald-600"
        />

        <StatCard
          title="Average Habit Score"
          value="79"
          subtext="Cohort weighted average"
          icon={Activity}
          badgeColor="bg-purple-50 text-purple-600"
        />

        <StatCard
          title="High Risk Students"
          value="5"
          subtext="Action required"
          icon={AlertTriangle}
          badgeColor="bg-amber-50 text-amber-600"
        />
      </div>

      {/* Section 1: Students Requiring Attention (Modern Cards Grid) */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-slate-800 tracking-wide uppercase">Students Requiring Attention</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {attentionStudents.map((st) => (
            <div key={st.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 font-bold text-sm flex items-center justify-center border border-blue-200">
                      {st.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">{st.name}</h3>
                      <span className="text-xs text-slate-500">Wake: {st.wakeTime}</span>
                    </div>
                  </div>

                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    st.risk.includes('Low') ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-amber-50 text-amber-700 border border-amber-100'
                  }`}>
                    {st.risk}
                  </span>
                </div>

                <div className="mt-3 text-xs space-y-1 text-slate-600 bg-slate-50 p-2.5 rounded-lg">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Habit Score:</span>
                    <strong className="text-slate-800">{st.habitScore} / 100</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Last Active:</span>
                    <span className="text-slate-700">{st.lastActive}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
                <button
                  onClick={() => navigate(`/coach/student/${st.id}`)}
                  className="flex-1 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-lg shadow-xs transition-colors"
                >
                  View Profile
                </button>
                <button
                  onClick={() => showNotice(`Recommendation sent to ${st.name}`)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-700 font-medium text-xs rounded-lg transition-colors"
                >
                  Send Rec
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Section 2: Assigned Students Table */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-slate-800 tracking-wide uppercase">Assigned Students Roster</h2>
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
                {assignedStudentsTable.map((row) => (
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

      {/* Section 3 & Section 4 Layout (2 Columns) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        
        {/* Section 3: Coach Recommendations */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800 tracking-wide uppercase">Coach Recommendations</h2>
            <button 
              onClick={() => showNotice('Create recommendation modal opened')}
              className="text-xs text-blue-600 font-semibold hover:underline flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Create Recommendation
            </button>
          </div>

          <div className="space-y-3">
            {coachNotes.map((n) => (
              <div key={n.id} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex items-start gap-3">
                <div className="p-2 bg-purple-50 text-purple-600 rounded-lg shrink-0 mt-0.5">
                  <ClipboardList className="w-4 h-4" />
                </div>
                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-medium">
                  "{n.text}"
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Section 4: Upcoming Sessions */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-slate-800 tracking-wide uppercase">Upcoming Sessions</h2>
          <div className="space-y-3">
            {upcomingSessions.map((s) => (
              <div key={s.id} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                    <Video className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-xs sm:text-sm">{s.student}</h3>
                    <span className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3 text-slate-400" /> {s.date} • {s.time}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => showNotice(`Starting session with ${s.student}...`)}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-lg shadow-xs transition-colors"
                  >
                    Start Session
                  </button>
                  <button 
                    onClick={() => showNotice(`Reschedule requested for ${s.student}`)}
                    className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs rounded-lg transition-colors"
                  >
                    Reschedule
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Section 5: Quick Actions */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-slate-800 tracking-wide uppercase">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button 
            onClick={() => showNotice('Assign challenge workflow initiated')}
            className="p-3.5 bg-white border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 rounded-xl shadow-sm text-xs font-bold text-slate-800 transition-all flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4 text-blue-600" /> Assign Challenge
          </button>

          <button 
            onClick={() => showNotice('Reminder dispatched to students')}
            className="p-3.5 bg-white border border-slate-200 hover:border-purple-300 hover:bg-purple-50/50 rounded-xl shadow-sm text-xs font-bold text-slate-800 transition-all flex items-center justify-center gap-2"
          >
            <Send className="w-4 h-4 text-purple-600" /> Send Reminder
          </button>

          <button 
            onClick={() => showNotice('Generating cohort summary report...')}
            className="p-3.5 bg-white border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50 rounded-xl shadow-sm text-xs font-bold text-slate-800 transition-all flex items-center justify-center gap-2"
          >
            <FileText className="w-4 h-4 text-emerald-600" /> Generate Report
          </button>

          <button 
            onClick={() => showNotice('Exporting PDF document...')}
            className="p-3.5 bg-white border border-slate-200 hover:border-amber-300 hover:bg-amber-50/50 rounded-xl shadow-sm text-xs font-bold text-slate-800 transition-all flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4 text-amber-600" /> Export PDF
          </button>
        </div>
      </div>

    </div>
  );
};

export default CoachDashboard;
