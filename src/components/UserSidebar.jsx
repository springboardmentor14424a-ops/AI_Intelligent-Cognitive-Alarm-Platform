import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  AlarmClock, 
  Brain, 
  Flame, 
  Moon, 
  User, 
  Settings 
} from 'lucide-react';

const UserSidebar = () => {
  const navItems = [
    { label: 'Dashboard', path: '/user', icon: LayoutDashboard, exact: true },
    { label: 'My Alarms', path: '/user/alarms', icon: AlarmClock },
    { label: 'Cognitive Challenges', path: '/user/challenges', icon: Brain },
    { label: 'Habit Tracker', path: '/user/habits', icon: Flame },
    { label: 'Sleep Insights', path: '/user/sleep', icon: Moon },
    { label: 'Profile', path: '/user/profile', icon: User },
    { label: 'Settings', path: '/user/settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200/80 min-h-[calc(100vh-4rem)] p-4 flex flex-col justify-between shrink-0 hidden md:block">
      <div className="space-y-1">
        <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
          User Menu
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.exact}
              className={({ isActive }) =>
                `w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-blue-50 text-blue-600 font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`
              }
            >
              <Icon className="w-4.5 h-4.5" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </div>

      {/* Motivational Bottom Box */}
      <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl">
        <span className="text-xs font-semibold text-slate-800 block">🔥 14-Day Streak!</span>
        <span className="text-[11px] text-slate-500 mt-0.5 block leading-tight">
          Keep waking up consistently to earn +10 Habit Score points.
        </span>
      </div>
    </aside>
  );
};

export default UserSidebar;
