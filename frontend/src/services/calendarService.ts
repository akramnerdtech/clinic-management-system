import {
  calendarGridStartHour, calendarGridEndHour, calendarDayHeaders, calendarWeekRangeLabel,
  calendarSyncLabel, calendarNowLabel, calendarNowMinutes, calendarEvents, calendarMiddayBanner,
  calendarEndBannerLabel, suiteUtilizationRows, roomStatuses, physicianShifts,
} from '@/data/calendar';
import { loadFromStorage } from '@/utils/storage';
import type {
  CalendarDayHeader, CalendarEvent, CalendarBanner, SuiteUtilizationRow, RoomStatus, PhysicianShift,
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
  getEvents(): CalendarEvent[] {
    return loadFromStorage(KEYS.events, calendarEvents);
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
    return loadFromStorage(KEYS.physicianShifts, physicianShifts);
  },
};
