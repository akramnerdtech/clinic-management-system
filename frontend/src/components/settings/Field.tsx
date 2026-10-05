import type { ReactNode } from 'react';

interface Props {
  label: string;
  value: string;
  icon?: ReactNode;
  wide?: boolean;
  danger?: boolean;
  type?: string;
  error?: string | null;
  autoComplete?: string;
  disabled?: boolean;
  maxLength?: number;
  onChange?: (value: string) => void;
}

export function Field({ label, value, icon, wide = false, danger = false, type = 'text', error, autoComplete, disabled = false, maxLength, onChange }: Props) {
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
          disabled={disabled}
          autoComplete={autoComplete}
          maxLength={maxLength}
          aria-invalid={error ? true : undefined}
          onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        />
      </div>
      {error && <small className="field-error" role="alert">{error}</small>}
    </label>
  );
}