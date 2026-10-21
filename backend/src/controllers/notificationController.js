import { supabaseAdmin } from '../config/supabaseClient.js';
import { env } from '../config/env.js';
import { createNotificationService } from '../services/notificationService.js';

/**
 * Asks the `process-sms-queue` Edge Function to send whatever is due right now, so the
 * doctor is texted immediately after a booking instead of waiting for the next cron tick.
 * Fire-and-forget: if it is not configured or fails, Supabase Cron sends it within a minute.
 */
async function triggerWorker() {
  if (!env.smsWorkerSecret) return;
  const res = await fetch(new URL('/functions/v1/process-sms-queue', env.supabaseUrl), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-worker-secret': env.smsWorkerSecret },
    body: '{}',
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`process-sms-queue responded ${res.status}`);
}

const service = createNotificationService({
  db: supabaseAdmin,
  notifyChanges: env.smsNotifyChanges,
  dailyLimit: env.smsDailyLimitPerAccount,
  defaultCountryCode: env.smsDefaultCountryCode,
  triggerWorker,
});

/** POST /api/notifications/appointments/sync — { clientId, action, appointment } */
export async function syncAppointment(req, res, next) {
  try {
    res.json({ ok: true, ...(await service.syncAppointment(req.userId, req.body || {})) });
  } catch (err) {
    next(err);
  }
}

/** POST /api/notifications/doctors — { name, mobile } */
export async function saveDoctorContact(req, res, next) {
  try {
    res.json({ ok: true, ...(await service.saveDoctorContact(req.userId, req.body || {})) });
  } catch (err) {
    next(err);
  }
}

/** POST /api/notifications/doctors/rename — { from, to } */
export async function renameDoctorContact(req, res, next) {
  try {
    res.json({ ok: true, ...(await service.renameDoctorContact(req.userId, req.body || {})) });
  } catch (err) {
    next(err);
  }
}
