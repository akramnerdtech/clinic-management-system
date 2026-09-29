import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Check, ChevronDown } from 'lucide-react';

export interface FilterOption {
  value: string;
  label: string;
  count: number;
}

interface FilterDropdownProps {
  icon: ReactNode;
  /** Trigger text when nothing is selected, e.g. "Status: All". */
  allLabel: string;
  /** Prefix for the trigger text once an option is picked, e.g. "Status" -> "Status: Confirmed". */
  prefix: string;
  /** Label of the reset row at the top of the list, e.g. "All statuses". */
  resetLabel: string;
  options: FilterOption[];
  /** Number of appointments shown next to the reset row. */
  totalCount: number;
  selected: string | null;
  onSelect: (value: string | null) => void;
}

/** Single-select filter dropdown matching the calendar toolbar's look. Click outside or Esc closes it. */
export function FilterDropdown({ icon, allLabel, prefix, resetLabel, options, totalCount, selected, onSelect }: FilterDropdownProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const choose = (value: string | null) => {
    onSelect(value);
    setOpen(false);
  };

  return (
    <div className="filter-dropdown" ref={rootRef}>
      <button
        type="button"
        className={`dropdown-btn${selected ? ' has-selection' : ''}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        {icon} {selected ? `${prefix}: ${selected}` : allLabel} <ChevronDown size={12} />
      </button>
      {open && (
        <div className="filter-dropdown-panel" role="listbox" aria-label={resetLabel}>
          <button
            type="button"
            role="option"
            aria-selected={!selected}
            className={`doctor-filter-item${!selected ? ' selected' : ''}`}
            onClick={() => choose(null)}
          >
            <span className="doctor-filter-meta"><b>{resetLabel}</b></span>
            <em>{totalCount}</em>
            {!selected && <Check size={13} />}
          </button>
          {options.map((o) => (
            <button
              type="button"
              role="option"
              key={o.value}
              aria-selected={selected === o.value}
              className={`doctor-filter-item${selected === o.value ? ' selected' : ''}`}
              onClick={() => choose(o.value)}
            >
              <span className="doctor-filter-meta"><b>{o.label}</b></span>
              <em>{o.count}</em>
              {selected === o.value && <Check size={13} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
