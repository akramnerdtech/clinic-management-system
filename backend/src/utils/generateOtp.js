import crypto from 'node:crypto';

/** Generates a zero-padded numeric OTP of the given length (default 6 digits). */
export function generateOtp(length = 6) {
  const max = 10 ** length;
  const num = crypto.randomInt(0, max);
  return String(num).padStart(length, '0');
}
