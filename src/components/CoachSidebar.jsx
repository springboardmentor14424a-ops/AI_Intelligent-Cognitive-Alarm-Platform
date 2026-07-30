import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  Home, 
  Users, 
  FileText, 
  Sparkles, 
  Calendar, 
  Settings 
} from 'lucide-react';

const CoachSidebar = () => {
  const navItems = [
    { label: 'Dashboard', path: '/coach', icon: Home, exact: true },
    { label: 'Assigned Students', path: '/coach/students', icon: Users },
    { label: 'Student Reports', path: '/coach/reports', icon: FileText },
    { label: 'AI Recommendations', path: '/coach/recommendations', icon: Sparkles },
    { label: 'Schedule', path: '/coach/schedule', icon: Calendar },
    { label: 'Settings', path: '/coach/settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200/80 min-h-[calc(100vh-4rem)] p-4 flex flex-col justify-between shrink-0 hidden md:block">
      <div className="space-y-1">
        <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
          Coach Portal
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

      {/* Cohort Status Box */}
      <div className="p-3.5 bg-purple-50/60 border border-purple-100 rounded-xl">
        <span className="text-xs font-semibold text-purple-900 block">🩺 Active Coaching Cohort</span>
        <span className="text-[11px] text-purple-700 mt-0.5 block leading-tight">
          42 assigned students under sleep & wakefulness tracking.
        </span>
      </div>
    </aside>
  );
};

export default CoachSidebar;
