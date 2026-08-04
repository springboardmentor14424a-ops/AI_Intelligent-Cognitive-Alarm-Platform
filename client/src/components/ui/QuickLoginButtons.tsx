import React from 'react';
import { FiShield, FiUserCheck, FiUser, FiZap } from 'react-icons/fi';

interface QuickLoginButtonsProps {
  onSelectCredentials: (email: string, password: string) => void;
}

export const QuickLoginButtons: React.FC<QuickLoginButtonsProps> = ({ onSelectCredentials }) => {
  return (
    <div className="space-y-3 p-4 rounded-2xl bg-slate-900/90 border border-indigo-500/20 glass-panel">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
          <FiZap className="w-4 h-4 text-amber-400 animate-pulse" />
          Demo Accounts (1-Click Login)
        </span>
        <span className="text-[10px] text-slate-400 font-mono">Phase 1 Demo</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => onSelectCredentials('user@cognitivealarm.com', 'User@123')}
          className="flex items-center gap-2 p-2.5 rounded-xl bg-blue-950/50 hover:bg-blue-900/60 border border-blue-500/30 text-left transition-all group"
        >
          <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center group-hover:scale-105 transition-transform">
            <FiUser className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-blue-200">Login User</div>
            <div className="text-[10px] text-slate-400 font-mono">user@...</div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onSelectCredentials('coach@cognitivealarm.com', 'Coach@123')}
          className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-950/50 hover:bg-amber-900/60 border border-amber-500/30 text-left transition-all group"
        >
          <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center group-hover:scale-105 transition-transform">
            <FiUserCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-amber-200">Login Coach</div>
            <div className="text-[10px] text-slate-400 font-mono">coach@...</div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onSelectCredentials('admin@cognitivealarm.com', 'Admin@123')}
          className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-950/50 hover:bg-rose-900/60 border border-rose-500/30 text-left transition-all group"
        >
          <div className="w-7 h-7 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center group-hover:scale-105 transition-transform">
            <FiShield className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-rose-200">Login Admin</div>
            <div className="text-[10px] text-slate-400 font-mono">admin@...</div>
          </div>
        </button>
      </div>

      <div className="text-[11px] text-slate-400 bg-slate-950/50 p-2 rounded-lg border border-slate-800 space-y-0.5">
        <div>🔑 <strong>User:</strong> user@cognitivealarm.com / User@123</div>
        <div>🔑 <strong>Coach:</strong> coach@cognitivealarm.com / Coach@123</div>
        <div>🔑 <strong>Admin:</strong> admin@cognitivealarm.com / Admin@123</div>
      </div>
    </div>
  );
};
