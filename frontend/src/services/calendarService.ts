import {
  calendarGridStartHour,
  calendarGridEndHour,
  calendarDayHeaders,
  calendarWeekRangeLabel,
  calendarSyncLabel,
  calendarEvents,
  calendarMiddayBanner,
  calendarEndBannerLabel,
  suiteUtilizationRows,
  roomStatuses,
  physicianShifts,
  calendarWeekStart,
} from '@/data/calendar';

import { doctorsService } from '@/services/doctorsService';
import { appointmentsService } from '@/services/appointmentsService';
import { doctorScheduleConfigs } from '@/data/newAppointment';
import { getDoctorRoomAndOpd } from '@/services/wardAllocationService';
import { loadFromStorage, saveToStorage } from '@/utils/storage';
import { addDays, weekdayIndex, WEEKDAY_SHORT } from '@/utils/calendarDates';

import type {
  CalendarDayHeader,
  CalendarEvent,
  CalendarBanner,
  SuiteUtilizationRow,
  RoomStatus,
  PhysicianShift,
  CalendarDoctorOption,
} from '@/types';

const KEYS = {
  gridBounds: 'curaclinic.calendar.gridBounds',
  dayHeaders: 'curaclinic.calendar.dayHeaders',
  weekRangeLabel: 'curaclinic.calendar.weekRangeLabel',
  syncLabel: 'curaclinic.calendar.syncLabel',
  events: 'curaclinic.calendar.events',
  middayBanner: 'curaclinic.calendar.middayBanner',
  endBannerLabel: 'curaclinic.calendar.endBannerLabel',
  suiteUtilizationRows: 'curaclinic.calendar.suiteUtilizationRows',
  roomStatuses: 'curaclinic.calendar.roomStatuses',
  physicianShifts: 'curaclinic.calendar.physicianShifts',
};

function getToday(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getNow(): { label: string; minutes: number } {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const hour12 = hours % 12 || 12;
  const period = hours >= 12 ? 'PM' : 'AM';

  return {
    label: `${String(hour12).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${period}`,
    minutes: hours * 60 + minutes,
  };
}

/**
 * Robust time string to minutes converter.
 * Supports:
 * - 12-hour: "05:15 PM", "5:00 PM", "05:15 PM - 05:30 PM"
 * - 24-hour: "17:00", "17:15", "09:30", "18:00"
 */
export function timeToMinutes(time?: string): number {
  if (!time) return 0;
  const trimmed = time.trim();

  // 12-hour with AM / PM
  const match12 = trimmed.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (match12) {
    const rawHour = Number(match12[1]);
    const minute = Number(match12[2]);
    const period = match12[3].toUpperCase();
    const hour24 = (rawHour % 12) + (period === 'PM' ? 12 : 0);
    return hour24 * 60 + minute;
  }

  // 24-hour e.g. "17:00" or "09:30"
  const match24 = trimmed.match(/^(\d{1,2}):(\d{2})/);
  if (match24) {
    const hour = Number(match24[1]);
    const minute = Number(match24[2]);
    return hour * 60 + minute;
  }

  return 0;
}

export function formatTime(minutes: number): string {
  const hour24 = Math.floor(minutes / 60);
  const min = minutes % 60;
  const hour12 = hour24 % 12 || 12;
  const period = hour24 >= 12 ? 'PM' : 'AM';
  return `${String(hour12).padStart(2, '0')}:${String(min).padStart(2, '0')} ${period}`;
}

export function formatTimeSlot(startMinutes: number, duration = 15): string {
  return `${formatTime(startMinutes)} - ${formatTime(startMinutes + duration)}`;
}

export function normalizeDate(date?: string): string {
  if (!date) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return '';
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  return `${parsed.getFullYear()}-${month}-${day}`;
}

export function normalizeDoctor(name?: string): string {
  if (!name) return '';
  return name.replace(/\s*\([^)]*\)/g, '').trim().toLowerCase();
}

function getEventDoctorName(event: CalendarEvent): string {
  return event.doctorName?.trim() || event.doctor?.trim() || '';
}

export interface DoctorSlotInfo {
  time: string;
  startMinutes: number;
  durationMinutes: number;
}

export interface DoctorScheduleDayInfo {
  hasSchedule: boolean;
  start: string;
  end: string;
  startMinutes: number;
  endMinutes: number;
  suite: string;
  opd: string;
  slots: DoctorSlotInfo[];
}

export const calendarService = {
  /**
   * Calendar Operating Bounds: Strictly 10:00 AM to 08:00 PM (10am to 8pm)
   */
  getGridBounds(): { startHour: number; endHour: number } {
    return {
      startHour: 10,
      endHour: 20,
    };
  },

  getDoctorGridBounds(doctorName?: string | null): { startHour: number; endHour: number } {
    if (!doctorName) {
      return { startHour: 10, endHour: 20 };
    }
    const normTarget = normalizeDoctor(doctorName);
    const doctor = doctorsService.getDoctors().find(
      (d) => normalizeDoctor(d[0]) === normTarget,
    );
    if (!doctor) {
      return { startHour: 10, endHour: 20 };
    }

    const weekly = doctor[7];
    let minMinutes = 10 * 60;
    let maxMinutes = 20 * 60;

    if (weekly && typeof weekly === 'object') {
      let foundSession = false;
      Object.values(weekly).forEach((daySched) => {
        if (!daySched || daySched.active === false) return;
        if (daySched.sessions && daySched.sessions.length > 0) {
          daySched.sessions.forEach((s) => {
            const sm = timeToMinutes(s.start);
            const em = timeToMinutes(s.end);
            if (sm > 0 && em > sm) {
              minMinutes = foundSession ? Math.min(minMinutes, sm) : sm;
              maxMinutes = foundSession ? Math.max(maxMinutes, em) : em;
              foundSession = true;
            }
          });
        } else if (daySched.start && daySched.end) {
          const sm = timeToMinutes(daySched.start);
          const em = timeToMinutes(daySched.end);
          if (sm > 0 && em > sm) {
            minMinutes = foundSession ? Math.min(minMinutes, sm) : sm;
            maxMinutes = foundSession ? Math.max(maxMinutes, em) : em;
            foundSession = true;
          }
        }
      });
    }

    const startHour = Math.max(6, Math.min(10, Math.floor(minMinutes / 60)));
    const endHour = Math.min(23, Math.max(20, Math.ceil(maxMinutes / 60)));
    return { startHour, endHour };
  },

  getDayHeaders(): CalendarDayHeader[] {
    return loadFromStorage(KEYS.dayHeaders, calendarDayHeaders);
  },

  getWeekRangeLabel(): string {
    return loadFromStorage(KEYS.weekRangeLabel, calendarWeekRangeLabel);
  },

  getSyncLabel(): string {
    return loadFromStorage(KEYS.syncLabel, calendarSyncLabel);
  },

  getToday,
  getNow,

  /**
   * Retrieves all calendar events merged from stored calendar events and live appointments.
   * Every booked visit carries assigned room, OPD, green tone, and 'Slot Booked' status.
   */
  getEvents(): CalendarEvent[] {
    const stored = loadFromStorage<CalendarEvent[]>(KEYS.events, calendarEvents);
    const seed = new Map(calendarEvents.map((event) => [event.id, event]));

    const processedStored: CalendarEvent[] = stored
      .filter((event) => !event.id.startsWith('cal-'))
      .map((event) => {
        const seedEvent = seed.get(event.id);
        const docName = event.doctorName ?? event.doctor ?? seedEvent?.doctorName;
        const doc = event.doctor ?? event.doctorName ?? seedEvent?.doctor;
        const date = event.date ?? seedEvent?.date ?? addDays(calendarWeekStart, event.day ?? 0);
        const parsedStart = timeToMinutes(event.time);
        const startMinutes = parsedStart > 0
          ? parsedStart
          : event.startMinutes < 600
            ? 10 * 60 + event.startMinutes
            : event.startMinutes;

        const isBooked =
          event.status?.toLowerCase().includes('book') ||
          event.status?.toLowerCase().includes('confirm') ||
          true;

        const resolved = getDoctorRoomAndOpd({
          doctorName: docName || doc,
          doctorSuite: event.room || seedEvent?.room,
          customOpd: event.opd,
        });

        return {
          ...event,
          doctorName: docName,
          doctor: doc,
          room: resolved.room,
          opd: resolved.opd,
          date,
          startMinutes,
          durationMinutes: event.durationMinutes || 15,
          tone: isBooked ? 'confirmed' : (event.tone ?? 'confirmed'),
          status: 'Slot Booked',
          badge: 'SLOT BOOKED',
        };
      });

    // Also bring in every non-cancelled appointment from appointmentsService
    const appointments = appointmentsService.getEntries();
    const apptEvents: CalendarEvent[] = appointments
      .filter((entry) => entry[10] !== 'Cancelled')
      .map((entry) => {
        const time = entry[0];
        const date = normalizeDate(entry[11]) || getToday();
        const doctor = entry[7] || 'Doctor';
        const patient = entry[3] || 'Patient';
        const rawRoom = entry[8] || 'Suite 105';
        const rawOpd = entry[12];
        const startMinutes = timeToMinutes(time);
        const durationMatch = entry[1]?.match(/(\d+)\s*min/i);
        const durationMinutes = durationMatch ? Number(durationMatch[1]) : 15;

        const resolved = getDoctorRoomAndOpd({
          doctorName: doctor,
          doctorSuite: rawRoom,
          customOpd: rawOpd,
        });

        return {
          id: entry[2] || `appt-${date}-${doctor}-${time}`,
          date,
          day: weekdayIndex(date),
          time,
          startMinutes,
          durationMinutes,
          patient,
          doctor,
          doctorName: doctor,
          room: resolved.room,
          opd: resolved.opd,
          status: 'Slot Booked',
          tone: 'confirmed',
          badge: 'SLOT BOOKED',
        };
      });

    // Combine and deduplicate
    const combined = new Map<string, CalendarEvent>();
    processedStored.forEach((ev) => combined.set(ev.id, ev));
    apptEvents.forEach((ev) => combined.set(ev.id, ev));

    return Array.from(combined.values());
  },

  addEvent(event: CalendarEvent): void {
    const events = loadFromStorage<CalendarEvent[]>(KEYS.events, calendarEvents);
    const existingIndex = events.findIndex((item) => item.id === event.id);

    if (existingIndex >= 0) {
      events[existingIndex] = event;
    } else {
      events.push(event);
    }

    saveToStorage(KEYS.events, events);
    window.dispatchEvent(new CustomEvent('clinic-calendar-updated'));
  },

  removeEvent(eventId: string): void {
    const events = loadFromStorage<CalendarEvent[]>(KEYS.events, calendarEvents);
    const updated = events.filter((event) => event.id !== eventId);
    saveToStorage(KEYS.events, updated);
    window.dispatchEvent(new CustomEvent('clinic-calendar-updated'));
  },

  clearAllEvents(): void {
    saveToStorage(KEYS.events, []);
    window.dispatchEvent(new CustomEvent('clinic-calendar-updated'));
  },

  getDoctorOptions(): CalendarDoctorOption[] {
    const doctors = doctorsService.getDoctors();
    return doctors.map((doctor) => {
      const weekly = doctor[7];
      let slotTime = '10:00 AM – 12:00 PM • 06:00 PM – 08:00 PM';
      if (weekly && typeof weekly === 'object' && Object.keys(weekly).length > 0) {
        const activeDays = Object.values(weekly).filter((d) => d && d.active !== false);
        const firstDay = activeDays[0] || Object.values(weekly)[0];
        if (firstDay?.sessions && firstDay.sessions.length > 0) {
          slotTime = firstDay.sessions
            .map((s) => `${formatTime(timeToMinutes(s.start))} – ${formatTime(timeToMinutes(s.end))}`)
            .join(' • ');
        } else if (firstDay?.start && firstDay?.end) {
          slotTime = `${formatTime(timeToMinutes(firstDay.start))} – ${formatTime(timeToMinutes(firstDay.end))}`;
        }
      }
      return {
        name: doctor[0],
        specialty: doctor[1],
        room: doctor[2],
        onDuty: doctor[4] === 'ON DUTY' || doctor[4] === 'ON FLOOR' || doctor[4] === 'ACTIVE FLOOR',
        avatar: '', // DO NOT show doctor image in Master Calendar
        slotTime,
      };
    });
  },

  getMiddayBanner(): CalendarBanner {
    return loadFromStorage(KEYS.middayBanner, calendarMiddayBanner);
  },

  getEndBannerLabel(): string {
    return loadFromStorage(KEYS.endBannerLabel, calendarEndBannerLabel);
  },

  getSuiteUtilizationRows(): SuiteUtilizationRow[] {
    return loadFromStorage(KEYS.suiteUtilizationRows, suiteUtilizationRows);
  },

  getRoomStatuses(): RoomStatus[] {
    return loadFromStorage(KEYS.roomStatuses, roomStatuses);
  },

  getPhysicianShifts(): PhysicianShift[] {
    const roster = doctorsService.getDoctors();

    if (roster.length > 0) {
      return roster.map((doctor) => {
        const weekly = doctor[7];
        let shiftStart = '10:00';
        let shiftEnd = '20:00';
        if (weekly && typeof weekly === 'object' && Object.keys(weekly).length > 0) {
          const activeDays = Object.values(weekly).filter((d) => d && d.active !== false);
          const firstDay = activeDays[0] || Object.values(weekly)[0];
          if (firstDay?.sessions && firstDay.sessions.length > 0) {
            shiftStart = firstDay.sessions[0].start;
            shiftEnd = firstDay.sessions[firstDay.sessions.length - 1].end;
          } else {
            if (firstDay?.start) shiftStart = firstDay.start;
            if (firstDay?.end) shiftEnd = firstDay.end;
          }
        }
        const isOnDuty = doctor[4] === 'ON DUTY';
        return {
          name: doctor[0],
          doctorName: doctor[0],
          dept: doctor[1],
          avatar: '', // NO DR IMAGE IN MASTER CALENDAR
          shiftStart: formatTime(timeToMinutes(shiftStart)),
          shiftEnd: formatTime(timeToMinutes(shiftEnd)),
          station: doctor[2] || 'Suite 105',
          statusLabel: isOnDuty ? 'On Floor' : 'Off Duty',
          statusTone: (isOnDuty ? 'on-floor' : 'in-consult') as 'on-floor' | 'in-consult',
          visits: `${doctor[5] || '0/16'} Visits`,
        };
      });
    }

    return [];
  },

  /**
   * Checks whether the given doctor is scheduled/available on a specific date (ISO or date key).
   * Strict source of truth: only active working days added for this doctor are true.
   */
  isDoctorAvailableOnDay(doctorName: string, dateKeyOrIso: string): boolean {
    if (!doctorName || !dateKeyOrIso) return false;
    const cleanDate = normalizeDate(dateKeyOrIso);
    if (!cleanDate) return false;

    // ISO day code ('MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN')
    const dayCode = WEEKDAY_SHORT[weekdayIndex(cleanDate)];
    const normTarget = normalizeDoctor(doctorName);
    const doctor = doctorsService.getDoctors().find(
      (d) => normalizeDoctor(d[0]) === normTarget,
    );
    if (!doctor) return false;

    // Doctor explicitly marked OFF DUTY
    if (doctor[4] === 'OFF DUTY') return false;

    // 1. Weekly schedule is the primary source of truth from AddDoctorPage
    const weekly = doctor[7];
    if (weekly && typeof weekly === 'object' && Object.keys(weekly).length > 0) {
      const daySched = weekly[dayCode];
      return Boolean(daySched && daySched.active !== false);
    }

    // 2. Legacy fallback: check workingDays string (doctor[3])
    if (doctor[3]) {
      const upper = doctor[3].toUpperCase();
      if (upper.includes(dayCode)) return true;
      const code2 = dayCode.slice(0, 2);
      if (upper.includes(code2)) return true;
      if (dayCode === 'MON' && (upper.includes('M') || upper.includes('MON'))) return true;
      if (dayCode === 'WED' && (upper.includes('W') || upper.includes('WED'))) return true;
      if (dayCode === 'FRI' && (upper.includes('F') || upper.includes('FRI'))) return true;
    }

    return false;
  },

  /**
   * Returns list of 3-letter day codes on which the doctor is available: e.g. ['MON', 'WED']
   */
  getDoctorAvailableDayCodes(doctorName: string): string[] {
    const dayCodes = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
    const normTarget = normalizeDoctor(doctorName);
    const doctor = doctorsService.getDoctors().find(
      (d) => normalizeDoctor(d[0]) === normTarget,
    );
    if (!doctor || doctor[4] === 'OFF DUTY') return [];

    const weekly = doctor[7];
    if (weekly && typeof weekly === 'object' && Object.keys(weekly).length > 0) {
      return dayCodes.filter((code) => weekly[code] && weekly[code]?.active !== false);
    }

    if (doctor[3]) {
      const upper = doctor[3].toUpperCase();
      return dayCodes.filter((code) => {
        if (upper.includes(code)) return true;
        const code2 = code.slice(0, 2);
        if (upper.includes(code2)) return true;
        if (code === 'MON' && upper.includes('M')) return true;
        if (code === 'WED' && upper.includes('W')) return true;
        if (code === 'FRI' && upper.includes('F')) return true;
        return false;
      });
    }

    return [];
  },

  /**
   * Calculates the availability and 15-minute slot intervals for a given doctor on a specific date.
   * Only generates slots for listed doctors and strictly on their configured duty days.
   */
  getDoctorDaySchedule(doctorName: string, dateKey: string): DoctorScheduleDayInfo {
    const parsedDate = new Date(`${dateKey}T00:00:00`);
    const dayCodes = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    const dayCode = dayCodes[parsedDate.getDay()];

    const normTarget = normalizeDoctor(doctorName);
    const registered = doctorsService.getDoctors().find(
      (d) => normalizeDoctor(d[0]) === normTarget,
    );

    if (!registered) {
      return {
        hasSchedule: false,
        start: '10:00',
        end: '20:00',
        startMinutes: 0,
        endMinutes: 0,
        suite: 'Suite 105',
        opd: 'General OPD',
        slots: [],
      };
    }

    const suite = registered[2] || 'Suite 105';
    const roomOpd = getDoctorRoomAndOpd({
      doctorName,
      specialty: registered[1],
      doctorSuite: suite,
    });

    // Check availability strictly on this day: DO NOT show anything else on off-duty days!
    const isAvailable = this.isDoctorAvailableOnDay(doctorName, dateKey);
    if (!isAvailable) {
      return {
        hasSchedule: false,
        start: '10:00',
        end: '20:00',
        startMinutes: 0,
        endMinutes: 0,
        suite: roomOpd.room,
        opd: roomOpd.opd,
        slots: [],
      };
    }

    // Doctor is available on this day! Extract only their configured sessions:
    let sessions: Array<{ start: string; end: string }> = [];
    const weekly = registered[7];
    if (weekly && weekly[dayCode]) {
      const daySched = weekly[dayCode];
      if (daySched?.sessions && daySched.sessions.length > 0) {
        sessions = daySched.sessions.filter(
          (s) => s.start && s.end && timeToMinutes(s.end) > timeToMinutes(s.start),
        );
      } else if (daySched?.start && daySched?.end) {
        sessions = [{ start: daySched.start, end: daySched.end }];
      }
    }

    if (sessions.length === 0) {
      sessions = [
        { start: '10:00', end: '12:00' },
        { start: '18:00', end: '20:00' },
      ];
    }

    const start = sessions[0].start;
    const end = sessions[sessions.length - 1].end;

    const slots: DoctorSlotInfo[] = [];
    for (const session of sessions) {
      const sStart = timeToMinutes(session.start);
      const sEnd = timeToMinutes(session.end);
      if (sEnd > sStart) {
        for (let m = sStart; m < sEnd; m += 15) {
          slots.push({
            time: `${formatTime(m)} - ${formatTime(m + 15)}`,
            startMinutes: m,
            durationMinutes: 15,
          });
        }
      }
    }

    return {
      hasSchedule: true,
      start,
      end,
      startMinutes: timeToMinutes(start),
      endMinutes: timeToMinutes(end),
      suite: roomOpd.room,
      opd: roomOpd.opd,
      slots,
    };
  },

  getEventDoctorName,
};