import { Stethoscope, Clock3, CheckCircle2, Building2 } from 'lucide-react';
import type { Doctor, MetricConfig } from '@/types';

export const doctors: Doctor[] = [];

export const doctorsMetrics: MetricConfig[] = [
  { label: 'TOTAL DOCTORS', value: '0', note: 'Register new doctors', icon: Stethoscope },
  { label: 'ON DUTY TODAY', value: '0', note: 'of 0 scheduled', color: 'blue', icon: Clock3 },
  { label: 'AVAILABLE NOW', value: '0', note: '0 in consult', icon: CheckCircle2 },
  { label: 'MEDICAL SPECIALTIES', value: '0', note: 'Active units', icon: Building2 },
];

/** Static featured profile shown next to the doctor registry table. */
export const doctorProfile = {
  name: 'Dr. Ahmed Rahman',
  title: 'Head of Neurology',
  credentials: 'MD, PhD, FRCP (C)',
  status: 'ON DUTY',
  avatar: 'https://i.pravatar.cc/100?img=12',
  stats: [
    { value: '14 yrs', label: 'EXPERIENCE' },
    { value: '★ 4.9', label: 'RATING' },
    { value: '80%', label: 'CAPACITY' },
  ],
  loadLabel: "Today's Appointment Load",
  loadNote: '8 of 10 slots booked',
  consultationHours: '09:00 – 16:30',
  roomAssignment: 'East Wing Suite 304',
  directStationExt: '+1 (555) 019-382',
  upcomingSchedule: [
    { time: '14:00', patient: 'Robert Henderson', reason: 'Follow-up EEG' },
    { time: '15:15', patient: 'Clara Oswald', reason: 'Initial Consult' },
  ],
};
