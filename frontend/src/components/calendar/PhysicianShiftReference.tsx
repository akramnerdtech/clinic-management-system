import { IdCard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { PhysicianShift } from '@/types';

interface PhysicianShiftReferenceProps {
  shifts: PhysicianShift[];
  /** Roster name the calendar is currently filtered to, if any. */
  selectedDoctor?: string | null;
  /** Clicking a card filters the calendar to that doctor (clicking it again clears the filter). */
  onSelectDoctor?: (doctorName: string | null) => void;
}

export function PhysicianShiftReference({ shifts, selectedDoctor, onSelectDoctor }: PhysicianShiftReferenceProps) {
  const navigate = useNavigate();

  return (
    <section className="content-card side-card">
      <h2>Physician Shift Reference <span><IdCard size={15} /></span></h2>
      <p className="live-status-label">Current active medical staff assigned to suites today, September 24.</p>
      <div className="physician-grid">
        {shifts.map((s) => {
          const doctorName = s.doctorName;
          const interactive = Boolean(onSelectDoctor && doctorName);
          const active = interactive && selectedDoctor === doctorName;
          const toggle = () => {
            if (doctorName) onSelectDoctor?.(active ? null : doctorName);
          };
          return (
            <div
              className={`physician-card${interactive ? ' clickable' : ''}${active ? ' active' : ''}`}
              key={s.name}
              role={interactive ? 'button' : undefined}
              tabIndex={interactive ? 0 : undefined}
              aria-pressed={interactive ? active : undefined}
              title={interactive ? (active ? 'Show all doctors on the calendar' : `Show ${doctorName}'s schedule on the calendar`) : undefined}
              onClick={interactive ? toggle : undefined}
              onKeyDown={interactive ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  toggle();
                }
              } : undefined}
            >
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
          );
        })}
      </div>
      <a className="card-link" href="/doctors" onClick={(e) => { e.preventDefault(); navigate('/doctors'); }}>Full Roster →</a>
    </section>
  );
}
