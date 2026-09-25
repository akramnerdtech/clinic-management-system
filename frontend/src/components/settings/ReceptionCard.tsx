import type { receptionDefaults as ReceptionDefaultsType } from '@/data/settings';

interface Props {
  receptionDefaults: typeof ReceptionDefaultsType;
  onToggleWalkInAutoCheckin: () => void;
}

export function ReceptionCard({ receptionDefaults, onToggleWalkInAutoCheckin }: Props) {
  return (
    <section className="content-card reception-card">
      <h2>▱ Reception & Triage Defaults</h2>
      <p>Automate check-in procedures, waiting room pacing, and automated notification sequences.</p>
      <div>
        <article>
          <b>Intake Queue Buffer <span>{receptionDefaults.intakeQueueBuffer.value}</span></b>
          <p>{receptionDefaults.intakeQueueBuffer.description}</p>
        </article>
        <article>
          <b>Automated SMS Reminder <span>{receptionDefaults.smsReminder.value}</span></b>
          <p>{receptionDefaults.smsReminder.description}</p>
        </article>
      </div>
      <article className="walk-in">
        <b>♧ Walk-in Triage Auto-Checkin</b>
        <p>{receptionDefaults.walkInAutoCheckin.description}</p>
        <button
          type="button"
          className={`toggle-switch ${receptionDefaults.walkInAutoCheckin.enabled ? 'on' : ''}`}
          onClick={onToggleWalkInAutoCheckin}
          aria-label="Toggle walk-in triage auto-checkin"
        >
          {receptionDefaults.walkInAutoCheckin.enabled ? 'ON' : 'OFF'}
        </button>
      </article>
    </section>
  );
}
