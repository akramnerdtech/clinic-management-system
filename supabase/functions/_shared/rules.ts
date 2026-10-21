import type { NotificationPatch, NotificationStatus } from './types.ts';

/** Minutes to wait before attempt N+1 after attempt N failed transiently. */
const BACKOFF_MINUTES = [1, 5, 15, 60, 240];

/** `attemptsMade` is the number of attempts already made (1 after the first failure). */
export function backoffMinutes(attemptsMade: number): number {
  const index = Math.min(Math.max(attemptsMade, 1), BACKOFF_MINUTES.length) - 1;
  return BACKOFF_MINUTES[index];
}

const INACTIVE_STATUSES = new Set(['cancelled', 'canceled', 'completed', 'no show', 'noshow', 'deleted']);

/**
 * Whether an appointment should still notify its doctor. Mirrors isActiveStatus() in
 * backend/src/utils/notificationPlanner.js (a backend test keeps the two in sync).
 */
export function isActiveStatus(status: unknown): boolean {
  const normalized = String(status ?? '').trim().toLowerCase().replace(/[\s_-]+/g, ' ');
  return !INACTIVE_STATUSES.has(normalized);
}

export function isE164(value: string): boolean {
  return /^\+[1-9]\d{7,14}$/.test(value);
}

export type TwilioFailureKind = 'retryable' | 'permanent';

/**
 * Decides whether a failed Twilio API call is worth retrying.
 *  - network error / timeout (httpStatus 0), 429, 5xx  -> retry (transient)
 *  - 401 / 403 (bad or rotated credentials)            -> retry (fixable without losing the SMS)
 *  - other 4xx (invalid number, unverified trial number, unsubscribed, bad sender, ...) -> permanent
 */
export function classifyTwilioFailure(httpStatus: number): TwilioFailureKind {
  if (httpStatus === 0 || httpStatus === 429 || httpStatus >= 500) return 'retryable';
  if (httpStatus === 401 || httpStatus === 403) return 'retryable';
  return 'permanent';
}

// Twilio status progression. Callbacks can arrive out of order, so we never move backwards.
const DELIVERY_RANK: Record<string, number> = {
  accepted: 0,
  scheduled: 0,
  queued: 1,
  sending: 2,
  sent: 3,
  delivered: 4,
  read: 4,
  undelivered: 4,
  failed: 4,
};

/**
 * Turns a Twilio status callback into a database patch (or null if it should be ignored).
 * `current` is the row as stored: its coarse `status` and Twilio's last `delivery_status`.
 */
export function deliveryPatch(
  current: { status: NotificationStatus; delivery_status: string | null },
  incomingStatus: string,
  errorCode: string | null,
  errorMessage: string | null,
  nowIso: string,
): NotificationPatch | null {
  const status = incomingStatus.toLowerCase();
  const incomingRank = DELIVERY_RANK[status];
  if (incomingRank === undefined) return null;

  const currentRank = current.delivery_status ? (DELIVERY_RANK[current.delivery_status] ?? 0) : 0;
  if (incomingRank < currentRank) return null; // stale / out-of-order callback
  if (status === current.delivery_status) return null; // nothing new

  const patch: NotificationPatch = { delivery_status: status };

  if (status === 'delivered' || status === 'read') {
    patch.status = 'delivered';
    patch.delivered_at = nowIso;
  } else if (status === 'undelivered' || status === 'failed') {
    patch.status = 'failed';
    patch.error_code = errorCode;
    patch.last_error = `Twilio reported "${status}"${errorMessage ? `: ${errorMessage}` : ''}`.slice(0, 500);
  }
  return patch;
}
