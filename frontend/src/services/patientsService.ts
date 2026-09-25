import { patients, patientsMetrics, patientDossierDetails } from '@/data/patients';
import { loadFromStorage, saveToStorage } from '@/utils/storage';
import type { Patient, MetricConfig } from '@/types';

const KEYS = {
  patients: 'curaclinic.patients.patients',
  metrics: 'curaclinic.patients.metrics',
  dossierDetails: 'curaclinic.patients.dossierDetails',
};

export const patientsService = {
  getPatients(): Patient[] {
    return loadFromStorage(KEYS.patients, patients);
  },
  getMetrics(): MetricConfig[] {
    return loadFromStorage(KEYS.metrics, patientsMetrics);
  },
  getDossierDetails() {
    return loadFromStorage(KEYS.dossierDetails, patientDossierDetails);
  },
  /** Prepends a newly registered patient to the directory and persists it. */
  addPatient(patient: Patient): Patient[] {
    const current = loadFromStorage(KEYS.patients, patients);
    const updated = [patient, ...current];
    saveToStorage(KEYS.patients, updated);
    return updated;
  },
};
