import type { CalendarEvent } from '@/types';

/** Status filter choices, in the order they appear in the dropdown. */
export const CALENDAR_STATUS_OPTIONS = ['Confirmed', 'Scheduled', 'Waiting', 'In Consult', 'Urgent'];

export interface CalendarEventFilters {
  doctor: string | null;
  room: string | null;
  status: string | null;
}

/** Events with no explicit status are plain bookings ("Scheduled"); urgent walk-ins are "Urgent". */
export function eventStatus(event: CalendarEvent): string {
  if (event.status) return event.status;
  return event.tone === 'urgent' ? 'Urgent' : 'Scheduled';
}

/**
 * Applies the doctor / room / status filters. `skip` leaves one filter out, which is how the
 * dropdowns compute their per-option counts ("how many would I get if I picked this?").
 */
export function filterCalendarEvents(
  events: CalendarEvent[],
  filters: CalendarEventFilters,
  skip?: keyof CalendarEventFilters,
): CalendarEvent[] {
  return events.filter((e) => {
    if (skip !== 'doctor' && filters.doctor && e.doctorName !== filters.doctor) return false;
    if (skip !== 'room' && filters.room && e.room !== filters.room) return false;
    if (skip !== 'status' && filters.status && eventStatus(e) !== filters.status) return false;
    return true;
  });
}

/** Counts events per key (doctor name, room, status). */
export function countBy(events: CalendarEvent[], key: (e: CalendarEvent) => string | undefined): Record<string, number> {
  const counts: Record<string, number> = {};
  events.forEach((e) => {
    const k = key(e);
    if (k) counts[k] = (counts[k] ?? 0) + 1;
  });
  return counts;
}
