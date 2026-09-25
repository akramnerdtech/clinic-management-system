import { useNavigate } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import type { ActivityItem } from '@/types';

export function ActivityFeed({ items, icons }: { items: ActivityItem[]; icons: LucideIcon[] }) {
  const navigate = useNavigate();
  return (
    <section className="content-card side-card activity-feed">
      <h2>Live Activity Feed <i /></h2>
      <p>Reception events log</p>
      {items.map((a, i) => {
        const Icon = icons[i];
        return (
          <div className="feed-item" key={a.text}>
            <span>{Icon && <Icon size={13} />}</span>
            <b>{a.text}</b>
            <small>{a.meta}</small>
          </div>
        );
      })}
      <button className="audit-link" onClick={() => navigate('/settings')}>View Audit Log</button>
    </section>
  );
}
