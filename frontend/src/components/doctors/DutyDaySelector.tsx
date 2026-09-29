import type { DutyDay } from '@/types';

export function DutyDaySelector({ days, onToggle, onTimeChange }: {
  days: DutyDay[];
  onToggle: (key: string) => void;
  onTimeChange: (dayKey: string, part: 'start' | 'end', value: string) => void;
}) {
  return (
    <div className="duty-days doctor-weekly-schedule">
      {days.map((d) => (
        <div className={`doctor-day-row ${d.active ? 'scheduled' : ''}`} key={d.key}>
          <label className="doctor-day-toggle">
            <input type="checkbox" checked={d.active} onChange={() => onToggle(d.key)} />
            <span className="doctor-day-switch" />
            <b>{({ MON: 'Monday', TUE: 'Tuesday', WED: 'Wednesday', THU: 'Thursday', FRI: 'Friday', SAT: 'Saturday', SUN: 'Sunday' } as Record<string, string>)[d.key] ?? d.key}</b>
          </label>
          <label className="doctor-day-time"><span>Start</span><input type="time" value={d.start} disabled={!d.active} onChange={(event) => onTimeChange(d.key, 'start', event.target.value)} /></label>
          <span className="doctor-day-separator">to</span>
          <label className="doctor-day-time"><span>End</span><input type="time" value={d.end} disabled={!d.active} onChange={(event) => onTimeChange(d.key, 'end', event.target.value)} /></label>
          <small className={`doctor-day-state ${d.active ? 'on' : ''}`}>{d.active ? 'Scheduled' : 'Off duty'}</small>
        </div>
      ))}
    </div>
  );
}
