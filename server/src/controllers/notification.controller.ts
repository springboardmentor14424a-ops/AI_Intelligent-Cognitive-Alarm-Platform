import { Request, Response, NextFunction } from 'express';
import {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  sendNotification,
} from '../services/notification.service.js';
import { AppError } from '../middleware/error.middleware.js';

export const getNotifications = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) throw new AppError('Unauthorized', 401);

    const list = await getUserNotifications(userId);
    const unreadCount = list.filter((n) => !n.isRead).length;

    res.status(200).json({
      success: true,
      data: { notifications: list, unreadCount },
    });
  } catch (error) {
    next(error);
  }
};

export const markRead = async (req: Request<{ id: string }>, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;
    if (!userId) throw new AppError('Unauthorized', 401);

    await markNotificationAsRead(userId, id);

    res.status(200).json({
      success: true,
      message: 'Notification marked as read',
    });
  } catch (error) {
    next(error);
  }
};

export const markAllRead = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) throw new AppError('Unauthorized', 401);

    await markAllNotificationsAsRead(userId);

    res.status(200).json({
      success: true,
      message: 'All notifications marked as read',
    });
  } catch (error) {
    next(error);
  }
};

export const createNotification = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) throw new AppError('Unauthorized', 401);

    const { type, title, message } = req.body;
    if (!title || !message) throw new AppError('Title and message are required', 400);

    const newNotif = await sendNotification(userId, type || 'system', title, message);

    res.status(201).json({
      success: true,
      message: 'Notification sent successfully',
      data: { notification: newNotif },
    });
  } catch (error) {
    next(error);
  }
};
