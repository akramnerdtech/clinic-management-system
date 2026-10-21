// bcrypt (used by Supabase Auth) only considers the first 72 bytes of a password.
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 72;

/** Returns an error message if the password/confirmation pair is unacceptable, otherwise null. */
export function validateNewPassword(password, confirmPassword) {
  if (typeof password !== 'string' || !password) {
    return 'Please enter a password.';
  }
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`;
  }
  if (Buffer.byteLength(password, 'utf8') > PASSWORD_MAX_LENGTH) {
    return `Password must be at most ${PASSWORD_MAX_LENGTH} characters.`;
  }
  if (!/[A-Z]/.test(password)) {
    return 'Password must contain at least one uppercase letter (A-Z).';
  }
  if (!/[a-z]/.test(password)) {
    return 'Password must contain at least one lowercase letter (a-z).';
  }
  if (!/[0-9]/.test(password)) {
    return 'Password must contain at least one number (0-9).';
  }
  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~`]/.test(password)) {
    return 'Password must contain at least one special character (!@#$%^&*...).';
  }
  if (password !== confirmPassword) {
    return 'Passwords do not match.';
  }
  return null;
}