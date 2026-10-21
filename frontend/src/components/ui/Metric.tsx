import { Activity } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export function Metric({
  label,
  value,
  note,
  color = 'teal',
  icon: I = Activity,
  onClick,
  isActive = false,
}: {
  label: string;
  value: string;
  note: string;
  color?: string;
  icon?: LucideIcon;
  onClick?: () => void;
  isActive?: boolean;
}) {
  return (
    <div
      className={`metric-card ${onClick ? 'is-clickable' : ''} ${isActive ? 'is-active' : ''}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => (e.key === 'Enter' || e.key === ' ') && onClick() : undefined}
      title={onClick ? `Click to filter: ${label}` : undefined}
      style={onClick ? { cursor: 'pointer' } : undefined}
    >
      <div className="metric-top">
        <span>{label}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {isActive && (
            <span
              style={{
                fontSize: 9,
                fontWeight: 700,
                color: '#007d72',
                backgroundColor: '#e6f7f5',
                padding: '1px 6px',
                borderRadius: 4,
                letterSpacing: 0,
              }}
            >
              FILTER ACTIVE
            </span>
          )}
          <I size={16} className={`icon-${color}`} />
        </div>
      </div>
      <strong className={color === 'red' ? 'text-red' : ''}>{value}</strong>
      <small>{note}</small>
      <div className={`metric-bar ${color}`} />
    </div>
  );
}
