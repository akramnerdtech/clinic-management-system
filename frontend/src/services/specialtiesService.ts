import { specialties, specialtiesMetrics } from '@/data/specialties';
import { loadFromStorage, saveToStorage } from '@/utils/storage';
import type { Specialty, MetricConfig } from '@/types';

const KEYS = {
  specialties: 'curaclinic.specialties.specialties',
  metrics: 'curaclinic.specialties.metrics',
};

export const specialtiesService = {
  getSpecialties(): Specialty[] {
    return loadFromStorage(KEYS.specialties, specialties);
  },
  getMetrics(): MetricConfig[] {
    return loadFromStorage(KEYS.metrics, specialtiesMetrics);
  },
  /** Appends a newly configured specialty/category and persists it. */
  addSpecialty(specialty: Specialty): Specialty[] {
    const current = loadFromStorage(KEYS.specialties, specialties);
    const updated = [...current, specialty];
    saveToStorage(KEYS.specialties, updated);
    return updated;
  },
};
