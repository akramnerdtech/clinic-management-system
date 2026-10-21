import type { DoctorDaySchedule, DoctorWeeklySchedule, DutySession } from '@/types';

export function normalizeDutySessions(dayKey: string, schedule?: DoctorDaySchedule): DutySession[] {
  if (Array.isArray(schedule?.sessions) && schedule.sessions.length > 0) {
    return schedule.sessions.map((session, index) => ({
      id: session.id || `${dayKey.toLowerCase()}-${index + 1}`,
      label: session.label || (index === 0 ? 'Morning' : 'Evening'),
      start: session.start ?? '',
      end: session.end ?? '',
    }));
  }

  if (schedule?.start && schedule.end) {
    return [{
      id: `${dayKey.toLowerCase()}-legacy`,
      label: 'Shift 1',
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
        start: sessions[0]?.start ?? day.start,
        end: sessions[sessions.length - 1]?.end ?? day.end,
        sessions,
      }];
    }),
  );
}

export function formatTime12(time24: string): string {
  if (!time24) return '';
  const match = time24.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return time24;
  const hour = Number(match[1]);
  const minute = match[2];
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${String(hour12).padStart(2, '0')}:${minute} ${suffix}`;
}

export function getDoctorDutySessions(schedule?: DoctorWeeklySchedule): DutySession[] {
  if (!schedule) {
    return [
      { id: 'default-morn', label: 'Morning', start: '10:00', end: '12:00' },
      { id: 'default-eve', label: 'Evening', start: '18:00', end: '20:00' },
    ];
  }
  for (const day of Object.values(schedule)) {
    if (day.active !== false && Array.isArray(day.sessions) && day.sessions.length > 0) {
      return day.sessions;
    }
  }
  return [
    { id: 'default-morn', label: 'Morning', start: '10:00', end: '12:00' },
    { id: 'default-eve', label: 'Evening', start: '18:00', end: '20:00' },
  ];
}

export function formatDoctorShifts(schedule?: DoctorWeeklySchedule): string {
  const sessions = getDoctorDutySessions(schedule);
  if (!sessions.length) return 'Morning: 10:00 AM – 12:00 PM • Evening: 06:00 PM – 08:00 PM';
  return sessions.map((s, idx) => {
    const label = s.label || (idx === 0 ? 'Morning' : 'Evening');
    return `${label}: ${formatTime12(s.start)} – ${formatTime12(s.end)}`;
  }).join(' • ');
}