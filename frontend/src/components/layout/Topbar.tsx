import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Menu, Plus, Search, UserPlus } from 'lucide-react';
import { IconButton } from '@/components/ui/IconButton';
import { patientsService } from '@/services/patientsService';
import { doctorsService } from '@/services/doctorsService';
import { appointmentsService } from '@/services/appointmentsService';
import { useToast } from '@/utils/toast';

interface TopbarProps {
  onOpenMobileMenu: () => void;
}

export function Topbar({ onOpenMobileMenu }: TopbarProps) {
  const navigate = useNavigate();
  const toast = useToast();
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: globalThis.KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const runSearch = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    const term = query.trim().toLowerCase();
    if (!term) return;

    const matchesPatient = patientsService.getPatients().some((p) => `${p[0]} ${p[1]}`.toLowerCase().includes(term));
    const matchesDoctor = doctorsService.getDoctors().some((d) => `${d[0]} ${d[1]}`.toLowerCase().includes(term));
    const matchesAppointment = appointmentsService.getEntries().some((a) => `${a[2]} ${a[3]}`.toLowerCase().includes(term));

    if (matchesPatient) navigate('/patients');
    else if (matchesDoctor) navigate('/doctors');
    else if (matchesAppointment) navigate('/appointments');
    else toast.info(`No match for "${query.trim()}" in Patients, Doctors, or Appointments.`);
  };

  return (
    <header className="topbar">
      <button className="mobile-menu" onClick={onOpenMobileMenu}><Menu size={18} /></button>
      <div className="global-search">
        <Search size={15} />
        <input
          ref={inputRef}
          placeholder="Search patients, doctors, appointments..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={runSearch}
        />
        <kbd>Ctrl+K</kbd>
      </div>
      <div className="clinic-status"><i /> Clinic Open · 8 Doctors On Duty</div>
      <div className="top-date"><Calendar size={14} /> Thursday, 24 September 2026</div>
      <IconButton className="white-button" onClick={() => navigate('/patients/new')}><UserPlus size={14} /> Add Patient</IconButton>
      <IconButton className="teal-button" onClick={() => navigate('/appointments/new')}><Plus size={14} /> New Appointment</IconButton>
    </header>
  );
}
