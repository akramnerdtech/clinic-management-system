import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

/** Signs the app's own session token after a successful OTP verification. */
export function signSessionToken(payload) {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
}

/** Verifies a session token; throws if invalid/expired. */
export function verifySessionToken(token) {
  return jwt.verify(token, env.jwtSecret);
}
