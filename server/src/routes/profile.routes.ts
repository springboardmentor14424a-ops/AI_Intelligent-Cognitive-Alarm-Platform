import { Router } from 'express';
import { getProfile, updateProfile } from '../controllers/profile.controller.js';
import { validateRequest } from '../middleware/validate.middleware.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { updateProfileSchema } from '../schemas/profile.schema.js';

const router = Router();

router.use(authenticateToken);

router.get('/', getProfile);
router.put('/', validateRequest(updateProfileSchema), updateProfile);

export default router;
