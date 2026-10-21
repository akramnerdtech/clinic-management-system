import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Menu, Search, Moon, Sun } from 'lucide-react';
import { patientsService } from '@/services/patientsService';
import { doctorsService } from '@/services/doctorsService';
import { appointmentsService } from '@/services/appointmentsService';
import { useToast } from '@/utils/toast';
import { getStoredTheme, setStoredTheme, type Theme } from '@/utils/theme';

interface TopbarProps {
  onOpenMobileMenu: () => void;
}

export function Topbar({ onOpenMobileMenu }: TopbarProps) {
  const navigate = useNavigate();
  const toast = useToast();
  const [query, setQuery] = useState('');
  const [onDutyCount, setOnDutyCount] = useState(() => {
    return doctorsService.getDoctors().filter((d) => d[4] === 'ON DUTY').length;
  });
  const [theme, setTheme] = useState<Theme>(() => getStoredTheme());
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleThemeChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ theme: Theme }>;
      if (customEvent.detail?.theme) {
        setTheme(customEvent.detail.theme);
      } else {
        setTheme(getStoredTheme());
      }
    };
    window.addEventListener('clinic-theme-changed', handleThemeChange);
    window.addEventListener('storage', handleThemeChange);
    return () => {
      window.removeEventListener('clinic-theme-changed', handleThemeChange);
      window.removeEventListener('storage', handleThemeChange);
    };
  }, []);

  const handleToggleTheme = () => {
    const nextTheme: Theme = theme === 'dark' ? 'light' : 'dark';
    setStoredTheme(nextTheme);
    setTheme(nextTheme);
    toast.success(`Theme switched to ${nextTheme === 'dark' ? 'Dark Mode 🌙' : 'Light Mode ☀️'}`);
  };

  useEffect(() => {
    const updateDoctors = () => {
      setOnDutyCount(doctorsService.getDoctors().filter((d) => d[4] === 'ON DUTY').length);
    };
    window.addEventListener('clinic-doctors-updated', updateDoctors);
    window.addEventListener('storage', updateDoctors);
    return () => {
      window.removeEventListener('clinic-doctors-updated', updateDoctors);
      window.removeEventListener('storage', updateDoctors);
    };
  }, []);

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

  const todayString = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

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
      <div className="clinic-status">
        <i /> Clinic Open · {onDutyCount} {onDutyCount === 1 ? 'Doctor' : 'Doctors'} On Duty
      </div>
      <div className="top-date">
        <Calendar size={14} /> {todayString}
      </div>
      <button
        type="button"
        className="topbar-theme-toggle"
        onClick={handleToggleTheme}
        title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        aria-label="Toggle theme"
      >
        {theme === 'dark' ? (
          <>
            <Sun size={15} style={{ color: '#f59e0b' }} />
            <span>Light Mode</span>
          </>
        ) : (
          <>
            <Moon size={15} style={{ color: '#475569' }} />
            <span>Dark Mode</span>
          </>
        )}
      </button>
    </header>
  );
}
