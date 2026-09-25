import { Activity } from 'lucide-react';
import type { TrafficPoint } from '@/types';

export function Traffic({ points }: { points: TrafficPoint[] }) {
  return (
    <section className="content-card traffic-card">
      <div className="card-title">
        <div>
          <h2>Clinic Hourly Traffic & Triage Flow</h2>
          <p>Patient volume mapped against room utilization</p>
        </div>
        <div className="legend"><span /> Intake Load <span className="blue-dot" /> Peak Window (10:00 - 11:30 AM)</div>
      </div>
      <div className="bars">
        {points.map((p) => (
          <div key={p.hour}>
            <b style={{ height: `${p.value * 5}px` }}>{p.value}</b>
            <small>{p.hour}</small>
          </div>
        ))}
      </div>
      <div className="throughput">
        <Activity size={15} /> Current Throughput: 92% On-Time Consultations across all specialty rooms <strong>LIVE TELEMETRY ACTIVE</strong>
      </div>
    </section>
  );
}
