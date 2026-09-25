import { CalendarDays, Clock3, CheckCircle2, XCircle } from 'lucide-react';
import type { AppointmentEntry, MetricConfig } from '@/types';

export const appointmentsMetrics: MetricConfig[] = [
  { label: 'SCHEDULED TODAY', value: '24', note: '92% capacity booked', color: 'blue', icon: CalendarDays },
  { label: 'IN WAITING ROOM', value: '06', note: 'Target threshold: < 20 min', color: 'blue', icon: Clock3 },
  { label: 'COMPLETED TODAY', value: '14', note: '10 remaining on schedule', color: 'green', icon: CheckCircle2 },
  { label: 'CANCELLED / RESCHED', value: '02', note: 'Slots immediately freed', color: 'red', icon: XCircle },
];

export const appointmentTabs = ['All', 'Confirmed', 'Waiting', 'In Consultation', 'Completed', 'Cancelled'];

/** Tuple shape: [time, subLabel, tokenId, patientName, ageSex, complaint, note, doctor, room, visitType, status] */
export const appointmentEntries: AppointmentEntry[] = [
  ['10:30 AM', '30 min slot', 'TK-108', 'Eleanor Vance', '68 / F', 'Persistent Arrhythmia & Dyspnea', 'ECG scheduled on arrival', 'Dr. Marcus Chen', 'Room 204 · Cardiology', 'Follow-up', 'In Consultation'],
  ['10:45 AM', 'Waiting: 8 min', 'TK-109', 'Arthur Pendelton', '42 / M', 'Severe Migraine with Aura', 'Allergic to Penicillin', 'Dr. Sophia Patel', 'Room 201 · Neurology', 'New Visit', 'Waiting'],
  ['11:00 AM', 'Starts in 18 min', 'TK-110', 'Karina Lindqvist', '29 / F', 'Annual Endocrine Review', 'Bloodwork pre-cleared', 'Dr. Henrik Vanger', 'Room 206 · Endocrinology', 'Follow-up', 'Confirmed'],
  ['09:30 AM', 'Ended: 10:05 AM', 'TK-104', 'Rachel Brody', '51 / F', 'Hypertension Refill & Vitals Log', 'Prescription e-sent', 'Dr. Sophia Patel', 'Room 201 · General', 'Follow-up', 'Completed'],
  ['10:00 AM', 'Cancelled @ 08:45', 'TK-106', 'David Lin', '45 / M', 'Annual Dermatology Screening', 'Patient work conflict · Slot freed', 'Dr. Lisa Thorne', 'Room 205 · Dermatology', 'New Visit', 'Cancelled'],
];

/** Maps a status label to the CSS modifier class used for its pill. */
export const appointmentStatusStyles: Record<string, string> = {
  'In Consultation': 'status-consult',
  Waiting: 'status-waiting',
  Confirmed: 'status-confirmed',
  Completed: 'status-completed',
  Cancelled: 'status-cancelled',
};
