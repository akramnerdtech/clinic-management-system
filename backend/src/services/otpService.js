import crypto from 'node:crypto';
import { env } from '../config/env.js';
import { generateOtp } from '../utils/generateOtp.js';

/**
 * In-memory OTP store, keyed by lowercased email.
 *
 * This is intentionally simple (a single Map) since OTP login is the only
 * thing this backend does beyond Supabase signup — no database is needed
 * for it. For a multi-instance deployment, swap this Map for Redis without
 * changing the service's public interface below.
 */
const store = new Map();

const RESEND_COOLDOWN_MS = 30 * 1000;

function hashOtp(otp) {
  return crypto.createHash('sha256').update(otp).digest('hex');
}

/** Creates and stores a fresh OTP for the email, returning the plaintext code to send. */
export function issueOtp(email) {
  const key = email.toLowerCase();
  const existing = store.get(key);
  if (existing && Date.now() - existing.issuedAt < RESEND_COOLDOWN_MS) {
    const err = new Error('Please wait a moment before requesting another code.');
    err.status = 429;
    throw err;
  }

  const otp = generateOtp(env.otpLength);
  store.set(key, {
    otpHash: hashOtp(otp),
    issuedAt: Date.now(),
    expiresAt: Date.now() + env.otpTtlMinutes * 60 * 1000,
    attempts: 0,
  });
  return otp;
}

/** Verifies a submitted OTP. Throws with a status code on any failure. */
export function verifyOtp(email, submittedOtp) {
  const key = email.toLowerCase();
  const record = store.get(key);

  if (!record) {
    const err = new Error('No verification code was requested for this email.');
    err.status = 400;
    throw err;
  }

  if (Date.now() > record.expiresAt) {
    store.delete(key);
    const err = new Error('This code has expired. Please request a new one.');
    err.status = 400;
    throw err;
  }

  if (record.attempts >= env.otpMaxAttempts) {
    store.delete(key);
    const err = new Error('Too many incorrect attempts. Please request a new code.');
    err.status = 429;
    throw err;
  }

  const matches = hashOtp(submittedOtp) === record.otpHash;
  if (!matches) {
    record.attempts += 1;
    const err = new Error('Incorrect verification code.');
    err.status = 400;
    throw err;
  }

  store.delete(key);
}
