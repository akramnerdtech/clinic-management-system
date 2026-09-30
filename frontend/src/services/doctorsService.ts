import { doctors, doctorsMetrics, doctorProfile } from '@/data/doctors';
import { loadFromStorage, saveToStorage } from '@/utils/storage';
import type { Doctor, MetricConfig } from '@/types';

const KEYS = {
  doctors: 'curaclinic.doctors.doctors',
  metrics: 'curaclinic.doctors.metrics',
  profile: 'curaclinic.doctors.profile',
};

export const doctorsService = {
  getDoctors(): Doctor[] {
    const loaded = loadFromStorage<Doctor[]>(KEYS.doctors, doctors);
    const names = new Set(loaded.map((d) => d[0]));
    const merged = [...loaded];
    for (const d of doctors) {
      if (!names.has(d[0])) {
        merged.push(d);
        names.add(d[0]);
      }
    }
    return merged.map((doctor) => [
      doctor[0], doctor[1], doctor[2], doctor[3],
      doctor[4] === 'OFF DUTY' ? 'OFF DUTY' : 'ON DUTY',
      doctor[5], doctor[6], doctor[7],
    ]);
  },
  getOnDutyCount(): number {
    return this.getDoctors().filter((doctor) => doctor[4] === 'ON DUTY').length;
  },
  getMetrics(): MetricConfig[] {
    const metrics = loadFromStorage(KEYS.metrics, doctorsMetrics);
    const roster = this.getDoctors();
    const onDuty = roster.filter((doctor) => doctor[4] === 'ON DUTY').length;
    return metrics.map((metric) => metric.label === 'ON DUTY TODAY'
      ? { ...metric, value: String(onDuty), note: `of ${roster.length} doctors` }
      : metric);
  },
  getFeaturedProfile() {
    return loadFromStorage(KEYS.profile, doctorProfile);
  },
  /** Prepends a newly registered doctor to the roster and persists it. */
  addDoctor(doctor: Doctor): Doctor[] {
    const current = loadFromStorage(KEYS.doctors, doctors);
    const updated = [doctor, ...current];
    saveToStorage(KEYS.doctors, updated);
    return this.getDoctors();
  },
  updateDoctor(previousName: string, updatedDoctor: Doctor): Doctor[] {
    const current = loadFromStorage(KEYS.doctors, doctors);
    const updated = current.map((doctor) => doctor[0] === previousName ? updatedDoctor : doctor);
    saveToStorage(KEYS.doctors, updated);
    return this.getDoctors();
  },
  removeDoctor(name: string): Doctor[] {
    const current = loadFromStorage(KEYS.doctors, doctors);
    const updated = current.filter((doctor) => doctor[0] !== name);
    saveToStorage(KEYS.doctors, updated);
    return this.getDoctors();
  },
  setDutyStatus(name: string, onDuty: boolean): Doctor[] {
    const current = loadFromStorage(KEYS.doctors, doctors);
    const updated = current.map((doctor) => doctor[0] === name
      ? [...doctor.slice(0, 4), onDuty ? 'ON DUTY' : 'OFF DUTY', ...doctor.slice(5)] as Doctor
      : doctor);
    saveToStorage(KEYS.doctors, updated);
    return this.getDoctors();
  },
};
