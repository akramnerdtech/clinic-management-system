import { Stethoscope, Clock3, CheckCircle2, Building2 } from 'lucide-react';
import type { Doctor, MetricConfig } from '@/types';

export const doctors: Doctor[] = [
  ['Dr. XYZ', 'General Medicine', 'Suite 105', 'M T W T F', 'ON DUTY', '0 /4', 'https://i.pravatar.cc/80?img=33', {
    MON: { start: '15:00', end: '16:00' },
    TUE: { start: '15:00', end: '16:00' },
    WED: { start: '15:00', end: '16:00' },
    THU: { start: '15:00', end: '16:00' },
    FRI: { start: '15:00', end: '16:00' },
  }],
  ['Dr. Ahmed Rahman', 'Neurology', 'Suite 304', 'M T W T F', 'ON FLOOR', '8 /10', 'https://i.pravatar.cc/80?img=12', {
    MON: { start: '09:00', end: '17:00' },
    TUE: { start: '09:00', end: '17:00' },
    WED: { start: '09:00', end: '17:00' },
    THU: { start: '09:00', end: '17:00' },
    FRI: { start: '09:00', end: '17:00' },
  }],
  ['Dr. Elena Rostova', 'Dermatology', 'Suite 112', 'M T W T F', 'IN CONSULT', '11 /12', 'https://i.pravatar.cc/80?img=47', {
    MON: { start: '10:00', end: '17:00' },
    TUE: { start: '10:00', end: '17:00' },
    WED: { start: '10:00', end: '17:00' },
    THU: { start: '10:00', end: '17:00' },
    FRI: { start: '10:00', end: '17:00' },
  }],
  ['Dr. Marcus Vale', 'Pediatrics', 'Suite 201', 'M T W T F', 'ACTIVE FLOOR', '6 /8', 'https://i.pravatar.cc/80?img=11', {
    MON: { start: '08:00', end: '17:00' },
    TUE: { start: '08:00', end: '17:00' },
    WED: { start: '08:00', end: '17:00' },
    THU: { start: '08:00', end: '17:00' },
    FRI: { start: '08:00', end: '17:00' },
  }],
  ['Dr. Priya Patel', 'Cardiology', 'Cath Lab 2', 'M T W T F', 'ACTIVE FLOOR', '5 /6', 'https://i.pravatar.cc/80?img=45', {
    MON: { start: '11:00', end: '18:00' },
    TUE: { start: '11:00', end: '18:00' },
    WED: { start: '11:00', end: '18:00' },
    THU: { start: '11:00', end: '18:00' },
    FRI: { start: '11:00', end: '18:00' },
  }],
  ['Dr. Kenneth Moore', 'Orthopedics', 'Suite 408', 'M T W T F', 'ACTIVE FLOOR', '3 /8', 'https://i.pravatar.cc/80?img=60'],
  ['Dr. Sandra Chen', 'Internal Med', 'Suite 105', 'M T W T F', 'OFF DUTY', '0 /0', 'https://i.pravatar.cc/80?img=32'],
];

export const doctorsMetrics: MetricConfig[] = [
  { label: 'TOTAL DOCTORS', value: '8', note: '100% capacity', icon: Stethoscope },
  { label: 'ON DUTY TODAY', value: '5', note: 'of 8 scheduled', color: 'blue', icon: Clock3 },
  { label: 'AVAILABLE NOW', value: '4', note: '1 in consult', icon: CheckCircle2 },
  { label: 'MEDICAL SPECIALTIES', value: '6', note: 'Active units', icon: Building2 },
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
