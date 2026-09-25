import { IdCard } from 'lucide-react';
import type { PhysicianShift } from '@/types';

export function PhysicianShiftReference({ shifts }: { shifts: PhysicianShift[] }) {
  return (
    <section className="content-card side-card">
      <h2>Physician Shift Reference <span><IdCard size={15} /></span></h2>
      <p className="live-status-label">Current active medical staff assigned to suites today, September 24.</p>
      <div className="physician-grid">
        {shifts.map((s) => (
          <div className="physician-card" key={s.name}>
            <div className="physician-card-head">
              <img src={s.avatar} alt="" />
              <div>
                <b>{s.name}</b>
                <small>{s.dept}</small>
              </div>
            </div>
            <div className="physician-shift-row"><span>Shift</span><b>{s.shiftStart} - {s.shiftEnd}</b></div>
            <div className="physician-shift-row"><span>Station</span><b>{s.station}</b></div>
            <div className="physician-card-foot">
              <span className={`physician-status-pill ${s.statusTone}`}>{s.statusLabel}</span>
              <small>{s.visits}</small>
            </div>
          </div>
        ))}
      </div>
      <a className="card-link">Full Roster →</a>
    </section>
  );
}
