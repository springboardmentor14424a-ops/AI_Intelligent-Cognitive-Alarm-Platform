import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { getReportView, exportReport } from '../controllers/reports.controller.js';

const router = Router();

router.use(authenticateToken);

router.get('/view', getReportView);
router.get('/export', exportReport);

export default router;
