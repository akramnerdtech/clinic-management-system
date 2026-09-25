interface Props {
  label: string;
  value: string;
  wide?: boolean;
  danger?: boolean;
  type?: string;
  onChange?: (value: string) => void;
}

export function Field({ label, value, wide = false, danger = false, type = 'text', onChange }: Props) {
  return (
    <label className={`${wide ? 'wide' : ''} ${danger ? 'danger-label' : ''}`}>
      <span>{label}</span>
      <input
        type={type}
        value={value}
        placeholder={`Enter ${label.toLowerCase()}`}
        readOnly={!onChange}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
      />
    </label>
  );
}
