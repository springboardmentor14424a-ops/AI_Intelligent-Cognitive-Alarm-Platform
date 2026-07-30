import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  Home, 
  Users, 
  AlarmClock, 
  Puzzle, 
  FileText, 
  Bell, 
  Settings 
} from 'lucide-react';

const AdminSidebar = () => {
  const navItems = [
    { label: 'Dashboard', path: '/admin', icon: Home, exact: true },
    { label: 'User Management', path: '/admin/users', icon: Users },
    { label: 'Alarm Management', path: '/admin/alarms', icon: AlarmClock },
    { label: 'Challenge Library', path: '/admin/challenges', icon: Puzzle },
    { label: 'Reports', path: '/admin/reports', icon: FileText },
    { label: 'Notifications', path: '/admin/notifications', icon: Bell },
    { label: 'Platform Settings', path: '/admin/settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200/80 min-h-[calc(100vh-4rem)] p-4 flex flex-col justify-between shrink-0 hidden md:block">
      <div className="space-y-1">
        <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
          Admin Console
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

      {/* System Status Box */}
      <div className="p-3.5 bg-emerald-50/60 border border-emerald-100 rounded-xl">
        <span className="text-xs font-semibold text-emerald-900 block">🛡️ Infrastructure Health</span>
        <span className="text-[11px] text-emerald-700 mt-0.5 block leading-tight">
          99.8% Uptime • FastAPI Gateway nominal.
        </span>
      </div>
    </aside>
  );
};

export default AdminSidebar;
