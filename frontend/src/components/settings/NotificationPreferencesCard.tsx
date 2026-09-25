import type { ToggleSetting } from '@/types';

interface Props {
  toggles: ToggleSetting[];
  onToggle: (key: string) => void;
}

export function NotificationPreferencesCard({ toggles, onToggle }: Props) {
  return (
    <section className="content-card notifications-card">
      <h2>♪ Notification Preferences</h2>
      <p>Choose how CuraClinic keeps you informed across email, SMS, and the front-desk console.</p>
      <div className="toggle-list">
        {toggles.map((t) => (
          <article key={t.key}>
            <div>
              <b>{t.label}</b>
              <p>{t.description}</p>
            </div>
            <button
              type="button"
              className={`toggle-switch ${t.enabled ? 'on' : ''}`}
              onClick={() => onToggle(t.key)}
              aria-label={`Toggle ${t.label}`}
            >
              {t.enabled ? 'ON' : 'OFF'}
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
