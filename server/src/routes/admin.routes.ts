import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import {
  getAllUsers,
  getRecentUsers,
  getAllCoaches,
  getRecentCoaches,
  updateCoachStatus,
  getAdminStatistics,
} from '../controllers/admin.controller.js';

const router = Router();

// Protect all admin routes with JWT auth and admin role
router.use(authenticate, authorize(['admin']));

router.get('/users', getAllUsers);
router.get('/users/recent', getRecentUsers);
router.get('/coaches', getAllCoaches);
router.get('/coaches/recent', getRecentCoaches);
router.put('/coaches/:id/status', updateCoachStatus);
router.get('/statistics', getAdminStatistics);

export default router;
