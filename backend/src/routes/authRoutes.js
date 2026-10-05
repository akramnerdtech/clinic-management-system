import { Router } from 'express';
import { requestSignupOtp, verifySignupOtp, setSignupPassword, login } from '../controllers/authController.js';

const router = Router();

// Signup (3 steps). The account is only created at the very end.
router.post('/signup/request-otp', requestSignupOtp); // Full Name + Email → email OTP
router.post('/signup/verify-otp', verifySignupOtp);   // Email + OTP → signup token
router.post('/signup/set-password', setSignupPassword); // signup token + Password + Confirm → account

// Login: Email + Password only. No OTP.
router.post('/login', login);

export default router;