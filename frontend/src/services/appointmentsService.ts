import { appointmentsMetrics, appointmentTabs, appointmentEntries, appointmentStatusStyles } from '@/data/appointments';
import { loadFromStorage, saveToStorage } from '@/utils/storage';
import type { AppointmentEntry, MetricConfig } from '@/types';

const KEYS = {
  metrics: 'curaclinic.appointments.metrics',
  tabs: 'curaclinic.appointments.tabs',
  entries: 'curaclinic.appointments.entries',
  statusStyles: 'curaclinic.appointments.statusStyles',
};

export const appointmentsService = {
  getMetrics(): MetricConfig[] {
    const metrics = loadFromStorage(KEYS.metrics, appointmentsMetrics);
    const todayCount = this.getTodayEntries().length;
    return metrics.map((metric) => metric.label === 'SCHEDULED TODAY'
      ? { ...metric, value: String(Number(metric.value.replace(/,/g, '')) + todayCount) }
      : metric);
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
