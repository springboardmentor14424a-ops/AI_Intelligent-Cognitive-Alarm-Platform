import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import {
  FiLogOut,
  FiUser,
  FiSettings,
  FiBell,
  FiSearch,
  FiShield,
  FiUserCheck,
  FiMenu,
  FiMoon,
  FiCheckCircle,
} from 'react-icons/fi';
import { UserRole } from '../../types';

interface NavbarProps {
  onToggleMobileSidebar?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleMobileSidebar }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getRoleBadge = (role?: UserRole) => {
    switch (role) {
      case 'admin':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <FiShield className="w-3 h-3" /> Admin
          </span>
        );
      case 'coach':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <FiUserCheck className="w-3 h-3" /> Coach
          </span>
        );
      case 'user':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <FiUser className="w-3 h-3" /> User
          </span>
        );
    }
  };

  return (
    <header className="sticky top-0 z-20 border-b border-slate-800 glass-panel h-16 flex items-center justify-between px-4 sm:px-6">
      <div className="flex items-center gap-3">
        {onToggleMobileSidebar && (
          <button
            onClick={onToggleMobileSidebar}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors md:hidden"
            aria-label="Toggle Navigation Menu"
          >
            <FiMenu className="w-5 h-5" />
          </button>
        )}

        {/* Global Search Bar */}
        <div className="relative hidden sm:block w-64 md:w-80">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
            <FiSearch className="w-4 h-4" />
          </div>
          <input
            type="text"
            placeholder="Search alarms, habits, users..."
            className="w-full text-xs rounded-xl py-2 pl-9 pr-3 glass-input transition-all"
          />
        </div>
      </div>

      {user && (
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Dark Mode Status Indicator */}
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-400">
            <FiMoon className="w-3.5 h-3.5 text-indigo-400" />
            <span>Dark Theme Active</span>
          </div>

          {/* Notifications Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications((prev) => !prev)}
              className="relative p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Notifications"
            >
              <FiBell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-500 animate-ping" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-500" />
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 rounded-2xl glass-panel border border-slate-800 shadow-2xl p-4 z-50 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">System Alerts</h4>
                  <span className="text-[10px] text-blue-400 font-semibold">2 New</span>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-blue-950/40 border border-blue-500/20 text-slate-200">
                    <p className="font-semibold text-blue-300">Foundation Mode Active</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">JWT Auth & RBAC modules successfully synchronized.</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/20 text-slate-200">
                    <p className="font-semibold text-emerald-300">Alarm Engine Ready</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">3 active cognitive alarms initialized for current user.</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Profile Menu Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowProfileMenu((prev) => !prev)}
              className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-800/80 transition-colors focus:outline-none"
            >
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-md shadow-blue-500/20">
                {user.name.charAt(0)}
              </div>
              <div className="hidden md:flex flex-col text-left">
                <span className="text-xs font-semibold text-slate-200 leading-tight">{user.name}</span>
                <span className="text-[10px] text-slate-400 capitalize">{user.role}</span>
              </div>
            </button>

            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-56 rounded-2xl glass-panel border border-slate-800 shadow-2xl p-2 z-50 space-y-1">
                <div className="px-3 py-2 border-b border-slate-800">
                  <p className="text-xs font-bold text-white">{user.name}</p>
                  <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
                  <div className="mt-1.5">{getRoleBadge(user.role)}</div>
                </div>

                <Link
                  to="/profile"
                  onClick={() => setShowProfileMenu(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <FiUser className="w-4 h-4 text-indigo-400" /> My Profile
                </Link>

                <Link
                  to="/settings"
                  onClick={() => setShowProfileMenu(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <FiSettings className="w-4 h-4 text-indigo-400" /> Account Settings
                </Link>

                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-500/10 transition-colors"
                >
                  <FiLogOut className="w-4 h-4" /> Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
