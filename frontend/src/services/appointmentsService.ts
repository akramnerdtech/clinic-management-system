import { appointmentsMetrics, appointmentTabs, appointmentEntries, appointmentStatusStyles } from '@/data/appointments';
import { loadFromStorage, saveToStorage } from '@/utils/storage';
import { newAppointmentService } from '@/services/newAppointmentService';
import { notificationSyncService } from '@/services/notificationSyncService';
import type { AppointmentEntry, MetricConfig } from '@/types';

const KEYS = {
  metrics: 'curaclinic.appointments.metrics',
  tabs: 'curaclinic.appointments.tabs',
  entries: 'curaclinic.appointments.entries.v2',
  statusStyles: 'curaclinic.appointments.statusStyles',
  deletedCount: 'curaclinic.appointments.deletedCount',
};

export const appointmentsService = {
  /** Builds the four summary cards dynamically from real appointment entries. */
  getMetrics(): MetricConfig[] {
    const today = toDateKey(new Date());
    const allEntries = this.getEntries();
    const deletedCount = loadFromStorage<number>(KEYS.deletedCount, 0);

    // Appointments booked today (any booking created today)
    const bookedToday = allEntries.filter((entry) => {
      const bookedDate =
        normalizeDate(entry[15]) ||
        (entry[12] && /^\d{4}-\d{2}-\d{2}$/.test(entry[12]) ? entry[12] : '') ||
        normalizeDate(entry[11]);
      return bookedDate === today;
    });

    // Appointments scheduled for today (scheduled date is today and not cancelled)
    const scheduledToday = allEntries.filter(
      (entry) => normalizeDate(entry[11]) === today && (entry[10] || '').trim() !== 'Cancelled',
    );

    // Appointments marked Completed
    const completed = allEntries.filter((entry) => {
      const status = (entry[10] || '').trim().toLowerCase();
      return status === 'completed';
    });

    // Cancelled / deleted appointments
    const cancelledEntries = allEntries.filter((entry) => {
      const status = (entry[10] || '').trim().toLowerCase();
      return status === 'cancelled' || status.includes('cancel');
    });
    const totalCancelled = cancelledEntries.length + deletedCount;

    const capacity = newAppointmentService.getDayCapacity(today);
    const booked = capacity > 0 ? Math.min(100, Math.round((scheduledToday.length / capacity) * 100)) : null;
    const pad = (n: number) => String(n).padStart(2, '0');

    const computed: Record<string, { value: string; note: string }> = {
      'TODAY APPOINTMENT BOOK': {
        value: pad(bookedToday.length),
        note: bookedToday.length === 1 ? '1 appointment booked today' : `${bookedToday.length} appointments booked today`,
      },
      'APPOINTMENTS BOOKED TODAY': {
        value: pad(bookedToday.length),
        note: bookedToday.length === 1 ? '1 appointment booked today' : `${bookedToday.length} appointments booked today`,
      },
      'SCHEDULED TODAY': {
        value: pad(scheduledToday.length),
        note: booked === null ? `${scheduledToday.length} scheduled today` : `${booked}% capacity booked`,
      },
      "TODAY'S APPOINTMENTS": {
        value: pad(scheduledToday.length),
        note: booked === null ? `${scheduledToday.length} scheduled today` : `${booked}% capacity booked`,
      },
      'COMPLETED TODAY': {
        value: pad(completed.length),
        note: completed.length === 1 ? '1 consultation completed' : `${completed.length} consultations completed`,
      },
      COMPLETED: {
        value: pad(completed.length),
        note: completed.length === 1 ? '1 consultation completed' : `${completed.length} consultations completed`,
      },
      'CANCELLED / RESCHED': {
        value: pad(totalCancelled),
        note: totalCancelled === 0 ? 'No cancellations' : `${totalCancelled} cancelled / freed`,
      },
      CANCELLED: {
        value: pad(totalCancelled),
        note: totalCancelled === 0 ? 'No cancellations' : `${totalCancelled} cancelled / freed`,
      },
    };

    const cards = appointmentsMetrics.map((card) =>
      computed[card.label] ? { ...card, ...computed[card.label] } : card,
    );
    saveToStorage(KEYS.metrics, cards);
    return cards;
  },
  getTabs(): string[] {
    const loaded = loadFromStorage(KEYS.tabs, appointmentTabs);
    if (loaded.includes('Pending') || loaded.includes('Confirmed') || loaded.length !== appointmentTabs.length) {
      saveToStorage(KEYS.tabs, appointmentTabs);
      return appointmentTabs;
    }
    return loaded;
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
  /**
   * Prepends a newly booked appointment to the schedule and persists it.
   * `contact.patientMobile` is the patient's registered mobile ('' if none on file); when given,
   * the patient is also texted a booking confirmation.
   */
  addEntry(entry: AppointmentEntry, contact?: { patientMobile?: string }): AppointmentEntry[] {
    const today = toDateKey(new Date());
    const fullEntry: AppointmentEntry = [...entry] as AppointmentEntry;
    while (fullEntry.length < 15) {
      fullEntry.push('');
    }
    fullEntry[15] = fullEntry[15] || today;
    const current = loadFromStorage(KEYS.entries, appointmentEntries);
    const updated = [fullEntry, ...current];
    saveToStorage(KEYS.entries, updated);
    notificationSyncService.syncAppointment(fullEntry, contact); // SMS the doctor (and the patient) about the new booking
    window.dispatchEvent(new CustomEvent('clinic-appointments-updated'));
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
    notificationSyncService.syncAppointment(next); // reschedule / doctor change: update SMS reminders
    window.dispatchEvent(new CustomEvent('clinic-appointments-updated'));
    return updated;
  },
  /** Removes the appointment with the given token ID and persists the change. */
  deleteEntry(tokenId: string): AppointmentEntry[] {
    const current = loadFromStorage(KEYS.entries, appointmentEntries);
    const removed = current.find((entry) => entry[2] === tokenId);
    const updated = current.filter((entry) => entry[2] !== tokenId);
    saveToStorage(KEYS.entries, updated);

    // Track deletion so cancelled count increases
    const deletedCount = loadFromStorage<number>(KEYS.deletedCount, 0);
    saveToStorage(KEYS.deletedCount, deletedCount + 1);

    if (removed) notificationSyncService.removeAppointment(removed); // cancel pending SMS reminders
    window.dispatchEvent(new CustomEvent('clinic-appointments-updated'));
    return updated;
  },
  updateStatus(tokenId: string, status: string): AppointmentEntry[] {
    const current = loadFromStorage(KEYS.entries, appointmentEntries);
    const updated = current.map((entry) => entry[2] === tokenId
      ? [...entry.slice(0, 10), status, ...entry.slice(11)] as AppointmentEntry
      : entry);
    saveToStorage(KEYS.entries, updated);
    const changed = updated.find((entry) => entry[2] === tokenId);
    if (changed) notificationSyncService.syncAppointment(changed); // e.g. Cancelled: cancel pending SMS reminders
    window.dispatchEvent(new CustomEvent('clinic-appointments-updated'));
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