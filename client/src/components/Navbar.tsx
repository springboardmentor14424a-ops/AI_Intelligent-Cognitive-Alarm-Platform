import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { FiLogOut, FiActivity, FiUserCheck, FiShield, FiUser } from 'react-icons/fi';
import { UserRole } from '../types';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

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
    <header className="sticky top-0 z-40 border-b border-slate-800 glass-panel">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-500 to-violet-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <FiActivity className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              Cognitive Alarm Platform
            </h1>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">Foundation Phase</p>
          </div>
        </div>

        {user && (
          <div className="flex items-center gap-6">
            <nav className="hidden md:flex items-center gap-2">
              {user.role === 'user' && (
                <Link
                  to="/user"
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    location.pathname === '/user'
                      ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  User Dashboard
                </Link>
              )}

              {(user.role === 'coach' || user.role === 'admin') && (
                <Link
                  to="/coach"
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    location.pathname === '/coach'
                      ? 'bg-amber-600/20 text-amber-400 border border-amber-500/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  Coach Portal
                </Link>
              )}

              {user.role === 'admin' && (
                <Link
                  to="/admin"
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    location.pathname === '/admin'
                      ? 'bg-rose-600/20 text-rose-400 border border-rose-500/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  Admin Console
                </Link>
              )}
            </nav>

            <div className="flex items-center gap-3 pl-4 border-l border-slate-800">
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-xs font-semibold text-slate-200">{user.name}</span>
                <div className="mt-0.5">{getRoleBadge(user.role)}</div>
              </div>

              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 border border-slate-700 transition-all shadow-sm"
                title="Sign Out"
              >
                <FiLogOut className="w-4 h-4 text-slate-400" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
