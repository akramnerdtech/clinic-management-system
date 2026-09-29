import { useState } from 'react';
import { patientsService } from '@/services/patientsService';

export function usePatients() {
  const [patients, setPatients] = useState(() => patientsService.getPatients());
  const [metrics] = useState(() => patientsService.getMetrics());
  const [dossierDetails] = useState(() => patientsService.getDossierDetails());

  const removePatient = (patientId: string) => {
    const updated = patientsService.removePatient(patientId);
    setPatients(updated);
    return updated;
  };

  return { patients, metrics, dossierDetails, removePatient };
}
