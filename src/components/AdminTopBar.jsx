import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BellRing, Search, Bell, User, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const AdminTopBar = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [showNotifyDot, setShowNotifyDot] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
      {/* Brand Logo */}
      <div 
        onClick={() => navigate('/admin')}
        className="flex items-center gap-2.5 cursor-pointer group"
      >
        <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm transition-transform group-hover:scale-105">
          <BellRing className="w-5 h-5" />
        </div>
        <span className="font-bold text-lg text-slate-800 tracking-tight hidden sm:inline">
          Cognitive<span className="text-blue-600">Alarm</span>
        </span>
      </div>

      {/* Center Global Search Input */}
      <div className="flex-1 max-w-md mx-4">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Global search users, alarms, challenges, or audit logs..."
            className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
          />
        </div>
      </div>

      {/* Right Controls: Notifications, Admin Profile, Logout */}
      <div className="flex items-center gap-3">
        {/* Notification Icon */}
        <button 
          onClick={() => setShowNotifyDot(false)}
          className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors relative"
          title="Notifications"
        >
          <Bell className="w-4.5 h-4.5" />
          {showNotifyDot && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-600 rounded-full" />}
        </button>

        {/* Admin Profile Avatar */}
        <div 
          onClick={() => navigate('/admin/settings')}
          className="flex items-center gap-2.5 pl-2 cursor-pointer border-l border-slate-200"
        >
          <div className="w-8 h-8 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-700 font-semibold text-xs">
            <User className="w-4 h-4" />
          </div>
          <div className="hidden lg:flex flex-col text-left">
            <span className="text-xs font-semibold text-slate-800 leading-tight">{user?.name || 'System Ops Lead'}</span>
            <span className="text-[11px] text-slate-500">Administrator</span>
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
          title="Logout"
        >
          <LogOut className="w-4.5 h-4.5" />
        </button>
      </div>
    </header>
  );
};

export default AdminTopBar;
