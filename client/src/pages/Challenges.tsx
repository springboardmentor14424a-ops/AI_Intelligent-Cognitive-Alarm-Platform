import React, { useState, useEffect } from 'react';
import { Sidebar } from '../components/layout/Sidebar';
import { Navbar } from '../components/layout/Navbar';
import { challengeService } from '../services/challengeService';
import { ChallengePlayer } from '../components/challenges/ChallengePlayer';
import {
  Challenge,
  ChallengeType,
  ChallengeDifficulty,
  ChallengeAttempt,
  ChallengeAnalytics,
} from '../types';
import {
  FiCpu,
  FiZap,
  FiLayers,
  FiBookOpen,
  FiGrid,
  FiHelpCircle,
  FiCheckCircle,
  FiClock,
  FiTrendingUp,
  FiBarChart2,
  FiPlay,
  FiRotateCcw,
} from 'react-icons/fi';

export const ChallengesPage: React.FC = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [selectedType, setSelectedType] = useState<ChallengeType>('math');
  const [selectedDifficulty, setSelectedDifficulty] = useState<ChallengeDifficulty>('medium');

  const [activeChallenge, setActiveChallenge] = useState<Challenge | null>(null);
  const [isLoadingChallenge, setIsLoadingChallenge] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{
    isCorrect: boolean;
    correctAnswer: string;
    explanation: string;
  } | null>(null);

  const [attemptsHistory, setAttemptsHistory] = useState<ChallengeAttempt[]>([]);
  const [analytics, setAnalytics] = useState<ChallengeAnalytics | null>(null);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(true);

  const challengeCategories: Array<{
    type: ChallengeType;
    label: string;
    desc: string;
    icon: any;
    color: string;
  }> = [
    { type: 'math', label: 'Math Problems', desc: 'Arithmetic, equations & numerical speed', icon: FiZap, color: 'from-blue-500 to-indigo-600' },
    { type: 'logic', label: 'Logic Puzzles', desc: 'Sequences, deductions & reasoning', icon: FiCpu, color: 'from-purple-500 to-pink-600' },
    { type: 'memory', label: 'Memory Challenges', desc: 'Digit sequence & item recollection', icon: FiLayers, color: 'from-emerald-500 to-teal-600' },
    { type: 'word', label: 'Word Games', desc: 'Anagrams, vocabulary & unscrambling', icon: FiBookOpen, color: 'from-amber-500 to-orange-600' },
    { type: 'pattern', label: 'Pattern Recognition', desc: 'Symbol matrices & number series', icon: FiGrid, color: 'from-cyan-500 to-blue-600' },
    { type: 'riddle', label: 'Riddles', desc: 'Lateral thinking & brain teasers', icon: FiHelpCircle, color: 'from-rose-500 to-red-600' },
    { type: 'quiz', label: 'Quick Quiz', desc: 'Cognitive science & alertness trivia', icon: FiCheckCircle, color: 'from-violet-500 to-purple-600' },
  ];

  const difficulties: ChallengeDifficulty[] = ['beginner', 'easy', 'medium', 'hard', 'expert'];

  // Load telemetry data on mount
  useEffect(() => {
    fetchTelemetry();
    handleGenerateChallenge('math', 'medium');
  }, []);

  const fetchTelemetry = async () => {
    setIsLoadingData(true);
    try {
      const [attRes, anaRes] = await Promise.all([
        challengeService.getAttemptHistory(),
        challengeService.getAnalytics(),
      ]);

      if (attRes.success && attRes.data) setAttemptsHistory(attRes.data);
      if (anaRes.success && anaRes.data) setAnalytics(anaRes.data);
    } catch (err) {
      console.error('Error fetching challenge telemetry:', err);
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleGenerateChallenge = async (type: ChallengeType, diff: ChallengeDifficulty) => {
    setIsLoadingChallenge(true);
    setFeedback(null);
    try {
      const res = await challengeService.generateChallenge({
        challenge_type: type,
        difficulty: diff,
      });
      if (res.success && res.data) {
        setActiveChallenge(res.data);
      }
    } catch (err) {
      console.error('Error generating challenge:', err);
    } finally {
      setIsLoadingChallenge(false);
    }
  };

  const handleAnswerSubmit = async (answer: string, timeTakenSeconds: number) => {
    if (!activeChallenge) return;
    setIsSubmitting(true);

    try {
      const res = await challengeService.validateAnswer({
        challenge_id: activeChallenge.id,
        answer,
        time_taken: timeTakenSeconds,
        challenge_type: activeChallenge.challengeType,
        difficulty: activeChallenge.difficulty,
        correct_answer: activeChallenge.correctAnswer,
      });

      if (res.success && res.data) {
        setFeedback({
          isCorrect: res.data.is_correct,
          correctAnswer: res.data.correct_answer,
          explanation: res.data.explanation || 'Evaluation complete.',
        });
        // Refresh telemetry stats after attempt
        fetchTelemetry();
      }
    } catch (err) {
      console.error('Error submitting answer:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCategorySelect = (type: ChallengeType) => {
    setSelectedType(type);
    handleGenerateChallenge(type, selectedDifficulty);
  };

  const handleDifficultySelect = (diff: ChallengeDifficulty) => {
    setSelectedDifficulty(diff);
    handleGenerateChallenge(selectedType, diff);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      <Sidebar isCollapsed={isCollapsed} onToggleCollapse={() => setIsCollapsed(!isCollapsed)} />

      <div className={`flex-1 flex flex-col transition-all duration-300 ${isCollapsed ? 'pl-20' : 'pl-64'}`}>
        <Navbar />

        <main className="flex-1 p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-8">
          {/* Header Banner */}
          <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-slate-800 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 relative overflow-hidden">
            <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
              <div>
                <span className="px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest bg-blue-500/10 text-blue-400 border border-blue-500/20 mb-3 inline-block">
                  Cognitive Challenge Engine
                </span>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  Cognitive Challenges & Wake-Up Puzzles
                </h1>
                <p className="text-slate-400 text-sm mt-1 max-w-2xl">
                  Test and refine your cognitive sharpness across 7 rule-based challenge types. Practice morning alertness or prepare for your active anti-snooze wake-up alarm verification.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleGenerateChallenge(selectedType, selectedDifficulty)}
                  className="px-5 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-sm shadow-lg shadow-blue-500/20 hover:opacity-95 transition-all flex items-center gap-2"
                >
                  <FiRotateCcw className="w-4 h-4" />
                  <span>Generate New Challenge</span>
                </button>
              </div>
            </div>
          </div>

          {/* Performance Analytics Bar */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="glass-card p-5 rounded-2xl border border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Attempted</span>
                <FiBarChart2 className="w-5 h-5 text-blue-400" />
              </div>
              <p className="text-2xl font-extrabold text-white mt-2">
                {analytics?.total_challenges || attemptsHistory.length || 0}
              </p>
              <span className="text-[10px] text-slate-500 font-semibold">Completed sessions</span>
            </div>

            <div className="glass-card p-5 rounded-2xl border border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cognitive Accuracy</span>
                <FiTrendingUp className="w-5 h-5 text-emerald-400" />
              </div>
              <p className="text-2xl font-extrabold text-emerald-400 mt-2">
                {analytics?.accuracy_percentage || 85}%
              </p>
              <span className="text-[10px] text-emerald-500/80 font-semibold">Target &gt; 80%</span>
            </div>

            <div className="glass-card p-5 rounded-2xl border border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Avg Speed</span>
                <FiClock className="w-5 h-5 text-amber-400" />
              </div>
              <p className="text-2xl font-extrabold text-white mt-2">
                {analytics?.average_completion_time_seconds || 7}s
              </p>
              <span className="text-[10px] text-slate-500 font-semibold">Per challenge</span>
            </div>

            <div className="glass-card p-5 rounded-2xl border border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Correct Solved</span>
                <FiCheckCircle className="w-5 h-5 text-indigo-400" />
              </div>
              <p className="text-2xl font-extrabold text-indigo-300 mt-2">
                {analytics?.correct_answers || attemptsHistory.filter((a) => a.isCorrect).length || 0}
              </p>
              <span className="text-[10px] text-slate-500 font-semibold">Passed puzzles</span>
            </div>
          </div>

          {/* Main Interactive Grid: Categories & Difficulty Selector */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column: Challenge Categories & Difficulty Selector (5 Cols) */}
            <div className="lg:col-span-5 space-y-6">
              {/* Difficulty Level Picker */}
              <div className="glass-card p-6 rounded-2xl border border-slate-800 space-y-3">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                  Select Difficulty Tier
                </h3>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {difficulties.map((diff) => {
                    const isSel = selectedDifficulty === diff;
                    return (
                      <button
                        key={diff}
                        onClick={() => handleDifficultySelect(diff)}
                        className={`py-2 px-1 rounded-xl text-xs font-bold capitalize transition-all border ${
                          isSel
                            ? 'bg-blue-600/20 text-blue-400 border-blue-500/40 shadow-sm'
                            : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-slate-200 hover:bg-slate-800/80'
                        }`}
                      >
                        {diff}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Category Grid */}
              <div className="glass-card p-6 rounded-2xl border border-slate-800 space-y-4">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                  Challenge Types (7 Modules)
                </h3>

                <div className="space-y-2.5">
                  {challengeCategories.map((cat) => {
                    const Icon = cat.icon;
                    const isSel = selectedType === cat.type;
                    return (
                      <button
                        key={cat.type}
                        onClick={() => handleCategorySelect(cat.type)}
                        className={`w-full p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between ${
                          isSel
                            ? 'bg-gradient-to-r from-blue-900/40 via-indigo-900/30 to-slate-900 border-blue-500/50 shadow-md'
                            : 'bg-slate-900/50 border-slate-800 hover:bg-slate-800/60 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-3.5">
                          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${cat.color} flex items-center justify-center shadow-md text-white`}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-white">{cat.label}</h4>
                            <p className="text-[11px] text-slate-400">{cat.desc}</p>
                          </div>
                        </div>

                        <div className={`w-6 h-6 rounded-full flex items-center justify-center ${isSel ? 'text-blue-400' : 'text-slate-600'}`}>
                          <FiPlay className="w-3.5 h-3.5" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right Column: Challenge Player Sandbox (7 Cols) */}
            <div className="lg:col-span-7">
              {isLoadingChallenge || !activeChallenge ? (
                <div className="glass-card rounded-2xl p-12 text-center text-slate-400 space-y-4 border border-slate-800">
                  <FiCpu className="w-10 h-10 animate-spin mx-auto text-blue-400" />
                  <p className="text-sm font-semibold">Generating Dynamic Challenge...</p>
                </div>
              ) : (
                <ChallengePlayer
                  challenge={activeChallenge}
                  onAnswerSubmit={handleAnswerSubmit}
                  isLoading={isSubmitting}
                  feedback={feedback}
                  onNextChallenge={() => handleGenerateChallenge(selectedType, selectedDifficulty)}
                />
              )}
            </div>
          </div>

          {/* Attempt History Table */}
          <div className="glass-card rounded-2xl p-6 sm:p-8 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-white">Challenge Attempt History</h3>
                <p className="text-xs text-slate-400">Log of recent cognitive puzzle completions & results</p>
              </div>
              <span className="text-xs font-semibold text-slate-400">{attemptsHistory.length} total entries</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Difficulty</th>
                    <th className="py-3 px-4">Answer</th>
                    <th className="py-3 px-4">Result</th>
                    <th className="py-3 px-4">Time Taken</th>
                    <th className="py-3 px-4">Completed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {attemptsHistory.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-slate-500">
                        No challenge attempts recorded yet. Solve your first puzzle above!
                      </td>
                    </tr>
                  ) : (
                    attemptsHistory.map((att) => (
                      <tr key={att.id} className="hover:bg-slate-900/40">
                        <td className="py-3 px-4 font-bold text-white capitalize">{att.challengeType}</td>
                        <td className="py-3 px-4 capitalize">{att.difficulty}</td>
                        <td className="py-3 px-4 font-mono text-slate-300">{att.answer}</td>
                        <td className="py-3 px-4">
                          {att.isCorrect ? (
                            <span className="inline-flex items-center gap-1 text-emerald-400 font-bold">
                              <FiCheckCircle className="w-3.5 h-3.5" /> Correct
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-rose-400 font-bold">
                              <FiHelpCircle className="w-3.5 h-3.5" /> Incorrect
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono">{att.timeTaken}s</td>
                        <td className="py-3 px-4 text-slate-400">
                          {new Date(att.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};
