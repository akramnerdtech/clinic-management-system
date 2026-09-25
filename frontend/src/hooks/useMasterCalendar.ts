import { useState } from 'react';
import { calendarService } from '@/services/calendarService';

export function useMasterCalendar() {
  const [gridBounds] = useState(() => calendarService.getGridBounds());
  const [dayHeaders] = useState(() => calendarService.getDayHeaders());
  const [weekRangeLabel] = useState(() => calendarService.getWeekRangeLabel());
  const [syncLabel] = useState(() => calendarService.getSyncLabel());
  const [now] = useState(() => calendarService.getNow());
  const [events] = useState(() => calendarService.getEvents());
  const [middayBanner] = useState(() => calendarService.getMiddayBanner());
  const [endBannerLabel] = useState(() => calendarService.getEndBannerLabel());
  const [suiteUtilizationRows] = useState(() => calendarService.getSuiteUtilizationRows());
  const [roomStatuses] = useState(() => calendarService.getRoomStatuses());
  const [physicianShifts] = useState(() => calendarService.getPhysicianShifts());

  return {
    gridBounds, dayHeaders, weekRangeLabel, syncLabel, now, events,
    middayBanner, endBannerLabel, suiteUtilizationRows, roomStatuses, physicianShifts,
  };
}
