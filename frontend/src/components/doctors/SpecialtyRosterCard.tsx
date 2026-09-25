import { TrendingUp } from 'lucide-react';
import type { SpecialtyRosterItem } from '@/types';

export function SpecialtyRosterCard({ roster }: { roster: SpecialtyRosterItem[] }) {
  return (
    <section className="content-card">
      <div className="card-title">
        <div>
          <h2>Clinic Specialty Roster</h2>
          <p>Current registered active physicians across hospital specialties.</p>
        </div>
        <TrendingUp size={14} className="icon-teal" />
      </div>
      <div className="roster-list">
        {roster.map((r) => (
          <div className="roster-item" key={r.name}>
            <div className="roster-item-top">
              <b className={r.highlight ? 'text-teal' : ''}>{r.name}</b>
              <span>{r.count}</span>
            </div>
            <div className="roster-bar"><i style={{ width: `${r.percent}%` }} /></div>
          </div>
        ))}
      </div>
    </section>
  );
}
