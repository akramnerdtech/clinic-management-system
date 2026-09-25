import { useState } from 'react';
import { appointmentsService } from '@/services/appointmentsService';

export function useAppointments() {
  const [metrics] = useState(() => appointmentsService.getMetrics());
  const [tabs] = useState(() => appointmentsService.getTabs());
  const [entries] = useState(() => appointmentsService.getEntries());
  const [statusStyles] = useState(() => appointmentsService.getStatusStyles());
  return { metrics, tabs, entries, statusStyles };
}
