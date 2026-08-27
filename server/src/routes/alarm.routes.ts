import { Router } from 'express';
import {
  getAlarms,
  getAlarmById,
  getTodayAlarms,
  getUpcomingAlarms,
  checkNextAlarm,
  createAlarm,
  updateAlarm,
  enableAlarm,
  disableAlarm,
  toggleAlarmStatus,
  deleteAlarm,
} from '../controllers/alarm.controller.js';
import { validateRequest } from '../middleware/validate.middleware.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { createAlarmSchema, updateAlarmSchema } from '../schemas/alarm.schema.js';

const router = Router();

router.use(authenticateToken);

router.get('/', getAlarms);
router.get('/today', getTodayAlarms);
router.get('/upcoming', getUpcomingAlarms);
router.post('/check-next', checkNextAlarm);
router.get('/:id', getAlarmById);
router.post('/', validateRequest(createAlarmSchema), createAlarm);
router.put('/:id', validateRequest(updateAlarmSchema), updateAlarm);
router.patch('/:id/enable', enableAlarm);
router.patch('/:id/disable', disableAlarm);
router.patch('/:id/toggle', toggleAlarmStatus);
router.delete('/:id', deleteAlarm);

export default router;
