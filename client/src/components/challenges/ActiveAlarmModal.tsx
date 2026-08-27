import React, { useState, useEffect } from 'react';
import { Alarm, Challenge, WakeUpSession, ChallengeType, ChallengeDifficulty } from '../../types';
import { wakeUpService } from '../../services/wakeUpService';
import { challengeService } from '../../services/challengeService';
import { ChallengePlayer } from './ChallengePlayer';
import { FiBell, FiAlertTriangle, FiCheckCircle, FiShield, FiVolume2, FiVolumeX, FiRefreshCw } from 'react-icons/fi';

interface ActiveAlarmModalProps {
  alarm: Alarm;
  onDismiss: () => void;
}

export const ActiveAlarmModal: React.FC<ActiveAlarmModalProps> = ({ alarm, onDismiss }) => {
  const [session, setSession] = useState<WakeUpSession | null>(null);
  const [currentChallenge, setCurrentChallenge] = useState<Challenge | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{
    isCorrect: boolean;
    correctAnswer: string;
    explanation: string;
  } | null>(null);

  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(false);
  const [verifiedCompleted, setVerifiedCompleted] = useState<boolean>(false);

  // Sound chime synthesizer simulation using Web Audio API
  useEffect(() => {
    let audioCtx: AudioContext | null = null;
    let interval: any = null;

    if (!isAudioMuted && !verifiedCompleted) {
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          audioCtx = new AudioContextClass();
          const playChime = () => {
            if (!audioCtx || audioCtx.state === 'closed') return;
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
            osc.frequency.exponentialRampToValueAtTime(659.25, audioCtx.currentTime + 0.3); // E5
            gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.5);
          };

          playChime();
          interval = setInterval(playChime, 2500);
        }
      } catch (err) {
        console.warn('Audio chime unsupported:', err);
      }
    }

    return () => {
      if (interval) clearInterval(interval);
      if (audioCtx && audioCtx.state !== 'closed') {
        audioCtx.close().catch(() => {});
      }
    };
  }, [isAudioMuted, verifiedCompleted]);

  // Start verification session on mount
  useEffect(() => {
    const initSession = async () => {
      setIsLoading(true);
      try {
        const diff = (alarm.difficultyLevel || 'medium').toLowerCase() as ChallengeDifficulty;
        const res = await wakeUpService.startVerification({
          alarm_id: alarm.id,
          verification_method: 'puzzle_completion',
          challenge_type: 'math',
          difficulty: diff,
        });

        if (res.success && res.data) {
          setSession(res.data.session);
          setCurrentChallenge(res.data.current_challenge);
        }
      } catch (err) {
        console.error('Error initiating wake up session:', err);
      } finally {
        setIsLoading(false);
      }
    };

    initSession();
  }, [alarm]);

  const handleAnswerSubmit = async (answer: string, timeTakenSeconds: number) => {
    if (!currentChallenge || !session) return;
    setIsSubmitting(true);

    try {
      // Validate challenge answer via backend API
      const valRes = await challengeService.validateAnswer({
        challenge_id: currentChallenge.id,
        answer,
        time_taken: timeTakenSeconds,
        challenge_type: currentChallenge.challengeType,
        difficulty: currentChallenge.difficulty,
        correct_answer: currentChallenge.correctAnswer,
        session_id: session.id,
      });

      if (valRes.success && valRes.data) {
        const { is_correct, correct_answer, explanation, wake_up_verified } = valRes.data;

        setFeedback({
          isCorrect: is_correct,
          correctAnswer: correct_answer,
          explanation: explanation || 'Challenge evaluation complete.',
        });

        // Submit attempt to anti-snooze workflow session
        const subRes = await wakeUpService.submitAttempt({
          session_id: session.id,
          is_correct,
          challenge_type: currentChallenge.challengeType,
          difficulty: currentChallenge.difficulty,
        });

        if (subRes.success && subRes.data) {
          setSession(subRes.data.session);
          if (subRes.data.wake_up_verified || wake_up_verified) {
            setVerifiedCompleted(true);
          }
        }
      }
    } catch (err) {
      console.error('Error submitting challenge answer:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNextChallenge = () => {
    setFeedback(null);
    if (verifiedCompleted) return;

    // Generate new challenge for retry/multi-step
    const nextType: ChallengeType[] = ['math', 'logic', 'memory', 'word', 'pattern', 'riddle', 'quiz'];
    const randomType = nextType[Math.floor(Math.random() * nextType.length)];
    const diff = (alarm.difficultyLevel || 'medium').toLowerCase() as ChallengeDifficulty;

    challengeService.generateChallenge({ challenge_type: randomType, difficulty: diff }).then((res) => {
      if (res.success && res.data) {
        setCurrentChallenge(res.data);
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md overflow-y-auto animate-fadeIn">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden relative my-8">
        {/* Ringing Banner */}
        <div className="bg-gradient-to-r from-rose-600 via-indigo-600 to-blue-600 p-6 text-white flex items-center justify-between relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />

          <div className="flex items-center gap-4 z-10">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center animate-bounce">
              <FiBell className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-[10px] font-extrabold uppercase tracking-widest text-white">
                  Active Alarm
                </span>
                <span className="text-xs font-medium text-white/80">Time: {alarm.alarmTime}</span>
              </div>
              <h2 className="text-xl font-extrabold text-white mt-0.5">{alarm.alarmTitle}</h2>
            </div>
          </div>

          <div className="flex items-center gap-2 z-10">
            <button
              onClick={() => setIsAudioMuted(!isAudioMuted)}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
              title={isAudioMuted ? 'Unmute alarm tone' : 'Mute alarm tone'}
            >
              {isAudioMuted ? <FiVolumeX className="w-5 h-5" /> : <FiVolume2 className="w-5 h-5 animate-pulse" />}
            </button>
          </div>
        </div>

        {/* Alarm Verification Body */}
        <div className="p-6 sm:p-8">
          {verifiedCompleted ? (
            /* Celebration Screen: Wake-Up Verified */
            <div className="text-center py-8 space-y-6 animate-fadeIn">
              <div className="w-20 h-20 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/10 animate-pulse">
                <FiShield className="w-10 h-10" />
              </div>

              <div>
                <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-2">
                  Anti-Snooze Satisfied
                </span>
                <h3 className="text-2xl font-extrabold text-white">Wake-Up Verified!</h3>
                <p className="text-sm text-slate-300 max-w-md mx-auto mt-2">
                  Congratulations! You have completed the mandatory cognitive challenge. Your brain is active and wide awake.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 max-w-sm mx-auto grid grid-cols-2 gap-4 text-center">
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Attempts</p>
                  <p className="text-lg font-extrabold text-slate-100">{session?.attempts || 1}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Verified Status</p>
                  <p className="text-lg font-extrabold text-emerald-400">PASSED</p>
                </div>
              </div>

              <button
                onClick={onDismiss}
                className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white font-extrabold text-base shadow-xl shadow-emerald-500/20 hover:opacity-95 transition-all"
              >
                Dismiss Alarm Now
              </button>
            </div>
          ) : (
            /* Active Challenge Player */
            <div>
              <div className="mb-6 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-3 text-amber-300 text-xs">
                <FiAlertTriangle className="w-5 h-5 flex-shrink-0 text-amber-400" />
                <span>
                  <strong>Anti-Snooze Lock Active:</strong> Alarm cannot be dismissed until you solve the required cognitive challenge correctly.
                </span>
              </div>

              {isLoading || !currentChallenge ? (
                <div className="py-12 text-center text-slate-400 space-y-3">
                  <FiRefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-400" />
                  <p className="text-sm font-semibold">Generating Cognitive Challenge...</p>
                </div>
              ) : (
                <ChallengePlayer
                  challenge={currentChallenge}
                  onAnswerSubmit={handleAnswerSubmit}
                  isLoading={isSubmitting}
                  feedback={feedback}
                  onNextChallenge={handleNextChallenge}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
