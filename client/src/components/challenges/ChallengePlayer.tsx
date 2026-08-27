import React, { useState, useEffect } from 'react';
import { Challenge } from '../../types';
import { FiCheckCircle, FiXCircle, FiClock, FiHelpCircle, FiArrowRight, FiEye, FiEyeOff } from 'react-icons/fi';

interface ChallengePlayerProps {
  challenge: Challenge;
  onAnswerSubmit: (answer: string, timeTakenSeconds: number) => void;
  isLoading?: boolean;
  feedback?: {
    isCorrect: boolean;
    correctAnswer: string;
    explanation: string;
  } | null;
  onNextChallenge?: () => void;
}

export const ChallengePlayer: React.FC<ChallengePlayerProps> = ({
  challenge,
  onAnswerSubmit,
  isLoading = false,
  feedback = null,
  onNextChallenge,
}) => {
  const [selectedOption, setSelectedOption] = useState<string>('');
  const [textAnswer, setTextAnswer] = useState<string>('');
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [showMemory, setShowMemory] = useState<boolean>(challenge.challengeType === 'memory');

  // Reset timer on challenge change
  useEffect(() => {
    setElapsedSeconds(0);
    setSelectedOption('');
    setTextAnswer('');
    setShowMemory(challenge.challengeType === 'memory');

    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [challenge.id]);

  // Memory challenge auto-hide after 4 seconds
  useEffect(() => {
    if (challenge.challengeType === 'memory' && showMemory) {
      const memoryTimer = setTimeout(() => {
        setShowMemory(false);
      }, 4000);
      return () => clearTimeout(memoryTimer);
    }
  }, [challenge.id, showMemory]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (feedback) return; // Prevent double submit when feedback shown

    const finalAnswer = challenge.options && challenge.options.length > 0 ? selectedOption : textAnswer;
    if (!finalAnswer.trim()) return;

    onAnswerSubmit(finalAnswer.trim(), elapsedSeconds);
  };

  const getDifficultyBadge = (diff: string) => {
    switch (diff?.toLowerCase()) {
      case 'beginner':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Beginner</span>;
      case 'easy':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">Easy</span>;
      case 'medium':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20">Medium</span>;
      case 'hard':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-rose-500/10 text-rose-400 border border-rose-500/20">Hard</span>;
      case 'expert':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-purple-500/10 text-purple-400 border border-purple-500/20">Expert</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-500/10 text-slate-400 border border-slate-500/20">{diff}</span>;
    }
  };

  return (
    <div className="glass-card rounded-2xl p-6 sm:p-8 border border-slate-800 shadow-xl relative overflow-hidden">
      {/* Top Bar: Type, Difficulty, Timer */}
      <div className="flex items-center justify-between pb-6 border-b border-slate-800/80 mb-6">
        <div className="flex items-center gap-3">
          <span className="px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider bg-blue-600/20 text-blue-400 border border-blue-500/30">
            {challenge.challengeType} Challenge
          </span>
          {getDifficultyBadge(challenge.difficulty)}
        </div>

        <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-slate-900/90 border border-slate-800 text-xs font-mono text-slate-300">
          <FiClock className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
          <span>{elapsedSeconds}s</span>
        </div>
      </div>

      {/* Memory Mode Preview Banner */}
      {challenge.challengeType === 'memory' && (
        <div className="mb-6 p-4 rounded-xl bg-slate-900/80 border border-indigo-500/30 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            {showMemory ? <FiEye className="w-4 h-4 text-indigo-400" /> : <FiEyeOff className="w-4 h-4 text-amber-400" />}
            <span className="text-xs font-semibold text-slate-300">
              {showMemory ? 'Memorize sequence now! (Hiding in 4s)' : 'Sequence hidden. Select the correct order below:'}
            </span>
          </div>
          {showMemory ? (
            <p className="text-xl font-bold tracking-widest text-indigo-300 font-mono py-2 bg-indigo-950/40 rounded-lg border border-indigo-500/20">
              {challenge.question}
            </p>
          ) : (
            <button
              type="button"
              onClick={() => setShowMemory(true)}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold underline mt-1"
            >
              Peek again (temporary)
            </button>
          )}
        </div>
      )}

      {/* Question Text */}
      <div className="mb-8">
        <h3 className="text-lg sm:text-xl font-bold text-white leading-relaxed">
          {challenge.challengeType === 'memory' && !showMemory
            ? 'What was the exact sequence you memorized?'
            : challenge.question}
        </h3>
      </div>

      {/* Form Submission */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {challenge.options && challenge.options.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {challenge.options.map((opt, idx) => {
              const isSelected = selectedOption === opt;
              return (
                <button
                  key={idx}
                  type="button"
                  disabled={isLoading || !!feedback}
                  onClick={() => setSelectedOption(opt)}
                  className={`p-4 rounded-xl border text-left font-medium text-sm transition-all flex items-center justify-between ${
                    isSelected
                      ? 'bg-blue-600/20 border-blue-500 text-blue-300 shadow-md shadow-blue-500/10'
                      : 'bg-slate-900/60 border-slate-800 text-slate-200 hover:bg-slate-800/80 hover:border-slate-700'
                  } ${feedback ? 'cursor-not-allowed opacity-75' : ''}`}
                >
                  <span className="truncate">{opt}</span>
                  <div
                    className={`w-5 h-5 rounded-full border flex items-center justify-center text-xs font-bold ${
                      isSelected ? 'border-blue-500 bg-blue-500 text-white' : 'border-slate-700 text-slate-500'
                    }`}
                  >
                    {String.fromCharCode(65 + idx)}
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">
              Type Your Answer:
            </label>
            <input
              type="text"
              value={textAnswer}
              disabled={isLoading || !!feedback}
              onChange={(e) => setTextAnswer(e.target.value)}
              placeholder="Enter result..."
              className="w-full px-4 py-3 rounded-xl bg-slate-900/80 border border-slate-700 text-white text-base focus:outline-none focus:border-blue-500 font-mono"
            />
          </div>
        )}

        {/* Feedback Section */}
        {feedback && (
          <div
            className={`p-4 rounded-xl border transition-all animate-fadeIn ${
              feedback.isCorrect
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            }`}
          >
            <div className="flex items-center gap-3 mb-2">
              {feedback.isCorrect ? (
                <FiCheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
              ) : (
                <FiXCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
              )}
              <h4 className="font-bold text-sm">
                {feedback.isCorrect ? 'Correct Answer!' : 'Incorrect Answer'}
              </h4>
            </div>
            {!feedback.isCorrect && (
              <p className="text-xs text-rose-200/90 mb-1 font-semibold">
                Correct Answer was: <span className="font-bold underline">{feedback.correctAnswer}</span>
              </p>
            )}
            <p className="text-xs text-slate-300 flex items-start gap-1.5 mt-2">
              <FiHelpCircle className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
              <span>{feedback.explanation}</span>
            </p>
          </div>
        )}

        {/* Action Button */}
        <div className="pt-2 flex items-center justify-end gap-3">
          {feedback ? (
            <button
              type="button"
              onClick={onNextChallenge}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-sm shadow-lg hover:shadow-blue-500/20 transition-all flex items-center gap-2"
            >
              <span>Continue</span>
              <FiArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={isLoading || (!selectedOption && !textAnswer.trim())}
              className="w-full sm:w-auto px-8 py-3 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white font-bold text-sm shadow-lg shadow-blue-500/20 hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <span>Validating...</span>
              ) : (
                <>
                  <span>Submit Answer</span>
                  <FiCheckCircle className="w-4 h-4" />
                </>
              )}
            </button>
          )}
        </div>
      </form>
    </div>
  );
};
