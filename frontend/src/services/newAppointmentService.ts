import {
  medicalSpecialtyOptions, specialistOptions, appointmentFormatOptions,
  priorityOptions, appointmentDoctor, doctorScheduleConfigs, appointmentMeta,
} from '@/data/newAppointment';
import { loadFromStorage, saveToStorage } from '@/utils/storage';
import type { AppointmentCalendarDay, AppointmentDoctorInfo, AppointmentEntry, AppointmentSlotSession } from '@/types';
import { doctorsService } from '@/services/doctorsService';

const KEYS = {
  medicalSpecialties: 'curaclinic.newAppointment.medicalSpecialties',
  specialists: 'curaclinic.newAppointment.specialists',
  formatOptions: 'curaclinic.newAppointment.formatOptions',
  priorityOptions: 'curaclinic.newAppointment.priorityOptions',
  meta: 'curaclinic.newAppointment.meta',
  formState: 'curaclinic.newAppointment.formState',
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

export const newAppointmentService = {
  getMedicalSpecialties() { return loadFromStorage(KEYS.medicalSpecialties, medicalSpecialtyOptions); },
  getSpecialists() {
    const configured = loadFromStorage(KEYS.specialists, specialistOptions);
    const registered = doctorsService.getDoctors().map(([name]) => name);
    return [...new Set([...configured, ...registered])];
  },
  getFormatOptions() { return loadFromStorage(KEYS.formatOptions, appointmentFormatOptions); },
  getPriorityOptions() { return loadFromStorage(KEYS.priorityOptions, priorityOptions); },
  getDoctorForSpecialist(specialist: string, specialty: string): AppointmentDoctorInfo {
    const schedule = getSchedule(specialist);
    if (!schedule) return { ...appointmentDoctor, name: specialist, title: `${specialty} specialist` };
    return {
      ...appointmentDoctor,
      name: schedule.name,
      title: `${specialty} specialist`,
      avatar: schedule.avatar || appointmentDoctor.avatar,
      suite: schedule.suite,
      hours: schedule.hours,
    };
  },
  getCalendarDays(specialist: string, entries: AppointmentEntry[]): AppointmentCalendarDay[] {
    const schedule = getSchedule(specialist);
    const today = startOfToday();
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() + index);
      const dateKey = toDateKey(date);
      const daySchedule = schedule?.weekdays[date.getDay()];
      const openSlots = daySchedule
        ? createTimes(daySchedule.start, daySchedule.end).filter((time) => !isBooked(entries, schedule.name, dateKey, time)).length
        : 0;
      const status = !daySchedule
        ? 'offduty'
        : openSlots === 0 ? 'full' : 'open';
      const dateLabel = index === 0 ? 'TODAY' : date.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
      return {
        label: dateLabel,
        date: date.getDate(),
        dateKey,
        status,
        meta: status === 'offduty' ? 'Off duty' : status === 'full' ? 'Full' : `${openSlots} open`,
      };
    });
  },
  getCalendarMonthLabel(days: AppointmentCalendarDay[]): string {
    if (!days.length) return '';
    const first = new Date(`${days[0].dateKey}T00:00:00`);
    const last = new Date(`${days[days.length - 1].dateKey}T00:00:00`);
    const firstMonth = first.toLocaleDateString('en-US', { month: 'short' });
    const lastMonth = last.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    return firstMonth === lastMonth.split(' ')[0]
      ? first.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      : `${firstMonth} – ${lastMonth}`;
  },
  getSlotSessions(specialist: string, dateKey: string, entries: AppointmentEntry[]): AppointmentSlotSession[] {
    const schedule = getSchedule(specialist);
    const date = new Date(`${dateKey}T00:00:00`);
    const daySchedule = schedule?.weekdays[date.getDay()];
    if (!schedule || !daySchedule) return [];
    const slots = createTimes(daySchedule.start, daySchedule.end).map((time) => ({
      time,
      status: isBooked(entries, schedule.name, dateKey, time) ? 'booked' as const : 'available' as const,
    }));
    const sessions = [
      { title: 'MORNING CONSULTATION', min: 0, max: 12 * 60 },
      { title: 'AFTERNOON CONSULTATION', min: 12 * 60, max: 24 * 60 },
    ];
    return sessions.map((session) => {
      const sessionSlots = slots.filter(({ time }) => {
        const minutes = timeToMinutes(time);
        return minutes >= session.min && minutes < session.max;
      });
      return {
        title: session.title,
        hours: sessionSlots.length ? `${sessionSlots[0].time} - ${sessionSlots[sessionSlots.length - 1].time}` : '',
        slots: sessionSlots,
      };
    }).filter((session) => session.slots.length > 0);
  },
  getMeta() { return loadFromStorage(KEYS.meta, appointmentMeta); },
  /** In-progress selections for the New Appointment form (survives a page reload). */
  getFormState(): NewAppointmentFormState {
    return loadFromStorage(KEYS.formState, {});
  },
  saveFormState(state: NewAppointmentFormState): void {
    saveToStorage(KEYS.formState, state);
  },
  resetFormState(): void {
    saveToStorage(KEYS.formState, {});
  },
};

interface ResolvedDoctorSchedule {
  name: string;
  suite: string;
  avatar: string;
  hours: string;
  weekdays: Record<number, { start: string; end: string }>;
}

function getSchedule(specialist: string): ResolvedDoctorSchedule | undefined {
  const configured = doctorScheduleConfigs[specialist];
  if (configured) {
    const weekdays = Object.fromEntries(configured.weekdays.map((weekday) => [weekday, {
      start: `${String(configured.startHour).padStart(2, '0')}:00`,
      end: `${String(configured.endHour).padStart(2, '0')}:00`,
    }]));
    return {
      name: configured.name,
      suite: configured.suite,
      avatar: configured.avatar,
      hours: `${formatHour(configured.startHour)} - ${formatHour(configured.endHour)}`,
      weekdays,
    };
  }

  const doctor = doctorsService.getDoctors().find(([name]) => normalizeDoctor(name) === normalizeDoctor(specialist));
  if (!doctor) return undefined;
  const weeklySchedule = doctor[7] ?? {};
  const weekdays = Object.fromEntries(Object.entries(weeklySchedule).flatMap(([day, times]) => {
    const dayIndex = WEEKDAY_INDEX[day];
    return times?.start && times.end && dayIndex !== undefined ? [[dayIndex, times]] : [];
  }));
  const scheduleTimes = Object.values(weekdays);
  const hours = scheduleTimes.length
    ? `${scheduleTimes[0].start} - ${scheduleTimes[0].end}`
    : 'Schedule not set';
  return { name: doctor[0], suite: doctor[2], avatar: doctor[6], hours, weekdays };
}

const WEEKDAY_INDEX: Record<string, number> = { SUN: 0, MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5, SAT: 6 };

function startOfToday(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function toDateKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function formatHour(hour: number): string {
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${String(hour12).padStart(2, '0')}:00 ${suffix}`;
}

function createTimes(start: string, end: string): string[] {
  const startMinutes = timeStringToMinutes(start);
  const endMinutes = timeStringToMinutes(end);
  const times: string[] = [];
  for (let minutes = startMinutes; minutes < endMinutes; minutes += 30) {
    const hour24 = Math.floor(minutes / 60);
    const minute = minutes % 60;
    const hour12 = hour24 % 12 || 12;
    times.push(`${String(hour12).padStart(2, '0')}:${String(minute).padStart(2, '0')} ${hour24 >= 12 ? 'PM' : 'AM'}`);
  }
  return times;
}

function timeStringToMinutes(value: string): number {
  const match = value.match(/^(\d{2}):(\d{2})$/);
  return match ? Number(match[1]) * 60 + Number(match[2]) : 0;
}

function timeToMinutes(time: string): number {
  const match = time.match(/^(\d{2}):(\d{2})\s(AM|PM)$/);
  if (!match) return 0;
  const hour = Number(match[1]) % 12 + (match[3] === 'PM' ? 12 : 0);
  return hour * 60 + Number(match[2]);
}

function normalizeDate(date?: string): string {
  if (!date) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? '' : toDateKey(parsed);
}

function normalizeDoctor(name: string): string {
  return name.replace(/\s*\([^)]*\)/g, '').trim().toLowerCase();
}

function isBooked(entries: AppointmentEntry[], doctorName: string, dateKey: string, time: string): boolean {
  return entries.some((entry) => entry[0] === time
    && normalizeDate(entry[11]) === dateKey
    && normalizeDoctor(entry[7]) === normalizeDoctor(doctorName)
    && entry[10] !== 'Cancelled');
}
