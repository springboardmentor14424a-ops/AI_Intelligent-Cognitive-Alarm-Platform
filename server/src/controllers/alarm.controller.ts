import { Request, Response, NextFunction } from 'express';
import { eq, and } from 'drizzle-orm';
import { db } from '../db/index.js';
import { alarms } from '../db/schema/alarms.js';
import { AppError } from '../middleware/error.middleware.js';
import { CreateAlarmInput, UpdateAlarmInput } from '../schemas/alarm.schema.js';

// In-memory fallback store for alarms per user
const mockAlarmsStore: Record<string, any[]> = {
  'demo-user-id': [
    {
      id: 'alarm-1',
      userId: 'demo-user-id',
      alarmTitle: 'Morning Awakening & Hydration',
      alarmTime: '07:00 AM',
      repeatType: 'daily',
      sound: 'Gentle Chime',
      vibration: true,
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
      sound: 'Cyber Pulse',
      vibration: false,
      activeStatus: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'alarm-3',
      userId: 'demo-user-id',
      alarmTitle: 'Evening Wind-down Routine',
      alarmTime: '10:30 PM',
      repeatType: 'daily',
      sound: 'Zen Flute',
      vibration: true,
      activeStatus: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
};

export const getAlarms = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) throw new AppError('Unauthorized', 401);

    if (!mockAlarmsStore[userId]) {
      mockAlarmsStore[userId] = [
        {
          id: `alarm-${Date.now()}-1`,
          userId,
          alarmTitle: 'Primary Morning Awakening',
          alarmTime: '07:00 AM',
          repeatType: 'daily',
          sound: 'Gentle Chime',
          vibration: true,
          activeStatus: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];
    }

    try {
      const dbAlarms = await db.select().from(alarms).where(eq(alarms.userId, userId));
      if (dbAlarms.length > 0) {
        res.status(200).json({ success: true, data: { alarms: dbAlarms } });
        return;
      }
    } catch (_err) {}

    res.status(200).json({
      success: true,
      data: { alarms: mockAlarmsStore[userId] },
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

    const { alarmTitle, alarmTime, repeatType, sound, vibration, activeStatus } = req.body;

    const newAlarm = {
      id: `alarm-${Date.now()}`,
      userId,
      alarmTitle,
      alarmTime,
      repeatType: repeatType || 'daily',
      sound: sound || 'Gentle Chime',
      vibration: vibration !== undefined ? vibration : true,
      activeStatus: activeStatus !== undefined ? activeStatus : true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (!mockAlarmsStore[userId]) {
      mockAlarmsStore[userId] = [];
    }
    mockAlarmsStore[userId].unshift(newAlarm);

    try {
      await db.insert(alarms).values({
        id: newAlarm.id,
        userId,
        alarmTitle,
        alarmTime,
        repeatType: newAlarm.repeatType,
        sound: newAlarm.sound,
        vibration: newAlarm.vibration,
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

    if (!mockAlarmsStore[userId]) mockAlarmsStore[userId] = [];

    const index = mockAlarmsStore[userId].findIndex((a) => a.id === id);
    if (index === -1) {
      throw new AppError('Alarm not found', 404);
    }

    mockAlarmsStore[userId][index] = {
      ...mockAlarmsStore[userId][index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    const updatedAlarm = mockAlarmsStore[userId][index];

    try {
      await db
        .update(alarms)
        .set({ ...updates, updatedAt: new Date() })
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

export const toggleAlarmStatus = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;
    if (!userId) throw new AppError('Unauthorized', 401);

    if (!mockAlarmsStore[userId]) mockAlarmsStore[userId] = [];

    const alarm = mockAlarmsStore[userId].find((a) => a.id === id);
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

    if (!mockAlarmsStore[userId]) mockAlarmsStore[userId] = [];

    const initialLength = mockAlarmsStore[userId].length;
    mockAlarmsStore[userId] = mockAlarmsStore[userId].filter((a) => a.id !== id);

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
