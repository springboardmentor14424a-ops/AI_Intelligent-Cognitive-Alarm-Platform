export type UserRole = 'user' | 'coach' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
}

export interface Profile {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  wakeUpTime: string;
  sleepTime: string;
  sleepDuration?: string;
  timezone: string;
  productivityGoal: string;
  difficultyPreference: string;
  habitPreferences?: string;
  updatedAt?: string;
}

export interface Habit {
  id: string;
  userId: string;
  habitName: string;
  targetDays: number;
  currentStreak: number;
  isEnabled?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type RepeatType = 'daily' | 'weekdays' | 'weekend' | 'one_time' | 'smart_adaptive';

export interface Alarm {
  id: string;
  userId: string;
  alarmTitle: string;
  alarmTime: string;
  repeatType: RepeatType;
  repeatDays?: string[];
  difficultyLevel?: string;
  sound: string;
  vibration: boolean;
  snooze?: number;
  activeStatus: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  errors?: Array<{ field: string; message: string }>;
}

export type ChallengeType = 'math' | 'logic' | 'memory' | 'word' | 'pattern' | 'riddle' | 'quiz';
export type ChallengeDifficulty = 'beginner' | 'easy' | 'medium' | 'hard' | 'expert';

export interface Challenge {
  id: string;
  challengeType: ChallengeType;
  difficulty: ChallengeDifficulty;
  question: string;
  options?: string[];
  correctAnswer: string;
  explanation: string;
  createdAt?: string;
}

export interface ChallengeAttempt {
  id: string;
  userId: string;
  challengeId?: string | null;
  answer: string;
  isCorrect: boolean;
  timeTaken: number;
  difficulty: string;
  challengeType: string;
  completedAt: string;
}

export interface WakeUpSession {
  id: string;
  alarmId: string | null;
  userId: string;
  verificationStarted: string;
  verificationCompleted: string | null;
  attempts: number;
  correctAnswers: number;
  wakeUpVerified: boolean;
  verificationMethod: string;
  requiredCorrect: number;
}

export interface ChallengeAnalytics {
  total_challenges: number;
  completed_challenges: number;
  correct_answers: number;
  incorrect_answers: number;
  accuracy_percentage: number;
  average_completion_time_seconds: number;
  type_performance?: Record<string, { total: number; correct: number }>;
}

