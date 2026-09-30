import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { calendarService } from '@/services/calendarService';

import {
  getColumnDates,
  getMonthWeeks,
  getRangeLabel,
  getVisibleRange,
  parseISO,
  shiftAnchor,
  weekdayIndex,
  WEEKDAY_SHORT,
} from '@/utils/calendarDates';

import type { CalendarView } from '@/utils/calendarDates';

import {
  CALENDAR_STATUS_OPTIONS,
  countBy,
  eventStatus,
  filterCalendarEvents,
} from '@/utils/calendarFilters';

import type { CalendarColumn } from '@/types';

export function useMasterCalendar() {
  const [gridBounds] =
    useState(() =>
      calendarService.getGridBounds(),
    );

  const [syncLabel] =
    useState(() =>
      calendarService.getSyncLabel(),
    );

  const [today] =
    useState(() =>
      calendarService.getToday(),
    );

  const [now] =
    useState(() =>
      calendarService.getNow(),
    );

  const [allEvents, setAllEvents] = useState(() => calendarService.getEvents());
  const [middayBanner] = useState(() => calendarService.getMiddayBanner());
  const [endBannerLabel] = useState(() => calendarService.getEndBannerLabel());
  const [suiteUtilizationRows] = useState(() => calendarService.getSuiteUtilizationRows());
  const [roomStatuses] = useState(() => calendarService.getRoomStatuses());
  const [physicianShifts] = useState(() => calendarService.getPhysicianShifts());
  const [doctorOptions, setDoctorOptions] = useState(() => calendarService.getDoctorOptions());

  useEffect(() => {
    const handleUpdate = () => {
      setAllEvents(calendarService.getEvents());
      setDoctorOptions(calendarService.getDoctorOptions());
    };
    window.addEventListener('clinic-appointments-updated', handleUpdate);
    window.addEventListener('clinic-calendar-updated', handleUpdate);
    window.addEventListener('clinic-doctors-updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('clinic-appointments-updated', handleUpdate);
      window.removeEventListener('clinic-calendar-updated', handleUpdate);
      window.removeEventListener('clinic-doctors-updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  const refreshEvents = useCallback(() => {
    setAllEvents(calendarService.getEvents());
    setDoctorOptions(calendarService.getDoctorOptions());
  }, []);

  const getDoctorSchedule = useCallback(
    (doctor: string, dateKey: string) => calendarService.getDoctorDaySchedule(doctor, dateKey),
    [],
  );

  const [view, setView] =
    useState<CalendarView>(
      'Week',
    );

  const [anchor, setAnchor] =
    useState(today);

  const [selectedDoctor, setSelectedDoctor] =
    useState<string | null>(
      null,
    );

  // If only 1 doctor is registered in the clinic, auto-select them so their schedule slots are immediately visible
  useEffect(() => {
    if (!selectedDoctor && doctorOptions.length === 1) {
      setSelectedDoctor(doctorOptions[0].name);
    }
  }, [selectedDoctor, doctorOptions]);

  const [selectedRoom, setSelectedRoom] =
    useState<string | null>(
      null,
    );

  const [selectedStatus, setSelectedStatus] =
    useState<string | null>(
      null,
    );

  const goToday =
    useCallback(() => {
      setAnchor(today);
    }, [today]);

  const goPrev =
    useCallback(() => {
      setAnchor(
        (current) =>
          shiftAnchor(
            view,
            current,
            -1,
          ),
      );
    }, [view]);

  const goNext =
    useCallback(() => {
      setAnchor(
        (current) =>
          shiftAnchor(
            view,
            current,
            1,
          ),
      );
    }, [view]);

  const openDay =
    useCallback(
      (date: string) => {
        setAnchor(date);
        setView('Day');
      },
      [],
    );

  const range =
    useMemo(
      () =>
        getVisibleRange(
          view,
          anchor,
        ),
      [view, anchor],
    );

  const rangeLabel =
    useMemo(
      () =>
        getRangeLabel(
          view,
          anchor,
        ),
      [view, anchor],
    );

  const columns =
    useMemo<CalendarColumn[]>(
      () =>
        getColumnDates(
          view,
          anchor,
        ).map((iso) => ({
          iso,

          label:
            WEEKDAY_SHORT[
              weekdayIndex(iso)
            ],

          date:
            parseISO(
              iso,
            ).getDate(),

          today:
            iso === today,
        })),
      [
        view,
        anchor,
        today,
      ],
    );

  const monthWeeks =
    useMemo(
      () =>
        view === 'Month'
          ? getMonthWeeks(
              anchor,
            )
          : [],
      [view, anchor],
    );

  const filters =
    useMemo(
      () => ({
        doctor:
          selectedDoctor,
        room:
          selectedRoom,
        status:
          selectedStatus,
      }),
      [
        selectedDoctor,
        selectedRoom,
        selectedStatus,
      ],
    );

  const periodEvents =
    useMemo(
      () =>
        allEvents.filter(
          (event) =>
            Boolean(
              event.date,
            ) &&
            event.date! >=
              range.start &&
            event.date! <=
              range.end,
        ),
      [
        allEvents,
        range,
      ],
    );

  const events =
    useMemo(
      () =>
        filterCalendarEvents(
          periodEvents,
          filters,
        ),
      [
        periodEvents,
        filters,
      ],
    );

  /*
   * Doctor counts.
   *
   * Supports:
   * doctorName
   * doctor
   */

  const doctorEvents =
    useMemo(
      () =>
        filterCalendarEvents(
          periodEvents,
          filters,
          'doctor',
        ),
      [
        periodEvents,
        filters,
      ],
    );

  const appointmentCounts =
    useMemo(() => {
      const result: Record<
        string,
        number
      > = {};

      doctorEvents.forEach(
        (event) => {
          const name =
            calendarService.getEventDoctorName(
              event,
            );

          if (!name) {
            return;
          }

          result[name] =
            (result[name] ??
              0) + 1;
        },
      );

      return result;
    }, [doctorEvents]);

  const totalAppointments =
    doctorEvents.length;

  /*
   * Room counts
   */

  const roomOptions =
    useMemo(() => {
      const counts =
        countBy(
          filterCalendarEvents(
            periodEvents,
            filters,
            'room',
          ),
          (event) =>
            event.room,
        );

      const rooms =
        Array.from(
          new Set(
            allEvents
              .map(
                (event) =>
                  event.room,
              )
              .filter(
                (
                  room,
                ): room is string =>
                  Boolean(
                    room,
                  ),
              ),
          ),
        ).sort(
          (
            a,
            b,
          ) =>
            a.localeCompare(
              b,
              undefined,
              {
                numeric: true,
              },
            ),
        );

      return rooms.map(
        (room) => ({
          value: room,
          label: room,
          count:
            counts[room] ??
            0,
        }),
      );
    }, [
      allEvents,
      periodEvents,
      filters,
    ]);

  /*
   * Status counts
   */

  const statusOptions =
    useMemo(() => {
      const counts =
        countBy(
          filterCalendarEvents(
            periodEvents,
            filters,
            'status',
          ),
          eventStatus,
        );

      return CALENDAR_STATUS_OPTIONS.map(
        (status) => ({
          value: status,
          label: status,
          count:
            counts[status] ??
            0,
        }),
      );
    }, [
      periodEvents,
      filters,
    ]);

  const roomTotal =
    filterCalendarEvents(
      periodEvents,
      filters,
      'room',
    ).length;

  const statusTotal =
    filterCalendarEvents(
      periodEvents,
      filters,
      'status',
    ).length;

  const hasActiveFilters =
    Boolean(
      selectedDoctor ||
      selectedRoom ||
      selectedStatus,
    );

  const clearFilters =
    useCallback(() => {
      setSelectedDoctor(null);
      setSelectedRoom(null);
      setSelectedStatus(null);
    }, []);

  return {
    gridBounds,
    syncLabel,

    now:
      columns.some(
        (column) =>
          column.today,
      )
        ? now
        : null,

    events,
    today,
    columns,
    monthWeeks,

    middayBanner,
    endBannerLabel,

    suiteUtilizationRows,
    roomStatuses,
    physicianShifts,

    view,
    setView,

    rangeLabel,

    goToday,
    goPrev,
    goNext,
    openDay,

    doctorOptions,
    selectedDoctor,
    setSelectedDoctor,

    appointmentCounts,
    totalAppointments,

    roomOptions,
    selectedRoom,
    setSelectedRoom,
    roomTotal,

    statusOptions,
    selectedStatus,
    setSelectedStatus,
    statusTotal,

    hasActiveFilters,
    clearFilters,
    refreshEvents,
    getDoctorSchedule,
  };
}