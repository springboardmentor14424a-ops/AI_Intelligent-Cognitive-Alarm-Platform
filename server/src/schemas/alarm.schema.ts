import { z } from 'zod';

export const createAlarmSchema = z.object({
  alarmTitle: z.string().min(2, 'Alarm title must be at least 2 characters'),
  alarmTime: z.string().min(1, 'Alarm time is required'),
  repeatType: z.enum(['daily', 'weekdays', 'weekend', 'one_time', 'smart_adaptive']).default('daily'),
  repeatDays: z.array(z.string()).optional(),
  difficultyLevel: z.enum(['Easy', 'Moderate', 'High', 'Expert']).default('Moderate'),
  sound: z.string().default('Gentle Chime'),
  vibration: z.boolean().default(true),
  snooze: z.number().int().min(1).max(60).default(5),
  activeStatus: z.boolean().default(true),
});

export const updateAlarmSchema = createAlarmSchema.partial();

export type CreateAlarmInput = z.infer<typeof createAlarmSchema>;
export type UpdateAlarmInput = z.infer<typeof updateAlarmSchema>;
