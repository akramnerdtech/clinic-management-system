import { ClipboardPlus } from 'lucide-react';
import type { AppointmentFormatOption, PriorityOption } from '@/types';

interface Props {
  medicalSpecialties: string[];
  specialists: string[];
  departmentLine: string;
  onDutyLine: string;
  specialty: string;
  onSpecialtyChange: (value: string) => void;
  specialist: string;
  onSpecialistChange: (value: string) => void;
  reason: string;
  onReasonChange: (value: string) => void;
  intakeMemo: string;
  onIntakeMemoChange: (value: string) => void;
  formatOptions: AppointmentFormatOption[];
  formatId: string;
  onFormatChange: (id: string) => void;
  priorityOptions: PriorityOption[];
  priorityId: string;
  onPriorityChange: (id: string) => void;
}

export function ClinicalSetupCard({
  medicalSpecialties, specialists, departmentLine, onDutyLine,
  specialty, onSpecialtyChange, specialist, onSpecialistChange,
  reason, onReasonChange, intakeMemo, onIntakeMemoChange,
  formatOptions, formatId, onFormatChange, priorityOptions, priorityId, onPriorityChange,
}: Props) {
  return (
    <section className="content-card appointment-form-card">
      <div className="card-title icon-title">
        <div className="form-icon"><ClipboardPlus size={16} /></div>
        <div>
          <h2>2. Clinical & Consultation Setup</h2>
        </div>
        <span className="section-badge">Step 2 of 3</span>
      </div>

      <form onSubmit={(e) => e.preventDefault()} className="form-grid">
        <label>
          <span>Medical Specialty *</span>
          <select value={specialty} onChange={(e) => onSpecialtyChange(e.target.value)}>
            {medicalSpecialties.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        <label>
          <span>Assigned Specialist *</span>
          <select value={specialist} onChange={(e) => onSpecialistChange(e.target.value)}>
            {specialists.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        <small className="field-note">{departmentLine}</small>
        <small className="field-note field-note-teal">● {onDutyLine}</small>

        <label className="wide">
          <span>Reason for Visit / Chief Complaint * <em className="label-hint">Concise phrase</em></span>
          <input placeholder="e.g. Annual checkup, follow-up visit, lab review" value={reason} onChange={(e) => onReasonChange(e.target.value)} />
        </label>

        <label>
          <span>Appointment Format</span>
          <div className="format-grid">
            {formatOptions.map((f) => (
              <button
                type="button"
                key={f.id}
                className={`format-cell ${formatId === f.id ? 'selected' : ''}`}
                onClick={() => onFormatChange(f.id)}
              >
                <span className="radio-dot" />
                <b>{f.label}</b>
                <small>{f.meta}</small>
              </button>
            ))}
          </div>
        </label>
        <label>
          <span>Priority Triage Level</span>
          <div className="priority-grid">
            {priorityOptions.map((p) => (
              <button
                type="button"
                key={p.id}
                className={`priority-cell ${priorityId === p.id ? 'selected' : ''}`}
                onClick={() => onPriorityChange(p.id)}
              >
                <span className={`dot ${p.tone}`} />
                {p.label}
                <span className={`radio ${priorityId === p.id ? p.tone : ''}`} />
              </button>
            ))}
          </div>
        </label>

        <label className="wide">
          <span>Intake Memo & Pre-Visit Notes <em className="label-hint">Optional for Physician</em></span>
          <textarea rows={3} placeholder="Optional notes for the physician before the visit" value={intakeMemo} onChange={(e) => onIntakeMemoChange(e.target.value)} />
        </label>
      </form>
    </section>
  );
}
