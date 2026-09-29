import { useState } from 'react';
import { appointmentsService } from '@/services/appointmentsService';

export function useAppointments() {
  const [metrics, setMetrics] = useState(() => appointmentsService.getMetrics());
  const [tabs] = useState(() => appointmentsService.getTabs());
  const [entries, setEntries] = useState(() => appointmentsService.getEntries());
  const [statusStyles] = useState(() => appointmentsService.getStatusStyles());

  const updateStatus = (tokenId: string, status: string) => {
    const updated = appointmentsService.updateStatus(tokenId, status);
    setEntries(updated);
    setMetrics(appointmentsService.getMetrics());
  };

  const deleteEntry = (tokenId: string) => {
    const updated = appointmentsService.deleteEntry(tokenId);
    setEntries(updated);
    setMetrics(appointmentsService.getMetrics());
  };

  return { metrics, tabs, entries, statusStyles, updateStatus, deleteEntry };
}