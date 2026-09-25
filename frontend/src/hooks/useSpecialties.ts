import { useState } from 'react';
import { specialtiesService } from '@/services/specialtiesService';
import { useToast } from '@/utils/toast';
import type { Specialty } from '@/types';

export function useSpecialties() {
  const [specialties, setSpecialties] = useState(() => specialtiesService.getSpecialties());
  const [metrics] = useState(() => specialtiesService.getMetrics());
  const toast = useToast();

  const addSpecialty = (specialty: Specialty) => {
    const updated = specialtiesService.addSpecialty(specialty);
    setSpecialties(updated);
    toast.success(`${specialty[0]} was added to the specialty roster.`);
  };

  return { specialties, metrics, addSpecialty };
}
