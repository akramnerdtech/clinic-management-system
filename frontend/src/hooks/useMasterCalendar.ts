import { useCallback, useMemo, useState } from 'react';
import { calendarService } from '@/services/calendarService';
import {
  getColumnDates, getMonthWeeks, getRangeLabel, getVisibleRange, parseISO, shiftAnchor, weekdayIndex, WEEKDAY_SHORT,
} from '@/utils/calendarDates';
import type { CalendarView } from '@/utils/calendarDates';
import { CALENDAR_STATUS_OPTIONS, countBy, eventStatus, filterCalendarEvents } from '@/utils/calendarFilters';
import type { CalendarColumn } from '@/types';

export function useMasterCalendar() {
  const [gridBounds] = useState(() => calendarService.getGridBounds());
  const [syncLabel] = useState(() => calendarService.getSyncLabel());
  const [now] = useState(() => calendarService.getNow());
  const [today] = useState(() => calendarService.getToday());
  const [allEvents] = useState(() => calendarService.getEvents());
  const [middayBanner] = useState(() => calendarService.getMiddayBanner());
  const [endBannerLabel] = useState(() => calendarService.getEndBannerLabel());
  const [suiteUtilizationRows] = useState(() => calendarService.getSuiteUtilizationRows());
  const [roomStatuses] = useState(() => calendarService.getRoomStatuses());
  const [physicianShifts] = useState(() => calendarService.getPhysicianShifts());
  const [doctorOptions] = useState(() => calendarService.getDoctorOptions());

  const [view, setView] = useState<CalendarView>('Week');
  const [anchor, setAnchor] = useState(today);
  const [selectedDoctor, setSelectedDoctor] = useState<string | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);

  const goToday = useCallback(() => setAnchor(today), [today]);
  const goPrev = useCallback(() => setAnchor((a) => shiftAnchor(view, a, -1)), [view]);
  const goNext = useCallback(() => setAnchor((a) => shiftAnchor(view, a, 1)), [view]);
  /** Jump to a single day (used when a month cell is clicked). */
  const openDay = useCallback((iso: string) => {
    setAnchor(iso);
    setView('Day');
  }, []);

  const range = useMemo(() => getVisibleRange(view, anchor), [view, anchor]);
  const rangeLabel = useMemo(() => getRangeLabel(view, anchor), [view, anchor]);
  const isCurrentPeriod = today >= range.start && today <= range.end;

  const columns = useMemo<CalendarColumn[]>(
    () => getColumnDates(view, anchor).map((iso) => ({
      iso,
      label: WEEKDAY_SHORT[weekdayIndex(iso)],
      date: parseISO(iso).getDate(),
      today: iso === today,
    })),
    [view, anchor, today],
  );
  const monthWeeks = useMemo(() => (view === 'Month' ? getMonthWeeks(anchor) : []), [view, anchor]);

  const filters = useMemo(
    () => ({ doctor: selectedDoctor, room: selectedRoom, status: selectedStatus }),
    [selectedDoctor, selectedRoom, selectedStatus],
  );

  /** Everything scheduled in the visible period, before the doctor / room / status filters. */
  const periodEvents = useMemo(
    () => allEvents.filter((e) => e.date && e.date >= range.start && e.date <= range.end),
    [allEvents, range],
  );
  const events = useMemo(() => filterCalendarEvents(periodEvents, filters), [periodEvents, filters]);

  // Each dropdown's counts ignore its own filter, so they show what picking that option would give.
  const appointmentCounts = useMemo(
    () => countBy(filterCalendarEvents(periodEvents, filters, 'doctor'), (e) => e.doctorName),
    [periodEvents, filters],
  );
  const totalAppointments = useMemo(
    () => filterCalendarEvents(periodEvents, filters, 'doctor').length,
    [periodEvents, filters],
  );

  const roomOptions = useMemo(() => {
    const counts = countBy(filterCalendarEvents(periodEvents, filters, 'room'), (e) => e.room);
    const rooms = Array.from(new Set(allEvents.map((e) => e.room).filter((r): r is string => Boolean(r))))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    return rooms.map((r) => ({ value: r, label: r, count: counts[r] ?? 0 }));
  }, [allEvents, periodEvents, filters]);

  const statusOptions = useMemo(() => {
    const counts = countBy(filterCalendarEvents(periodEvents, filters, 'status'), eventStatus);
    return CALENDAR_STATUS_OPTIONS.map((s) => ({ value: s, label: s, count: counts[s] ?? 0 }));
  }, [periodEvents, filters]);
  const roomTotal = useMemo(
    () => filterCalendarEvents(periodEvents, filters, 'room').length,
    [periodEvents, filters],
  );
  const statusTotal = useMemo(
    () => filterCalendarEvents(periodEvents, filters, 'status').length,
    [periodEvents, filters],
  );

  const hasActiveFilters = Boolean(selectedDoctor || selectedRoom || selectedStatus);
  const clearFilters = useCallback(() => {
    setSelectedDoctor(null);
    setSelectedRoom(null);
    setSelectedStatus(null);
  }, []);

  return {
    gridBounds, syncLabel, middayBanner, endBannerLabel, suiteUtilizationRows, roomStatuses, physicianShifts,
    // navigation
    view, setView, rangeLabel, isCurrentPeriod, goToday, goPrev, goNext, openDay,
    columns, monthWeeks, today,
    // the now-line only makes sense while today is on screen
    now: columns.some((c) => c.today) ? now : null,
    // data
    events,
    // filters
    doctorOptions, selectedDoctor, setSelectedDoctor, appointmentCounts, totalAppointments,
    roomOptions, selectedRoom, setSelectedRoom, roomTotal,
    statusOptions, selectedStatus, setSelectedStatus, statusTotal,
    hasActiveFilters, clearFilters,
  };
}
