import {
  medicalSpecialtyOptions,
  specialistOptions,
  appointmentFormatOptions,
  priorityOptions,
  appointmentDoctor,
  doctorScheduleConfigs,
  appointmentMeta,
} from '@/data/newAppointment';

import {
  loadFromStorage,
  saveToStorage,
} from '@/utils/storage';

import type {
  AppointmentCalendarDay,
  AppointmentDoctorInfo,
  AppointmentEntry,
  AppointmentSlotSession,
  CalendarEvent,
} from '@/types';

import { doctorsService } from '@/services/doctorsService';
import { calendarService } from '@/services/calendarService';

const KEYS = {
  medicalSpecialties:
    'curaclinic.newAppointment.medicalSpecialties',

  specialists:
    'curaclinic.newAppointment.specialists',

  formatOptions:
    'curaclinic.newAppointment.formatOptions',

  priorityOptions:
    'curaclinic.newAppointment.priorityOptions',

  meta:
    'curaclinic.newAppointment.meta',

  formState:
    'curaclinic.newAppointment.formState',
};

export interface NewAppointmentFormState {
  patientId?: string;
  selectedDay?: string;
  selectedSlot?: string;
  formatId?: string;
  priorityId?: string;
  specialty?: string;
  specialist?: string;
  reason?: string;
  intakeMemo?: string;
}

/*
 * ============================================
 * NEW APPOINTMENT SERVICE
 * ============================================
 */

export const newAppointmentService = {
  /*
   * ==========================================
   * MEDICAL SPECIALTIES
   * ==========================================
   */

  getMedicalSpecialties() {
    return loadFromStorage(
      KEYS.medicalSpecialties,
      medicalSpecialtyOptions,
    );
  },

  /*
   * ==========================================
   * SPECIALISTS / DOCTORS
   * ==========================================
   */

  getSpecialists() {
    const configured =
      loadFromStorage(
        KEYS.specialists,
        specialistOptions,
      );

    const registered =
      doctorsService
        .getDoctors()
        .map(
          ([name]) =>
            name,
        );

    return [
      ...new Set([
        ...configured,
        ...registered,
      ]),
    ];
  },

  /*
   * ==========================================
   * FORMAT OPTIONS
   * ==========================================
   */

  getFormatOptions() {
    return loadFromStorage(
      KEYS.formatOptions,
      appointmentFormatOptions,
    );
  },

  /*
   * ==========================================
   * PRIORITY OPTIONS
   * ==========================================
   */

  getPriorityOptions() {
    return loadFromStorage(
      KEYS.priorityOptions,
      priorityOptions,
    );
  },

  /*
   * ==========================================
   * DOCTOR INFORMATION
   * ==========================================
   */

  getDoctorForSpecialist(
    specialist: string,
    specialty: string,
  ): AppointmentDoctorInfo {
    const schedule =
      getSchedule(
        specialist,
      );

    if (!schedule) {
      return {
        ...appointmentDoctor,

        name:
          specialist,

        title:
          `${specialty} specialist`,
      };
    }

    return {
      ...appointmentDoctor,

      name:
        schedule.name,

      title:
        `${specialty} specialist`,

      avatar:
        schedule.avatar ||
        appointmentDoctor.avatar,

      suite:
        schedule.suite,

      hours:
        schedule.hours,
    };
  },

  /*
   * ==========================================
   * CALENDAR DAYS
   * ==========================================
   */

  getCalendarDays(
    specialist: string,
    entries: AppointmentEntry[],
  ): AppointmentCalendarDay[] {
    const schedule =
      getSchedule(
        specialist,
      );

    const today =
      startOfToday();

    return Array.from(
      {
        length: 7,
      },
      (_, index) => {
        const date =
          new Date(
            today,
          );

        date.setDate(
          today.getDate() +
            index,
        );

        const dateKey =
          toDateKey(
            date,
          );

        const daySchedule =
          schedule?.weekdays[
            date.getDay()
          ];

        const openSlots =
          daySchedule
            ? createTimes(
                daySchedule.start,
                daySchedule.end,
              ).filter(
                (time) =>
                  !isBooked(
                    entries,
                    schedule.name,
                    dateKey,
                    time,
                  ),
              ).length
            : 0;

        const status =
          !daySchedule
            ? 'offduty'
            : openSlots === 0
              ? 'full'
              : 'open';

        const dateLabel =
          index === 0
            ? 'TODAY'
            : date
                .toLocaleDateString(
                  'en-US',
                  {
                    weekday:
                      'short',
                  },
                )
                .toUpperCase();

        return {
          label:
            dateLabel,

          date:
            date.getDate(),

          dateKey,

          status,

          meta:
            status ===
            'offduty'
              ? 'Off duty'
              : status === 'full'
                ? 'Full'
                : `${openSlots} open`,
        };
      },
    );
  },

  /*
   * ==========================================
   * MONTH LABEL
   * ==========================================
   */

  getCalendarMonthLabel(
    days: AppointmentCalendarDay[],
  ): string {
    if (!days.length) {
      return '';
    }

    const first =
      new Date(
        `${days[0].dateKey}T00:00:00`,
      );

    const last =
      new Date(
        `${days[
          days.length - 1
        ].dateKey}T00:00:00`,
      );

    const firstMonth =
      first.toLocaleDateString(
        'en-US',
        {
          month: 'short',
        },
      );

    const lastMonth =
      last.toLocaleDateString(
        'en-US',
        {
          month: 'short',
          year: 'numeric',
        },
      );

    return firstMonth ===
      lastMonth.split(' ')[0]
      ? first.toLocaleDateString(
          'en-US',
          {
            month: 'long',
            year: 'numeric',
          },
        )
      : `${firstMonth} – ${lastMonth}`;
  },

  /*
   * ==========================================
   * SLOT SESSIONS
   *
   * 30 MINUTE SLOTS
   * ==========================================
   */

  getSlotSessions(
    specialist: string,
    dateKey: string,
    entries: AppointmentEntry[],
  ): AppointmentSlotSession[] {
    const schedule =
      getSchedule(
        specialist,
      );

    const date =
      new Date(
        `${dateKey}T00:00:00`,
      );

    const daySchedule =
      schedule?.weekdays[
        date.getDay()
      ];

    if (
      !schedule ||
      !daySchedule
    ) {
      return [];
    }

    /*
     * Generate 30-minute slots
     */

    const slots =
      createTimes(
        daySchedule.start,
        daySchedule.end,
      ).map(
        (time) => ({
          time,

          status:
            isBooked(
              entries,
              schedule.name,
              dateKey,
              time,
            )
              ? ('booked' as const)
              : ('available' as const),
        }),
      );

    const sessions = [
      {
        title:
          'MORNING CONSULTATION',

        min: 0,

        max:
          12 * 60,
      },

      {
        title:
          'AFTERNOON CONSULTATION',

        min:
          12 * 60,

        max:
          24 * 60,
      },
    ];

    return sessions
      .map(
        (session) => {
          const sessionSlots =
            slots.filter(
              ({ time }) => {
                const minutes =
                  timeToMinutes(
                    time,
                  );

                return (
                  minutes >=
                    session.min &&
                  minutes <
                    session.max
                );
              },
            );

          return {
            title:
              session.title,

            hours:
              sessionSlots.length
                ? `${sessionSlots[0].time} - ${
                    sessionSlots[
                      sessionSlots.length -
                        1
                    ].time
                  }`
                : '',

            slots:
              sessionSlots,
          };
        },
      )
      .filter(
        (session) =>
          session.slots
            .length > 0,
      );
  },

  /*
   * ==========================================
   * DAY CAPACITY
   * ==========================================
   */

  getDayCapacity(
    dateKey: string,
  ): number {
    const date =
      new Date(
        `${dateKey}T00:00:00`,
      );

    return this.getSpecialists().reduce(
      (
        total,
        specialist,
      ) => {
        const daySchedule =
          getSchedule(
            specialist,
          )?.weekdays[
            date.getDay()
          ];

        return (
          total +
          (daySchedule
            ? createTimes(
                daySchedule.start,
                daySchedule.end,
              ).length
            : 0)
        );
      },
      0,
    );
  },

  /*
   * ==========================================
   * META
   * ==========================================
   */

  getMeta() {
    return loadFromStorage(
      KEYS.meta,
      appointmentMeta,
    );
  },

  /*
   * ==========================================
   * FORM STATE
   * ==========================================
   */

  getFormState(): NewAppointmentFormState {
    return loadFromStorage(
      KEYS.formState,
      {},
    );
  },

  saveFormState(
    state: NewAppointmentFormState,
  ): void {
    saveToStorage(
      KEYS.formState,
      state,
    );
  },

  resetFormState(): void {
    saveToStorage(
      KEYS.formState,
      {},
    );
  },

  /*
   * ==========================================
   * SAVE APPOINTMENT TO MASTER CALENDAR
   * ==========================================
   *
   * This connects:
   *
   * New Appointment
   *       ↓
   * Master Calendar
   *
   * Appointment becomes a
   * 30-minute booked calendar event.
   */

  saveAppointmentToCalendar(
    entry: AppointmentEntry,
  ): void {
    const time =
      entry[0];

    const doctor =
      entry[7];

    const status =
      entry[10];

    const date =
      normalizeDate(
        entry[11],
      );

    /*
     * Required data missing
     */

    if (
      !time ||
      !doctor ||
      !date
    ) {
      return;
    }

    /*
     * Don't add cancelled
     * appointments to calendar.
     */

    if (
      String(status)
        .toLowerCase() ===
      'cancelled'
    ) {
      return;
    }

    const startMinutes =
      timeToMinutes(
        time,
      );

    const doctorInfo =
      this.getDoctorForSpecialist(
        doctor,
        '',
      );

    const patient =
      getPatientName(
        entry,
      );

    const eventId =
      createAppointmentEventId(
        entry,
        date,
        doctor,
        time,
      );

    const event: CalendarEvent = {
      id: eventId,
      date,
      startMinutes,
      durationMinutes: 15,
      time,
      patient,
      doctor,
      doctorName: doctor,
      room: doctorInfo.suite || 'Room 1',
      status: 'Slot Booked',
      tone: 'confirmed',
      badge: 'SLOT BOOKED',
    };

    calendarService.addEvent(
      event,
    );
  },
};

/*
 * ============================================
 * DOCTOR SCHEDULE
 * ============================================
 */

interface ResolvedDoctorSchedule {
  name: string;

  suite: string;

  avatar: string;

  hours: string;

  weekdays: Record<
    number,
    {
      start: string;
      end: string;
    }
  >;
}

function getSchedule(
  specialist: string,
): ResolvedDoctorSchedule | undefined {
  /*
   * First check configured schedules.
   */

  const configured =
    doctorScheduleConfigs[
      specialist
    ];

  if (configured) {
    const weekdays =
      Object.fromEntries(
        configured.weekdays.map(
          (weekday) => [
            weekday,

            {
              start:
                `${String(
                  configured.startHour,
                ).padStart(
                  2,
                  '0',
                )}:00`,

              end:
                `${String(
                  configured.endHour,
                ).padStart(
                  2,
                  '0',
                )}:00`,
            },
          ],
        ),
      );

    return {
      name:
        configured.name,

      suite:
        configured.suite,

      avatar:
        configured.avatar,

      hours:
        `${formatHour(
          configured.startHour,
        )} - ${formatHour(
          configured.endHour,
        )}`,

      weekdays,
    };
  }

  /*
   * Then check registered doctors.
   */

  const doctor =
    doctorsService
      .getDoctors()
      .find(
        ([name]) =>
          normalizeDoctor(
            name,
          ) ===
          normalizeDoctor(
            specialist,
          ),
      );

  if (!doctor) {
    return undefined;
  }

  const weeklySchedule =
    doctor[7] ?? {};

  const weekdays =
    Object.fromEntries(
      Object.entries(
        weeklySchedule,
      ).flatMap(
        ([day, times]) => {
          const dayIndex =
            WEEKDAY_INDEX[
              day
            ];

          return times?.start &&
            times.end &&
            dayIndex !==
              undefined
            ? [
                [
                  dayIndex,
                  times,
                ],
              ]
            : [];
        },
      ),
    );

  const scheduleTimes =
    Object.values(
      weekdays,
    );

  const hours =
    scheduleTimes.length
      ? `${scheduleTimes[0].start} - ${scheduleTimes[0].end}`
      : 'Schedule not set';

  return {
    name:
      doctor[0],

    suite:
      doctor[2],

    avatar:
      doctor[6],

    hours,

    weekdays,
  };
}

/*
 * ============================================
 * WEEKDAY MAP
 * ============================================
 */

const WEEKDAY_INDEX: Record<
  string,
  number
> = {
  SUN: 0,
  MON: 1,
  TUE: 2,
  WED: 3,
  THU: 4,
  FRI: 5,
  SAT: 6,
};

/*
 * ============================================
 * TODAY
 * ============================================
 */

function startOfToday(): Date {
  const today =
    new Date();

  today.setHours(
    0,
    0,
    0,
    0,
  );

  return today;
}

/*
 * ============================================
 * DATE KEY
 * ============================================
 */

function toDateKey(
  date: Date,
): string {
  const month =
    String(
      date.getMonth() + 1,
    ).padStart(2, '0');

  const day =
    String(
      date.getDate(),
    ).padStart(2, '0');

  return `${date.getFullYear()}-${month}-${day}`;
}

/*
 * ============================================
 * FORMAT HOUR
 * ============================================
 */

function formatHour(
  hour: number,
): string {
  const suffix =
    hour >= 12
      ? 'PM'
      : 'AM';

  const hour12 =
    hour % 12 || 12;

  return `${String(
    hour12,
  ).padStart(
    2,
    '0',
  )}:00 ${suffix}`;
}

/*
 * ============================================
 * CREATE 15-MINUTE TIMES
 * ============================================
 *
 * Example:
 * 03:00 PM - 03:15 PM
 * 03:15 PM - 03:30 PM
 * 03:30 PM - 03:45 PM
 * 03:45 PM - 04:00 PM
 */

function formatMinutes(minutes: number): string {
  const hour24 = Math.floor(minutes / 60);
  const minute = minutes % 60;
  const hour12 = hour24 % 12 || 12;
  const suffix = hour24 >= 12 ? 'PM' : 'AM';
  return `${String(hour12).padStart(2, '0')}:${String(minute).padStart(2, '0')} ${suffix}`;
}

function createTimes(
  start: string,
  end: string,
): string[] {
  const startMinutes = timeStringToMinutes(start);
  const endMinutes = timeStringToMinutes(end);
  const times: string[] = [];

  for (
    let minutes = startMinutes;
    minutes < endMinutes;
    minutes += 15
  ) {
    const slotStart = formatMinutes(minutes);
    const slotEnd = formatMinutes(minutes + 15);
    times.push(`${slotStart} - ${slotEnd}`);
  }

  return times;
}

/*
 * ============================================
 * "14:30" -> minutes
 * ============================================
 */

function timeStringToMinutes(
  value: string,
): number {
  const match = value.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return 0;
  return Number(match[1]) * 60 + Number(match[2]);
}

/*
 * ============================================
 * "03:30 PM" or "03:30 PM - 03:45 PM" -> minutes
 * ============================================
 */

function timeToMinutes(
  time: string,
): number {
  if (!time) return 0;
  const match = time.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!match) return 0;

  const rawHour = Number(match[1]);
  const minute = Number(match[2]);
  const period = match[3].toUpperCase();
  const hour24 = (rawHour % 12) + (period === 'PM' ? 12 : 0);

  return hour24 * 60 + minute;
}

/*
 * ============================================
 * NORMALIZE DATE
 * ============================================
 */

function normalizeDate(
  date?: string,
): string {
  if (!date) {
    return '';
  }

  if (
    /^\d{4}-\d{2}-\d{2}$/.test(
      date,
    )
  ) {
    return date;
  }

  const parsed =
    new Date(date);

  if (
    Number.isNaN(
      parsed.getTime(),
    )
  ) {
    return '';
  }

  return toDateKey(
    parsed,
  );
}

/*
 * ============================================
 * NORMALIZE DOCTOR
 * ============================================
 */

function normalizeDoctor(
  name: string,
): string {
  return name
    .replace(
      /\s*\([^)]*\)/g,
      '',
    )
    .trim()
    .toLowerCase();
}

/*
 * ============================================
 * CHECK BOOKED SLOT
 * ============================================
 */

function isBooked(
  entries: AppointmentEntry[],
  doctorName: string,
  dateKey: string,
  time: string,
): boolean {
  const targetMinutes = timeToMinutes(time);
  return entries.some(
    (entry) =>
      timeToMinutes(entry[0]) === targetMinutes &&
      normalizeDate(entry[11]) === dateKey &&
      normalizeDoctor(entry[7]) === normalizeDoctor(doctorName) &&
      entry[10] !== 'Cancelled',
  );
}

/*
 * ============================================
 * PATIENT NAME
 * ============================================
 *
 * AppointmentEntry ka exact patient
 * index tumhare provided code mein
 * visible nahi tha.
 *
 * Isliye commonly-used fields ko
 * safely check kar rahe hain.
 * ============================================
 */

function getPatientName(
  entry: AppointmentEntry,
): string {
  const possibleValues =
    [
      entry[1],
      entry[2],
      entry[3],
      entry[4],
      entry[5],
    ];

  for (
    const value of
      possibleValues
  ) {
    if (
      typeof value ===
        'string' &&
      value.trim()
    ) {
      return value.trim();
    }
  }

  return 'Patient';
}

/*
 * ============================================
 * NORMALIZE APPOINTMENT STATUS
 * ============================================
 */

function normalizeAppointmentStatus(
  status: unknown,
): string {
  const value =
    String(
      status ?? '',
    )
      .trim()
      .toLowerCase();

  if (
    value ===
      'cancelled'
  ) {
    return 'Cancelled';
  }

  if (
    value ===
      'completed'
  ) {
    return 'Completed';
  }

  if (
    value ===
      'waiting'
  ) {
    return 'Waiting';
  }

  if (
    value ===
      'in consult'
  ) {
    return 'In Consult';
  }

  /*
   * Booked / Confirmed /
   * anything else becomes
   * Slot Booked.
   */

  return 'Slot Booked';
}

/*
 * ============================================
 * UNIQUE CALENDAR EVENT ID
 * ============================================
 */

function createAppointmentEventId(
  entry: AppointmentEntry,
  date: string,
  doctor: string,
  time: string,
): string {
  /*
   * Existing appointment id, if
   * one is available in the tuple.
   */

  const possibleId =
    entry[8];

  if (
    typeof possibleId ===
      'string' &&
    possibleId.trim()
  ) {
    return `appointment-${possibleId}`;
  }

  /*
   * Otherwise create deterministic
   * id from date + doctor + time.
   *
   * This is useful because one doctor
   * cannot have two appointments in
   * the same 30-minute slot.
   */

  const safeDoctor =
    normalizeDoctor(
      doctor,
    )
      .replace(
        /[^a-z0-9]+/g,
        '-',
      )
      .replace(
        /^-|-$/g,
        '',
      );

  const safeTime =
    time
      .replace(
        /[^a-zA-Z0-9]/g,
        '',
      );

  return `appointment-${date}-${safeDoctor}-${safeTime}`;
}