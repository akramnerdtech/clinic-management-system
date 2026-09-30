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
import { loadFromStorage, saveToStorage } from '@/utils/storage';
import { addDays, weekdayIndex } from '@/utils/calendarDates';

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

export function timeToMinutes(time?: string): number {
  if (!time) return 0;
  const match = time.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!match) return 0;
  const rawHour = Number(match[1]);
  const minute = Number(match[2]);
  const period = match[3].toUpperCase();
  const hour24 = (rawHour % 12) + (period === 'PM' ? 12 : 0);
  return hour24 * 60 + minute;
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
  slots: DoctorSlotInfo[];
}

export const calendarService = {
  getGridBounds(): { startHour: number; endHour: number } {
    return loadFromStorage(KEYS.gridBounds, {
      startHour: calendarGridStartHour,
      endHour: calendarGridEndHour,
    });
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
   * Retrieves all calendar events merged from both:
   * 1. Stored calendar events
   * 2. Live appointments from `appointmentsService`
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
        : event.startMinutes < 480
          ? calendarGridStartHour * 60 + event.startMinutes
          : event.startMinutes;

      const isBooked =
        event.status?.toLowerCase().includes('book') ||
        event.status?.toLowerCase().includes('confirm');

      return {
        ...event,
        doctorName: docName,
        doctor: doc,
        room: event.room ?? seedEvent?.room ?? 'Room 1',
        date,
        startMinutes,
        durationMinutes: event.durationMinutes || 15,
        tone: isBooked ? 'confirmed' : (event.tone ?? 'confirmed'),
        status: isBooked ? 'Slot Booked' : (event.status || 'Slot Booked'),
        badge: isBooked ? 'SLOT BOOKED' : (event.badge || 'SLOT BOOKED'),
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
        const room = entry[8] || 'Suite 105';
        const startMinutes = timeToMinutes(time);
        const durationMatch = entry[1]?.match(/(\d+)\s*min/i);
        const durationMinutes = durationMatch ? Number(durationMatch[1]) : 15;

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
          room,
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

  getDoctorOptions(): CalendarDoctorOption[] {
    return doctorsService.getDoctors().map((doctor) => ({
      name: doctor[0],
      specialty: doctor[1],
      room: doctor[2],
      onDuty: doctor[4] === 'ON DUTY' || doctor[4] === 'ON FLOOR' || doctor[4] === 'ACTIVE FLOOR',
      avatar: doctor[6],
    }));
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
    const seed = new Map(physicianShifts.map((physician) => [physician.name, physician.doctorName]));

    return loadFromStorage(KEYS.physicianShifts, physicianShifts).map((physician) => ({
      ...physician,
      doctorName: physician.doctorName ?? seed.get(physician.name),
    }));
  },

  /**
   * Calculates the availability and 15-minute slot intervals for a given doctor on a specific date.
   */
  getDoctorDaySchedule(doctorName: string, dateKey: string): DoctorScheduleDayInfo {
    const parsedDate = new Date(`${dateKey}T00:00:00`);
    const dayIndex = parsedDate.getDay(); // 0: Sun, 1: Mon, ...
    const dayCodes = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    const dayCode = dayCodes[dayIndex];

    const normTarget = normalizeDoctor(doctorName);

    // 1. Check doctorScheduleConfigs
    let matchedConfig = Object.values(doctorScheduleConfigs).find(
      (cfg) => normalizeDoctor(cfg.name) === normTarget,
    );

    // 2. Check registered doctors
    const registered = doctorsService.getDoctors().find(
      (d) => normalizeDoctor(d[0]) === normTarget,
    );

    let start = '09:00';
    let end = '17:00';
    let suite = registered?.[2] || matchedConfig?.suite || 'Suite 101';
    let hasSchedule = false;

    if (matchedConfig && matchedConfig.weekdays.includes(dayIndex)) {
      hasSchedule = true;
      start = `${String(matchedConfig.startHour).padStart(2, '0')}:00`;
      end = `${String(matchedConfig.endHour).padStart(2, '0')}:00`;
      suite = matchedConfig.suite;
    } else if (registered?.[7]?.[dayCode]?.start && registered?.[7]?.[dayCode]?.end) {
      hasSchedule = true;
      start = registered[7][dayCode].start;
      end = registered[7][dayCode].end;
      suite = registered[2];
    } else if (dayIndex >= 1 && dayIndex <= 5) {
      // General weekday schedule default if doctor is on duty
      hasSchedule = true;
      start = '09:00';
      end = '17:00';
    }

    if (!hasSchedule) {
      return {
        hasSchedule: false,
        start,
        end,
        startMinutes: 0,
        endMinutes: 0,
        suite,
        slots: [],
      };
    }

    const startMinutes = timeToMinutes(start);
    const endMinutes = timeToMinutes(end);
    const slots: DoctorSlotInfo[] = [];

    for (let m = startMinutes; m < endMinutes; m += 15) {
      const slotStart = formatTime(m);
      const slotEnd = formatTime(m + 15);
      slots.push({
        time: `${slotStart} - ${slotEnd}`,
        startMinutes: m,
        durationMinutes: 15,
      });
    }

    return {
      hasSchedule: true,
      start,
      end,
      startMinutes,
      endMinutes,
      suite,
      slots,
    };
  },

  getEventDoctorName,
};