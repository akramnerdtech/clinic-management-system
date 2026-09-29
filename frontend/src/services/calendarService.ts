import {
  calendarGridStartHour, calendarGridEndHour, calendarDayHeaders, calendarWeekRangeLabel,
  calendarSyncLabel, calendarNowLabel, calendarNowMinutes, calendarEvents, calendarMiddayBanner,
  calendarEndBannerLabel, suiteUtilizationRows, roomStatuses, physicianShifts,
  calendarToday, calendarWeekStart,
} from '@/data/calendar';
import { doctorsService } from '@/services/doctorsService';
import { loadFromStorage } from '@/utils/storage';
import { addDays } from '@/utils/calendarDates';
import type {
  CalendarDayHeader, CalendarEvent, CalendarBanner, SuiteUtilizationRow, RoomStatus, PhysicianShift,
  CalendarDoctorOption,
} from '@/types';

const KEYS = {
  gridBounds: 'curaclinic.calendar.gridBounds',
  dayHeaders: 'curaclinic.calendar.dayHeaders',
  weekRangeLabel: 'curaclinic.calendar.weekRangeLabel',
  syncLabel: 'curaclinic.calendar.syncLabel',
  now: 'curaclinic.calendar.now',
  events: 'curaclinic.calendar.events',
  middayBanner: 'curaclinic.calendar.middayBanner',
  endBannerLabel: 'curaclinic.calendar.endBannerLabel',
  suiteUtilizationRows: 'curaclinic.calendar.suiteUtilizationRows',
  roomStatuses: 'curaclinic.calendar.roomStatuses',
  physicianShifts: 'curaclinic.calendar.physicianShifts',
};

export const calendarService = {
  getGridBounds(): { startHour: number; endHour: number } {
    return loadFromStorage(KEYS.gridBounds, { startHour: calendarGridStartHour, endHour: calendarGridEndHour });
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
  getNow(): { label: string; minutes: number } {
    return loadFromStorage(KEYS.now, { label: calendarNowLabel, minutes: calendarNowMinutes });
  },
  /** The clinic's "today" (ISO date) — the demo schedule is anchored to this day. */
  getToday(): string {
    return calendarToday;
  },
  getEvents(): CalendarEvent[] {
    const stored = loadFromStorage(KEYS.events, calendarEvents);
    // Events cached before the doctor / room filters existed lack those fields; backfill from the seed by id.
    const seed = new Map(calendarEvents.map((e) => [e.id, e]));
    return stored.map((e) => ({
      ...e,
      doctorName: e.doctorName ?? seed.get(e.id)?.doctorName,
      room: e.room ?? seed.get(e.id)?.room,
      // Each event knows its weekday; anchor it to the seed week to get a real calendar date.
      date: e.date ?? addDays(calendarWeekStart, e.day),
    }));
  },
  /** Doctors available in the calendar's doctor filter, taken from the live doctor roster. */
  getDoctorOptions(): CalendarDoctorOption[] {
    return doctorsService.getDoctors().map((d) => ({
      name: d[0], specialty: d[1], room: d[2], onDuty: d[4] === 'ON DUTY', avatar: d[6],
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
    const seed = new Map(physicianShifts.map((p) => [p.name, p.doctorName]));
    return loadFromStorage(KEYS.physicianShifts, physicianShifts)
      .map((p) => ({ ...p, doctorName: p.doctorName ?? seed.get(p.name) }));
  },
};
