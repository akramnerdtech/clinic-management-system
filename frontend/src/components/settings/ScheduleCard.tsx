import { CalendarClock, Clock } from 'lucide-react';
import type { ScheduleRow, DurationOption } from '@/types';

interface ScheduleCardProps {
  scheduleRows: ScheduleRow[];
  durationOptions: DurationOption[];
}

const toNiceTime = (t: string) => t.replace(/^0/, '');

export function ScheduleCard({ scheduleRows, durationOptions }: ScheduleCardProps) {
  return (
    <>
      <section className="sp-card">
        <header className="sp-card-head">
          <span className="sp-card-icon"><CalendarClock size={18} /></span>
          <div>
            <h2>Operating hours</h2>
            <p>When patients can book appointments and walk in.</p>
          </div>
          <span className="sp-chip">EST (UTC-5)</span>
        </header>
        <div className="sp-schedule">
          {scheduleRows.map((r) => {
            const open = Boolean(r[2]);
            return (
              <div className={`sp-schedule-row ${open ? '' : 'closed'}`} key={r[0]}>
                <i className="sp-dot" />
                <div className="sp-schedule-name">
                  <b>{r[0]}</b>
                  <small>{r[1]}</small>
                </div>
                <div className="sp-schedule-time">
                  {open ? <><Clock size={13} /> {toNiceTime(r[2])} – {toNiceTime(r[3])}</> : 'Closed'}
                </div>
                <span className={`sp-badge ${open ? 'green' : 'grey'}`}>{open ? r[4] : 'Closed'}</span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="sp-card">
        <header className="sp-card-head">
          <span className="sp-card-icon"><Clock size={18} /></span>
          <div>
            <h2>Default appointment length</h2>
            <p>Applied automatically to newly assigned physician calendars.</p>
          </div>
        </header>
        <div className="sp-duration-grid">
          {durationOptions.map((x, i) => (
            <div className={`sp-duration ${i === 1 ? 'selected' : ''}`} key={x[0]}>
              {i === 1 && <span className="sp-badge teal">Recommended</span>}
              <b>{x[0]}</b>
              <strong>{x[1].replace(/\b(\w)(\w*)/g, (_, a, b) => a.toUpperCase() + b.toLowerCase())}</strong>
              <p>{x[2]}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}