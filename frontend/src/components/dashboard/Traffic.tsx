import { Activity, CalendarDays, TrendingUp } from 'lucide-react';
import type { TrafficPoint } from '@/types';

export function Traffic({ points }: { points: TrafficPoint[] }) {
  const total = points.reduce((acc, p) => acc + p.value, 0);
  const maxVal = Math.max(1, ...points.map((p) => p.value));

  // Find peak day
  const peak = points.reduce((prev, curr) => (curr.value > prev.value ? curr : prev), points[0] || { hour: 'MON', value: 0 });

  // Today's day code
  const todayDayIndex = (new Date().getDay() + 6) % 7;
  const dayNames = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
  const todayCode = dayNames[todayDayIndex];

  return (
    <section className="content-card traffic-card">
      <div className="card-title">
        <div>
          <h2>Weekly Patient Volume & Schedule Flow</h2>
          <p>Appointment volume mapped across clinic days (Monday – Sunday)</p>
        </div>
        <div className="legend" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: '#007d72', display: 'inline-block' }} />
            Weekly Volume
          </span>
          {peak && peak.value > 0 && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#0d9488', fontWeight: 600 }}>
              <TrendingUp size={12} /> Peak: {peak.hour} ({peak.value})
            </span>
          )}
        </div>
      </div>
      <div className="bars" style={{ minHeight: 120, alignItems: 'flex-end', paddingTop: 16 }}>
        {points.map((p) => {
          const isToday = p.hour === todayCode;
          const isPeak = p.value > 0 && p.value === peak.value;
          const barHeight = Math.max(12, Math.round((p.value / maxVal) * 80));

          return (
            <div key={p.hour} style={{ flex: 1, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: p.value > 0 ? '#007d72' : 'var(--text-muted, #94a3b8)', marginBottom: 4 }}>
                {p.value}
              </span>
              <b
                style={{
                  height: `${barHeight}px`,
                  width: '70%',
                  maxWidth: 36,
                  borderRadius: '3px 3px 0 0',
                  background: isPeak ? '#007d72' : isToday ? '#0d9488' : p.value > 0 ? '#2dd4bf' : '#e2e8f0',
                  transition: 'height 0.3s ease',
                  display: 'block',
                }}
              />
              <small
                style={{
                  marginTop: 6,
                  fontSize: 10,
                  fontWeight: isToday ? 800 : 600,
                  color: isToday ? '#007d72' : 'var(--text-muted, #64748b)',
                  borderBottom: isToday ? '2px solid #007d72' : 'none',
                  paddingBottom: 2,
                }}
              >
                {p.hour}
              </small>
            </div>
          );
        })}
      </div>
      <div className="throughput">
        <Activity size={15} /> Weekly Scheduled Intake: <strong>{total} Appointments</strong> across all doctor suites · <CalendarDays size={13} style={{ marginLeft: 6, marginRight: 2 }} /> LIVE TELEMETRY ACTIVE
      </div>
    </section>
  );
}
