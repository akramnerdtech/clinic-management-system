import nodemailer from 'nodemailer';
import { env } from './env.js';

/**
 * Nodemailer transport. Scope: sending the login OTP email only — nothing
 * else in this backend sends mail.
 */
export const transporter = nodemailer.createTransport({
  host: env.smtpHost,
  port: env.smtpPort,
  secure: env.smtpSecure,
  auth: env.smtpUser && env.smtpPass ? { user: env.smtpUser, pass: env.smtpPass } : undefined,
});
