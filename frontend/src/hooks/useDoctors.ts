import { useState, useEffect, useCallback } from 'react';
import { doctorsService } from '@/services/doctorsService';

export function useDoctors() {
  const [doctors, setDoctors] = useState(() => doctorsService.getDoctors());
  const [metrics, setMetrics] = useState(() => doctorsService.getMetrics());
  const [featuredProfile] = useState(() => doctorsService.getFeaturedProfile());

  const refresh = useCallback(() => {
    const current = doctorsService.getDoctors();
    setDoctors(current);
    setMetrics(doctorsService.getMetrics());
  }, []);

  useEffect(() => {
    const handleUpdate = () => refresh();
    window.addEventListener('clinic-doctors-updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('clinic-doctors-updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [refresh]);

  const updateDoctor = (previousName: string, doctor: (typeof doctors)[number]) => {
    const updated = doctorsService.updateDoctor(previousName, doctor);
    setDoctors(updated);
    setMetrics(doctorsService.getMetrics());
    return updated;
  };

  const removeDoctor = (name: string) => {
    const updated = doctorsService.removeDoctor(name);
    setDoctors(updated);
    setMetrics(doctorsService.getMetrics());
    return updated;
  };

  const clearAllDoctors = () => {
    const updated = doctorsService.clearAllDoctors();
    setDoctors(updated);
    setMetrics(doctorsService.getMetrics());
    return updated;
  };

  const setDutyStatus = (name: string, onDuty: boolean) => {
    const updated = doctorsService.setDutyStatus(name, onDuty);
    setDoctors(updated);
    setMetrics(doctorsService.getMetrics());
    return updated;
  };

  return {
    doctors,
    metrics,
    featuredProfile,
    updateDoctor,
    removeDoctor,
    clearAllDoctors,
    setDutyStatus,
    refresh,
  };
}
