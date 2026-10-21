import { Stethoscope, Clock3, CheckCircle2, Building2 } from 'lucide-react';
import type { Doctor, MetricConfig } from '@/types';

export const doctors: Doctor[] = [];

export const doctorsMetrics: MetricConfig[] = [
  { label: 'TOTAL DOCTORS', value: '0', note: 'Register new doctors', icon: Stethoscope },
  { label: 'ON DUTY TODAY', value: '0', note: 'of 0 scheduled', color: 'blue', icon: Clock3 },
  { label: 'AVAILABLE NOW', value: '0', note: '0 in consult', icon: CheckCircle2 },
  { label: 'MEDICAL SPECIALTIES', value: '0', note: 'Active units', icon: Building2 },
];

/** Static featured profile shown next to the doctor registry table when no registered doctors exist. */
export const doctorProfile = {
  name: 'Dr. Eleanor Vance',
  title: 'Consultant Physician',
  credentials: 'MD, FRCP',
  status: 'ON DUTY',
  avatar: '',
  stats: [
    { value: '14 yrs', label: 'EXPERIENCE' },
    { value: '★ 4.9', label: 'RATING' },
    { value: '80%', label: 'CAPACITY' },
  ],
  loadLabel: "Today's Appointment Load",
  loadNote: '8 of 10 slots booked',
  consultationHours: 'Morning: 10:00 AM – 12:00 PM • Evening: 06:00 PM – 08:00 PM',
  shifts: [
    { label: 'Morning Session', time: '10:00 AM – 12:00 PM' },
    { label: 'Evening Session', time: '06:00 PM – 08:00 PM' },
  ],
  roomAssignment: 'East Wing Suite 304',
  directStationExt: '+1 (555) 019-382',
  upcomingSchedule: [
    { time: '10:30 AM', patient: 'Robert Henderson', reason: 'Follow-up EEG (Morning)' },
    { time: '06:45 PM', patient: 'Clara Oswald', reason: 'Initial Consult (Evening)' },
  ],
};
