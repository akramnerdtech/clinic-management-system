import { doctorsMetrics, doctorProfile } from '@/data/doctors';
import { loadFromStorage, saveToStorage } from '@/utils/storage';
import { Stethoscope, Clock3, CheckCircle2, Building2 } from 'lucide-react';
import type { Doctor, MetricConfig } from '@/types';

const KEYS = {
  doctors: 'curaclinic.doctors.doctors',
  metrics: 'curaclinic.doctors.metrics',
  profile: 'curaclinic.doctors.profile',
};

export const doctorsService = {
  getDoctors(): Doctor[] {
    const loaded = loadFromStorage<Doctor[]>(KEYS.doctors, []);
    return loaded.map((doctor) => [
      doctor[0],
      doctor[1],
      doctor[2],
      doctor[3],
      doctor[4] === 'OFF DUTY' ? 'OFF DUTY' : 'ON DUTY',
      doctor[5],
      doctor[6],
      doctor[7],
    ]);
  },

  getOnDutyCount(): number {
    return this.getDoctors().filter((doctor) => doctor[4] === 'ON DUTY').length;
  },

  getMetrics(): MetricConfig[] {
    const roster = this.getDoctors();
    const onDuty = roster.filter((doctor) => doctor[4] === 'ON DUTY').length;
    const available = onDuty;
    const specialties = new Set(roster.map((d) => d[1])).size;

    return [
      {
        label: 'TOTAL DOCTORS',
        value: String(roster.length),
        note: roster.length ? '100% capacity' : 'No doctors registered',
        icon: Stethoscope,
      },
      {
        label: 'ON DUTY TODAY',
        value: String(onDuty),
        note: `of ${roster.length} scheduled`,
        color: 'blue',
        icon: Clock3,
      },
      {
        label: 'AVAILABLE NOW',
        value: String(available),
        note: `${available} on floor`,
        icon: CheckCircle2,
      },
      {
        label: 'MEDICAL SPECIALTIES',
        value: String(specialties),
        note: 'Active units',
        icon: Building2,
      },
    ];
  },

  getFeaturedProfile() {
    return loadFromStorage(KEYS.profile, doctorProfile);
  },

  /** Prepends a newly registered doctor to the roster and persists it. */
  addDoctor(doctor: Doctor): Doctor[] {
    const current = loadFromStorage<Doctor[]>(KEYS.doctors, []);
    // Prevent duplicate entries by name
    const filtered = current.filter((d) => d[0].toLowerCase() !== doctor[0].toLowerCase());
    const updated = [doctor, ...filtered];
    saveToStorage(KEYS.doctors, updated);
    window.dispatchEvent(new CustomEvent('clinic-doctors-updated'));
    window.dispatchEvent(new CustomEvent('clinic-calendar-updated'));
    return this.getDoctors();
  },

  updateDoctor(previousName: string, updatedDoctor: Doctor): Doctor[] {
    const current = loadFromStorage<Doctor[]>(KEYS.doctors, []);
    const updated = current.map((doctor) => doctor[0] === previousName ? updatedDoctor : doctor);
    saveToStorage(KEYS.doctors, updated);
    window.dispatchEvent(new CustomEvent('clinic-doctors-updated'));
    window.dispatchEvent(new CustomEvent('clinic-calendar-updated'));
    return this.getDoctors();
  },

  removeDoctor(name: string): Doctor[] {
    const current = loadFromStorage<Doctor[]>(KEYS.doctors, []);
    const updated = current.filter((doctor) => doctor[0] !== name);
    saveToStorage(KEYS.doctors, updated);
    window.dispatchEvent(new CustomEvent('clinic-doctors-updated'));
    window.dispatchEvent(new CustomEvent('clinic-calendar-updated'));
    return this.getDoctors();
  },

  clearAllDoctors(): Doctor[] {
    saveToStorage(KEYS.doctors, []);
    window.dispatchEvent(new CustomEvent('clinic-doctors-updated'));
    window.dispatchEvent(new CustomEvent('clinic-calendar-updated'));
    return [];
  },

  setDutyStatus(name: string, onDuty: boolean): Doctor[] {
    const current = loadFromStorage<Doctor[]>(KEYS.doctors, []);
    const updated = current.map((doctor) => doctor[0] === name
      ? [...doctor.slice(0, 4), onDuty ? 'ON DUTY' : 'OFF DUTY', ...doctor.slice(5)] as Doctor
      : doctor);
    saveToStorage(KEYS.doctors, updated);
    window.dispatchEvent(new CustomEvent('clinic-doctors-updated'));
    window.dispatchEvent(new CustomEvent('clinic-calendar-updated'));
    return this.getDoctors();
  },
};
