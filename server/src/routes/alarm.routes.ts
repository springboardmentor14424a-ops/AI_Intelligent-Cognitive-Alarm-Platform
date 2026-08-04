import { Router } from 'express';
import {
  getAlarms,
  createAlarm,
  updateAlarm,
  toggleAlarmStatus,
  deleteAlarm,
} from '../controllers/alarm.controller.js';
import { validateRequest } from '../middleware/validate.middleware.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { createAlarmSchema, updateAlarmSchema } from '../schemas/alarm.schema.js';

const router = Router();

router.use(authenticateToken);

router.get('/', getAlarms);
router.post('/', validateRequest(createAlarmSchema), createAlarm);
router.put('/:id', validateRequest(updateAlarmSchema), updateAlarm);
router.patch('/:id/toggle', toggleAlarmStatus);
router.delete('/:id', deleteAlarm);

export default router;
