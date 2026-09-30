import { useState, useEffect, useCallback } from 'react';
import { patientsService } from '@/services/patientsService';

export function usePatients() {
  const [patients, setPatients] = useState(() => patientsService.getPatients());
  const [metrics, setMetrics] = useState(() => patientsService.getMetrics());
  const [dossierDetails] = useState(() => patientsService.getDossierDetails());

  const refresh = useCallback(() => {
    setPatients(patientsService.getPatients());
    setMetrics(patientsService.getMetrics());
  }, []);

  useEffect(() => {
    const handleUpdate = () => refresh();
    window.addEventListener('clinic-patients-updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('clinic-patients-updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [refresh]);

  const removePatient = (patientId: string) => {
    const updated = patientsService.removePatient(patientId);
    setPatients(updated);
    setMetrics(patientsService.getMetrics());
    return updated;
  };

  const clearAllPatients = () => {
    const updated = patientsService.clearAllPatients();
    setPatients(updated);
    setMetrics(patientsService.getMetrics());
    return updated;
  };

  return {
    patients,
    metrics,
    dossierDetails,
    removePatient,
    clearAllPatients,
    refresh,
  };
}
