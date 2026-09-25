import { LogOut, MonitorSmartphone } from 'lucide-react';
import type { SessionEntry } from '@/types';
import { IconButton } from '@/components/ui/IconButton';

interface Props {
  sessions: SessionEntry[];
  onRevoke: (id: string) => void;
  onSignOutOthers: () => void;
}

export function SessionsCard({ sessions, onRevoke, onSignOutOthers }: Props) {
  const hasOtherSessions = sessions.some((s) => !s.current);

  return (
    <section className="content-card rail-card">
      <h2><MonitorSmartphone size={15} /> Active Sessions</h2>
      <p>Devices currently signed in to your CuraClinic account.</p>
      {sessions.map((s) => (
        <div className="session-row" key={s.id}>
          <div>
            <b>{s.device}{s.current && <em>CURRENT</em>}</b>
            <small>{s.location} · {s.lastActive}</small>
          </div>
          {!s.current && <button onClick={() => onRevoke(s.id)}>Revoke</button>}
        </div>
      ))}
      {hasOtherSessions && (
        <IconButton className="soft-button full-button" onClick={onSignOutOthers}>
          <LogOut size={13} /> Sign Out All Other Sessions
        </IconButton>
      )}
    </section>
  );
}
