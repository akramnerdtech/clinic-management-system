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
    return loadFromStorage(KEYS.metrics, appointmentsMetrics);
  },
  getTabs(): string[] {
    return loadFromStorage(KEYS.tabs, appointmentTabs);
  },
  getEntries(): AppointmentEntry[] {
    return loadFromStorage(KEYS.entries, appointmentEntries);
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
};
