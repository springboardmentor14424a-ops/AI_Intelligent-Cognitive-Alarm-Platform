import React, { useState } from 'react';
import { Calculator, Boxes, Puzzle, LayoutGrid, Type, Play, CheckCircle2, Clock } from 'lucide-react';

const UserChallengesPage = () => {
  const [notice, setNotice] = useState(null);

  const challenges = [
    {
      id: 'math',
      title: 'Math Problems',
      description: 'Multi-step mental arithmetic equations to trigger logical reasoning.',
      difficulty: 'Easy',
      estimatedTime: '15 - 30 sec',
      icon: Calculator,
      color: 'bg-blue-50 text-blue-600 border-blue-100'
    },
    {
      id: 'memory',
      title: 'Memory Match',
      description: 'Spatial pattern matrix recall to stimulate active memory centers.',
      difficulty: 'Medium',
      estimatedTime: '20 - 40 sec',
      icon: LayoutGrid,
      color: 'bg-purple-50 text-purple-600 border-purple-100'
    },
    {
      id: 'logic',
      title: 'Logic Puzzles',
      description: 'Symbol deduction equations & sequence pattern recognition.',
      difficulty: 'Medium',
      estimatedTime: '30 - 45 sec',
      icon: Puzzle,
      color: 'bg-emerald-50 text-emerald-600 border-emerald-100'
    },
    {
      id: 'pattern',
      title: 'Pattern Recognition',
      description: 'Visual sequence completion & spatial alignment challenges.',
      difficulty: 'Hard',
      estimatedTime: '25 - 35 sec',
      icon: Boxes,
      color: 'bg-amber-50 text-amber-600 border-amber-100'
    },
    {
      id: 'word',
      title: 'Word Game Anagrams',
      description: 'Unscramble cognitive vocabulary words under timer pressure.',
      difficulty: 'Easy',
      estimatedTime: '15 - 25 sec',
      icon: Type,
      color: 'bg-rose-50 text-rose-600 border-rose-100'
    }
  ];

  const handleStart = (title) => {
    setNotice(`Starting ${title} practice challenge...`);
    setTimeout(() => setNotice(null), 3000);
  };

  return (
    <div className="space-y-6">
      {notice && (
        <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-700 font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-blue-600" />
          <span>{notice}</span>
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Cognitive Challenges</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Practice wakefulness puzzle solver engines to sharpen your morning alertness.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {challenges.map((ch) => {
          const Icon = ch.icon;
          return (
            <div key={ch.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className={`p-2.5 rounded-xl border ${ch.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                    {ch.difficulty}
                  </span>
                </div>

                <h3 className="font-bold text-slate-900 text-base">{ch.title}</h3>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{ch.description}</p>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-500 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400" /> {ch.estimatedTime}
                </span>

                <button 
                  onClick={() => handleStart(ch.title)}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg shadow-sm transition-colors flex items-center gap-1"
                >
                  <Play className="w-3 h-3 fill-current" /> Start
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default UserChallengesPage;
