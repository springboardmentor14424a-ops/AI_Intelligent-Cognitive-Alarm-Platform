import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Puzzle, Edit3, Trash2, CheckCircle2, Award, Users, Clock } from 'lucide-react';
import StatCard from '../../components/StatCard';

const AdminChallengeDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [notice, setNotice] = useState(null);

  const showNotice = (msg) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 3000);
  };

  const challengesMap = {
    '1': { id: '1', title: 'Math Puzzle', category: 'Arithmetic', difficulty: 'Easy', createdDate: 'Jan 10, 2026', activeUsers: 84, successRate: '94%' },
    '2': { id: '2', title: 'Memory Game', category: 'Spatial Matrix', difficulty: 'Medium', createdDate: 'Jan 12, 2026', activeUsers: 62, successRate: '88%' },
    '3': { id: '3', title: 'Logic Puzzle', category: 'Deduction', difficulty: 'Medium', createdDate: 'Jan 15, 2026', activeUsers: 45, successRate: '82%' },
    '4': { id: '4', title: 'Pattern Match', category: 'Visual Alignment', difficulty: 'Hard', createdDate: 'Jan 18, 2026', activeUsers: 29, successRate: '78%' }
  };

  const ch = challengesMap[id] || challengesMap['1'];

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      {notice && (
        <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-700 font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-blue-600" />
          <span>{notice}</span>
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button
          onClick={() => navigate('/admin/challenges')}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-white border border-slate-200 text-slate-700 hover:text-blue-600 rounded-lg text-xs font-semibold shadow-xs transition-all self-start sm:self-auto"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Challenges
        </button>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => showNotice(`Editing ${ch.title}...`)}
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-lg shadow-sm transition-colors flex items-center gap-1"
          >
            <Edit3 className="w-3.5 h-3.5" /> Edit Challenge
          </button>
          <button 
            onClick={() => showNotice(`Deleted challenge ${ch.title}`)}
            className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 font-medium text-xs rounded-lg border border-rose-200 transition-colors flex items-center gap-1"
          >
            <Trash2 className="w-3.5 h-3.5" /> Delete
          </button>
        </div>
      </div>

      {/* Main Details Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-6">
        <div className="flex items-center gap-4 pb-6 border-b border-slate-100">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-xl border border-purple-100">
            <Puzzle className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{ch.title}</h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-100 mt-1">
              Category: {ch.category}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs sm:text-sm">
          <div>
            <span className="text-slate-400 font-medium block">Difficulty Tier</span>
            <span className="font-semibold text-slate-800">{ch.difficulty}</span>
          </div>
          <div>
            <span className="text-slate-400 font-medium block">Created Date</span>
            <span className="font-semibold text-slate-800">{ch.createdDate}</span>
          </div>
          <div>
            <span className="text-slate-400 font-medium block">Active Assigned Users</span>
            <span className="font-semibold text-slate-800">{ch.activeUsers} Students</span>
          </div>
          <div>
            <span className="text-slate-400 font-medium block">Overall Success Rate</span>
            <span className="font-semibold text-emerald-600">{ch.successRate}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard
          title="Active Solver Population"
          value={`${ch.activeUsers} Users`}
          subtext="Assigned across morning alarms"
          icon={Users}
          badgeColor="bg-blue-50 text-blue-600"
        />

        <StatCard
          title="Completion Accuracy Rate"
          value={ch.successRate}
          subtext="First-attempt pass metric"
          icon={Award}
          badgeColor="bg-emerald-50 text-emerald-600"
        />
      </div>
    </div>
  );
};

export default AdminChallengeDetailsPage;
