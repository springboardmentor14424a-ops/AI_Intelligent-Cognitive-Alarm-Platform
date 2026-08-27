import axiosInstance from '../api/axiosInstance';
import { ApiResponse, Alarm, RepeatType } from '../types';

export interface CreateAlarmPayload {
  alarmTitle: string;
  alarmTime: string;
  repeatType?: RepeatType;
  repeatDays?: string[];
  difficultyLevel?: string;
  sound?: string;
  vibration?: boolean;
  snooze?: number;
  activeStatus?: boolean;
}

export const alarmService = {
  getAlarms: async (): Promise<ApiResponse<{ alarms: Alarm[] }>> => {
    const response = await axiosInstance.get<ApiResponse<{ alarms: Alarm[] }>>('/alarms');
    return response.data;
  },

  getAlarmById: async (id: string): Promise<ApiResponse<{ alarm: Alarm }>> => {
    const response = await axiosInstance.get<ApiResponse<{ alarm: Alarm }>>(`/alarms/${id}`);
    return response.data;
  },

  getTodayAlarms: async (): Promise<ApiResponse<{ alarms: Alarm[]; totalToday: number }>> => {
    const response = await axiosInstance.get<ApiResponse<{ alarms: Alarm[]; totalToday: number }>>('/alarms/today');
    return response.data;
  },

  getUpcomingAlarms: async (): Promise<ApiResponse<{ alarms: Alarm[]; totalUpcoming: number }>> => {
    const response = await axiosInstance.get<ApiResponse<{ alarms: Alarm[]; totalUpcoming: number }>>('/alarms/upcoming');
    return response.data;
  },

  checkNextAlarm: async (): Promise<ApiResponse<{ nextAlarm: Alarm | null }>> => {
    const response = await axiosInstance.post<ApiResponse<{ nextAlarm: Alarm | null }>>('/alarms/check-next');
    return response.data;
  },

  createAlarm: async (payload: CreateAlarmPayload): Promise<ApiResponse<{ alarm: Alarm }>> => {
    const response = await axiosInstance.post<ApiResponse<{ alarm: Alarm }>>('/alarms', payload);
    return response.data;
  },

  updateAlarm: async (id: string, updates: Partial<Alarm>): Promise<ApiResponse<{ alarm: Alarm }>> => {
    const response = await axiosInstance.put<ApiResponse<{ alarm: Alarm }>>(`/alarms/${id}`, updates);
    return response.data;
  },

  enableAlarm: async (id: string): Promise<ApiResponse<{ alarm: Alarm }>> => {
    const response = await axiosInstance.patch<ApiResponse<{ alarm: Alarm }>>(`/alarms/${id}/enable`);
    return response.data;
  },

  disableAlarm: async (id: string): Promise<ApiResponse<{ alarm: Alarm }>> => {
    const response = await axiosInstance.patch<ApiResponse<{ alarm: Alarm }>>(`/alarms/${id}/disable`);
    return response.data;
  },

  toggleAlarm: async (id: string): Promise<ApiResponse<{ alarm: Alarm }>> => {
    const response = await axiosInstance.patch<ApiResponse<{ alarm: Alarm }>>(`/alarms/${id}/toggle`);
    return response.data;
  },

  deleteAlarm: async (id: string): Promise<ApiResponse<void>> => {
    const response = await axiosInstance.delete<ApiResponse<void>>(`/alarms/${id}`);
    return response.data;
  },
};
