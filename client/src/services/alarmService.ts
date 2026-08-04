import axiosInstance from '../api/axiosInstance';
import { ApiResponse, Alarm, RepeatType } from '../types';

export interface CreateAlarmPayload {
  alarmTitle: string;
  alarmTime: string;
  repeatType?: RepeatType;
  sound?: string;
  vibration?: boolean;
  activeStatus?: boolean;
}

export const alarmService = {
  getAlarms: async (): Promise<ApiResponse<{ alarms: Alarm[] }>> => {
    const response = await axiosInstance.get<ApiResponse<{ alarms: Alarm[] }>>('/alarms');
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

  toggleAlarm: async (id: string): Promise<ApiResponse<{ alarm: Alarm }>> => {
    const response = await axiosInstance.patch<ApiResponse<{ alarm: Alarm }>>(`/alarms/${id}/toggle`);
    return response.data;
  },

  deleteAlarm: async (id: string): Promise<ApiResponse<void>> => {
    const response = await axiosInstance.delete<ApiResponse<void>>(`/alarms/${id}`);
    return response.data;
  },
};
