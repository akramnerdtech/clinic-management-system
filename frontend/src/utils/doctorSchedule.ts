import type { DoctorDaySchedule, DoctorWeeklySchedule, DutySession } from '@/types';

export function normalizeDutySessions(dayKey: string, schedule?: DoctorDaySchedule): DutySession[] {
  if (Array.isArray(schedule?.sessions)) {
    return schedule.sessions.map((session, index) => ({
      id: session.id || `${dayKey.toLowerCase()}-${index + 1}`,
      start: session.start ?? '',
      end: session.end ?? '',
    }));
  }

  if (schedule?.start && schedule.end) {
    return [{
      id: `${dayKey.toLowerCase()}-legacy`,
      start: schedule.start,
      end: schedule.end,
    }];
  }

  return [];
}

export function normalizeDoctorWeeklySchedule(
  schedule?: DoctorWeeklySchedule,
): DoctorWeeklySchedule | undefined {
  if (!schedule) return undefined;

  return Object.fromEntries(
    Object.entries(schedule).map(([dayKey, day]) => {
      const sessions = normalizeDutySessions(dayKey, day);
      return [dayKey, {
        active: day.active ?? sessions.length > 0,
        sessions,
      }];
    }),
  );
}