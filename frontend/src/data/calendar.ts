import type {
  CalendarDayHeader, CalendarEvent, CalendarBanner,
  SuiteUtilizationRow, RoomStatus, PhysicianShift,
} from '@/types';

export const calendarGridStartHour = 8;
export const calendarGridEndHour = 17;

export const calendarDayHeaders: CalendarDayHeader[] = [
  { label: 'MON', date: 21 },
  { label: 'TUE', date: 22 },
  { label: 'WED', date: 23 },
  { label: 'THU', date: 24, today: true },
  { label: 'FRI', date: 25 },
  { label: 'SAT', date: 26 },
  { label: 'SUN', date: 27 },
];

export const calendarWeekRangeLabel = 'September 21 – 27, 2026';
export const calendarSyncLabel = 'SYNC LIVE • 10:15 AM EDT';
export const calendarNowLabel = '10:15 AM';
export const calendarNowMinutes = 135; // minutes after 08:00 AM

/** Tuple-free event list mirroring the live scheduling board. */
export const calendarEvents: CalendarEvent[] = [
  // Monday
  { id: 'ev-1', day: 0, startMinutes: 60, durationMinutes: 45, time: '09:00 AM', patient: 'Teresa Ramos', doctor: 'Dr. Rostova', badge: 'Ste 204', tone: 'default' },
  { id: 'ev-2', day: 0, startMinutes: 300, durationMinutes: 45, time: '01:00 PM', patient: 'Deon Jackson', doctor: 'Dr. Vance · Ste 101', status: 'Confirmed', tone: 'confirmed' },
  { id: 'ev-3', day: 0, startMinutes: 360, durationMinutes: 45, time: '02:00 PM', patient: 'Kavita Sharma', doctor: 'Dr. Patel · Ste 103', status: 'Confirmed', tone: 'confirmed' },
  // Tuesday
  { id: 'ev-4', day: 1, startMinutes: 120, durationMinutes: 45, time: '10:00 AM', patient: 'Arthur Pendelton', doctor: 'Dr. Vance (Cardiology)', badge: 'Ste 102', tone: 'default' },
  // Wednesday
  { id: 'ev-5', day: 2, startMinutes: 15, durationMinutes: 45, time: '08:15 AM', patient: 'Harold Finch', doctor: 'Dr. Vance · Ste 101', status: 'Confirmed', tone: 'confirmed' },
  { id: 'ev-6', day: 2, startMinutes: 195, durationMinutes: 45, time: '11:15 AM', patient: 'Sofia Chen', doctor: 'Dr. Rostova · Ste 204', status: 'Confirmed', tone: 'confirmed' },
  { id: 'ev-7', day: 2, startMinutes: 435, durationMinutes: 45, time: '03:15 PM', patient: 'Oliver Vance', doctor: 'Dr. Rostova · Beds', badge: 'Ste 204', tone: 'default' },
  // Thursday (today)
  { id: 'ev-8', day: 3, startMinutes: 75, durationMinutes: 45, time: '09:15 AM', patient: 'Liam Henderson', doctor: 'Dr. A. Patel · Ste 103', status: 'In Consult', tone: 'consult' },
  { id: 'ev-9', day: 3, startMinutes: 135, durationMinutes: 45, time: '10:15 AM', patient: 'Maya Lin-Wood', status: 'Waiting', tone: 'waiting' },
  { id: 'ev-10', day: 3, startMinutes: 195, durationMinutes: 45, time: '11:15 AM', patient: 'Chloe Dupuis', doctor: 'Dr. A. Patel · Ste 103', status: 'Confirmed', tone: 'confirmed' },
  { id: 'ev-11', day: 3, startMinutes: 330, durationMinutes: 45, time: '01:30 PM', patient: 'Patricia Gomez', doctor: 'Dr. Vance · Ste 102', status: 'Confirmed', tone: 'confirmed' },
  // Friday
  { id: 'ev-12', day: 4, startMinutes: 60, durationMinutes: 45, time: '09:00 AM', patient: 'Gwen Stacy', status: 'Confirmed', tone: 'confirmed' },
  { id: 'ev-13', day: 4, startMinutes: 375, durationMinutes: 45, time: '02:15 PM', patient: 'Felix Baum', doctor: 'Dr. Chen · Ortho', status: 'Confirmed', tone: 'confirmed' },
  { id: 'ev-14', day: 4, startMinutes: 480, durationMinutes: 45, time: '04:00 PM', patient: 'Zoe Saldana', doctor: 'Dr. Vance · Ste 101', status: 'Confirmed', tone: 'confirmed' },
  // Saturday
  { id: 'ev-15', day: 5, startMinutes: 120, durationMinutes: 45, time: '10:00 AM', patient: 'Urgent Walk-in', doctor: 'Weekend Roster', badge: 'Bay 1', tone: 'urgent' },
];

export const calendarMiddayBanner: CalendarBanner = {
  startMinutes: 240,
  durationMinutes: 60,
  label: 'MIDDAY CLINICAL HANDOVER & STERILIZATION WINDOW (12:00 – 01:00 PM)',
};

export const calendarEndBannerLabel = 'END OF SCHEDULED CLINIC HOURS • EMERGENCY ROSTER TRANSITIONS TO EVENING CALL';

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
  { name: 'Dr. Marcus Vance', dept: 'Cardiology Lead', avatar: 'https://i.pravatar.cc/60?img=12', shiftStart: '08:00', shiftEnd: '16:30', station: 'Suite 101 / 102', statusLabel: 'On Floor', statusTone: 'on-floor', visits: '6 / 8 Visits' },
  { name: 'Dr. Elena Rostova', dept: 'Pediatric Dept', avatar: 'https://i.pravatar.cc/60?img=48', shiftStart: '08:30', shiftEnd: '17:00', station: 'Suite 204', statusLabel: 'On Floor', statusTone: 'on-floor', visits: '5 / 7 Visits' },
  { name: 'Dr. Aisha Patel', dept: 'Internal Medicine', avatar: 'https://i.pravatar.cc/60?img=32', shiftStart: '09:00', shiftEnd: '18:00', station: 'Suite 103', statusLabel: 'In Consult', statusTone: 'in-consult', visits: '4 / 9 Visits' },
];
