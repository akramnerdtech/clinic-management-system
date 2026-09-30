import type { CalendarEvent } from '@/types';

/** Status filter choices, in the order they appear in the dropdown. */
export const CALENDAR_STATUS_OPTIONS = ['Slot Booked', 'Confirmed', 'Waiting', 'In Consult', 'Urgent'];

export interface CalendarEventFilters {
  doctor: string | null;
  room: string | null;
  status: string | null;
}

export function matchesDoctor(eventDoctor?: string, filterDoctor?: string | null): boolean {
  if (!filterDoctor) return true;
  if (!eventDoctor) return false;
  const a = eventDoctor.replace(/\s*\([^)]*\)/g, '').trim().toLowerCase();
  const b = filterDoctor.replace(/\s*\([^)]*\)/g, '').trim().toLowerCase();
  return a === b || a.includes(b) || b.includes(a);
}

/** Events with no explicit status are plain bookings ("Slot Booked"); urgent walk-ins are "Urgent". */
export function eventStatus(event: CalendarEvent): string {
  if (event.status) {
    const s = event.status.trim().toLowerCase();
    if (s === 'confirmed' || s === 'booked' || s === 'slot booked') {
      return 'Slot Booked';
    }
    return event.status;
  }
  return event.tone === 'urgent' ? 'Urgent' : 'Slot Booked';
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
    if (skip !== 'doctor' && filters.doctor) {
      const docName = e.doctorName ?? e.doctor ?? '';
      if (!matchesDoctor(docName, filters.doctor)) return false;
    }
    if (skip !== 'room' && filters.room && e.room !== filters.room) return false;
    if (skip !== 'status' && filters.status) {
      const st = eventStatus(e).toLowerCase();
      const target = filters.status.toLowerCase();
      if (st !== target && !(target.includes('book') && st.includes('book'))) return false;
    }
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
