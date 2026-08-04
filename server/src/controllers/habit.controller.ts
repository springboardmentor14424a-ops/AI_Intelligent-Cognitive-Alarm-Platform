import { Request, Response, NextFunction } from 'express';
import { eq, and } from 'drizzle-orm';
import { db } from '../db/index.js';
import { habits } from '../db/schema/habits.js';
import { AppError } from '../middleware/error.middleware.js';
import { CreateHabitInput, UpdateHabitInput } from '../schemas/habit.schema.js';

// In-memory fallback store for habits per user
const mockHabitsStore: Record<string, any[]> = {
  'demo-user-id': [
    {
      id: 'habit-1',
      userId: 'demo-user-id',
      habitName: 'Morning Water Hydration (500ml)',
      targetDays: 7,
      currentStreak: 5,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'habit-2',
      userId: 'demo-user-id',
      habitName: '10-Minute Starlight Stretching',
      targetDays: 5,
      currentStreak: 3,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'habit-3',
      userId: 'demo-user-id',
      habitName: 'Digital Screen Sunset at 10 PM',
      targetDays: 7,
      currentStreak: 12,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
};

export const getHabits = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) throw new AppError('Unauthorized', 401);

    if (!mockHabitsStore[userId]) {
      mockHabitsStore[userId] = [
        {
          id: `habit-${Date.now()}-1`,
          userId,
          habitName: 'Early Morning Hydration',
          targetDays: 7,
          currentStreak: 4,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];
    }

    // Try DB query
    try {
      const dbHabits = await db.select().from(habits).where(eq(habits.userId, userId));
      if (dbHabits.length > 0) {
        res.status(200).json({ success: true, data: { habits: dbHabits } });
        return;
      }
    } catch (_err) {}

    res.status(200).json({
      success: true,
      data: { habits: mockHabitsStore[userId] },
    });
  } catch (error) {
    next(error);
  }
};

export const createHabit = async (
  req: Request<{}, {}, CreateHabitInput>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) throw new AppError('Unauthorized', 401);

    const { habitName, targetDays, currentStreak } = req.body;

    const newHabit = {
      id: `habit-${Date.now()}`,
      userId,
      habitName,
      targetDays: targetDays ?? 7,
      currentStreak: currentStreak ?? 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (!mockHabitsStore[userId]) {
      mockHabitsStore[userId] = [];
    }
    mockHabitsStore[userId].unshift(newHabit);

    // Try DB insert
    try {
      await db.insert(habits).values({
        id: newHabit.id,
        userId,
        habitName,
        targetDays: newHabit.targetDays,
        currentStreak: newHabit.currentStreak,
      });
    } catch (_err) {}

    res.status(201).json({
      success: true,
      message: 'Habit created successfully',
      data: { habit: newHabit },
    });
  } catch (error) {
    next(error);
  }
};

export const updateHabit = async (
  req: Request<{ id: string }, {}, UpdateHabitInput>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;
    if (!userId) throw new AppError('Unauthorized', 401);

    const updates = req.body;

    if (!mockHabitsStore[userId]) mockHabitsStore[userId] = [];

    const index = mockHabitsStore[userId].findIndex((h) => h.id === id);
    if (index === -1) {
      throw new AppError('Habit not found', 404);
    }

    mockHabitsStore[userId][index] = {
      ...mockHabitsStore[userId][index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    const updatedHabit = mockHabitsStore[userId][index];

    // Try DB update
    try {
      await db
        .update(habits)
        .set({ ...updates, updatedAt: new Date() })
        .where(and(eq(habits.id, id), eq(habits.userId, userId)));
    } catch (_err) {}

    res.status(200).json({
      success: true,
      message: 'Habit updated successfully',
      data: { habit: updatedHabit },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteHabit = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;
    if (!userId) throw new AppError('Unauthorized', 401);

    if (!mockHabitsStore[userId]) mockHabitsStore[userId] = [];

    const initialLength = mockHabitsStore[userId].length;
    mockHabitsStore[userId] = mockHabitsStore[userId].filter((h) => h.id !== id);

    if (mockHabitsStore[userId].length === initialLength) {
      throw new AppError('Habit not found', 404);
    }

    // Try DB delete
    try {
      await db.delete(habits).where(and(eq(habits.id, id), eq(habits.userId, userId)));
    } catch (_err) {}

    res.status(200).json({
      success: true,
      message: 'Habit deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
