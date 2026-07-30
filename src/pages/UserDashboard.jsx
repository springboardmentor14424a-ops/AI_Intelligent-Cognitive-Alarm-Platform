import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import StatCard from '../components/StatCard';
import { 
  AlarmClock, 
  Award, 
  Flame, 
  Brain, 
  Target, 
  Quote, 
  Sparkles, 
  CheckCircle2, 
  Clock, 
  Calendar,
  ArrowRight
} from 'lucide-react';

const UserDashboard = () => {
  const navigate = useNavigate();
  const [activeNotice, setActiveNotice] = useState(null);

  const showNotice = (msg) => {
    setActiveNotice(msg);
    setTimeout(() => setActiveNotice(null), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Notice Banner */}
      {activeNotice && (
        <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-700 font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-blue-600" />
          <span>{activeNotice}</span>
        </div>
      )}

      {/* Welcome Section */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Good Morning, Alex 👋
          </h1>
          <div className="mt-1 flex items-center gap-2 text-sm text-slate-600 font-medium">
            <Target className="w-4 h-4 text-blue-600" />
            <span>Today's Goal: <strong className="text-slate-800 font-semibold">Wake up before 6:30 AM</strong></span>
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200/80 p-3.5 rounded-xl max-w-sm flex items-start gap-2.5">
          <Quote className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <p className="text-xs text-slate-600 italic">
            "Success begins the moment you rise with purpose and conquer the morning."
          </p>
        </div>
      </div>

      {/* Section 1: Top Statistics (4 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Next Alarm"
          value="06:30 AM"
          subtext="Tomorrow"
          icon={AlarmClock}
          badgeColor="bg-blue-50 text-blue-600"
        />

        <StatCard
          title="Habit Score"
          value="84 / 100"
          subtext="Excellent"
          icon={Award}
          badgeColor="bg-purple-50 text-purple-600"
        />

        <StatCard
          title="Current Streak"
          value="14 Days 🔥"
          subtext="Consecutive days on time"
          icon={Flame}
          badgeColor="bg-amber-50 text-amber-600"
        />

        <StatCard
          title="Today's Challenge"
          value="Math Puzzle"
          subtext="Difficulty: Easy"
          icon={Brain}
          badgeColor="bg-emerald-50 text-emerald-600"
        />
      </div>

      {/* Section 2: Upcoming Alarms (Beautiful Cards) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-800 tracking-wide uppercase">Upcoming Alarms</h2>
          <button 
            onClick={() => navigate('/user/alarms')}
            className="text-xs text-blue-600 font-semibold hover:underline flex items-center gap-1"
          >
            View All <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Card 1 */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Morning Routine</h3>
                <span className="text-2xl font-extrabold text-blue-600 block mt-1">06:30 AM</span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                Tomorrow
              </span>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
              <div className="flex items-center gap-1.5">
                <Brain className="w-4 h-4 text-purple-600" />
                <span>Challenge: <strong>Math Puzzle</strong></span>
              </div>
              <button 
                onClick={() => navigate('/user/alarms')}
                className="px-3 py-1 bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-700 font-medium rounded-lg transition-colors"
              >
                Edit Alarm
              </button>
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Workout Alarm</h3>
                <span className="text-2xl font-extrabold text-blue-600 block mt-1">08:00 AM</span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-100">
                Saturday
              </span>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
              <div className="flex items-center gap-1.5">
                <Brain className="w-4 h-4 text-purple-600" />
                <span>Challenge: <strong>Memory Game</strong></span>
              </div>
              <button 
                onClick={() => navigate('/user/alarms')}
                className="px-3 py-1 bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-700 font-medium rounded-lg transition-colors"
              >
                Edit Alarm
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Section 3 & Section 4 Layout (2 Columns) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        
        {/* Section 3: Today's Progress */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-800 tracking-wide uppercase">Today's Progress</h2>
          
          <div className="space-y-3.5">
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-slate-700">Wake-up Consistency</span>
                <span className="text-blue-600">90%</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-600 rounded-full" style={{ width: '90%' }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-slate-700">Challenge Completion</span>
                <span className="text-purple-600">82%</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-purple-600 rounded-full" style={{ width: '82%' }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-slate-700">Sleep Goal (7.5h / 8h)</span>
                <span className="text-emerald-600">75%</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-600 rounded-full" style={{ width: '75%' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Section 4: Recent Activities (Timeline) */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
          <h2 className="text-sm font-bold text-slate-800 tracking-wide uppercase">Recent Activities</h2>
          
          <div className="space-y-3 text-xs">
            <div>
              <span className="font-semibold text-slate-400 block mb-1">Today</span>
              <ul className="space-y-1.5 pl-2">
                <li className="flex items-center gap-2 text-slate-700 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Alarm dismissed successfully at 06:28 AM</span>
                </li>
                <li className="flex items-center gap-2 text-slate-700 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Math puzzle challenge completed in 14s</span>
                </li>
              </ul>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <span className="font-semibold text-slate-400 block mb-1">Yesterday</span>
              <ul className="space-y-1.5 pl-2">
                <li className="flex items-center gap-2 text-slate-700 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Slept before 11:00 PM target time</span>
                </li>
                <li className="flex items-center gap-2 text-slate-700 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Habit score increased (+2 pts)</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

      </div>

      {/* Section 5: AI Recommendation Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 bg-blue-50 rounded-xl text-blue-600 shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm">AI Sleep Assistant</h3>
            <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
              You have improved your wake-up consistency. Try sleeping 20 minutes earlier tonight to increase your habit score to 88+.
            </p>
          </div>
        </div>

        <button 
          onClick={() => navigate('/user/sleep')}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-lg shadow-sm transition-colors whitespace-nowrap"
        >
          View Suggestions
        </button>
      </div>

    </div>
  );
};

export default UserDashboard;
