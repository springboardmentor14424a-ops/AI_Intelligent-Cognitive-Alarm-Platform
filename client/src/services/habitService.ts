import axiosInstance from '../api/axiosInstance';
import { ApiResponse, Habit } from '../types';

export interface CreateHabitPayload {
  habitName: string;
  targetDays?: number;
  currentStreak?: number;
  isEnabled?: boolean;
}

export const habitService = {
  getHabits: async (): Promise<ApiResponse<{ habits: Habit[] }>> => {
    const response = await axiosInstance.get<ApiResponse<{ habits: Habit[] }>>('/habits');
    return response.data;
  },

  getHabitById: async (id: string): Promise<ApiResponse<{ habit: Habit }>> => {
    const response = await axiosInstance.get<ApiResponse<{ habit: Habit }>>(`/habits/${id}`);
    return response.data;
  },

  createHabit: async (payload: CreateHabitPayload): Promise<ApiResponse<{ habit: Habit }>> => {
    const response = await axiosInstance.post<ApiResponse<{ habit: Habit }>>('/habits', payload);
    return response.data;
  },

  updateHabit: async (id: string, updates: Partial<Habit>): Promise<ApiResponse<{ habit: Habit }>> => {
    const response = await axiosInstance.put<ApiResponse<{ habit: Habit }>>(`/habits/${id}`, updates);
    return response.data;
  },

  toggleHabit: async (id: string): Promise<ApiResponse<{ habit: Habit }>> => {
    const response = await axiosInstance.patch<ApiResponse<{ habit: Habit }>>(`/habits/${id}/toggle`);
    return response.data;
  },

  deleteHabit: async (id: string): Promise<ApiResponse<void>> => {
    const response = await axiosInstance.delete<ApiResponse<void>>(`/habits/${id}`);
    return response.data;
  },
};
