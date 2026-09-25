import type { CalendarBanner, CalendarDayHeader, CalendarEvent } from '@/types';

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
  dayHeaders: CalendarDayHeader[];
  events: CalendarEvent[];
  middayBanner: CalendarBanner;
  endBannerLabel: string;
  now: { label: string; minutes: number };
}

export function CalendarGrid({ startHour, endHour, dayHeaders, events, middayBanner, endBannerLabel, now }: CalendarGridProps) {
  const totalMinutes = (endHour - startHour) * 60;
  const gridHeight = totalMinutes * PX_PER_MIN;
  const wrapperHeight = gridHeight + END_BANNER_HEIGHT;
  const hours = Array.from({ length: endHour - startHour + 1 }, (_, i) => startHour + i);

  return (
    <div className="cal-grid-wrap">
      <div className="cal-header-row">
        <div className="cal-header-cell cal-header-gutter"><small>GMT-4</small></div>
        {dayHeaders.map((d) => (
          <div key={d.label} className={`cal-header-cell${d.today ? ' today' : ''}`}>
            <span className="cal-day-label">{d.label}</span>
            <span className="cal-day-num">{d.date}</span>
            {d.today && <span className="cal-today-pill">TODAY</span>}
          </div>
        ))}
      </div>
      <div className="cal-body">
        <div className="cal-time-col" style={{ height: wrapperHeight }}>
          {hours.map((h) => (
            <span key={h} className="cal-time-label" style={{ top: (h - startHour) * 60 * PX_PER_MIN }}>
              {formatHour(h)}
            </span>
          ))}
        </div>
        <div className="cal-days-area" style={{ height: wrapperHeight, backgroundSize: `100% ${60 * PX_PER_MIN}px` }}>
          {dayHeaders.map((d, dayIndex) => (
            <div key={d.label} className="cal-day-col">
              {events.filter((e) => e.day === dayIndex).map((e) => (
                <div
                  key={e.id}
                  className={`cal-event tone-${e.tone}`}
                  style={{ top: e.startMinutes * PX_PER_MIN, height: e.durationMinutes * PX_PER_MIN }}
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
        <div className="cal-banner-row" style={{ top: middayBanner.startMinutes * PX_PER_MIN, height: middayBanner.durationMinutes * PX_PER_MIN }}>
          {middayBanner.label}
        </div>
        <div className="cal-banner-row cal-banner-end" style={{ top: totalMinutes * PX_PER_MIN }}>
          {endBannerLabel}
        </div>
        <div className="cal-now-line" style={{ top: now.minutes * PX_PER_MIN }} />
        <span className="cal-now-chip" style={{ top: now.minutes * PX_PER_MIN }}>{now.label}</span>
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
