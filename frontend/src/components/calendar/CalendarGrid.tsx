import type { CalendarBanner, CalendarColumn, CalendarEvent } from '@/types';

const PX_PER_MIN = 20 / 15;
const END_BANNER_HEIGHT = 30;

function formatHour(hour: number): string {
  const period = hour >= 12 ? 'PM' : 'AM';
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${String(h12).padStart(2, '0')}:00 ${period}`;
}

interface CalendarGridProps {
  startHour: number;
  endHour: number;
  /** One entry per visible day: 7 for the Week view, 1 for the Day view. */
  columns: CalendarColumn[];
  events: CalendarEvent[];
  middayBanner: CalendarBanner;
  endBannerLabel: string;
  /** Current-time marker; null when today isn't on screen. */
  now: { label: string; minutes: number } | null;
  /** Shown over the day columns when nothing is left to display. */
  emptyMessage?: string;
  onSelectEvent?: (event: CalendarEvent) => void;
}

export function CalendarGrid({ startHour, endHour, columns, events, middayBanner, endBannerLabel, now, emptyMessage, onSelectEvent }: CalendarGridProps) {
  const totalMinutes = (endHour - startHour) * 60;
  const gridHeight = totalMinutes * PX_PER_MIN;
  const wrapperHeight = gridHeight + END_BANNER_HEIGHT;
  const hours = Array.from({ length: endHour - startHour + 1 }, (_, i) => startHour + i);
  // The stylesheet defaults to 7 columns; size the tracks to however many days are visible.
  const single = columns.length === 1;
  const trackStyle = {
    gridTemplateColumns: `70px repeat(${columns.length}, minmax(${single ? 240 : 120}px, 1fr))`,
    minWidth: single ? 0 : 900,
  };

  return (
    <div className="cal-grid-wrap">
      <div className="cal-header-row" style={trackStyle}>
        <div className="cal-header-cell cal-header-gutter"><small>GMT-4</small></div>
        {columns.map((c) => (
          <div key={c.iso} className={`cal-header-cell${c.today ? ' today' : ''}`}>
            <span className="cal-day-label">{c.label}</span>
            <span className="cal-day-num">{c.date}</span>
            {c.today && <span className="cal-today-pill">TODAY</span>}
          </div>
        ))}
      </div>
      <div className="cal-body" style={trackStyle}>
        <div className="cal-time-col" style={{ height: wrapperHeight }}>
          {hours.map((h) => (
            <span key={h} className="cal-time-label" style={{ top: (h - startHour) * 60 * PX_PER_MIN }}>
              {formatHour(h)}
            </span>
          ))}
        </div>
        <div className="cal-days-area" style={{ height: wrapperHeight, backgroundSize: `100% ${60 * PX_PER_MIN}px`, gridTemplateColumns: `repeat(${columns.length}, 1fr)` }}>
          {columns.map((c) => (
            <div key={c.iso} className="cal-day-col">
              {events.filter((e) => e.date === c.iso).map((e) => (
                <div
                  key={e.id}
                  className={`cal-event tone-${e.tone}`}
                  style={{ top: e.startMinutes * PX_PER_MIN, height: e.durationMinutes * PX_PER_MIN }}
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelectEvent?.(e)}
                  onKeyDown={(ev) => {
                    if (ev.key === 'Enter' || ev.key === ' ') {
                      ev.preventDefault();
                      onSelectEvent?.(e);
                    }
                  }}
                >
                  {e.badge && <em className="cal-badge">{e.badge}</em>}
                  {e.status && <em className={`status-pill cal-status ${statusClass(e.status)}`}>{e.status}</em>}
                  <span>{e.time}</span>
                  <b>{e.patient}</b>
                  {e.doctor && <small>{e.doctor}</small>}
                </div>
              ))}
            </div>
          ))}
        </div>
        {emptyMessage && <div className="cal-empty">{emptyMessage}</div>}
        <div className="cal-banner-row" style={{ top: middayBanner.startMinutes * PX_PER_MIN, height: middayBanner.durationMinutes * PX_PER_MIN }}>
          {middayBanner.label}
        </div>
        <div className="cal-banner-row cal-banner-end" style={{ top: totalMinutes * PX_PER_MIN }}>
          {endBannerLabel}
        </div>
        {now && <div className="cal-now-line" style={{ top: now.minutes * PX_PER_MIN }} />}
        {now && <span className="cal-now-chip" style={{ top: now.minutes * PX_PER_MIN }}>{now.label}</span>}
      </div>
    </div>
  );
}

function statusClass(status: string): string {
  if (status === 'Confirmed') return 'status-confirmed';
  if (status === 'Waiting') return 'status-waiting';
  if (status === 'In Consult') return 'status-consult';
  return 'status-completed';
}
