import { useState } from 'react';
import { doctorsService } from '@/services/doctorsService';

export function useDoctors() {
  const [doctors, setDoctors] = useState(() => doctorsService.getDoctors());
  const [metrics, setMetrics] = useState(() => doctorsService.getMetrics());
  const [featuredProfile] = useState(() => doctorsService.getFeaturedProfile());

  const refreshDoctors = (updated: ReturnType<typeof doctorsService.getDoctors>) => {
    setDoctors(updated);
    setMetrics(doctorsService.getMetrics().map((metric) => metric.label === 'ON DUTY TODAY'
      ? { ...metric, value: String(doctorsService.getOnDutyCount()), note: `of ${updated.length} doctors` }
      : metric));
  };

  const updateDoctor = (previousName: string, doctor: (typeof doctors)[number]) => refreshDoctors(doctorsService.updateDoctor(previousName, doctor));
  const removeDoctor = (name: string) => refreshDoctors(doctorsService.removeDoctor(name));
  const setDutyStatus = (name: string, onDuty: boolean) => refreshDoctors(doctorsService.setDutyStatus(name, onDuty));

  return { doctors, metrics, featuredProfile, updateDoctor, removeDoctor, setDutyStatus };
}
