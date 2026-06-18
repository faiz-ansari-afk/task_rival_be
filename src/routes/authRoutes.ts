import { Router } from 'express';
import { signup, login, refresh, logout, me } from '../controllers/authController';
import { validateBody } from '../middleware/validate';
import { signupSchema, loginSchema } from '../validators/authValidators';
import { requireAuth } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

router.post('/signup', validateBody(signupSchema), asyncHandler(signup));
router.post('/login', validateBody(loginSchema), asyncHandler(login));
router.post('/refresh', asyncHandler(refresh));
router.post('/logout', asyncHandler(logout));
router.get('/me', requireAuth, asyncHandler(me));

export default router;
