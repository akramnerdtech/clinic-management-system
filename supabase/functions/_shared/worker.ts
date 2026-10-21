import { buildMessage } from './messages.ts';
import { backoffMinutes, isActiveStatus, isE164 } from './rules.ts';
import { sendTwilioSms, timingSafeEqualStr, type TwilioConfig } from './twilio.ts';
import type { ClinicAppointment, NotificationPatch, QueueStore, SmsNotification } from './types.ts';

export interface WorkerEnv {
  /** Shared secret that callers (Supabase Cron, the backend) must present. */
  workerSecret: string | null;
  twilio: TwilioConfig | null;
  statusCallbackUrl: string | null;
  clinicName: string;
}

/** Reads configuration from Supabase Secrets (injected so tests don't need Deno). */
export function readWorkerEnv(get: (key: string) => string | undefined): WorkerEnv {
  const clean = (key: string) => get(key)?.trim() || undefined;
  const accountSid = clean('TWILIO_ACCOUNT_SID');
  const authToken = clean('TWILIO_AUTH_TOKEN');
  const from = clean('TWILIO_FROM_NUMBER');
  const messagingServiceSid = clean('TWILIO_MESSAGING_SERVICE_SID');
  const supabaseUrl = clean('SUPABASE_URL')?.replace(/\/+$/, '');

  return {
    workerSecret: clean('SMS_WORKER_SECRET') ?? null,
    twilio: accountSid && authToken && (from || messagingServiceSid) ? { accountSid, authToken, from, messagingServiceSid } : null,
    statusCallbackUrl: supabaseUrl ? `${supabaseUrl}/functions/v1/twilio-status-callback` : null,
    clinicName: clean('CLINIC_NAME') ?? 'CuraClinic',
  };
}

export interface WorkerDeps {
  store: QueueStore;
  env: WorkerEnv;
  fetchImpl?: typeof fetch;
  now?: () => Date;
  batchSize?: number;
  maxBatches?: number;
  timeBudgetMs?: number;
}

export interface RunSummary {
  claimed: number;
  sent: number;
  retried: number;
  failed: number;
  cancelled: number;
  skipped: number;
}

const STALE_LOCK_MS = 10 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

export async function handleWorkerRequest(req: Request, deps: WorkerDeps): Promise<Response> {
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
  if (!deps.env.workerSecret) return json({ error: 'worker_not_configured' }, 500);

  const provided = req.headers.get('x-worker-secret') ?? '';
  if (!timingSafeEqualStr(provided, deps.env.workerSecret)) return json({ error: 'unauthorized' }, 401);

  // Refuse to claim anything we cannot send: rows stay pending and are retried once configured.
  if (!deps.env.twilio) return json({ error: 'twilio_not_configured' }, 500);

  try {
    return json({ ok: true, ...(await processQueue(deps)) });
  } catch (error) {
    console.error('process-sms-queue failed:', error instanceof Error ? error.message : error);
    return json({ error: 'worker_failed' }, 500);
  }
}

type Outcome = keyof Omit<RunSummary, 'claimed'>;

/** Sends every notification that is due. Safe to run concurrently with itself. */
export async function processQueue(deps: WorkerDeps): Promise<RunSummary> {
  const now = deps.now ?? (() => new Date());
  const { store, env } = deps;
  const batchSize = deps.batchSize ?? 25;
  const maxBatches = deps.maxBatches ?? 4;
  const budgetMs = deps.timeBudgetMs ?? 60_000;
  const started = Date.now();
  const summary: RunSummary = { claimed: 0, sent: 0, retried: 0, failed: 0, cancelled: 0, skipped: 0 };

  await store.releaseStaleLocks(new Date(now().getTime() - STALE_LOCK_MS).toISOString());

  for (let batch = 0; batch < maxBatches; batch++) {
    if (Date.now() - started > budgetMs) break;

    const due = await store.listDue(now().toISOString(), batchSize);
    if (due.length === 0) break;

    let progressed = false;
    for (const candidate of due) {
      const claimed = await store.claim(candidate, now().toISOString());
      if (!claimed) continue; // another worker took it
      progressed = true;
      summary.claimed++;

      try {
        summary[await handleOne(claimed, deps, now)]++;
      } catch (error) {
        // Unexpected failure (e.g. database hiccup): never leave the row stuck in `sending`.
        console.error(`notification ${claimed.id} errored:`, error instanceof Error ? error.message : error);
        summary[await failSafely(claimed, deps, now, error)]++;
      }
    }
    if (!progressed) break;
  }
  return summary;
}

/** Decides whether a claimed notification should still be sent at all. */
function guard(n: SmsNotification, appointment: ClinicAppointment, nowMs: number): NotificationPatch | null {
  if (n.kind !== 'cancellation') {
    if (!isActiveStatus(appointment.status)) {
      return { status: 'cancelled', last_error: 'Appointment is no longer active' };
    }
    if (n.doctor_key !== appointment.doctor_key) {
      return { status: 'cancelled', last_error: 'Appointment was reassigned to another doctor' };
    }
    if ((n.kind === 'reminder' || n.kind === 'update') && n.revision !== appointment.revision) {
      return { status: 'cancelled', last_error: 'Superseded by a later reschedule' };
    }
  }

  const scheduledMs = new Date(n.scheduled_for).getTime();
  if (n.kind === 'reminder') {
    // A reminder is pointless once the appointment has started.
    const deadline = appointment.starts_at ? new Date(appointment.starts_at).getTime() : scheduledMs + 12 * HOUR_MS;
    if (nowMs >= deadline) return { status: 'skipped', last_error: 'Reminder window has passed' };
  } else if (nowMs - scheduledMs > 24 * HOUR_MS) {
    return { status: 'skipped', last_error: 'Notification expired (older than 24 hours)' };
  }
  return null;
}

async function handleOne(n: SmsNotification, deps: WorkerDeps, now: () => Date): Promise<Outcome> {
  const { store, env } = deps;
  const clear: NotificationPatch = { locked_at: null };

  // Safety guard for legacy queue rows created by an older patient-SMS build. Never send SMS to patients.
  if ((n.kind as string) === 'patient_confirmation') {
    await store.finish(n.id, { ...clear, status: 'cancelled', last_error: 'Patient SMS is disabled; notifications are doctor-only' });
    return 'cancelled';
  }

  const appointment = await store.getAppointment(n.appointment_id);
  if (!appointment) {
    await store.finish(n.id, { ...clear, status: 'cancelled', last_error: 'Appointment record not found' });
    return 'cancelled';
  }

  const blocked = guard(n, appointment, now().getTime());
  if (blocked) {
    await store.finish(n.id, { ...clear, ...blocked });
    return blocked.status === 'cancelled' ? 'cancelled' : 'skipped';
  }

  // All active notification kinds are doctor-facing. Resolve the registered doctor number fresh at send time.
  const contact = await store.getContact(n.owner_id, n.doctor_key);
  if (!contact) {
    await store.finish(n.id, {
      ...clear,
      status: 'failed',
      error_code: 'NO_DOCTOR_MOBILE',
      last_error: `No mobile number is registered for ${appointment.doctor_name}`,
    });
    return 'failed';
  }
  if (!contact.sms_enabled) {
    await store.finish(n.id, { ...clear, status: 'skipped', last_error: 'SMS is disabled for this doctor' });
    return 'skipped';
  }
  if (!isE164(contact.mobile_e164)) {
    await store.finish(n.id, {
      ...clear,
      status: 'failed',
      error_code: 'INVALID_DOCTOR_MOBILE',
      last_error: `Stored mobile number for ${appointment.doctor_name} is not valid E.164`,
    });
    return 'failed';
  }
  const recipient = contact.mobile_e164;

  const body = buildMessage(n, appointment, env.clinicName);
  const result = await sendTwilioSms({
    config: env.twilio as TwilioConfig,
    to: recipient,
    body,
    statusCallback: env.statusCallbackUrl,
    fetchImpl: deps.fetchImpl,
  });

  if (result.ok) {
    // The SMS is already out: persisting this MUST NOT be skipped, or the stale-lock
    // recovery would send it a second time. Retry the write a few times.
    await saveSentResult(deps.store, n.id, {
      ...clear,
      status: 'sent',
      twilio_sid: result.sid,
      delivery_status: result.status,
      to_number: recipient,
      body,
      sent_at: now().toISOString(),
      error_code: null,
      last_error: null,
    });
    return 'sent';
  }

  console.warn(
    `notification ${n.id} (${n.kind}) Twilio send failed: ${result.code} http=${result.httpStatus} retryable=${result.retryable} attempt=${n.attempts}/${n.max_attempts}`,
  );

  if (result.retryable && n.attempts < n.max_attempts) {
    await store.finish(n.id, {
      ...clear,
      status: 'pending',
      next_attempt_at: new Date(now().getTime() + backoffMinutes(n.attempts) * 60_000).toISOString(),
      error_code: result.code,
      last_error: result.message,
    });
    return 'retried';
  }

  await store.finish(n.id, { ...clear, status: 'failed', error_code: result.code, last_error: result.message });
  return 'failed';
}

async function saveSentResult(store: QueueStore, id: string, patch: NotificationPatch): Promise<void> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await store.finish(id, patch);
      return;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 200 * (attempt + 1)));
    }
  }
  console.error(`SMS for notification ${id} was sent but could not be recorded:`, lastError);
  throw lastError;
}

/** Last-resort handling when processing threw: retry later, or give up after max attempts. */
async function failSafely(n: SmsNotification, deps: WorkerDeps, now: () => Date, error: unknown): Promise<Outcome> {
  const message = (error instanceof Error ? error.message : String(error)).slice(0, 300);
  try {
    if (n.attempts < n.max_attempts) {
      await deps.store.finish(n.id, {
        status: 'pending',
        locked_at: null,
        next_attempt_at: new Date(now().getTime() + backoffMinutes(n.attempts) * 60_000).toISOString(),
        error_code: 'WORKER_ERROR',
        last_error: message,
      });
      return 'retried';
    }
    await deps.store.finish(n.id, { status: 'failed', locked_at: null, error_code: 'WORKER_ERROR', last_error: message });
    return 'failed';
  } catch {
    // Database unavailable: the row stays `sending` and is recovered by the stale-lock release.
    return 'retried';
  }
}
