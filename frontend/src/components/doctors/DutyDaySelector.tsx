import type { DutyDay } from '@/types';

export function DutyDaySelector({ days, onToggle }: { days: DutyDay[]; onToggle: (key: string) => void }) {
  return (
    <div className="duty-days">
      {days.map((d) => (
        <button type="button" key={d.key} className={d.active ? 'active' : ''} onClick={() => onToggle(d.key)}>
          <b>{d.key}</b>
          <small>{d.active ? 'Duty' : 'Off'}</small>
        </button>
      ))}
    </div>
  );
}
