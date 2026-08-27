import { Router } from 'express';
import {
  createChallenge,
  getChallenges,
  getChallengeById,
  generateChallengeEndpoint,
  validateChallengeAnswer,
  getChallengeAttempts,
  getChallengeAnalytics,
} from '../controllers/challenge.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = Router();

// Public / Authenticated challenge routes
router.get('/analytics', authenticateToken, getChallengeAnalytics);
router.get('/attempts', authenticateToken, getChallengeAttempts);

router.post('/generate', generateChallengeEndpoint);
router.post('/validate', validateChallengeAnswer);

router.post('/', authenticateToken, createChallenge);
router.get('/', getChallenges);
router.get('/:id', getChallengeById);

export default router;
