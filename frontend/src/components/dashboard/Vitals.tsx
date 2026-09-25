import { Activity } from 'lucide-react';
import type { VitalRow } from '@/types';

export function Vitals({ rows }: { rows: VitalRow[] }) {
  return (
    <section className="content-card side-card">
      <h2>Triage Bays & Vitals <Activity size={15} /></h2>
      <p>Live patient telemetry readings</p>
      {rows.map((v) => (
        <div className="vital-row" key={v.room}>
          <b>{v.room}</b>
          <span>{v.readingLabel} <strong>{v.readingValue}</strong></span>
          <small>{v.note}</small>
          <em>{v.status}</em>
        </div>
      ))}
    </section>
  );
}
