import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search, Stethoscope, X } from 'lucide-react';
import type { CalendarDoctorOption } from '@/types';

interface DoctorFilterProps {
  doctors: CalendarDoctorOption[];
  /** Appointments per doctor name for the visible period (after the room / status filters). */
  counts: Record<string, number>;
  totalAppointments: number;
  selected: string | null;
  onSelect: (name: string | null) => void;
}

/** Dropdown listing every doctor; picking one filters the calendar to that doctor's schedule. */
export function DoctorFilter({ doctors, counts, totalAppointments, selected, onSelect }: DoctorFilterProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
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

  const selectedDoctor = doctors.find((d) => d.name === selected);
  const activeCount = doctors.filter((d) => d.onDuty).length;

  const visibleDoctors = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return doctors;
    return doctors.filter((d) => d.name.toLowerCase().includes(q) || d.specialty.toLowerCase().includes(q));
  }, [doctors, query]);

  const choose = (name: string | null) => {
    onSelect(name);
    setOpen(false);
    setQuery('');
  };

  return (
    <div className="doctor-filter" ref={rootRef}>
      <button
        type="button"
        className={`dropdown-btn doctor-filter-trigger${selectedDoctor ? ' has-selection' : ''}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        {selectedDoctor
          ? <img src={selectedDoctor.avatar} alt="" className="doctor-filter-avatar" />
          : <Stethoscope size={12} />}
        <span className="doctor-filter-label">
          {selectedDoctor ? selectedDoctor.name : `All Doctors (${activeCount} Active)`}
        </span>
        {selectedDoctor && <em className="doctor-filter-count">{counts[selectedDoctor.name] ?? 0} appts</em>}
        <ChevronDown size={12} />
      </button>
      {selectedDoctor && (
        <button type="button" className="doctor-filter-clear" onClick={() => choose(null)} aria-label="Clear doctor filter" title="Show all doctors">
          <X size={12} />
        </button>
      )}

      {open && (
        <div className="doctor-filter-panel" role="listbox" aria-label="Filter calendar by doctor">
          <label className="doctor-filter-search">
            <Search size={12} />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search doctor or specialty"
            />
          </label>
          <div className="doctor-filter-list">
            <button
              type="button"
              role="option"
              aria-selected={!selected}
              className={`doctor-filter-item${!selected ? ' selected' : ''}`}
              onClick={() => choose(null)}
            >
              <span className="doctor-filter-all-icon"><Stethoscope size={14} /></span>
              <span className="doctor-filter-meta">
                <b>All Doctors</b>
                <small>{doctors.length} doctors · {activeCount} on duty</small>
              </span>
              <em>{totalAppointments}</em>
              {!selected && <Check size={13} />}
            </button>
            {visibleDoctors.map((d) => (
              <button
                type="button"
                role="option"
                key={d.name}
                aria-selected={selected === d.name}
                className={`doctor-filter-item${selected === d.name ? ' selected' : ''}`}
                onClick={() => choose(d.name)}
              >
                <img src={d.avatar} alt="" className="doctor-filter-avatar large" />
                <span className="doctor-filter-meta">
                  <b>{d.name}</b>
                  <small>{d.specialty} · {d.room}</small>
                </span>
                <i className={`doctor-filter-dot${d.onDuty ? ' on' : ''}`} title={d.onDuty ? 'On duty' : 'Off duty'} />
                <em>{counts[d.name] ?? 0}</em>
                {selected === d.name && <Check size={13} />}
              </button>
            ))}
            {visibleDoctors.length === 0 && <p className="doctor-filter-empty">No doctors match “{query}”.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
