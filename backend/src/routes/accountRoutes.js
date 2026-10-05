import { Router } from 'express';
import express from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import {
  getMe, updateProfile, uploadAvatar, removeAvatar, changePassword,
} from '../controllers/accountController.js';

const router = Router();

// Every account route requires a valid session; the user is always `req.userId` from the token.
router.use(requireAuth);

router.get('/me', getMe);
router.patch('/profile', updateProfile);
router.post('/password', changePassword);

// Avatar: raw bytes. Slightly above the 2 MB cap so the controller can return a clear 413 message.
router.post(
  '/avatar',
  express.raw({ type: ['image/jpeg', 'image/png', 'image/webp'], limit: '2100kb' }),
  uploadAvatar,
);
router.delete('/avatar', removeAvatar);

export default router;