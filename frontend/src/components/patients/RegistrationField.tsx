import type { RegistrationField as RegistrationFieldType } from '@/types';

interface Props {
  field: RegistrationFieldType;
  value: string;
  onChange: (value: string) => void;
}

/** A short, human-readable example for each field, used as a placeholder when the field is empty. */
const PLACEHOLDERS: Record<string, string> = {
  fullName: 'e.g. Jane Doe',
  phone: 'e.g. +1 (555) 123-4567',
  dob: 'MM/DD/YYYY',
  complaint: 'e.g. Follow-up consultation',
  allergies: 'e.g. Penicillin, Latex — or None',
  doctor: 'e.g. Dr. Jane Smith',
  notes: 'Any additional notes for the care team',
};

export function RegistrationField({ field, value, onChange }: Props) {
  const { id, label, wide, optional, textarea, icon: Icon } = field;
  const placeholder = PLACEHOLDERS[id] ?? `Enter ${label.replace(/\s*\*$/, '').toLowerCase()}`;
  return (
    <label className={wide ? 'wide' : ''}>
      <span>
        {label}
        {optional && <em>Optional</em>}
      </span>
      {textarea ? (
        <textarea rows={3} placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
      ) : Icon ? (
        <div className="field-decorated">
          <Icon size={13} />
          <input placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
        </div>
      ) : (
        <input placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
      )}
    </label>
  );
}
