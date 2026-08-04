import React from 'react';
import { Link } from 'react-router-dom';
import {
  FiActivity,
  FiClock,
  FiCheckSquare,
  FiShield,
  FiZap,
  FiArrowRight,
} from 'react-icons/fi';

export const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans overflow-hidden relative">
      {/* Background Ambient Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-gradient-to-b from-blue-600/20 via-indigo-600/10 to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* Landing Navigation Header */}
      <header className="relative z-20 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 flex items-center justify-center shadow-lg shadow-blue-500/30 border border-blue-400/20">
            <FiActivity className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-extrabold text-base text-white tracking-tight block">
              Cognitive Alarm
            </span>
            <span className="text-[10px] text-blue-400 font-semibold uppercase tracking-wider block">
              Platform Core
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Link
            to="/login"
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-900 border border-slate-800 transition-colors"
          >
            Sign In
          </Link>
          <Link
            to="/register"
            className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 transition-all shadow-lg shadow-blue-500/20"
          >
            Get Started
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 text-center space-y-8">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 shadow-inner">
          <FiZap className="w-4 h-4 text-amber-400" /> PostgreSQL & Drizzle ORM Architecture Active
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold text-white tracking-tight max-w-4xl mx-auto leading-tight">
          Intelligent Cognitive Alarm &{' '}
          <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-violet-400 bg-clip-text text-transparent">
            Behavioral Habit Platform
          </span>
        </h1>

        <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Master your morning routines, track cognitive habits, and access tailored coaching workflows with multi-role RBAC access for Users, Coaches, and Administrators.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Link
            to="/register"
            className="w-full sm:w-auto px-8 py-4 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 transition-all shadow-xl shadow-blue-500/25 flex items-center justify-center gap-2 group"
          >
            <span>Create Account</span>
            <FiArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link
            to="/login"
            className="w-full sm:w-auto px-8 py-4 rounded-xl text-sm font-bold text-slate-300 hover:text-white bg-slate-900 border border-slate-800 transition-all"
          >
            Sign In to Dashboard
          </Link>
        </div>
      </section>

      {/* Features Grid */}
      <section className="relative z-10 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-slate-800/80">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-3">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <FiClock className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">Smart Alarm Management</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Create and toggle custom alarm schedules (Daily, Weekdays, Weekend, One-Time) with customizable sounds and vibration triggers.
            </p>
          </div>

          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <FiCheckSquare className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">Habit & Streak Tracking</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Maintain daily routines with target day goals and real-time streak counting to build long-term cognitive discipline.
            </p>
          </div>

          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-3">
            <div className="w-12 h-12 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center">
              <FiShield className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">Multi-Role Access Control</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Tailored dashboards for User self-management, Coach trainee supervision, and Admin system telemetry.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-800 py-8 text-center text-xs text-slate-500">
        <p>© 2026 Intelligent Cognitive Alarm Platform. All rights reserved.</p>
      </footer>
    </div>
  );
};
