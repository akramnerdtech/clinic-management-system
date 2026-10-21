import type { DutyDay } from '@/types';

export function DutyDaySelector({
  days,
  onToggle,
  onTimeChange,
  onSessionChange,
  onApplyPreset,
}: {
  days: DutyDay[];
  onToggle: (key: string) => void;
  onTimeChange: (dayKey: string, part: 'start' | 'end', value: string) => void;
  onSessionChange?: (dayKey: string, sessionIndex: number, part: 'start' | 'end', value: string) => void;
  onApplyPreset?: (preset: 'both' | 'morning' | 'evening' | 'full') => void;
}) {
  const dayNames: Record<string, string> = {
    MON: 'Monday',
    TUE: 'Tuesday',
    WED: 'Wednesday',
    THU: 'Thursday',
    FRI: 'Friday',
    SAT: 'Saturday',
    SUN: 'Sunday',
  };

  return (
    <div className="duty-days doctor-weekly-schedule">
      {onApplyPreset && (
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8,
          marginBottom: 16,
          padding: '10px 14px',
          background: '#f8fafc',
          borderRadius: 8,
          border: '1px solid #e2e8f0',
          alignItems: 'center'
        }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>
            Quick Shift Preset:
          </span>
          <button
            type="button"
            onClick={() => onApplyPreset('both')}
            style={{
              fontSize: 12,
              fontWeight: 600,
              padding: '4px 10px',
              borderRadius: 6,
              background: '#ecfdf5',
              border: '1px solid #a7f3d0',
              color: '#065f46',
              cursor: 'pointer'
            }}
          >
            ☀️+🌙 Morning (10–12) & Evening (6–8)
          </button>
          <button
            type="button"
            onClick={() => onApplyPreset('morning')}
            style={{
              fontSize: 12,
              fontWeight: 600,
              padding: '4px 10px',
              borderRadius: 6,
              background: '#fef3c7',
              border: '1px solid #fde68a',
              color: '#92400e',
              cursor: 'pointer'
            }}
          >
            ☀️ Morning Only (10–12)
          </button>
          <button
            type="button"
            onClick={() => onApplyPreset('evening')}
            style={{
              fontSize: 12,
              fontWeight: 600,
              padding: '4px 10px',
              borderRadius: 6,
              background: '#e0e7ff',
              border: '1px solid #c7d2fe',
              color: '#3730a3',
              cursor: 'pointer'
            }}
          >
            🌙 Evening Only (6–8)
          </button>
          <button
            type="button"
            onClick={() => onApplyPreset('full')}
            style={{
              fontSize: 12,
              fontWeight: 600,
              padding: '4px 10px',
              borderRadius: 6,
              background: '#f1f5f9',
              border: '1px solid #cbd5e1',
              color: '#334155',
              cursor: 'pointer'
            }}
          >
            Full Day (10–8)
          </button>
        </div>
      )}

      {days.map((d) => {
        const mornSession = d.sessions?.[0] ?? { start: '10:00', end: '12:00' };
        const eveSession = d.sessions?.[1] ?? { start: '18:00', end: '20:00' };

        return (
          <div
            className={`doctor-day-row ${d.active ? 'scheduled' : ''}`}
            key={d.key}
            style={{
              flexDirection: 'column',
              alignItems: 'stretch',
              gap: 8,
              padding: '12px 14px',
              border: d.active ? '1.5px solid #007d72' : '1px solid #e2e8f0',
              borderRadius: 8,
              marginBottom: 10,
              background: d.active ? '#fcfdfd' : '#ffffff',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label className="doctor-day-toggle" style={{ margin: 0 }}>
                <input type="checkbox" checked={d.active} onChange={() => onToggle(d.key)} />
                <span className="doctor-day-switch" />
                <b style={{ fontSize: 14 }}>{dayNames[d.key] ?? d.key}</b>
              </label>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: 10,
                  backgroundColor: d.active ? '#dcfce7' : '#f1f5f9',
                  color: d.active ? '#15803d' : '#64748b',
                }}
              >
                {d.active ? 'Active Visiting Day' : 'Off Duty'}
              </span>
            </div>

            {d.active && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10, marginTop: 4 }}>
                {/* Morning Session */}
                <div style={{
                  padding: '8px 10px',
                  background: '#fefce8',
                  borderRadius: 6,
                  border: '1px solid #fef08a',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  flexWrap: 'wrap'
                }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#854d0e', minWidth: 95 }}>
                    ☀️ Morning Visit:
                  </span>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#475569' }}>
                    <span>In</span>
                    <input
                      type="time"
                      value={mornSession.start || '10:00'}
                      onChange={(e) => {
                        if (onSessionChange) {
                          onSessionChange(d.key, 0, 'start', e.target.value);
                        } else {
                          onTimeChange(d.key, 'start', e.target.value);
                        }
                      }}
                      style={{ padding: '2px 6px', border: '1px solid #cbd5e1', borderRadius: 4, fontSize: 12 }}
                    />
                  </label>
                  <span style={{ color: '#94a3b8', fontSize: 12 }}>–</span>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#475569' }}>
                    <span>Out</span>
                    <input
                      type="time"
                      value={mornSession.end || '12:00'}
                      onChange={(e) => {
                        if (onSessionChange) {
                          onSessionChange(d.key, 0, 'end', e.target.value);
                        } else {
                          onTimeChange(d.key, 'end', e.target.value);
                        }
                      }}
                      style={{ padding: '2px 6px', border: '1px solid #cbd5e1', borderRadius: 4, fontSize: 12 }}
                    />
                  </label>
                </div>

                {/* Evening Session */}
                <div style={{
                  padding: '8px 10px',
                  background: '#eef2ff',
                  borderRadius: 6,
                  border: '1px solid #c7d2fe',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  flexWrap: 'wrap'
                }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#3730a3', minWidth: 95 }}>
                    🌙 Evening Visit:
                  </span>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#475569' }}>
                    <span>In</span>
                    <input
                      type="time"
                      value={eveSession.start || '18:00'}
                      onChange={(e) => {
                        if (onSessionChange) {
                          onSessionChange(d.key, 1, 'start', e.target.value);
                        }
                      }}
                      style={{ padding: '2px 6px', border: '1px solid #cbd5e1', borderRadius: 4, fontSize: 12 }}
                    />
                  </label>
                  <span style={{ color: '#94a3b8', fontSize: 12 }}>–</span>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#475569' }}>
                    <span>Out</span>
                    <input
                      type="time"
                      value={eveSession.end || '20:00'}
                      onChange={(e) => {
                        if (onSessionChange) {
                          onSessionChange(d.key, 1, 'end', e.target.value);
                        }
                      }}
                      style={{ padding: '2px 6px', border: '1px solid #cbd5e1', borderRadius: 4, fontSize: 12 }}
                    />
                  </label>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
