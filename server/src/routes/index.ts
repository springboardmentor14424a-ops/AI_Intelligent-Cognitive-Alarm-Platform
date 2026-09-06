import { Router } from 'express';
import authRoutes from './auth.routes.js';
import dashboardRoutes from './dashboard.routes.js';
import profileRoutes from './profile.routes.js';
import habitRoutes from './habit.routes.js';
import alarmRoutes from './alarm.routes.js';
import challengeRoutes from './challenge.routes.js';
import wakeUpRoutes from './wakeUp.routes.js';
import analyticsRoutes from './analytics.routes.js';
import reportsRoutes from './reports.routes.js';
import notificationRoutes from './notification.routes.js';
import adminRoutes from './admin.routes.js';
import coachRoutes from './coach.routes.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import {
  getAdaptiveDifficulty,
  calculateAdaptiveDifficultyHandler,
  getRecommendations,
  generateRecommendationsHandler,
  getHabitScoreHandler,
  getHabitScoreHistoryHandler,
  getHabitScoreBreakdownHandler,
  getCategoryRecommendationsHandler,
} from '../controllers/analytics.controller.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/profile', profileRoutes);
router.use('/habits', habitRoutes);
router.use('/alarms', alarmRoutes);
router.use('/challenges', challengeRoutes);
router.use('/wakeup', wakeUpRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/reports', reportsRoutes);
router.use('/notifications', notificationRoutes);
router.use('/admin', adminRoutes);
router.use('/coach', coachRoutes);

// Direct Spec-compliant Habit Score Endpoints
router.get('/habit-score', authenticateToken, getHabitScoreHandler);
router.get('/habit-score/history', authenticateToken, getHabitScoreHistoryHandler);
router.get('/habit-score/breakdown', authenticateToken, getHabitScoreBreakdownHandler);

// Direct Spec-compliant Recommendation Endpoints
router.get('/recommendations', authenticateToken, getRecommendations);
router.get('/recommendations/sleep', authenticateToken, getCategoryRecommendationsHandler('sleep'));
router.get('/recommendations/wake-up', authenticateToken, getCategoryRecommendationsHandler('wakeup'));
router.get('/recommendations/habits', authenticateToken, getCategoryRecommendationsHandler('habits'));
router.get('/recommendations/productivity', authenticateToken, getCategoryRecommendationsHandler('productivity'));
router.get('/recommendations/challenges', authenticateToken, getCategoryRecommendationsHandler('challenges'));
router.post('/recommendations/generate', authenticateToken, generateRecommendationsHandler);

// Direct Adaptive Difficulty Spec-compliant Endpoints
router.get('/adaptive/difficulty', authenticateToken, getAdaptiveDifficulty);
router.post('/adaptive/difficulty/calculate', authenticateToken, calculateAdaptiveDifficultyHandler);

export default router;

