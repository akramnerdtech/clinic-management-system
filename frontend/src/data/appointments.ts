import { CalendarDays, Clock3, CheckCircle2, XCircle } from 'lucide-react';
import type { AppointmentEntry, MetricConfig } from '@/types';

export const appointmentsMetrics: MetricConfig[] = [
  { label: 'SCHEDULED TODAY', value: '00', note: '0% capacity booked', color: 'blue', icon: CalendarDays },
  { label: 'IN WAITING ROOM', value: '00', note: 'Target threshold: < 20 min', color: 'blue', icon: Clock3 },
  { label: 'COMPLETED TODAY', value: '00', note: '0 remaining on schedule', color: 'green', icon: CheckCircle2 },
  { label: 'CANCELLED / RESCHED', value: '00', note: 'Slots immediately freed', color: 'red', icon: XCircle },
];

export const appointmentTabs = ['All', 'Confirmed', 'Waiting', 'In Consultation', 'Completed', 'Cancelled'];

/** Tuple shape: [time, subLabel, tokenId, patientName, ageSex, complaint, note, doctor, room, visitType, status, appointmentDate?] */
export const appointmentEntries: AppointmentEntry[] = [];

/** Maps a status label to the CSS modifier class used for its pill. */
export const appointmentStatusStyles: Record<string, string> = {
  'In Consultation': 'status-consult',
  Waiting: 'status-waiting',
  Confirmed: 'status-confirmed',
  Completed: 'status-completed',
  Cancelled: 'status-cancelled',
};