import type {
  AppointmentFormatOption, PriorityOption, AppointmentDoctorInfo,
} from '@/types';

export const medicalSpecialtyOptions = [
  'Neurology & Neurosciences', 'Cardiology', 'Dermatology', 'Pediatrics', 'Orthopedics', 'Internal Medicine',
];

export const specialistOptions = [
  'Dr. XYZ (MD)', 'Dr. Ahmed Rahman (MD, PhD)', 'Dr. Elena Rostova (MD)', 'Dr. Marcus Vale (MD)', 'Dr. Priya Patel (MD, FACC)',
];

export const appointmentFormatOptions: AppointmentFormatOption[] = [
  { id: 'standard', label: 'Standard Slot', meta: '15 Minutes • Routine Consultation' },
  { id: 'initial', label: 'Initial Visit', meta: '15 Minutes • Detailed Review' },
  { id: 'followup', label: 'Follow-Up', meta: '15 Minutes • Progress Track' },
];

export const priorityOptions: PriorityOption[] = [
  { id: 'routine', label: 'Routine', tone: 'blue' },
  { id: 'urgent', label: 'Urgent Expedited', tone: 'red' },
];

export const appointmentDoctor: AppointmentDoctorInfo = {
  name: 'Dr. XYZ',
  title: 'Consultant Physician',
  avatar: '',
  rating: '4.9',
  suite: 'Suite 105 • Wing B',
  hours: 'Morning: 10:00 AM – 12:00 PM • Evening: 06:00 PM – 08:00 PM',
};

export interface DoctorScheduleConfig {
  name: string;
  weekdays: number[];
  startHour: number;
  endHour: number;
  suite: string;
  avatar: string;
}

export const doctorScheduleConfigs: Record<string, DoctorScheduleConfig> = {
  'Dr. XYZ (MD)': {
    name: 'Dr. XYZ', weekdays: [1, 2, 3, 4, 5], startHour: 10, endHour: 20,
    suite: 'Suite 105 • Wing B', avatar: '',
  },
  'Dr. Ahmed Rahman (MD, PhD)': {
    name: 'Dr. Ahmed Rahman', weekdays: [1, 2, 3, 4, 5], startHour: 10, endHour: 20,
    suite: 'Suite 102 • Wing B', avatar: '',
  },
  'Dr. Elena Rostova (MD)': {
    name: 'Dr. Elena Rostova', weekdays: [1, 2, 3, 4, 5], startHour: 10, endHour: 20,
    suite: 'Suite 204 • Wing A', avatar: '',
  },
  'Dr. Marcus Vale (MD)': {
    name: 'Dr. Marcus Vale', weekdays: [1, 2, 3, 4, 5, 6], startHour: 10, endHour: 20,
    suite: 'Suite 310 • Wing C', avatar: '',
  },
  'Dr. Priya Patel (MD, FACC)': {
    name: 'Dr. Priya Patel', weekdays: [1, 2, 4, 5], startHour: 10, endHour: 20,
    suite: 'Suite 205 • Wing A', avatar: '',
  },
};

export const appointmentMeta = {
  reasonDefault: 'Recurrent migraine episodes with unilateral visual aura',
  intakeMemoDefault:
    'Patient has reported visual disturbances preceding severe frontal cephalalgia over the past 14 days. '
    + 'Prior treatment with sumatriptan yielded moderate relief. Blood pressure baseline stable at last wellness check.',
  departmentLine: 'Department Wing B • Floor 1',
  onDutyLine: 'On-Duty Today until 08:00 PM',
  holdMinutesLabel: '09:45 min',
  fee: '₹500.00',
  feeNote: 'Covered via National Health Card / Insurance (Copay ₹0.00 at check-in).',
  syncNote:
    "Confirmation SMS and automated intake pre-screener will be instantaneously sent to patient's registered mobile device upon booking.",
};
