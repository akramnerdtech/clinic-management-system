/**
 * Date-range handling for reports. All dates are local calendar days stored as
 * `YYYY-MM-DD` keys (the same convention the rest of the app uses), and both ends of a
 * range are inclusive. Weeks run Monday to Sunday, matching the dashboard's
 * "Appointments this week" metric.
 */

export type RangePreset = 'today' | 'yesterday' | 'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth' | 'custom';

export const RANGE_PRESETS: { id: RangePreset; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: 'thisWeek', label: 'This Week' },
  { id: 'lastWeek', label: 'Last Week' },
  { id: 'thisMonth', label: 'This Month' },
  { id: 'lastMonth', label: 'Last Month' },
  { id: 'custom', label: 'Custom Range' },
];

export interface DateRange {
  /** First day, inclusive, `YYYY-MM-DD`. */
  start: string;
  /** Last day, inclusive, `YYYY-MM-DD`. */
  end: string;
  /** Human readable, e.g. `05 Oct 2026 – 11 Oct 2026`. */
  label: string;
}

const pad = (n: number) => String(n).padStart(2, '0');

export const dateKey = (date: Date): string => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/**
 * Turns a stored date or timestamp into a local `YYYY-MM-DD` key. Date-only strings are used as
 * written; anything else (ISO timestamps, "Oct 5, 2026") is read as a moment in time and converted
 * to the local day. Returns '' when there is no usable date, so such records never match a range.
 */
export function keyFromValue(value?: string | null): string {
  if (!value) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '' : dateKey(parsed);
}

export const inRange = (key: string, range: DateRange): boolean => Boolean(key) && key >= range.start && key <= range.end;

export const includesToday = (range: DateRange, now = new Date()): boolean => inRange(dateKey(now), range);

export function formatDay(key: string): string {
  return parseDateKey(key).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function makeRange(start: Date, end: Date): DateRange {
  const startKey = dateKey(start);
  const endKey = dateKey(end);
  return {
    start: startKey,
    end: endKey,
    label: startKey === endKey ? formatDay(startKey) : `${formatDay(startKey)} – ${formatDay(endKey)}`,
  };
}

export interface CustomRangeInput {
  from: string;
  to: string;
}

/** Returns a message when a custom range can't be used, otherwise null. */
export function validateCustomRange({ from, to }: CustomRangeInput): string | null {
  if (!from || !to) return 'Choose both a start and an end date.';
  if (from > to) return 'The start date must be on or before the end date.';
  return null;
}

/** Resolves a preset (or a custom range) to concrete dates. Returns null for an invalid custom range. */
export function resolveRange(preset: RangePreset, custom?: CustomRangeInput, now = new Date()): DateRange | null {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const shift = (days: number) => new Date(today.getFullYear(), today.getMonth(), today.getDate() + days);
  const monday = shift(-((today.getDay() + 6) % 7));

  switch (preset) {
    case 'today':
      return makeRange(today, today);
    case 'yesterday':
      return makeRange(shift(-1), shift(-1));
    case 'thisWeek':
      return makeRange(monday, new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6));
    case 'lastWeek':
      return makeRange(
        new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() - 7),
        new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() - 1),
      );
    case 'thisMonth':
      return makeRange(new Date(today.getFullYear(), today.getMonth(), 1), new Date(today.getFullYear(), today.getMonth() + 1, 0));
    case 'lastMonth':
      return makeRange(new Date(today.getFullYear(), today.getMonth() - 1, 1), new Date(today.getFullYear(), today.getMonth(), 0));
    case 'custom':
      if (!custom || validateCustomRange(custom)) return null;
      return makeRange(parseDateKey(custom.from), parseDateKey(custom.to));
    default:
      return null;
  }
}