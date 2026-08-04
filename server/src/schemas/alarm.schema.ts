import { z } from 'zod';

export const createAlarmSchema = z.object({
  alarmTitle: z.string().min(2, 'Alarm title must be at least 2 characters'),
  alarmTime: z.string().min(1, 'Alarm time is required'),
  repeatType: z.enum(['daily', 'weekdays', 'weekend', 'one_time']).default('daily'),
  sound: z.string().default('Gentle Chime'),
  vibration: z.boolean().default(true),
  activeStatus: z.boolean().default(true),
});

export const updateAlarmSchema = createAlarmSchema.partial();

export type CreateAlarmInput = z.infer<typeof createAlarmSchema>;
export type UpdateAlarmInput = z.infer<typeof updateAlarmSchema>;
