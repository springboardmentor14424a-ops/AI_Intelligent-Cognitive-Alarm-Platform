import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware.js';
import {
  getOverview,
  getWakeUp,
  getChallenges,
  getHabitsAnalytics,
  getSnooze,
  getRecommendations,
  generateRecommendationsHandler,
  getAdaptiveDifficulty,
  calculateAdaptiveDifficultyHandler,
  getHabitScoreHandler,
} from '../controllers/analytics.controller.js';

const router = Router();

router.use(authenticateToken);

router.get('/overview', getOverview);
router.get('/wakeup', getWakeUp);
router.get('/challenges', getChallenges);
router.get('/habits', getHabitsAnalytics);
router.get('/snooze', getSnooze);
router.get('/recommendations', getRecommendations);
router.post('/recommendations/generate', generateRecommendationsHandler);
router.get('/adaptive-difficulty', getAdaptiveDifficulty);
router.post('/adaptive-difficulty/calculate', calculateAdaptiveDifficultyHandler);
router.get('/score', getHabitScoreHandler);

export default router;
