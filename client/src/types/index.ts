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
  timezone: string;
  productivityGoal: string;
  difficultyPreference: string;
  updatedAt?: string;
}

export interface Habit {
  id: string;
  userId: string;
  habitName: string;
  targetDays: number;
  currentStreak: number;
  createdAt?: string;
  updatedAt?: string;
}

export type RepeatType = 'daily' | 'weekdays' | 'weekend' | 'one_time';

export interface Alarm {
  id: string;
  userId: string;
  alarmTitle: string;
  alarmTime: string;
  repeatType: RepeatType;
  sound: string;
  vibration: boolean;
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
