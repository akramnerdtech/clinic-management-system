import { appointmentsMetrics, appointmentTabs, appointmentEntries, appointmentStatusStyles } from '@/data/appointments';
import { loadFromStorage, saveToStorage } from '@/utils/storage';
import { newAppointmentService } from '@/services/newAppointmentService';
import type { AppointmentEntry, MetricConfig } from '@/types';

const KEYS = {
  metrics: 'curaclinic.appointments.metrics',
  tabs: 'curaclinic.appointments.tabs',
  entries: 'curaclinic.appointments.entries.v2',
  statusStyles: 'curaclinic.appointments.statusStyles',
};

export const appointmentsService = {
  /** Builds the four summary cards from today's real appointment entries. */
  getMetrics(): MetricConfig[] {
    const cards = loadFromStorage(KEYS.metrics, appointmentsMetrics);
    const today = toDateKey(new Date());
    const todays = this.getEntries().filter((entry) => normalizeDate(entry[11]) === today);
    const active = todays.filter((entry) => entry[10] !== 'Cancelled');
    const waiting = todays.filter((entry) => entry[10] === 'Waiting');
    const completed = todays.filter((entry) => entry[10] === 'Completed');
    const cancelled = todays.filter((entry) => entry[10] === 'Cancelled');

    const capacity = newAppointmentService.getDayCapacity(today);
    const booked = capacity > 0 ? Math.min(100, Math.round((active.length / capacity) * 100)) : null;
    const longestWait = waiting.reduce((max, entry) => {
      const match = entry[1].match(/(\d+)\s*min/i);
      return match ? Math.max(max, Number(match[1])) : max;
    }, 0);
    const remaining = Math.max(0, active.length - completed.length);
    const pad = (n: number) => String(n).padStart(2, '0');

    const computed: Record<string, { value: string; note: string }> = {
      'SCHEDULED TODAY': {
        value: pad(active.length),
        note: booked === null ? 'No doctor slots configured today' : `${booked}% capacity booked`,
      },
      'IN WAITING ROOM': {
        value: pad(waiting.length),
        note: waiting.length && longestWait ? `Longest wait: ${longestWait} min · target < 20 min` : 'Target threshold: < 20 min',
      },
      'COMPLETED TODAY': {
        value: pad(completed.length),
        note: `${remaining} remaining on schedule`,
      },
      'CANCELLED / RESCHED': {
        value: pad(cancelled.length),
        note: cancelled.length ? 'Slots immediately freed' : 'No cancellations today',
      },
    };
    return cards.map((card) => (computed[card.label] ? { ...card, ...computed[card.label] } : card));
  },
  getTabs(): string[] {
    return loadFromStorage(KEYS.tabs, appointmentTabs);
  },
  getEntries(): AppointmentEntry[] {
    return loadFromStorage(KEYS.entries, appointmentEntries);
  },
  getTodayEntries(): AppointmentEntry[] {
    const today = toDateKey(new Date());
    return this.getEntries().filter((entry) => normalizeDate(entry[11]) === today && entry[10] !== 'Cancelled');
  },
  getStatusStyles(): Record<string, string> {
    return loadFromStorage(KEYS.statusStyles, appointmentStatusStyles);
  },
  /** Prepends a newly booked appointment to the schedule and persists it. */
  addEntry(entry: AppointmentEntry): AppointmentEntry[] {
    const current = loadFromStorage(KEYS.entries, appointmentEntries);
    const updated = [entry, ...current];
    saveToStorage(KEYS.entries, updated);
    return updated;
  },
  getNextToken(): string {
    const current = loadFromStorage(KEYS.entries, appointmentEntries);
    const max = current.reduce((highest, entry) => {
      const match = entry[2].match(/^TK-(\d+)$/i);
      return match ? Math.max(highest, Number(match[1])) : highest;
    }, 0);
    return `TK-${String(max + 1).padStart(3, '0')}`;
  },
  getEntryByToken(tokenId: string): AppointmentEntry | undefined {
    return loadFromStorage(KEYS.entries, appointmentEntries).find((entry) => entry[2] === tokenId);
  },
  /** Replaces the appointment with the given token ID and persists the change. */
  updateEntry(tokenId: string, next: AppointmentEntry): AppointmentEntry[] {
    const current = loadFromStorage(KEYS.entries, appointmentEntries);
    const updated = current.map((entry) => (entry[2] === tokenId ? next : entry));
    saveToStorage(KEYS.entries, updated);
    return updated;
  },
  /** Removes the appointment with the given token ID and persists the change. */
  deleteEntry(tokenId: string): AppointmentEntry[] {
    const current = loadFromStorage(KEYS.entries, appointmentEntries);
    const updated = current.filter((entry) => entry[2] !== tokenId);
    saveToStorage(KEYS.entries, updated);
    return updated;
  },
  updateStatus(tokenId: string, status: string): AppointmentEntry[] {
    const current = loadFromStorage(KEYS.entries, appointmentEntries);
    const updated = current.map((entry) => entry[2] === tokenId
      ? [...entry.slice(0, 10), status, entry[11]] as AppointmentEntry
      : entry);
    saveToStorage(KEYS.entries, updated);
    return updated;
  },
};

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