import type { ReactNode } from 'react';

interface Props {
  label: string;
  value: string;
  icon?: ReactNode;
  wide?: boolean;
  danger?: boolean;
  type?: string;
  onChange?: (value: string) => void;
}

export function Field({ label, value, icon, wide = false, danger = false, type = 'text', onChange }: Props) {
  return (
    <label className={`sp-field ${wide ? 'wide' : ''} ${danger ? 'danger' : ''}`}>
      <span className="sp-label">{label}</span>
      <div className="sp-input">
        {icon}
        <input
          type={type}
          value={value}
          placeholder={label}
          readOnly={!onChange}
          onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        />
      </div>
    </label>
  );
}