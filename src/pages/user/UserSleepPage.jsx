import React from 'react';
import StatCard from '../../components/StatCard';
import { Moon, Clock, BedDouble, Sparkles, CheckCircle2 } from 'lucide-react';

const UserSleepPage = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Sleep Insights</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Clean overview of your sleep schedule, target bedtime, and circadian rhythm alignment.
        </p>
      </div>

      {/* Sleep Overview Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Average Sleep"
          value="7.5 Hours"
          subtext="7-day daily average"
          icon={Moon}
          badgeColor="bg-blue-50 text-blue-600"
        />

        <StatCard
          title="Target Sleep"
          value="8.0 Hours"
          subtext="Configured wellness goal"
          icon={BedDouble}
          badgeColor="bg-purple-50 text-purple-600"
        />

        <StatCard
          title="Wake-up Time"
          value="06:30 AM"
          subtext="Morning alarm schedule"
          icon={Clock}
          badgeColor="bg-emerald-50 text-emerald-600"
        />

        <StatCard
          title="Bed Time"
          value="11:00 PM"
          subtext="Recommended bedtime"
          icon={Moon}
          badgeColor="bg-amber-50 text-amber-600"
        />
      </div>

      {/* Sleep Quality Progress Indicator Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-base">Sleep Quality Score</h2>
              <span className="text-xs text-slate-500">Based on bedtime consistency & wakefulness speed</span>
            </div>
          </div>

          <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-bold">
            Optimal - 88%
          </span>
        </div>

        <div className="space-y-3 pt-2">
          <div>
            <div className="flex justify-between text-xs font-semibold mb-1">
              <span className="text-slate-700">Sleep Duration Alignment (7.5h / 8.0h)</span>
              <span className="text-blue-600 font-bold">93.7%</span>
            </div>
            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-blue-600 rounded-full" style={{ width: '93.7%' }} />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs font-semibold mb-1">
              <span className="text-slate-700">Circadian Stability Index</span>
              <span className="text-purple-600 font-bold">88.0%</span>
            </div>
            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-purple-600 rounded-full" style={{ width: '88%' }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserSleepPage;
