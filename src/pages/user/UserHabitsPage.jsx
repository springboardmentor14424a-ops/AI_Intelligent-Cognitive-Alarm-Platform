import React from 'react';
import StatCard from '../../components/StatCard';
import { Flame, Award, Calendar, CheckCircle2, TrendingUp } from 'lucide-react';

const UserHabitsPage = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Habit Tracker</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Monitor your long-term wake-up consistency and routine adherence progress.
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Current Streak"
          value="14 Days 🔥"
          subtext="Active streak count"
          icon={Flame}
          badgeColor="bg-amber-50 text-amber-600"
        />

        <StatCard
          title="Longest Streak"
          value="21 Days"
          subtext="Personal best record"
          icon={Award}
          badgeColor="bg-purple-50 text-purple-600"
        />

        <StatCard
          title="Habit Score"
          value="84 / 100"
          subtext="Optimal habit tier"
          icon={TrendingUp}
          badgeColor="bg-blue-50 text-blue-600"
        />

        <StatCard
          title="Monthly Progress"
          value="88%"
          subtext="July compliance rate"
          icon={Calendar}
          badgeColor="bg-emerald-50 text-emerald-600"
        />
      </div>

      {/* Weekly Goals & Breakdown */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-5">
        <h2 className="text-sm font-bold text-slate-800 tracking-wide uppercase">Weekly Goals & Adherence</h2>

        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-xs font-semibold mb-1.5">
              <span className="text-slate-800">Wake-up On-Time Goal (5/5 Weekdays)</span>
              <span className="text-blue-600 font-bold">100% (5 of 5)</span>
            </div>
            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-blue-600 rounded-full" style={{ width: '100%' }} />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs font-semibold mb-1.5">
              <span className="text-slate-800">No-Snooze Challenge Rate (Zero Snoozes)</span>
              <span className="text-emerald-600 font-bold">85% (6 of 7 Days)</span>
            </div>
            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-600 rounded-full" style={{ width: '85%' }} />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs font-semibold mb-1.5">
              <span className="text-slate-800">Cognitive Puzzle Pass Rate (Under 20s)</span>
              <span className="text-purple-600 font-bold">92%</span>
            </div>
            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-purple-600 rounded-full" style={{ width: '92%' }} />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs font-semibold mb-1.5">
              <span className="text-slate-800">Sleep Schedule Adherence (Bed by 11 PM)</span>
              <span className="text-amber-600 font-bold">78%</span>
            </div>
            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-amber-600 rounded-full" style={{ width: '78%' }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserHabitsPage;
