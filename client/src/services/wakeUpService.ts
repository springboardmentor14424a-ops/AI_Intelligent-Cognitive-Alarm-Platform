import axiosInstance from '../api/axiosInstance';
import { ApiResponse, Challenge, WakeUpSession, ChallengeType, ChallengeDifficulty } from '../types';

export const wakeUpService = {
  startVerification: async (payload: {
    alarm_id?: string;
    verification_method?: string;
    challenge_type?: ChallengeType;
    difficulty?: ChallengeDifficulty;
  }): Promise<ApiResponse<{ session: WakeUpSession; current_challenge: Challenge }>> => {
    const res = await axiosInstance.post('/wakeup/start', payload);
    return res.data;
  },

  submitAttempt: async (payload: {
    session_id: string;
    is_correct: boolean;
    challenge_type?: ChallengeType;
    difficulty?: ChallengeDifficulty;
  }): Promise<
    ApiResponse<{
      session: WakeUpSession;
      wake_up_verified: boolean;
      next_challenge: Challenge | null;
    }>
  > => {
    const res = await axiosInstance.post('/wakeup/submit', payload);
    return res.data;
  },

  getStatus: async (sessionId: string): Promise<ApiResponse<WakeUpSession>> => {
    const res = await axiosInstance.get(`/wakeup/status/${sessionId}`);
    return res.data;
  },
};
