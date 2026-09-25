import { ShieldCheck, RefreshCcw } from 'lucide-react';
import type {
  AppointmentPatientInfo, AppointmentFormatOption, PriorityOption, AppointmentDoctorInfo,
  AppointmentCalendarDay, AppointmentSlotSession, AppointmentMiniChip,
} from '@/types';

export const appointmentPatient: AppointmentPatientInfo = {
  name: 'Ahmed Khan',
  patientId: 'PT-00841',
  insuranceBadge: 'INSURED (BLUECARE GOLD)',
  age: 42,
  gender: 'Male',
  phone: '+1 (555) 382-9012',
  lastVisit: 'Last visit 3 mo ago',
  avatar: 'https://i.pravatar.cc/80?img=12',
};

export const medicalSpecialtyOptions = [
  'Neurology & Neurosciences', 'Cardiology', 'Dermatology', 'Pediatrics', 'Orthopedics', 'Internal Medicine',
];

export const specialistOptions = [
  'Dr. Ahmed Rahman (MD, PhD)', 'Dr. Elena Rostova (MD)', 'Dr. Marcus Vale (MD)', 'Dr. Priya Patel (MD, FACC)',
];

export const appointmentFormatOptions: AppointmentFormatOption[] = [
  { id: 'initial', label: 'Initial Visit', meta: '45 Minutes • Detailed Review' },
  { id: 'followup', label: 'Follow-Up', meta: '20 Minutes • Progress Track' },
];

export const priorityOptions: PriorityOption[] = [
  { id: 'routine', label: 'Routine', tone: 'blue' },
  { id: 'urgent', label: 'Urgent Expedited', tone: 'red' },
];

export const appointmentDoctor: AppointmentDoctorInfo = {
  name: 'Dr. Ahmed Rahman',
  title: 'Senior Specialist in Clinical Neurology',
  avatar: 'https://i.pravatar.cc/100?img=12',
  rating: '4.9',
  suite: 'Suite 102 • Wing B',
  hours: '09:00 AM - 02:00 PM',
};

export const appointmentMiniChips: AppointmentMiniChip[] = [
  { icon: ShieldCheck, label: 'PROTOCOL', value: 'Standard Care Pathway' },
  { icon: RefreshCcw, label: 'QUEUE', value: 'Room 102 Auto-Sync' },
];

export const calendarMonthLabel = 'September 2026';

export const calendarDays: AppointmentCalendarDay[] = [
  { label: 'MON', date: 21, status: 'past', meta: 'Past' },
  { label: 'TUE', date: 22, status: 'past', meta: 'Past' },
  { label: 'WED', date: 23, status: 'full', meta: 'Full' },
  { label: 'THU', date: 24, status: 'open', meta: '5 Open' },
  { label: 'FRI', date: 25, status: 'open', meta: '4 Open' },
  { label: 'SAT', date: 26, status: 'open', meta: '2 Open' },
];

export const slotSessions: AppointmentSlotSession[] = [
  {
    title: 'MORNING CONSULTATION SESSION',
    hours: '09:00 AM - 12:00 PM',
    slots: [
      { time: '09:00 AM', status: 'booked' },
      { time: '09:30 AM', status: 'reserved' },
      { time: '10:00 AM', status: 'available' },
      { time: '10:30 AM', status: 'available' },
      { time: '11:00 AM', status: 'booked' },
      { time: '11:30 AM', status: 'available' },
    ],
  },
  {
    title: 'AFTERNOON CONSULTATION SESSION',
    hours: '01:00 PM - 02:00 PM',
    slots: [
      { time: '01:00 PM', status: 'available' },
      { time: '01:30 PM', status: 'available' },
      { time: '02:00 PM', status: 'offduty' },
    ],
  },
];

export const appointmentMeta = {
  reasonDefault: 'Recurrent migraine episodes with unilateral visual aura',
  intakeMemoDefault:
    'Patient has reported visual disturbances preceding severe frontal cephalalgia over the past 14 days. '
    + 'Prior treatment with sumatriptan yielded moderate relief. Blood pressure baseline stable at last wellness check.',
  departmentLine: 'Department Wing B • Floor 1',
  onDutyLine: 'On-Duty Today until 02:00 PM',
  holdMinutesLabel: '09:45 min',
  fee: '$75.00',
  feeNote: "Covered via BlueCare Gold (Copay $0.00 estimated at reception check-in).",
  syncNote:
    "Confirmation SMS and automated intake pre-screener will be instantaneously sent to patient's registered mobile device upon booking.",
};
