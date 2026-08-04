import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FiShieldOff, FiArrowLeft } from 'react-icons/fi';

export const AccessDenied: React.FC = () => {
  const { user, getRoleRedirectPath } = useAuth();

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-center text-slate-100">
      <div className="w-16 h-16 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center mb-4 border border-rose-500/20 shadow-xl shadow-rose-500/10">
        <FiShieldOff className="w-8 h-8" />
      </div>
      <h1 className="text-3xl font-extrabold tracking-tight">403 - Access Denied</h1>
      <p className="text-slate-400 mt-2 max-w-md text-sm leading-relaxed">
        Your account role (<span className="font-semibold text-rose-400 capitalize">{user?.role || 'Guest'}</span>) does not have authorization to view this protected console.
      </p>
      <Link
        to={user ? getRoleRedirectPath(user.role) : '/login'}
        className="mt-6 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-all shadow-lg shadow-blue-500/20 flex items-center gap-2"
      >
        <FiArrowLeft className="w-4 h-4" /> Return to My Dashboard
      </Link>
    </div>
  );
};
