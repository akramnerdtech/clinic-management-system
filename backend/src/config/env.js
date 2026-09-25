import 'dotenv/config';

function required(name) {
  const value = process.env[name];
  if (!value) {
    // Fail fast and loudly at boot rather than deep inside a request handler.
    throw new Error(`Missing required environment variable: ${name}. Check backend/.env against .env.example.`);
  }
  return value;
}

export const env = {
  port: Number(process.env.PORT) || 4000,
  corsOrigin: (process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),

  supabaseUrl: required('SUPABASE_URL'),
  supabaseServiceRoleKey: required('SUPABASE_SERVICE_ROLE_KEY'),

  jwtSecret: required('JWT_SECRET'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',

  otpLength: Number(process.env.OTP_LENGTH) || 6,
  otpTtlMinutes: Number(process.env.OTP_TTL_MINUTES) || 5,
  otpMaxAttempts: Number(process.env.OTP_MAX_ATTEMPTS) || 5,

  smtpHost: process.env.SMTP_HOST,
  smtpPort: Number(process.env.SMTP_PORT) || 587,
  smtpSecure: process.env.SMTP_SECURE === 'true',
  smtpUser: process.env.SMTP_USER,
  smtpPass: process.env.SMTP_PASS,
  mailFrom: process.env.MAIL_FROM || 'CuraClinic <no-reply@curaclinic.app>',
};
