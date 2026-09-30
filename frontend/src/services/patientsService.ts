import { patientDossierDetails } from '@/data/patients';
import { loadFromStorage, saveToStorage } from '@/utils/storage';
import { Users, Clock3, AlertTriangle, ShieldCheck } from 'lucide-react';
import type { Patient, MetricConfig } from '@/types';

const KEYS = {
  patients: 'curaclinic.patients.patients',
  metrics: 'curaclinic.patients.metrics',
  dossierDetails: 'curaclinic.patients.dossierDetails',
};

export const patientsService = {
  getPatients(): Patient[] {
    return loadFromStorage<Patient[]>(KEYS.patients, []);
  },

  getMetrics(): MetricConfig[] {
    const list = this.getPatients();
    const today = new Date();
    const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const activeToday = list.filter((p) => p[9] === todayKey).length;

    return [
      {
        label: 'TOTAL DIRECTORY',
        value: String(list.length),
        note: list.length ? 'Registered in EHR' : 'Directory empty',
        color: 'blue',
        icon: Users,
      },
      {
        label: 'ACTIVE TODAY',
        value: String(activeToday),
        note: `${activeToday} registered today`,
        color: 'blue',
        icon: Clock3,
      },
      {
        label: 'CRITICAL ALERTS',
        value: '0',
        note: 'All reviews clear',
        color: 'red',
        icon: AlertTriangle,
      },
      {
        label: 'VERIFICATION RATE',
        value: '100%',
        note: 'Verified & active',
        icon: ShieldCheck,
      },
    ];
  },

  getDossierDetails() {
    return loadFromStorage(KEYS.dossierDetails, patientDossierDetails);
  },

  /** Prepends a newly registered patient to the directory and persists it. */
  addPatient(patient: Patient): Patient[] {
    const current = loadFromStorage<Patient[]>(KEYS.patients, []);
    const updated = [patient, ...current];
    saveToStorage(KEYS.patients, updated);
    window.dispatchEvent(new CustomEvent('clinic-patients-updated'));
    return updated;
  },

  removePatient(patientId: string): Patient[] {
    const current = loadFromStorage<Patient[]>(KEYS.patients, []);
    const updated = current.filter(([id]) => id !== patientId);
    saveToStorage(KEYS.patients, updated);
    window.dispatchEvent(new CustomEvent('clinic-patients-updated'));
    return updated;
  },

  clearAllPatients(): Patient[] {
    saveToStorage(KEYS.patients, []);
    window.dispatchEvent(new CustomEvent('clinic-patients-updated'));
    return [];
  },

  updatePatient(patient: Patient): Patient[] {
    const current = loadFromStorage<Patient[]>(KEYS.patients, []);
    const updated = current.map((entry) => entry[0] === patient[0] ? patient : entry);
    saveToStorage(KEYS.patients, updated);
    window.dispatchEvent(new CustomEvent('clinic-patients-updated'));
    return updated;
  },
};
