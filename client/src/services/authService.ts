import axiosInstance from '../api/axiosInstance';
import { ApiResponse, User, UserRole } from '../types';

export interface LoginPayload {
  email: string;
  password: string;
  role?: UserRole;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  role?: UserRole;
}

export interface AuthResponseData {
  user: User;
  token: string;
}

export const authService = {
  login: async (payload: LoginPayload): Promise<ApiResponse<AuthResponseData>> => {
    const response = await axiosInstance.post<ApiResponse<AuthResponseData>>('/auth/login', payload);
    return response.data;
  },

  register: async (payload: RegisterPayload): Promise<ApiResponse<AuthResponseData>> => {
    const response = await axiosInstance.post<ApiResponse<AuthResponseData>>('/auth/register', payload);
    return response.data;
  },

  getMe: async (): Promise<ApiResponse<{ user: User }>> => {
    const response = await axiosInstance.get<ApiResponse<{ user: User }>>('/auth/me');
    return response.data;
  },

  logout: async (): Promise<ApiResponse<void>> => {
    const response = await axiosInstance.post<ApiResponse<void>>('/auth/logout');
    return response.data;
  },

  getDashboardData: async (role: UserRole): Promise<ApiResponse<any>> => {
    const response = await axiosInstance.get<ApiResponse<any>>(`/dashboard/${role}`);
    return response.data;
  },
};
