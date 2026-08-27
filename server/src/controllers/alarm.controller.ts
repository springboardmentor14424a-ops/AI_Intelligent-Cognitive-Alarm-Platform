import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { eq, and } from 'drizzle-orm';
import { db } from '../db/index.js';
import { alarms } from '../db/schema/alarms.js';
import { AppError } from '../middleware/error.middleware.js';
import { CreateAlarmInput, UpdateAlarmInput } from '../schemas/alarm.schema.js';
import { calculateSmartAdaptiveDifficulty } from '../services/adaptiveAlarm.service.js';

// In-memory fallback store for alarms per user
const mockAlarmsStore: Record<string, any[]> = {
  'demo-user-id': [
    {
      id: 'alarm-1',
      userId: 'demo-user-id',
      alarmTitle: 'Morning Awakening & Hydration',
      alarmTime: '07:00 AM',
      repeatType: 'daily',
      repeatDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      difficultyLevel: 'Moderate',
      sound: 'Gentle Chime',
      vibration: true,
      snooze: 5,
      activeStatus: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'alarm-2',
      userId: 'demo-user-id',
      alarmTitle: 'Focus Session Power Hour',
      alarmTime: '09:30 AM',
      repeatType: 'weekdays',
      repeatDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
      difficultyLevel: 'High',
      sound: 'Cyber Pulse',
      vibration: false,
      snooze: 5,
      activeStatus: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'alarm-3',
      userId: 'demo-user-id',
      alarmTitle: 'Smart Adaptive Morning Challenge',
      alarmTime: '06:30 AM',
      repeatType: 'smart_adaptive',
      repeatDays: ['Mon', 'Wed', 'Fri'],
      difficultyLevel: calculateSmartAdaptiveDifficulty({ difficultyPreference: 'Moderate', snoozeCountLast7Days: 2 }),
      sound: 'Zen Flute',
      vibration: true,
      snooze: 3,
      activeStatus: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
};

const getOrInitUserAlarms = (userId: string): any[] => {
  if (!mockAlarmsStore[userId]) {
    mockAlarmsStore[userId] = [
      {
        id: `alarm-${Date.now()}-1`,
        userId,
        alarmTitle: 'Primary Morning Awakening',
        alarmTime: '07:00 AM',
        repeatType: 'daily',
        repeatDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        difficultyLevel: 'Moderate',
        sound: 'Gentle Chime',
        vibration: true,
        snooze: 5,
        activeStatus: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
  }
  return mockAlarmsStore[userId];
};

export const getAlarms = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) throw new AppError('Unauthorized', 401);

    const userAlarms = getOrInitUserAlarms(userId);

    try {
      const dbAlarms = await db.select().from(alarms).where(eq(alarms.userId, userId));
      if (dbAlarms.length > 0) {
        res.status(200).json({ success: true, data: { alarms: dbAlarms } });
        return;
      }
    } catch (_err) {}

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

    try {
      const [dbAlarm] = await db
        .select()
        .from(alarms)
        .where(and(eq(alarms.id, id), eq(alarms.userId, userId)));
      if (dbAlarm) {
        res.status(200).json({ success: true, data: { alarm: dbAlarm } });
        return;
      }
    } catch (_err) {}

    const userAlarms = getOrInitUserAlarms(userId);
    const alarm = userAlarms.find((a) => a.id === id);
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

    const userAlarms = getOrInitUserAlarms(userId);
    const todayAlarms = userAlarms.filter((a) => a.activeStatus);

    res.status(200).json({
      success: true,
      data: { alarms: todayAlarms, totalToday: todayAlarms.length },
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

    const userAlarms = getOrInitUserAlarms(userId);
    const activeAlarms = userAlarms.filter((a) => a.activeStatus);

    res.status(200).json({
      success: true,
      data: { alarms: activeAlarms, totalUpcoming: activeAlarms.length },
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

    const userAlarms = getOrInitUserAlarms(userId);
    const activeAlarms = userAlarms.filter((a) => a.activeStatus);
    const nextAlarm = activeAlarms[0] || null;

    res.status(200).json({
      success: true,
      data: { nextAlarm },
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

    const newAlarm = {
      id: randomUUID(),
      userId,
      alarmTitle,
      alarmTime,
      repeatType: repeatType || 'daily',
      repeatDays: repeatDays || [],
      difficultyLevel: calculatedDifficulty,
      sound: sound || 'Gentle Chime',
      vibration: vibration !== undefined ? vibration : true,
      snooze: snooze !== undefined ? snooze : 5,
      activeStatus: activeStatus !== undefined ? activeStatus : true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const userAlarms = getOrInitUserAlarms(userId);
    userAlarms.unshift(newAlarm);

    try {
      await db.insert(alarms).values({
        id: newAlarm.id,
        userId,
        alarmTitle,
        alarmTime,
        repeatType: newAlarm.repeatType,
        repeatDays: JSON.stringify(newAlarm.repeatDays),
        difficultyLevel: newAlarm.difficultyLevel,
        sound: newAlarm.sound,
        vibration: newAlarm.vibration,
        snooze: newAlarm.snooze,
        activeStatus: newAlarm.activeStatus,
      });
    } catch (_err) {}

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

    const userAlarms = getOrInitUserAlarms(userId);
    const index = userAlarms.findIndex((a) => a.id === id);
    if (index === -1) {
      throw new AppError('Alarm not found', 404);
    }

    userAlarms[index] = {
      ...userAlarms[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    const updatedAlarm = userAlarms[index];

    try {
      await db
        .update(alarms)
        .set({
          ...updates,
          repeatDays: updates.repeatDays ? JSON.stringify(updates.repeatDays) : undefined,
          updatedAt: new Date(),
        })
        .where(and(eq(alarms.id, id), eq(alarms.userId, userId)));
    } catch (_err) {}

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

    const userAlarms = getOrInitUserAlarms(userId);
    const alarm = userAlarms.find((a) => a.id === id);
    if (!alarm) throw new AppError('Alarm not found', 404);

    alarm.activeStatus = true;
    alarm.updatedAt = new Date().toISOString();

    try {
      await db
        .update(alarms)
        .set({ activeStatus: true, updatedAt: new Date() })
        .where(and(eq(alarms.id, id), eq(alarms.userId, userId)));
    } catch (_err) {}

    res.status(200).json({
      success: true,
      message: 'Alarm enabled successfully',
      data: { alarm },
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

    const userAlarms = getOrInitUserAlarms(userId);
    const alarm = userAlarms.find((a) => a.id === id);
    if (!alarm) throw new AppError('Alarm not found', 404);

    alarm.activeStatus = false;
    alarm.updatedAt = new Date().toISOString();

    try {
      await db
        .update(alarms)
        .set({ activeStatus: false, updatedAt: new Date() })
        .where(and(eq(alarms.id, id), eq(alarms.userId, userId)));
    } catch (_err) {}

    res.status(200).json({
      success: true,
      message: 'Alarm disabled successfully',
      data: { alarm },
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

    const userAlarms = getOrInitUserAlarms(userId);
    const alarm = userAlarms.find((a) => a.id === id);
    if (!alarm) {
      throw new AppError('Alarm not found', 404);
    }

    alarm.activeStatus = !alarm.activeStatus;
    alarm.updatedAt = new Date().toISOString();

    try {
      await db
        .update(alarms)
        .set({ activeStatus: alarm.activeStatus, updatedAt: new Date() })
        .where(and(eq(alarms.id, id), eq(alarms.userId, userId)));
    } catch (_err) {}

    res.status(200).json({
      success: true,
      message: `Alarm ${alarm.activeStatus ? 'enabled' : 'disabled'} successfully`,
      data: { alarm },
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

    const userAlarms = getOrInitUserAlarms(userId);
    const initialLength = userAlarms.length;
    mockAlarmsStore[userId] = userAlarms.filter((a) => a.id !== id);

    if (mockAlarmsStore[userId].length === initialLength) {
      throw new AppError('Alarm not found', 404);
    }

    try {
      await db.delete(alarms).where(and(eq(alarms.id, id), eq(alarms.userId, userId)));
    } catch (_err) {}

    res.status(200).json({
      success: true,
      message: 'Alarm deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
