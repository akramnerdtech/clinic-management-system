import { useState } from 'react';
import { patientsService } from '@/services/patientsService';

export function usePatients() {
  const [patients] = useState(() => patientsService.getPatients());
  const [metrics] = useState(() => patientsService.getMetrics());
  const [dossierDetails] = useState(() => patientsService.getDossierDetails());
  return { patients, metrics, dossierDetails };
}
