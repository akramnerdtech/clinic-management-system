import type {
  CalendarDayHeader, CalendarEvent, CalendarBanner,
  SuiteUtilizationRow, RoomStatus, PhysicianShift,
} from '@/types';

export const calendarGridStartHour = 10;
export const calendarGridEndHour = 20;

export const calendarDayHeaders: CalendarDayHeader[] = [
  { label: 'MON', date: 28 },
  { label: 'TUE', date: 29 },
  { label: 'WED', date: 30, today: true },
  { label: 'THU', date: 1 },
  { label: 'FRI', date: 2 },
  { label: 'SAT', date: 3 },
  { label: 'SUN', date: 4 },
];

/** The demo clinic's "today" and the Monday of the week the events are laid out in. */
export const calendarToday = '2026-09-30';
export const calendarWeekStart = '2026-09-28';

export const calendarWeekRangeLabel = 'September 28 – October 4, 2026';
export const calendarSyncLabel = 'SYNC LIVE • 10:15 AM IST';
export const calendarNowLabel = '02:30 PM';
export const calendarNowMinutes = 270; // minutes after 10:00 AM

/**
 * Static schedule removed: Master Calendar displays ONLY appointments booked by the user.
 */
export const calendarEvents: CalendarEvent[] = [];

export const calendarMiddayBanner: CalendarBanner = {
  startMinutes: 780, // 01:00 PM (13:00)
  durationMinutes: 60,
  label: 'MIDDAY CLINICAL HANDOVER & STERILIZATION WINDOW (01:00 – 02:00 PM)',
};

export const calendarEndBannerLabel = 'END OF SCHEDULED CLINIC HOURS (08:00 PM) • EMERGENCY ON-CALL ACTIVE';

export const suiteUtilizationRows: SuiteUtilizationRow[] = [
  { label: 'General Medicine Suites (4/4)', fraction: '4/4', percent: 100, percentLabel: '100% Full', tone: 'red' },
  { label: 'Specialty Suites (Cardio / Ortho - 3/4)', fraction: '3/4', percent: 75, percentLabel: '75% Full', tone: 'teal' },
  { label: 'Triage Bays & Intake (2/5)', fraction: '2/5', percent: 40, percentLabel: '40% Active', tone: 'green' },
];

export const roomStatuses: RoomStatus[] = [
  { label: '101 (Occupied)', tone: 'occupied' },
  { label: '102 (Occupied)', tone: 'occupied' },
  { label: '104 (Sanitizing)', tone: 'sanitizing' },
  { label: '205 (Vacant)', tone: 'vacant' },
];

export const physicianShifts: PhysicianShift[] = [
  { name: 'Dr. XYZ', doctorName: 'Dr. XYZ', dept: 'General Medicine', avatar: 'https://i.pravatar.cc/60?img=33', shiftStart: '15:00', shiftEnd: '16:00', station: 'Suite 105', statusLabel: 'On Floor', statusTone: 'on-floor', visits: '1 / 4 Visits' },
  { name: 'Dr. Marcus Vance', doctorName: 'Dr. Marcus Vale', dept: 'Cardiology Lead', avatar: 'https://i.pravatar.cc/60?img=12', shiftStart: '08:00', shiftEnd: '16:30', station: 'Suite 101 / 102', statusLabel: 'On Floor', statusTone: 'on-floor', visits: '6 / 8 Visits' },
  { name: 'Dr. Elena Rostova', doctorName: 'Dr. Elena Rostova', dept: 'Pediatric Dept', avatar: 'https://i.pravatar.cc/60?img=48', shiftStart: '08:30', shiftEnd: '17:00', station: 'Suite 204', statusLabel: 'On Floor', statusTone: 'on-floor', visits: '5 / 7 Visits' },
  { name: 'Dr. Aisha Patel', doctorName: 'Dr. Priya Patel', dept: 'Internal Medicine', avatar: 'https://i.pravatar.cc/60?img=32', shiftStart: '09:00', shiftEnd: '18:00', station: 'Suite 103', statusLabel: 'In Consult', statusTone: 'in-consult', visits: '4 / 9 Visits' },
];
