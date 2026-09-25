import { Router } from 'express';
import { signup, requestOtp, verifyOtpAndLogin } from '../controllers/authController.js';

const router = Router();

// Signup: Full Name + Email → Supabase account. No OTP.
router.post('/signup', signup);

// Login step 1: Email → generate + email OTP.
router.post('/login/request-otp', requestOtp);

// Login step 2: Email + OTP → verify → session token.
router.post('/login/verify-otp', verifyOtpAndLogin);

export default router;
