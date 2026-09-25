import type { ScheduleRow, DurationOption } from '@/types';

interface ScheduleCardProps {
  scheduleRows: ScheduleRow[];
  durationOptions: DurationOption[];
}

export function ScheduleCard({ scheduleRows, durationOptions }: ScheduleCardProps) {
  return (
    <section className="content-card schedule-card">
      <div className="card-title">
        <div>
          <h2>◷ Operating Schedule & Slot Cadence</h2>
          <p>Determine public appointment bookability, walk-in windows, and standard consultation increments.</p>
        </div>
        <small>EST (UTC-5)</small>
      </div>
      {scheduleRows.map((r, i) => (
        <div className="schedule-row" key={r[0]}>
          <i className={i === 2 ? 'off' : ''}>{i === 2 ? '' : '✓'}</i>
          <div><b>{r[0]}</b><small>{r[1]}</small></div>
          {r[2] && <><strong>{r[2]}</strong><span>to</span><strong>{r[3]}</strong></>}
          <em>{r[4]}</em>
        </div>
      ))}
      <h4>DEFAULT APPOINTMENT SLOT DURATION <span>Applied automatically to newly assigned physician calendars</span></h4>
      <div className="duration-grid">
        {durationOptions.map((x, i) => (
          <div className={i === 1 ? 'selected' : ''} key={x[0]}>
            <b>{x[0]}</b>
            <small>{x[1]}</small>
            <p>{x[2]}</p>
            {i === 1 && <span>RECOMMENDED</span>}
          </div>
        ))}
      </div>
    </section>
  );
}
