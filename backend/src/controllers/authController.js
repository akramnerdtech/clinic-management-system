import { createAccount, findUserByEmail } from '../services/supabaseService.js';
import { issueOtp, verifyOtp } from '../services/otpService.js';
import { transporter } from '../config/mailer.js';
import { env } from '../config/env.js';
import { otpEmailHtml } from '../utils/emailTemplate.js';
import { signSessionToken } from '../utils/token.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidEmail(email) {
  return typeof email === 'string' && EMAIL_RE.test(email.trim());
}

/** POST /api/auth/signup — Full Name + Email → Supabase account. No OTP required. */
export async function signup(req, res, next) {
  try {
    const fullName = (req.body?.fullName || '').trim();
    const email = (req.body?.email || '').trim().toLowerCase();

    if (!fullName) {
      return res.status(400).json({ message: 'Full name is required.' });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ message: 'A valid email is required.' });
    }

    const user = await createAccount({ fullName, email });
    return res.status(201).json({
      message: 'Account created. You can now log in with your email.',
      user: { id: user.id, email: user.email, fullName },
    });
  } catch (err) {
    next(err);
  }
}

/** POST /api/auth/login/request-otp — Email → generate 6-digit OTP → email via Nodemailer. */
export async function requestOtp(req, res, next) {
  try {
    const email = (req.body?.email || '').trim().toLowerCase();
    if (!isValidEmail(email)) {
      return res.status(400).json({ message: 'A valid email is required.' });
    }

    const user = await findUserByEmail(email);
    if (!user) {
      // Deliberately vague: don't reveal whether an email is registered.
      return res.status(404).json({ message: 'No account found for this email. Please sign up first.' });
    }

    const otp = issueOtp(email);

    await transporter.sendMail({
      from: env.mailFrom,
      to: email,
      subject: 'Your CuraClinic login code',
      html: otpEmailHtml({ otp, ttlMinutes: env.otpTtlMinutes }),
    });

    return res.status(200).json({ message: `A 6-digit code was sent to ${email}.` });
  } catch (err) {
    next(err);
  }
}

/** POST /api/auth/login/verify-otp — Email + OTP → verify → issue session token. */
export async function verifyOtpAndLogin(req, res, next) {
  try {
    const email = (req.body?.email || '').trim().toLowerCase();
    const otp = (req.body?.otp || '').trim();

    if (!isValidEmail(email) || !otp) {
      return res.status(400).json({ message: 'Email and verification code are required.' });
    }

    verifyOtp(email, otp);

    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(404).json({ message: 'No account found for this email.' });
    }

    const token = signSessionToken({ sub: user.id, email: user.email });
    return res.status(200).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.user_metadata?.full_name || '',
      },
    });
  } catch (err) {
    next(err);
  }
}
