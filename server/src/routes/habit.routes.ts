import { Router } from 'express';
import {
  getHabits,
  getHabitById,
  createHabit,
  updateHabit,
  toggleHabitStatus,
  deleteHabit,
  getHabitScore,
} from '../controllers/habit.controller.js';
import { validateRequest } from '../middleware/validate.middleware.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { createHabitSchema, updateHabitSchema } from '../schemas/habit.schema.js';

const router = Router();

router.use(authenticateToken);

router.get('/', getHabits);
router.get('/score', getHabitScore);
router.get('/:id', getHabitById);
router.post('/', validateRequest(createHabitSchema), createHabit);
router.put('/:id', validateRequest(updateHabitSchema), updateHabit);
router.patch('/:id/toggle', toggleHabitStatus);
router.delete('/:id', deleteHabit);

export default router;
