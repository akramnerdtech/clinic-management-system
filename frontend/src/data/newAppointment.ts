import type {
  AppointmentFormatOption, PriorityOption, AppointmentDoctorInfo,
} from '@/types';

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

export interface DoctorScheduleConfig {
  name: string;
  weekdays: number[];
  startHour: number;
  endHour: number;
  suite: string;
  avatar: string;
}

export const doctorScheduleConfigs: Record<string, DoctorScheduleConfig> = {
  'Dr. Ahmed Rahman (MD, PhD)': {
    name: 'Dr. Ahmed Rahman', weekdays: [1, 2, 3, 4, 5], startHour: 9, endHour: 14,
    suite: 'Suite 102 • Wing B', avatar: 'https://i.pravatar.cc/100?img=12',
  },
  'Dr. Elena Rostova (MD)': {
    name: 'Dr. Elena Rostova', weekdays: [1, 3, 5], startHour: 10, endHour: 16,
    suite: 'Suite 204 • Wing A', avatar: 'https://i.pravatar.cc/100?img=47',
  },
  'Dr. Marcus Vale (MD)': {
    name: 'Dr. Marcus Vale', weekdays: [2, 4, 6], startHour: 8, endHour: 13,
    suite: 'Suite 310 • Wing C', avatar: 'https://i.pravatar.cc/100?img=11',
  },
  'Dr. Priya Patel (MD, FACC)': {
    name: 'Dr. Priya Patel', weekdays: [1, 2, 4, 5], startHour: 11, endHour: 17,
    suite: 'Suite 205 • Wing A', avatar: 'https://i.pravatar.cc/100?img=45',
  },
};

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
