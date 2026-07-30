import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Puzzle, Plus, Eye, Edit3, CheckCircle2 } from 'lucide-react';

const AdminChallengesPage = () => {
  const navigate = useNavigate();
  const [notice, setNotice] = useState(null);

  const showNotice = (msg) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 3000);
  };

  const challengeLibrary = [
    { id: '1', title: 'Math Puzzle', category: 'Arithmetic', difficulty: 'Easy', activeUsers: 84 },
    { id: '2', title: 'Memory Game', category: 'Spatial Matrix', difficulty: 'Medium', activeUsers: 62 },
    { id: '3', title: 'Logic Puzzle', category: 'Deduction', difficulty: 'Medium', activeUsers: 45 },
    { id: '4', title: 'Pattern Match', category: 'Visual Alignment', difficulty: 'Hard', activeUsers: 29 }
  ];

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      {notice && (
        <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-700 font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-blue-600" />
          <span>{notice}</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Cognitive Challenge Library</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Configure puzzle engines, difficulty progression rules, and solver metrics.
          </p>
        </div>

        <button 
          onClick={() => showNotice('Create Challenge modal opened')}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-lg shadow-sm transition-colors flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Create Challenge
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {challengeLibrary.map((c) => (
          <div key={c.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-100">
                  {c.difficulty}
                </span>
                <Puzzle className="w-5 h-5 text-purple-600" />
              </div>
              <h3 className="font-bold text-slate-900 text-base">{c.title}</h3>
              <p className="text-xs text-slate-500 mt-1">{c.category} • {c.activeUsers} Active Users</p>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center gap-2">
              <button 
                onClick={() => navigate(`/admin/challenge/${c.id}`)}
                className="flex-1 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-lg shadow-xs transition-colors flex items-center justify-center gap-1"
              >
                <Eye className="w-3.5 h-3.5" /> View
              </button>
              <button 
                onClick={() => showNotice(`Editing ${c.title}...`)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs rounded-lg transition-colors flex items-center gap-1"
              >
                <Edit3 className="w-3.5 h-3.5" /> Edit
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminChallengesPage;
