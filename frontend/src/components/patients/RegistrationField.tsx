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
  age: 'e.g. 34',
  bloodGroup: 'e.g. O+',
  complaint: 'e.g. Follow-up consultation',
  doctor: 'e.g. Dr. Jane Smith',
  notes: 'Any additional notes for the care team',
};

export function RegistrationField({ field, value, onChange }: Props) {
  const { id, label, wide, optional, textarea, icon: Icon, options, numeric } = field;
  const placeholder = PLACEHOLDERS[id] ?? `Enter ${label.replace(/\s*\*$/, '').toLowerCase()}`;
  const numericProps = numeric ? { inputMode: 'numeric' as const, maxLength: 3 } : {};
  const suggestionListId = `patient-field-${id}-suggestions`;
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
          <input placeholder={placeholder} value={value} list={options ? suggestionListId : undefined} {...numericProps} onChange={(e) => onChange(numeric ? e.target.value.replace(/\D/g, '').slice(0, 3) : e.target.value)} />
        </div>
      ) : (
        <input placeholder={placeholder} value={value} list={options ? suggestionListId : undefined} {...numericProps} onChange={(e) => onChange(numeric ? e.target.value.replace(/\D/g, '').slice(0, 3) : e.target.value)} />
      )}
      {options && <datalist id={suggestionListId}>{options.map((option) => <option key={option} value={option} />)}</datalist>}
    </label>
  );
}