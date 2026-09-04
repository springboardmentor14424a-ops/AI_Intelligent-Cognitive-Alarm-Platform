import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import {
  getCoachUsers,
  getCoachUserDetail,
  getCoachStatistics,
  assignUserToCoach,
} from '../controllers/coach.controller.js';

const router = Router();

// Protect coach routes with JWT auth and coach role
router.use(authenticate, authorize(['coach', 'admin']));

router.get('/users', getCoachUsers);
router.get('/users/:id', getCoachUserDetail);
router.get('/statistics', getCoachStatistics);
router.post('/assign', assignUserToCoach);

export default router;
