import { Request, Response, NextFunction } from 'express';
import {
  getOverviewAnalytics,
  getWakeUpAnalytics,
  getChallengeAnalytics,
  getHabitAnalytics,
  getSnoozeAnalytics,
} from '../services/behavioralAnalytics.service.js';
import { generateRecommendations, getRecommendationsForUser } from '../services/recommendation.service.js';
import { calculateAdaptiveDifficulty, getAdaptiveDifficultyForUser } from '../services/adaptiveDifficulty.service.js';
import { calculateHabitScore } from '../services/habitScore.service.js';
import { AppError } from '../middleware/error.middleware.js';

export const getOverview = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) throw new AppError('Unauthorized', 401);

    const data = await getOverviewAnalytics(userId);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const getWakeUp = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) throw new AppError('Unauthorized', 401);

    const data = await getWakeUpAnalytics(userId);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const getChallenges = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) throw new AppError('Unauthorized', 401);

    const data = await getChallengeAnalytics(userId);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const getHabitsAnalytics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) throw new AppError('Unauthorized', 401);

    const data = await getHabitAnalytics(userId);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const getSnooze = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) throw new AppError('Unauthorized', 401);

    const data = await getSnoozeAnalytics(userId);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const getRecommendations = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) throw new AppError('Unauthorized', 401);

    const recommendations = await getRecommendationsForUser(userId);
    res.status(200).json({ success: true, data: { recommendations } });
  } catch (error) {
    next(error);
  }
};

export const generateRecommendationsHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) throw new AppError('Unauthorized', 401);

    const inputData = req.body || {};
    let recommendations;

    if (Object.keys(inputData).length > 0) {
      recommendations = generateRecommendations(inputData);
    } else {
      recommendations = await getRecommendationsForUser(userId);
    }

    res.status(200).json({ success: true, data: { recommendations } });
  } catch (error) {
    next(error);
  }
};

export const getAdaptiveDifficulty = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) throw new AppError('Unauthorized', 401);

    const adaptiveOutput = await getAdaptiveDifficultyForUser(userId);
    res.status(200).json({ success: true, data: adaptiveOutput });
  } catch (error) {
    next(error);
  }
};

export const calculateAdaptiveDifficultyHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) throw new AppError('Unauthorized', 401);

    const historyInput = req.body;
    if (!historyInput || Object.keys(historyInput).length === 0) {
      const adaptiveOutput = await getAdaptiveDifficultyForUser(userId);
      res.status(200).json({ success: true, data: adaptiveOutput });
      return;
    }

    const adaptiveOutput = calculateAdaptiveDifficulty(historyInput);
    res.status(200).json({ success: true, data: adaptiveOutput });
  } catch (error) {
    next(error);
  }
};

import { getHabitScoreHistory } from '../services/behavioralAnalytics.service.js';
import { getRecommendationsByCategory } from '../services/recommendation.service.js';

export const getHabitScoreHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) throw new AppError('Unauthorized', 401);

    const overview = await getOverviewAnalytics(userId);
    const scoreResult = overview.habitScore;

    res.status(200).json({
      success: true,
      data: scoreResult,
    });
  } catch (error) {
    next(error);
  }
};

export const getHabitScoreHistoryHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) throw new AppError('Unauthorized', 401);

    const period = (req.query.period as 'today' | '7d' | '30d') || '7d';
    const historyData = await getHabitScoreHistory(userId, period);

    res.status(200).json({
      success: true,
      data: historyData,
    });
  } catch (error) {
    next(error);
  }
};

export const getHabitScoreBreakdownHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) throw new AppError('Unauthorized', 401);

    const overview = await getOverviewAnalytics(userId);
    const scoreResult = overview.habitScore;

    res.status(200).json({
      success: true,
      data: {
        habit_score: scoreResult.habit_score,
        components: scoreResult.components,
        weights: scoreResult.weights,
        score_category: scoreResult.score_category,
        summaryMessage: scoreResult.summaryMessage,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getCategoryRecommendationsHandler = (category: string) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;
      if (!userId) throw new AppError('Unauthorized', 401);

      const recs = await getRecommendationsByCategory(userId, category);
      res.status(200).json({
        success: true,
        data: { recommendations: recs },
      });
    } catch (error) {
      next(error);
    }
  };
};

