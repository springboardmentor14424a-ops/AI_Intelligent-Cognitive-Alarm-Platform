import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { BellRing, User, LogOut, Shield, UserCheck, LayoutDashboard, Bell } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const navigate = useNavigate();
  const { role, user, logout } = useAuth();
  const [showNotifyDot, setShowNotifyDot] = useState(true);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand Logo */}
        <div 
          onClick={() => navigate('/')}
          className="flex items-center gap-2.5 cursor-pointer group"
        >
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm transition-transform group-hover:scale-105">
            <BellRing className="w-5 h-5" />
          </div>
          <span className="font-bold text-lg text-slate-800 tracking-tight">
            Cognitive<span className="text-blue-600">Alarm</span>
          </span>
        </div>

        {/* Role-Based Dynamic Navigation */}
        <nav className="flex items-center gap-1 sm:gap-2">
          {/* 1. Student / User Role */}
          {role === 'student' && (
            <NavLink
              to="/user"
              className={({ isActive }) =>
                `px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-150 flex items-center gap-2 ${
                  isActive
                    ? 'bg-blue-50 text-blue-600 font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`
              }
            >
              <LayoutDashboard className="w-4 h-4" />
              Dashboard
            </NavLink>
          )}

          {/* 2. Wellness Coach Role */}
          {role === 'coach' && (
            <NavLink
              to="/coach"
              className={({ isActive }) =>
                `px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-150 flex items-center gap-2 ${
                  isActive
                    ? 'bg-blue-50 text-blue-600 font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`
              }
            >
              <UserCheck className="w-4 h-4" />
              Coach Dashboard
            </NavLink>
          )}

          {/* 3. Administrator Role */}
          {role === 'admin' && (
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                `px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-150 flex items-center gap-2 ${
                  isActive
                    ? 'bg-blue-50 text-blue-600 font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`
              }
            >
              <Shield className="w-4 h-4" />
              Admin Dashboard
            </NavLink>
          )}
        </nav>

        {/* Right Section: Notifications, Profile & Logout */}
        <div className="flex items-center gap-3">
          {/* Notifications Button */}
          <button 
            onClick={() => setShowNotifyDot(false)}
            className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors relative"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {showNotifyDot && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-600 rounded-full" />}
          </button>

          {/* Profile Badge */}
          <div className="flex items-center gap-2.5 pl-3 border-l border-slate-200">
            <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 font-semibold text-xs">
              <User className="w-4 h-4" />
            </div>
            <div className="hidden md:flex flex-col">
              <span className="text-xs font-semibold text-slate-800 leading-tight">{user?.name || 'Alex Rivera'}</span>
              <span className="text-[11px] text-slate-500 capitalize">{role || 'student'}</span>
            </div>
          </div>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

      </div>
    </header>
  );
};

export default Navbar;
