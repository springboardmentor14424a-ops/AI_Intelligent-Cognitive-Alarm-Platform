import { Router } from 'express';
import authRoutes from './auth.routes.js';
import dashboardRoutes from './dashboard.routes.js';
import profileRoutes from './profile.routes.js';
import habitRoutes from './habit.routes.js';
import alarmRoutes from './alarm.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/profile', profileRoutes);
router.use('/habits', habitRoutes);
router.use('/alarms', alarmRoutes);

export default router;
