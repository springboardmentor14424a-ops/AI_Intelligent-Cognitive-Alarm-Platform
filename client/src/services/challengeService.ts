import axiosInstance from '../api/axiosInstance';
import {
  ApiResponse,
  Challenge,
  ChallengeType,
  ChallengeDifficulty,
  ChallengeAttempt,
  ChallengeAnalytics,
} from '../types';

export const challengeService = {
  getChallenges: async (params?: { challenge_type?: string; difficulty?: string }): Promise<ApiResponse<Challenge[]>> => {
    const res = await axiosInstance.get<ApiResponse<Challenge[]>>('/challenges', { params });
    return res.data;
  },

  getChallengeById: async (id: string): Promise<ApiResponse<Challenge>> => {
    const res = await axiosInstance.get<ApiResponse<Challenge>>(`/challenges/${id}`);
    return res.data;
  },

  generateChallenge: async (payload: {
    challenge_type: ChallengeType;
    difficulty: ChallengeDifficulty;
  }): Promise<ApiResponse<Challenge>> => {
    const res = await axiosInstance.post<ApiResponse<Challenge>>('/challenges/generate', payload);
    return res.data;
  },

  validateAnswer: async (payload: {
    challenge_id?: string;
    answer: string;
    time_taken: number;
    challenge_type: ChallengeType;
    difficulty: ChallengeDifficulty;
    correct_answer?: string;
    session_id?: string;
  }): Promise<
    ApiResponse<{
      is_correct: boolean;
      correct_answer: string;
      user_answer: string;
      explanation: string;
      time_taken: number;
      wake_up_session?: any;
      wake_up_verified: boolean;
    }>
  > => {
    const res = await axiosInstance.post('/challenges/validate', payload);
    return res.data;
  },

  getAttemptHistory: async (): Promise<ApiResponse<ChallengeAttempt[]>> => {
    const res = await axiosInstance.get<ApiResponse<ChallengeAttempt[]>>('/challenges/attempts');
    return res.data;
  },

  getAnalytics: async (): Promise<ApiResponse<ChallengeAnalytics>> => {
    const res = await axiosInstance.get<ApiResponse<ChallengeAnalytics>>('/challenges/analytics');
    return res.data;
  },
};
