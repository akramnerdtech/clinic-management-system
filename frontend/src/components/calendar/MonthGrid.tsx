import { useMemo } from 'react';
import type { CalendarEvent } from '@/types';
import { WEEKDAY_SHORT } from '@/utils/calendarDates';
import type { MonthCell } from '@/utils/calendarDates';

const MAX_CHIPS = 3;

interface MonthGridProps {
  weeks: MonthCell[][];
  events: CalendarEvent[];
  today: string;
  /** Shown above the grid when nothing is left to display. */
  emptyMessage?: string;
  onOpenDay: (iso: string) => void;
  onSelectEvent: (event: CalendarEvent) => void;
}

/** Month overview: one cell per day with the first few appointments; a day or "+N more" opens that day. */
export function MonthGrid({ weeks, events, today, emptyMessage, onOpenDay, onSelectEvent }: MonthGridProps) {
  const byDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    events.forEach((e) => {
      if (!e.date) return;
      map.set(e.date, [...(map.get(e.date) ?? []), e].sort((a, b) => a.startMinutes - b.startMinutes));
    });
    return map;
  }, [events]);

  return (
    <div className="cal-month">
      <div className="cal-month-head">
        {WEEKDAY_SHORT.map((d) => <span key={d}>{d}</span>)}
      </div>
      {emptyMessage && <p className="cal-month-empty">{emptyMessage}</p>}
      {weeks.map((week) => (
        <div className="cal-month-row" key={week[0].iso}>
          {week.map((cell) => {
            const dayEvents = byDate.get(cell.iso) ?? [];
            const extra = dayEvents.length - MAX_CHIPS;
            return (
              <div
                key={cell.iso}
                className={`cal-month-cell${cell.inMonth ? '' : ' outside'}${cell.iso === today ? ' today' : ''}`}
                onClick={() => onOpenDay(cell.iso)}
              >
                <button type="button" className="cal-month-date" onClick={(e) => { e.stopPropagation(); onOpenDay(cell.iso); }} aria-label={`Open ${cell.iso}`}>
                  {cell.date}
                </button>
                {dayEvents.slice(0, MAX_CHIPS).map((e) => (
                  <button
                    type="button"
                    key={e.id}
                    className={`cal-month-chip tone-${e.tone}`}
                    title={`${e.time} · ${e.patient}`}
                    onClick={(ev) => { ev.stopPropagation(); onSelectEvent(e); }}
                  >
                    <em>{e.time.replace(' ', '').toLowerCase()}</em> {e.patient}
                  </button>
                ))}
                {extra > 0 && (
                  <button type="button" className="cal-month-more" onClick={(e) => { e.stopPropagation(); onOpenDay(cell.iso); }}>
                    +{extra} more
                  </button>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
