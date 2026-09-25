import { Stethoscope } from 'lucide-react';
import type { AvailabilityEntry } from '@/types';

export function Availability({ entries }: { entries: AvailabilityEntry[] }) {
  return (
    <section className="content-card side-card">
      <h2>Doctor Availability <span><Stethoscope size={15} /></span></h2>
      <p>Physicians on active floor rotation</p>
      {entries.map((d) => (
        <div className="doctor-mini" key={d[0]}>
          <img src={d[3]} alt="" />
          <div>
            <b>{d[0]}</b>
            <small>{d[1]}</small>
            <small>09:00 AM – 02:00 PM</small>
          </div>
          <em className={d[2] === 'Available' ? 'available' : 'consult'}>{d[2]}</em>
        </div>
      ))}
      <a className="card-link">Manage Shift Rosters →</a>
    </section>
  );
}
