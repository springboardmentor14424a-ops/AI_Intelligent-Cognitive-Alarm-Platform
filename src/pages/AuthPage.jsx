import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BellRing, Mail, Lock, ArrowRight, UserCheck, Shield, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [role, setRole] = useState('Student');
  const [email, setEmail] = useState('alex@alarm.io');
  const [password, setPassword] = useState('CogniPass#987');
  const [errors, setErrors] = useState({});
  const [resetMessage, setResetMessage] = useState(false);
  
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleRoleChange = (e) => {
    const selectedRole = e.target.value;
    setRole(selectedRole);
    setErrors({});
    setResetMessage(false);

    if (selectedRole === 'Student') {
      setEmail('alex@alarm.io');
      setPassword('CogniPass#987');
    } else if (selectedRole === 'Wellness Coach') {
      setEmail('coach@alarm.io');
      setPassword('CogniPass#987');
    } else if (selectedRole === 'Administrator') {
      setEmail('admin@alarm.io');
      setPassword('CogniPass#987');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};

    if (!role) {
      newErrors.role = 'Please select a role';
    }
    if (!email || !email.trim()) {
      newErrors.email = 'Email address is required';
    }
    if (!password || !password.trim()) {
      newErrors.password = 'Password is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Call AuthContext login
    const targetRole = login(role, email);

    // Role-based navigation
    if (targetRole === 'student') {
      navigate('/user');
    } else if (targetRole === 'coach') {
      navigate('/coach');
    } else if (targetRole === 'admin') {
      navigate('/admin');
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center items-center px-4 py-12">
      {/* Brand Header */}
      <div 
        onClick={() => navigate('/')}
        className="flex items-center gap-2.5 cursor-pointer mb-8"
      >
        <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm">
          <BellRing className="w-5 h-5" />
        </div>
        <span className="font-bold text-xl text-slate-800 tracking-tight">
          Cognitive<span className="text-blue-600">Alarm</span>
        </span>
      </div>

      {/* Auth Card */}
      <div className="w-full max-w-md bg-white rounded-xl border border-slate-200 shadow-sm p-6 sm:p-8">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            {isLogin ? 'Welcome Back' : 'Create an Account'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {isLogin ? 'Sign in to access your dashboard' : 'Start building healthy wake-up habits'}
          </p>
        </div>

        {resetMessage && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-700 font-medium text-center">
            Password reset link sent to {email}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
          {!isLogin && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  placeholder="Alex Rivera"
                  autoComplete="off"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
                />
              </div>
            </div>
          )}

          {/* Role Dropdown */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Select Role</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                {role === 'Administrator' ? (
                  <Shield className="w-4 h-4 text-emerald-600" />
                ) : role === 'Wellness Coach' ? (
                  <UserCheck className="w-4 h-4 text-purple-600" />
                ) : (
                  <User className="w-4 h-4 text-blue-600" />
                )}
              </div>
              <select
                value={role}
                onChange={handleRoleChange}
                className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors appearance-none cursor-pointer"
              >
                <option value="Student">Student</option>
                <option value="Wellness Coach">Wellness Coach</option>
                <option value="Administrator">Administrator</option>
              </select>
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400 text-xs">
                ▼
              </div>
            </div>
            {errors.role && <p className="text-xs text-rose-500 mt-1">{errors.role}</p>}
          </div>

          {/* Email Field */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                value={email}
                autoComplete="off"
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors({ ...errors, email: null });
                }}
                placeholder="name@company.com"
                className={`w-full pl-9 pr-3 py-2 bg-slate-50 border ${
                  errors.email ? 'border-rose-400 focus:border-rose-500' : 'border-slate-200 focus:border-blue-500'
                } rounded-lg text-sm text-slate-900 focus:outline-none focus:bg-white transition-colors`}
              />
            </div>
            {errors.email && <p className="text-xs text-rose-500 mt-1">{errors.email}</p>}
          </div>

          {/* Password Field */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type="password"
                value={password}
                autoComplete="new-password"
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password) setErrors({ ...errors, password: null });
                }}
                className={`w-full pl-9 pr-3 py-2 bg-slate-50 border ${
                  errors.password ? 'border-rose-400 focus:border-rose-500' : 'border-slate-200 focus:border-blue-500'
                } rounded-lg text-sm text-slate-900 focus:outline-none focus:bg-white transition-colors`}
              />
            </div>
            {errors.password && <p className="text-xs text-rose-500 mt-1">{errors.password}</p>}
          </div>

          {/* Remember Me & Forgot Password */}
          {isLogin && (
            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-slate-600">
                <input
                  type="checkbox"
                  defaultChecked
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span>Remember Me</span>
              </label>
              <a
                href="#forgot"
                onClick={(e) => {
                  e.preventDefault();
                  setResetMessage(true);
                }}
                className="text-blue-600 font-medium hover:underline"
              >
                Forgot Password?
              </a>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-lg shadow-sm transition-colors flex items-center justify-center gap-1.5 mt-2"
          >
            {isLogin ? 'Sign In' : 'Create Account'} <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-slate-100 text-center">
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setResetMessage(false);
            }}
            className="text-xs text-slate-600 hover:text-blue-600 font-medium transition-colors"
          >
            {isLogin ? "Don't have an account? Create Account" : 'Already have an account? Sign In'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
