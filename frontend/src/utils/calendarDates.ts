/**
 * Date helpers for the Master Calendar. Every date is an ISO `YYYY-MM-DD` string so it can be
 * compared lexicographically and never drifts across time zones. Weeks start on Monday.
 */

export type CalendarView = 'Day' | 'Week' | 'Month';

export const CALENDAR_VIEWS: CalendarView[] = ['Day', 'Week', 'Month'];
export const WEEKDAY_SHORT = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const WEEKDAYS_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const pad = (n: number) => String(n).padStart(2, '0');

export function parseISO(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function toISO(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function addDays(iso: string, n: number): string {
  const d = parseISO(iso);
  d.setDate(d.getDate() + n);
  return toISO(d);
}

/** Adds calendar months, clamping the day so Jan 31 + 1 month lands on Feb 28/29. */
export function addMonths(iso: string, n: number): string {
  const d = parseISO(iso);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + n);
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, lastDay));
  return toISO(d);
}

/** Index of the weekday with Monday = 0 … Sunday = 6. */
export function weekdayIndex(iso: string): number {
  return (parseISO(iso).getDay() + 6) % 7;
}

export function startOfWeek(iso: string): string {
  return addDays(iso, -weekdayIndex(iso));
}

/** Moves the anchor date one step (a day, week or month depending on the view). */
export function shiftAnchor(view: CalendarView, iso: string, direction: 1 | -1): string {
  if (view === 'Day') return addDays(iso, direction);
  if (view === 'Week') return addDays(iso, 7 * direction);
  return addMonths(iso, direction);
}

/** Inclusive date range whose events should be loaded. Month covers the full padded grid. */
export function getVisibleRange(view: CalendarView, iso: string): { start: string; end: string } {
  if (view === 'Day') return { start: iso, end: iso };
  if (view === 'Week') {
    const start = startOfWeek(iso);
    return { start, end: addDays(start, 6) };
  }
  const d = parseISO(iso);
  const first = toISO(new Date(d.getFullYear(), d.getMonth(), 1));
  const last = toISO(new Date(d.getFullYear(), d.getMonth() + 1, 0));
  return { start: startOfWeek(first), end: addDays(startOfWeek(last), 6) };
}

/** Column dates for the time-grid views (Day = 1 column, Week = 7). Month has no time grid. */
export function getColumnDates(view: CalendarView, iso: string): string[] {
  if (view === 'Day') return [iso];
  if (view === 'Week') {
    const start = startOfWeek(iso);
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }
  return [];
}

export interface MonthCell {
  iso: string;
  date: number;
  inMonth: boolean;
}

/** Rows of 7 cells covering the month containing `iso`, padded to whole weeks. */
export function getMonthWeeks(iso: string): MonthCell[][] {
  const { start, end } = getVisibleRange('Month', iso);
  const month = parseISO(iso).getMonth();
  const weeks: MonthCell[][] = [];
  let cursor = start;
  while (cursor <= end) {
    const week: MonthCell[] = [];
    for (let i = 0; i < 7; i += 1) {
      const d = parseISO(cursor);
      week.push({ iso: cursor, date: d.getDate(), inMonth: d.getMonth() === month });
      cursor = addDays(cursor, 1);
    }
    weeks.push(week);
  }
  return weeks;
}

export function formatLongDate(iso: string): string {
  const d = parseISO(iso);
  return `${WEEKDAYS_LONG[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

/** Toolbar label for the current view, e.g. "September 21 – 27, 2026". */
export function getRangeLabel(view: CalendarView, iso: string): string {
  if (view === 'Day') return formatLongDate(iso);
  const d = parseISO(iso);
  if (view === 'Month') return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;

  const start = parseISO(startOfWeek(iso));
  const end = parseISO(addDays(startOfWeek(iso), 6));
  if (start.getFullYear() !== end.getFullYear()) {
    return `${MONTHS[start.getMonth()]} ${start.getDate()}, ${start.getFullYear()} – ${MONTHS[end.getMonth()]} ${end.getDate()}, ${end.getFullYear()}`;
  }
  if (start.getMonth() !== end.getMonth()) {
    return `${MONTHS[start.getMonth()]} ${start.getDate()} – ${MONTHS[end.getMonth()]} ${end.getDate()}, ${end.getFullYear()}`;
  }
  return `${MONTHS[start.getMonth()]} ${start.getDate()} – ${end.getDate()}, ${end.getFullYear()}`;
}

/** "Day" | "Week" | "Month" → lowercase noun for aria-labels ("Previous week"). */
export function viewNoun(view: CalendarView): string {
  return view.toLowerCase();
}
