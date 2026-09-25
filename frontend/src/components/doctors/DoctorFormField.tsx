import type { DoctorFormField as DoctorFormFieldType } from '@/types';

interface Props {
  field: DoctorFormFieldType;
  value: string;
  onChange: (value: string) => void;
}

export function DoctorFormField({ field, value, onChange }: Props) {
  const { label, placeholder, wide, type, options, icon: Icon, suffix } = field;
  const decorated = Boolean(Icon || suffix);

  return (
    <label className={wide ? 'wide' : ''}>
      <span>{label}</span>
      <div className={decorated ? 'field-decorated' : ''}>
        {Icon && <Icon size={13} />}
        {type === 'select' ? (
          <select value={value} onChange={(e) => onChange(e.target.value)}>
            <option value="" disabled>{placeholder}</option>
            {options?.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        ) : (
          <input placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
        )}
        {suffix && <em>{suffix}</em>}
      </div>
    </label>
  );
}
