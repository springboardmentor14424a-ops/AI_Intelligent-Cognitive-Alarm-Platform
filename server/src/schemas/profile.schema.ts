import { z } from 'zod';

export const updateProfileSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters').optional(),
  email: z.string().email('Invalid email address').optional(),
  wakeUpTime: z.string().min(1, 'Wake up time is required').optional(),
  sleepTime: z.string().min(1, 'Sleep time is required').optional(),
  timezone: z.string().min(1, 'Timezone is required').optional(),
  productivityGoal: z.string().min(1, 'Productivity goal is required').optional(),
  difficultyPreference: z.string().min(1, 'Difficulty preference is required').optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
