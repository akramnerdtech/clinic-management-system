import { useState } from 'react';
import { doctorsService } from '@/services/doctorsService';

export function useDoctors() {
  const [doctors] = useState(() => doctorsService.getDoctors());
  const [metrics] = useState(() => doctorsService.getMetrics());
  const [featuredProfile] = useState(() => doctorsService.getFeaturedProfile());
  return { doctors, metrics, featuredProfile };
}
