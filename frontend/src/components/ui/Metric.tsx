import { Activity } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export function Metric({ label, value, note, color = 'teal', icon: I = Activity }: { label: string; value: string; note: string; color?: string; icon?: LucideIcon }) {
  return (
    <div className="metric-card">
      <div className="metric-top">
        <span>{label}</span>
        <I size={16} className={`icon-${color}`} />
      </div>
      <strong className={color === 'red' ? 'text-red' : ''}>{value}</strong>
      <small>{note}</small>
      <div className={`metric-bar ${color}`} />
    </div>
  );
}
