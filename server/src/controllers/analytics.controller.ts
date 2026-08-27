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

export const getHabitScoreHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) throw new AppError('Unauthorized', 401);

    const overview = await getOverviewAnalytics(userId);
    const scoreResult = overview.habitScore;

    res.status(200).json({
      success: true,
      data: {
        overall_score: scoreResult.overall_score,
        wake_up_consistency: scoreResult.wake_up_consistency,
        challenge_completion: scoreResult.challenge_completion,
        snooze_reduction: scoreResult.snooze_reduction,
        sleep_adherence: scoreResult.sleep_adherence,
        score_breakdown: scoreResult.score_breakdown,
        score_category: scoreResult.score_category,
        summary_message: scoreResult.summaryMessage,
      },
    });
  } catch (error) {
    next(error);
  }
};
