import { Router } from 'express';
import {
  startWakeUpVerification,
  submitWakeUpAttempt,
  getWakeUpStatus,
} from '../controllers/wakeUp.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = Router();

router.post('/start', authenticateToken, startWakeUpVerification);
router.post('/submit', authenticateToken, submitWakeUpAttempt);
router.get('/status/:id', authenticateToken, getWakeUpStatus);

export default router;
