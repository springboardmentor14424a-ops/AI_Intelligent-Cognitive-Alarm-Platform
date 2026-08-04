import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  FiActivity,
  FiHome,
  FiUserCheck,
  FiShield,
  FiUser,
  FiSettings,
  FiClock,
  FiCheckSquare,
  FiChevronLeft,
  FiChevronRight,
} from 'react-icons/fi';

interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, onToggleCollapse }) => {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) return null;

  const isActive = (path: string) => location.pathname === path;

  return (
    <aside
      className={`fixed top-0 left-0 z-30 h-screen glass-panel border-r border-slate-800 transition-all duration-300 flex flex-col justify-between ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      <div className="flex flex-col h-full">
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800">
          <Link to="/" className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 flex items-center justify-center shadow-lg shadow-blue-500/20 flex-shrink-0">
              <FiActivity className="w-5 h-5 text-white" />
            </div>
            {!isCollapsed && (
              <div className="min-w-0">
                <span className="font-extrabold text-sm text-white tracking-tight block truncate">
                  Cognitive Alarm
                </span>
                <span className="text-[10px] text-blue-400 font-semibold uppercase tracking-wider block">
                  Platform Core
                </span>
              </div>
            )}
          </Link>
          <button
            onClick={onToggleCollapse}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors hidden sm:block"
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? <FiChevronRight className="w-5 h-5" /> : <FiChevronLeft className="w-5 h-5" />}
          </button>
        </div>

        {/* Navigation Sections */}
        <div className="flex-1 py-6 px-3 space-y-6 overflow-y-auto">
          {/* Dashboards Section */}
          <div className="space-y-1">
            {!isCollapsed && (
              <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                Dashboards
              </p>
            )}

            <Link
              to="/user/dashboard"
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                isActive('/user/dashboard')
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow-md shadow-blue-500/10'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
              title="User Dashboard"
            >
              <FiHome className="w-4 h-4 flex-shrink-0" />
              {!isCollapsed && <span className="truncate">User Dashboard</span>}
            </Link>

            {(user.role === 'coach' || user.role === 'admin') && (
              <Link
                to="/coach/dashboard"
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive('/coach/dashboard')
                    ? 'bg-amber-600/20 text-amber-400 border border-amber-500/30 shadow-md shadow-amber-500/10'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
                title="Coach Portal"
              >
                <FiUserCheck className="w-4 h-4 flex-shrink-0" />
                {!isCollapsed && <span className="truncate">Coach Portal</span>}
              </Link>
            )}

            {user.role === 'admin' && (
              <Link
                to="/admin/dashboard"
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive('/admin/dashboard')
                    ? 'bg-rose-600/20 text-rose-400 border border-rose-500/30 shadow-md shadow-rose-500/10'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
                title="Admin Console"
              >
                <FiShield className="w-4 h-4 flex-shrink-0" />
                {!isCollapsed && <span className="truncate">Admin Console</span>}
              </Link>
            )}
          </div>

          {/* Core Modules Section */}
          <div className="space-y-1">
            {!isCollapsed && (
              <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                Core Modules
              </p>
            )}

            <Link
              to="/profile"
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                isActive('/profile')
                  ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 shadow-md shadow-indigo-500/10'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
              title="User Profile"
            >
              <FiUser className="w-4 h-4 flex-shrink-0" />
              {!isCollapsed && <span className="truncate">User Profile</span>}
            </Link>

            <Link
              to="/settings"
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                isActive('/settings')
                  ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 shadow-md shadow-indigo-500/10'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
              title="Settings"
            >
              <FiSettings className="w-4 h-4 flex-shrink-0" />
              {!isCollapsed && <span className="truncate">Settings</span>}
            </Link>
          </div>
        </div>

        {/* User Card at bottom */}
        <div className="p-3 border-t border-slate-800">
          <div className={`p-2 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-xs flex-shrink-0">
              {user.name.charAt(0)}
            </div>
            {!isCollapsed && (
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white truncate">{user.name}</p>
                <p className="text-[10px] text-slate-400 capitalize truncate">{user.role} Account</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
};
