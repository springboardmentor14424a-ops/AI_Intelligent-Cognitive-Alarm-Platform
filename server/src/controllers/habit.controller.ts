import { Request, Response, NextFunction } from 'express';
import { eq, and, desc } from 'drizzle-orm';
import { db } from '../db/index.js';
import { habits } from '../db/schema/habits.js';
import { habitCompletions } from '../db/schema/habitCompletions.js';
import { AppError } from '../middleware/error.middleware.js';
import { CreateHabitInput, UpdateHabitInput } from '../schemas/habit.schema.js';

export const getHabits = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) throw new AppError('Unauthorized', 401);

    const userHabits = await db
      .select()
      .from(habits)
      .where(eq(habits.userId, userId))
      .orderBy(desc(habits.createdAt));

    res.status(200).json({
      success: true,
      data: { habits: userHabits },
    });
  } catch (error) {
    next(error);
  }
};

export const getHabitById = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;
    if (!userId) throw new AppError('Unauthorized', 401);

    const [habit] = await db
      .select()
      .from(habits)
      .where(and(eq(habits.id, id), eq(habits.userId, userId)));

    if (!habit) {
      throw new AppError('Habit not found', 404);
    }

    res.status(200).json({
      success: true,
      data: { habit },
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

    const { habitName, targetDays, currentStreak, isEnabled } = req.body;

    const [newHabit] = await db
      .insert(habits)
      .values({
        userId,
        habitName,
        targetDays: targetDays ?? 7,
        currentStreak: currentStreak ?? 0,
        isEnabled: isEnabled !== undefined ? isEnabled : true,
      })
      .returning();

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

    const [existing] = await db
      .select()
      .from(habits)
      .where(and(eq(habits.id, id), eq(habits.userId, userId)));

    if (!existing) {
      throw new AppError('Habit not found', 404);
    }

    // Check if streak was updated (habit completed for today)
    if (updates.currentStreak !== undefined && updates.currentStreak > existing.currentStreak) {
      const todayStr = new Date().toISOString().split('T')[0];
      await db.insert(habitCompletions).values({
        userId,
        habitId: id,
        completionDate: todayStr,
        completionStatus: 'completed',
      });
    }

    const [updatedHabit] = await db
      .update(habits)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(habits.id, id), eq(habits.userId, userId)))
      .returning();

    res.status(200).json({
      success: true,
      message: 'Habit updated successfully',
      data: { habit: updatedHabit },
    });
  } catch (error) {
    next(error);
  }
};

export const toggleHabitStatus = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;
    if (!userId) throw new AppError('Unauthorized', 401);

    const [existing] = await db
      .select()
      .from(habits)
      .where(and(eq(habits.id, id), eq(habits.userId, userId)));

    if (!existing) {
      throw new AppError('Habit not found', 404);
    }

    const [updatedHabit] = await db
      .update(habits)
      .set({ isEnabled: !existing.isEnabled, updatedAt: new Date() })
      .where(and(eq(habits.id, id), eq(habits.userId, userId)))
      .returning();

    res.status(200).json({
      success: true,
      message: `Habit ${updatedHabit.isEnabled ? 'enabled' : 'disabled'} successfully`,
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

    const deleted = await db
      .delete(habits)
      .where(and(eq(habits.id, id), eq(habits.userId, userId)))
      .returning();

    if (deleted.length === 0) {
      throw new AppError('Habit not found', 404);
    }

    res.status(200).json({
      success: true,
      message: 'Habit deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const getHabitScore = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) throw new AppError('Unauthorized', 401);

    const { calculateHabitScore } = await import('../services/habitScore.service.js');
    const { getOverviewAnalytics } = await import('../services/behavioralAnalytics.service.js');

    const overview = await getOverviewAnalytics(userId);
    if (!overview.hasSufficientData) {
      res.status(200).json({
        success: true,
        message: 'No data yet',
        data: {
          hasSufficientData: false,
          message: 'Complete more activities to generate insights.',
        },
      });
      return;
    }

    const scoreResult = calculateHabitScore({
      wakeUpConsistency: overview.wakeUpConsistency,
      challengeCompletion: overview.challengeAccuracy,
      snoozeReduction: overview.snoozeReductionRate,
      sleepAdherence: overview.sleepAdherenceRate,
    });

    res.status(200).json({
      success: true,
      message: 'Habit Score telemetry calculated',
      data: scoreResult,
    });
  } catch (error) {
    next(error);
  }
};
