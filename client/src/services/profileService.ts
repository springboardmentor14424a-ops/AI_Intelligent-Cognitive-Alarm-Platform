import axiosInstance from '../api/axiosInstance';
import { ApiResponse, Profile } from '../types';

export const profileService = {
  getProfile: async (): Promise<ApiResponse<{ profile: Profile }>> => {
    const response = await axiosInstance.get<ApiResponse<{ profile: Profile }>>('/profile');
    return response.data;
  },

  updateProfile: async (updates: Partial<Profile>): Promise<ApiResponse<{ profile: Profile }>> => {
    const response = await axiosInstance.put<ApiResponse<{ profile: Profile }>>('/profile', updates);
    return response.data;
  },
};
