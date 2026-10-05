import crypto from 'node:crypto';
import { env } from '../config/env.js';
import { generateOtp } from '../utils/generateOtp.js';

/**
 * In-memory OTP store, keyed by lowercased email.
 *
 * OTPs exist ONLY to verify an email address during new-account signup — they
 * are never issued for login. This is intentionally simple (a single Map). For
 * a multi-instance deployment, swap this Map for Redis without changing the
 * service's public interface below.
 */
const store = new Map();

const RESEND_COOLDOWN_MS = 30 * 1000;

function hashOtp(otp) {
  return crypto.createHash('sha256').update(otp).digest('hex');
}

/**
 * Creates and stores a fresh OTP for the email, returning the plaintext code to send.
 * `meta` (e.g. the signup full name) is kept server-side and handed back on a
 * successful verification, so it can't be altered between steps.
 */
export function issueOtp(email, meta = {}) {
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
    meta,
  });
  return otp;
}

/** Drops a pending OTP (used when the email could not be delivered, so the user can retry immediately). */
export function discardOtp(email) {
  store.delete(email.toLowerCase());
}

/**
 * Verifies a submitted OTP. Single-use: a successful check consumes it.
 * Returns the `meta` stored with the OTP. Throws with a status code on any failure.
 */
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
  return record.meta;
}