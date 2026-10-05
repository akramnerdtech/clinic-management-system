import { createAccount, findUserByEmail, signInWithPassword } from '../services/supabaseService.js';
import { issueOtp, verifyOtp, discardOtp } from '../services/otpService.js';
import { transporter } from '../config/mailer.js';
import { env } from '../config/env.js';
import { otpEmailHtml } from '../utils/emailTemplate.js';
import { signSessionToken, signSignupToken, verifySignupToken } from '../utils/token.js';
import { validateNewPassword } from '../utils/passwordPolicy.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidEmail(email) {
  return typeof email === 'string' && EMAIL_RE.test(email.trim());
}

function toUserPayload(user) {
  return {
    id: user.id,
    email: user.email,
    fullName: user.user_metadata?.full_name || '',
  };
}

/**
 * SIGNUP step 1 — POST /api/auth/signup/request-otp
 * Full Name + Email → email a 6-digit OTP. No account is created yet.
 * Emails that already have an account are rejected here, so an existing user is never sent an OTP.
 */
export async function requestSignupOtp(req, res, next) {
  let issuedFor = null;
  try {
    const fullName = (req.body?.fullName || '').trim();
    const email = (req.body?.email || '').trim().toLowerCase();

    if (!fullName) {
      return res.status(400).json({ message: 'Full name is required.' });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ message: 'A valid email is required.' });
    }

    const existing = await findUserByEmail(email);
    if (existing) {
      return res.status(409).json({ message: 'An account with this email already exists. Please log in instead.' });
    }

    const otp = issueOtp(email, { fullName });
    issuedFor = email;

    await transporter.sendMail({
      from: env.mailFrom,
      to: email,
      subject: 'Your CuraClinic verification code',
      html: otpEmailHtml({ otp, ttlMinutes: env.otpTtlMinutes }),
    });

    return res.status(200).json({ message: `A 6-digit code was sent to ${email}.` });
  } catch (err) {
    // If delivery failed, don't leave a cooldown behind that blocks an immediate retry.
    if (issuedFor && !err.status) discardOtp(issuedFor);
    next(err);
  }
}

/**
 * SIGNUP step 2 — POST /api/auth/signup/verify-otp
 * Email + OTP → verify (single-use) → short-lived signup token that unlocks the "set password" step.
 */
export async function verifySignupOtp(req, res, next) {
  try {
    const email = (req.body?.email || '').trim().toLowerCase();
    const otp = (req.body?.otp || '').trim();

    if (!isValidEmail(email) || !otp) {
      return res.status(400).json({ message: 'Email and verification code are required.' });
    }

    const { fullName } = verifyOtp(email, otp);
    const signupToken = signSignupToken({ email, fullName });

    return res.status(200).json({ message: 'Email verified. Now set your password.', signupToken });
  } catch (err) {
    next(err);
  }
}

/**
 * SIGNUP step 3 — POST /api/auth/signup/set-password
 * signupToken + Password + Confirm Password → create the account (password hashed by Supabase Auth).
 */
export async function setSignupPassword(req, res, next) {
  try {
    const { signupToken, password, confirmPassword } = req.body || {};

    let verified;
    try {
      verified = verifySignupToken(typeof signupToken === 'string' ? signupToken : '');
    } catch {
      return res.status(401).json({ message: 'Your email verification has expired. Please start signing up again.' });
    }

    const passwordError = validateNewPassword(password, confirmPassword);
    if (passwordError) {
      return res.status(400).json({ message: passwordError });
    }

    const user = await createAccount({ fullName: verified.fullName, email: verified.email, password });
    return res.status(201).json({
      message: 'Account created. You can now log in.',
      user: toUserPayload({ ...user, user_metadata: { full_name: verified.fullName } }),
    });
  } catch (err) {
    next(err);
  }
}

/** LOGIN — POST /api/auth/login. Email + Password → session token. Never involves an OTP. */
export async function login(req, res, next) {
  try {
    const email = (req.body?.email || '').trim().toLowerCase();
    const password = typeof req.body?.password === 'string' ? req.body.password : '';

    if (!isValidEmail(email) || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const user = await signInWithPassword(email, password);
    const token = signSessionToken({ sub: user.id, email: user.email });

    return res.status(200).json({ token, user: toUserPayload(user) });
  } catch (err) {
    next(err);
  }
}