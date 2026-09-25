import { DoorOpen } from 'lucide-react';
import type { RoomStatus, SuiteUtilizationRow } from '@/types';

export function SuiteUtilization({ rows, roomStatuses }: { rows: SuiteUtilizationRow[]; roomStatuses: RoomStatus[] }) {
  return (
    <section className="content-card side-card">
      <h2>Suite Utilization <span><DoorOpen size={15} /></span></h2>
      <p className="live-status-label">Occupancy distribution across inpatient rooms and consultation corridors.</p>
      {rows.map((r) => (
        <div className="suite-util-row" key={r.label}>
          <div className="suite-util-row-top">
            <span>{r.label}</span>
            <span>{r.percentLabel}</span>
          </div>
          <div className={`suite-util-bar ${r.tone}`}>
            <i style={{ width: `${r.percent}%` }} />
          </div>
        </div>
      ))}
      <div className="suite-legend">
        {roomStatuses.map((r) => (
          <span key={r.label}><i className={r.tone} /> {r.label}</span>
        ))}
      </div>
    </section>
  );
}
