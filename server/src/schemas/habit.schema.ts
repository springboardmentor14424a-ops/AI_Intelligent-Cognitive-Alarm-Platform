import { z } from 'zod';

export const createHabitSchema = z.object({
  habitName: z.string().min(2, 'Habit name must be at least 2 characters'),
  targetDays: z.number().int().min(1).max(365).default(7),
  currentStreak: z.number().int().min(0).default(0),
});

export const updateHabitSchema = createHabitSchema.partial();

export type CreateHabitInput = z.infer<typeof createHabitSchema>;
export type UpdateHabitInput = z.infer<typeof updateHabitSchema>;
