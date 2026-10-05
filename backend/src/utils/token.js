import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

/** Signs the app's own session token after a successful email + password login. */
export function signSessionToken(payload) {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
}

/** Verifies a session token; throws if invalid/expired. */
export function verifySessionToken(token) {
  return jwt.verify(token, env.jwtSecret);
}

const SIGNUP_TOKEN_PURPOSE = 'signup-email-verified';
const SIGNUP_TOKEN_TTL = '10m';

/**
 * Short-lived proof that an email address passed OTP verification during signup.
 * It is only accepted by the "set password" step and carries a `purpose` claim,
 * so it can never be mistaken for a login session token.
 */
export function signSignupToken({ email, fullName }) {
  return jwt.sign({ purpose: SIGNUP_TOKEN_PURPOSE, email, fullName }, env.jwtSecret, {
    expiresIn: SIGNUP_TOKEN_TTL,
  });
}

/** Verifies a signup-verification token; throws if invalid, expired, or of the wrong kind. */
export function verifySignupToken(token) {
  const payload = jwt.verify(token, env.jwtSecret);
  if (payload.purpose !== SIGNUP_TOKEN_PURPOSE) {
    throw new Error('Wrong token type.');
  }
  return payload;
}