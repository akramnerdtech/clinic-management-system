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
    return loadFromStorage(KEYS.doctors, doctors);
  },
  getMetrics(): MetricConfig[] {
    return loadFromStorage(KEYS.metrics, doctorsMetrics);
  },
  getFeaturedProfile() {
    return loadFromStorage(KEYS.profile, doctorProfile);
  },
  /** Prepends a newly registered doctor to the roster and persists it. */
  addDoctor(doctor: Doctor): Doctor[] {
    const current = loadFromStorage(KEYS.doctors, doctors);
    const updated = [doctor, ...current];
    saveToStorage(KEYS.doctors, updated);
    return updated;
  },
};
