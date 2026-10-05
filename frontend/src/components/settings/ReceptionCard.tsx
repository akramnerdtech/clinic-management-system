import { BellRing, Hourglass, ScanLine } from 'lucide-react';
import type { receptionDefaults as ReceptionDefaultsType } from '@/data/settings';

interface Props {
  receptionDefaults: typeof ReceptionDefaultsType;
  onToggleWalkInAutoCheckin: () => void;
}

export function ReceptionCard({ receptionDefaults, onToggleWalkInAutoCheckin }: Props) {
  const walkIn = receptionDefaults.walkInAutoCheckin;
  return (
    <section className="sp-card">
      <header className="sp-card-head">
        <span className="sp-card-icon"><ScanLine size={18} /></span>
        <div>
          <h2>Reception &amp; triage</h2>
          <p>Check-in, waiting room pacing and reminder defaults.</p>
        </div>
      </header>
      <div className="sp-list">
        <div className="sp-list-row">
          <span className="sp-list-icon"><Hourglass size={16} /></span>
          <div>
            <b>Queue buffer</b>
            <p>{receptionDefaults.intakeQueueBuffer.description}</p>
          </div>
          <span className="sp-chip strong">{receptionDefaults.intakeQueueBuffer.value}</span>
        </div>
        <div className="sp-list-row">
          <span className="sp-list-icon"><BellRing size={16} /></span>
          <div>
            <b>SMS reminder</b>
            <p>{receptionDefaults.smsReminder.description}</p>
          </div>
          <span className="sp-chip strong">{receptionDefaults.smsReminder.value}</span>
        </div>
        <div className="sp-list-row">
          <span className="sp-list-icon"><ScanLine size={16} /></span>
          <div>
            <b>Walk-in auto check-in</b>
            <p>{walkIn.description}</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={walkIn.enabled}
            aria-label="Toggle walk-in triage auto check-in"
            className={`sp-switch ${walkIn.enabled ? 'on' : ''}`}
            onClick={onToggleWalkInAutoCheckin}
          ><i /></button>
        </div>
      </div>
    </section>
  );
}