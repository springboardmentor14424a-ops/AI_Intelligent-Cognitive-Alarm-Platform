import { Request, Response, NextFunction } from 'express';
import { eq, and, desc } from 'drizzle-orm';
import { db } from '../db/index.js';
import { alarms } from '../db/schema/alarms.js';
import { alarmEvents } from '../db/schema/alarmEvents.js';
import { AppError } from '../middleware/error.middleware.js';
import { CreateAlarmInput, UpdateAlarmInput } from '../schemas/alarm.schema.js';
import { calculateSmartAdaptiveDifficulty } from '../services/adaptiveAlarm.service.js';

export const getAlarms = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) throw new AppError('Unauthorized', 401);

    const userAlarms = await db
      .select()
      .from(alarms)
      .where(eq(alarms.userId, userId))
      .orderBy(desc(alarms.createdAt));

    res.status(200).json({
      success: true,
      data: { alarms: userAlarms },
    });
  } catch (error) {
    next(error);
  }
};

export const getAlarmById = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;
    if (!userId) throw new AppError('Unauthorized', 401);

    const [alarm] = await db
      .select()
      .from(alarms)
      .where(and(eq(alarms.id, id), eq(alarms.userId, userId)));

    if (!alarm) {
      throw new AppError('Alarm not found', 404);
    }

    res.status(200).json({
      success: true,
      data: { alarm },
    });
  } catch (error) {
    next(error);
  }
};

export const getTodayAlarms = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) throw new AppError('Unauthorized', 401);

    const userAlarms = await db
      .select()
      .from(alarms)
      .where(and(eq(alarms.userId, userId), eq(alarms.activeStatus, true)));

    res.status(200).json({
      success: true,
      data: { alarms: userAlarms, totalToday: userAlarms.length },
    });
  } catch (error) {
    next(error);
  }
};

export const getUpcomingAlarms = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) throw new AppError('Unauthorized', 401);

    const userAlarms = await db
      .select()
      .from(alarms)
      .where(and(eq(alarms.userId, userId), eq(alarms.activeStatus, true)));

    res.status(200).json({
      success: true,
      data: { alarms: userAlarms, totalUpcoming: userAlarms.length },
    });
  } catch (error) {
    next(error);
  }
};

export const checkNextAlarm = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) throw new AppError('Unauthorized', 401);

    const [nextAlarm] = await db
      .select()
      .from(alarms)
      .where(and(eq(alarms.userId, userId), eq(alarms.activeStatus, true)))
      .limit(1);

    res.status(200).json({
      success: true,
      data: { nextAlarm: nextAlarm || null },
    });
  } catch (error) {
    next(error);
  }
};

export const createAlarm = async (
  req: Request<{}, {}, CreateAlarmInput>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) throw new AppError('Unauthorized', 401);

    const { alarmTitle, alarmTime, repeatType, repeatDays, difficultyLevel, sound, vibration, snooze, activeStatus } = req.body;

    const calculatedDifficulty = repeatType === 'smart_adaptive'
      ? calculateSmartAdaptiveDifficulty({ difficultyPreference: difficultyLevel || 'Moderate', snoozeCountLast7Days: 1 })
      : (difficultyLevel || 'Moderate');

    const [newAlarm] = await db
      .insert(alarms)
      .values({
        userId,
        alarmTitle,
        alarmTime,
        repeatType: repeatType || 'daily',
        repeatDays: JSON.stringify(repeatDays || []),
        difficultyLevel: calculatedDifficulty,
        sound: sound || 'Gentle Chime',
        vibration: vibration !== undefined ? vibration : true,
        snooze: snooze !== undefined ? snooze : 5,
        activeStatus: activeStatus !== undefined ? activeStatus : true,
      })
      .returning();

    // Log creation event in PostgreSQL
    await db.insert(alarmEvents).values({
      userId,
      alarmId: newAlarm.id,
      eventType: 'created',
    });

    res.status(201).json({
      success: true,
      message: 'Alarm created successfully',
      data: { alarm: newAlarm },
    });
  } catch (error) {
    next(error);
  }
};

export const updateAlarm = async (
  req: Request<{ id: string }, {}, UpdateAlarmInput>,
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
      .from(alarms)
      .where(and(eq(alarms.id, id), eq(alarms.userId, userId)));

    if (!existing) {
      throw new AppError('Alarm not found', 404);
    }

    const [updatedAlarm] = await db
      .update(alarms)
      .set({
        ...updates,
        repeatDays: updates.repeatDays ? JSON.stringify(updates.repeatDays) : undefined,
        updatedAt: new Date(),
      })
      .where(and(eq(alarms.id, id), eq(alarms.userId, userId)))
      .returning();

    res.status(200).json({
      success: true,
      message: 'Alarm updated successfully',
      data: { alarm: updatedAlarm },
    });
  } catch (error) {
    next(error);
  }
};

export const enableAlarm = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;
    if (!userId) throw new AppError('Unauthorized', 401);

    const [updatedAlarm] = await db
      .update(alarms)
      .set({ activeStatus: true, updatedAt: new Date() })
      .where(and(eq(alarms.id, id), eq(alarms.userId, userId)))
      .returning();

    if (!updatedAlarm) throw new AppError('Alarm not found', 404);

    await db.insert(alarmEvents).values({
      userId,
      alarmId: id,
      eventType: 'activated',
    });

    res.status(200).json({
      success: true,
      message: 'Alarm enabled successfully',
      data: { alarm: updatedAlarm },
    });
  } catch (error) {
    next(error);
  }
};

export const disableAlarm = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;
    if (!userId) throw new AppError('Unauthorized', 401);

    const [updatedAlarm] = await db
      .update(alarms)
      .set({ activeStatus: false, updatedAt: new Date() })
      .where(and(eq(alarms.id, id), eq(alarms.userId, userId)))
      .returning();

    if (!updatedAlarm) throw new AppError('Alarm not found', 404);

    await db.insert(alarmEvents).values({
      userId,
      alarmId: id,
      eventType: 'deactivated',
    });

    res.status(200).json({
      success: true,
      message: 'Alarm disabled successfully',
      data: { alarm: updatedAlarm },
    });
  } catch (error) {
    next(error);
  }
};

export const toggleAlarmStatus = async (
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
      .from(alarms)
      .where(and(eq(alarms.id, id), eq(alarms.userId, userId)));

    if (!existing) {
      throw new AppError('Alarm not found', 404);
    }

    const newStatus = !existing.activeStatus;
    const [updatedAlarm] = await db
      .update(alarms)
      .set({ activeStatus: newStatus, updatedAt: new Date() })
      .where(and(eq(alarms.id, id), eq(alarms.userId, userId)))
      .returning();

    await db.insert(alarmEvents).values({
      userId,
      alarmId: id,
      eventType: newStatus ? 'activated' : 'deactivated',
    });

    res.status(200).json({
      success: true,
      message: `Alarm ${newStatus ? 'enabled' : 'disabled'} successfully`,
      data: { alarm: updatedAlarm },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteAlarm = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;
    if (!userId) throw new AppError('Unauthorized', 401);

    const deleted = await db
      .delete(alarms)
      .where(and(eq(alarms.id, id), eq(alarms.userId, userId)))
      .returning();

    if (deleted.length === 0) {
      throw new AppError('Alarm not found', 404);
    }

    res.status(200).json({
      success: true,
      message: 'Alarm deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
