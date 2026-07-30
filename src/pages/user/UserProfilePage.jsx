import React, { useState } from 'react';
import { User, Mail, Shield, Clock, Brain, Globe, Edit3, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const UserProfilePage = () => {
  const { user } = useAuth();
  const [notice, setNotice] = useState(null);

  const showNotice = (msg) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 3000);
  };

  return (
    <div className="space-y-6">
      {notice && (
        <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-700 font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-blue-600" />
          <span>{notice}</span>
        </div>
      )}

      {/* Header & Edit Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">User Profile</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Manage your personal wake-up preferences and cognitive settings.
          </p>
        </div>

        <button 
          onClick={() => showNotice('Edit profile mode opened')}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-lg shadow-sm transition-colors flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Edit3 className="w-4 h-4" /> Edit Profile
        </button>
      </div>

      {/* Main Profile Info Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-6">
        <div className="flex items-center gap-4 pb-6 border-b border-slate-100">
          <div className="w-16 h-16 rounded-full bg-blue-100 border-2 border-blue-200 flex items-center justify-center text-blue-600 font-bold text-xl">
            <User className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">{user?.name || 'Alex Rivera'}</h2>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100 mt-1">
              Student Role
            </span>
          </div>
        </div>

        {/* User Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 text-xs sm:text-sm">
          <div>
            <span className="text-slate-400 font-medium flex items-center gap-1.5 mb-1">
              <Mail className="w-4 h-4 text-slate-400" /> Email Address
            </span>
            <span className="font-semibold text-slate-800">{user?.email || 'alex@alarm.io'}</span>
          </div>

          <div>
            <span className="text-slate-400 font-medium flex items-center gap-1.5 mb-1">
              <Shield className="w-4 h-4 text-slate-400" /> Account Role
            </span>
            <span className="font-semibold text-slate-800">Student</span>
          </div>

          <div>
            <span className="text-slate-400 font-medium flex items-center gap-1.5 mb-1">
              <Clock className="w-4 h-4 text-slate-400" /> Preferred Wake-up Time
            </span>
            <span className="font-semibold text-slate-800">06:30 AM</span>
          </div>

          <div>
            <span className="text-slate-400 font-medium flex items-center gap-1.5 mb-1">
              <Clock className="w-4 h-4 text-slate-400" /> Sleep Goal
            </span>
            <span className="font-semibold text-slate-800">8 Hours</span>
          </div>

          <div>
            <span className="text-slate-400 font-medium flex items-center gap-1.5 mb-1">
              <Brain className="w-4 h-4 text-slate-400" /> Challenge Preference
            </span>
            <span className="font-semibold text-slate-800">Math Exercises</span>
          </div>

          <div>
            <span className="text-slate-400 font-medium flex items-center gap-1.5 mb-1">
              <Brain className="w-4 h-4 text-slate-400" /> Difficulty Level
            </span>
            <span className="font-semibold text-slate-800">Easy</span>
          </div>

          <div>
            <span className="text-slate-400 font-medium flex items-center gap-1.5 mb-1">
              <Globe className="w-4 h-4 text-slate-400" /> Timezone
            </span>
            <span className="font-semibold text-slate-800">GMT -5 (Eastern Time)</span>
          </div>
        </div>
      </div>

      {/* Profile Completion Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-3">
        <div className="flex items-center justify-between text-xs font-semibold">
          <span className="text-slate-800">Profile Completion</span>
          <span className="text-blue-600 font-bold">85% Completed</span>
        </div>
        <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-blue-600 rounded-full" style={{ width: '85%' }} />
        </div>
        <p className="text-xs text-slate-500">
          Complete sleep hygiene goals to reach 100% profile optimization.
        </p>
      </div>
    </div>
  );
};

export default UserProfilePage;
