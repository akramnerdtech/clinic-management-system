import { apiClient } from '@/config/api';
import { loadAuthSession } from '@/utils/authStorage';
import { loadFromStorage, saveToStorage } from '@/utils/storage';
import type { AppointmentEntry } from '@/types';

/**
 * Tells the backend about appointment / doctor changes so doctors get SMS notifications.
 *
 * - Appointments stay in localStorage exactly as before; this only mirrors what the SMS
 *   needs (token, patient name, doctor, date, slot, status, room, visit type — never the
 *   complaint or notes). At booking time it also carries the patient's registered mobile so
 *   the backend can queue the patient's confirmation SMS.
 * - It never blocks or changes the UI: failures are swallowed.
 * - Every call goes through a small persisted outbox, so if the backend is down or the
 *   session expired the change is retried later (and in order) instead of being lost.
 * - Twilio is not involved here at all: credentials live only in Supabase Secrets.
 */

const KEYS = {
  clientId: 'curaclinic.notifications.clientId',
  outbox: 'curaclinic.notifications.outbox',
};

const MAX_OUTBOX = 200;
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const RETRY_DELAYS_MS = [15_000, 30_000, 60_000, 120_000, 300_000];

interface OutboxItem {
  id: string;
  createdAt: number;
  path: string;
  body: Record<string, unknown>;
}

function randomId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  }
}

/** Identifies this browser profile so token IDs (TK-001, ...) from different browsers never collide. */
function getClientId(): string {
  const stored = loadFromStorage<string>(KEYS.clientId, '');
  if (stored) return stored;
  const created = randomId();
  saveToStorage(KEYS.clientId, created);
  return created;
}

function toDateKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function normalizeDate(value?: string): string {
  if (!value) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '' : toDateKey(parsed);
}

function readOutbox(): OutboxItem[] {
  const items = loadFromStorage<OutboxItem[]>(KEYS.outbox, []);
  return Array.isArray(items) ? items : [];
}

let flushing = false;
let flushAgain = false;
let retryTimer: number | undefined;
let retryStep = 0;

function enqueue(path: string, body: Record<string, unknown>): void {
  const now = Date.now();
  const items = readOutbox().filter((item) => now - item.createdAt < MAX_AGE_MS);
  items.push({ id: randomId(), createdAt: now, path, body });
  saveToStorage(KEYS.outbox, items.slice(-MAX_OUTBOX));
  void flush();
}

function scheduleRetry(): void {
  if (typeof window === 'undefined' || retryTimer !== undefined || readOutbox().length === 0) return;
  const delay = RETRY_DELAYS_MS[Math.min(retryStep, RETRY_DELAYS_MS.length - 1)];
  retryStep += 1;
  retryTimer = window.setTimeout(() => {
    retryTimer = undefined;
    void flush();
  }, delay);
}

/** Sends queued items one at a time, oldest first, so the server sees changes in order. */
export async function flush(): Promise<void> {
  if (flushing) {
    flushAgain = true;
    return;
  }
  flushing = true;
  let failed = false;
  try {
    do {
      flushAgain = false;
      while (!failed) {
        const item = readOutbox()[0];
        if (!item) break;
        if (!loadAuthSession()?.token) {
          failed = true; // not signed in yet: keep everything and try again later
          break;
        }
        try {
          await apiClient.post(item.path, item.body);
          saveToStorage(KEYS.outbox, readOutbox().filter((queued) => queued.id !== item.id));
          retryStep = 0;
        } catch (error) {
          const status = (error as { response?: { status?: number } })?.response?.status;
          // The server understood and rejected it (bad data): retrying cannot help, drop it.
          if (status !== undefined && [400, 404, 413, 422].includes(status)) {
            saveToStorage(KEYS.outbox, readOutbox().filter((queued) => queued.id !== item.id));
            continue;
          }
          failed = true; // network down, 401, 429, 5xx ...: keep it and retry later
        }
      }
    } while (flushAgain && !failed); // new items arrived mid-flush: go again, unless we are backing off
    if (failed) scheduleRetry();
  } finally {
    flushing = false;
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => void flush());
  window.addEventListener('focus', () => void flush());
  window.setTimeout(() => void flush(), 3000); // deliver anything left over from the last session
}

function appointmentPayload(entry: AppointmentEntry): Record<string, unknown> | null {
  const date = normalizeDate(entry[11]);
  // Older/sample entries have no date or doctor: there is nothing to schedule.
  if (!date || !entry[0] || !entry[2] || !entry[7]) return null;
  return {
    tokenId: entry[2],
    patientName: entry[3],
    doctorName: entry[7],
    date,
    slot: entry[0],
    status: entry[10],
    room: entry[8] || '',
    visitType: entry[9] || '',
  };
}

export const notificationSyncService = {
  /**
   * An appointment was booked, edited/rescheduled, or its status changed.
   * Pass `contact.patientMobile` only for a NEW booking (use '' when the patient has no mobile on
   * file, so the server records why no confirmation was sent); edits and status changes omit it.
   */
  syncAppointment(entry: AppointmentEntry, contact?: { patientMobile?: string }): void {
    const appointment = appointmentPayload(entry);
    if (!appointment) return;
    if (contact?.patientMobile !== undefined) appointment.patientMobile = String(contact.patientMobile).trim();
    enqueue('/notifications/appointments/sync', { clientId: getClientId(), action: 'upsert', appointment });
  },

  /** An appointment was deleted (its pending SMS are cancelled). */
  removeAppointment(entry: AppointmentEntry): void {
    const appointment = appointmentPayload(entry);
    if (!appointment) return;
    enqueue('/notifications/appointments/sync', { clientId: getClientId(), action: 'delete', appointment });
  },

  /** The doctor's mobile from the Add Doctor form (the server validates and normalises it). */
  syncDoctorContact(name: string, mobile?: string): void {
    if (!name?.trim() || !mobile?.trim()) return;
    enqueue('/notifications/doctors', { name, mobile });
  },

  /** A doctor was renamed: carry their mobile over to the new name. */
  renameDoctor(from: string, to: string): void {
    if (!from?.trim() || !to?.trim() || from === to) return;
    enqueue('/notifications/doctors/rename', { from, to });
  },
};
