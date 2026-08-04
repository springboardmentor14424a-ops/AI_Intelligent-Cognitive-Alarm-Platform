import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { authorizeRoles } from '../middleware/role.middleware.js';
import {
  getUserDashboard,
  getCoachDashboard,
  getAdminDashboard,
} from '../controllers/dashboard.controller.js';

const router = Router();

// Route accessible by user, coach, or admin
router.get('/user', authenticateToken, authorizeRoles('user', 'coach', 'admin'), getUserDashboard);

// Route accessible by coach or admin
router.get('/coach', authenticateToken, authorizeRoles('coach', 'admin'), getCoachDashboard);

// Route accessible strictly by admin
router.get('/admin', authenticateToken, authorizeRoles('admin'), getAdminDashboard);

export default router;
