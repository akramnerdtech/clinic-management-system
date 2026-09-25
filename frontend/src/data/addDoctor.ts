import { IdCard, Hash, Phone, Mail, DollarSign } from 'lucide-react';
import type { DoctorFormField, DutyDay, SpecialtyRosterItem, AddDoctorPreview, CapacitySegment } from '@/types';

export const basicInfoFields: DoctorFormField[] = [
  { id: 'title', label: 'Title', placeholder: 'Dr.', type: 'select', options: ['Dr.', 'Prof.', 'Mr.', 'Mrs.'] },
  { id: 'fullName', label: 'Full Legal Name *', placeholder: 'e.g. Eleanor Vance, MD', wide: true },
  { id: 'license', label: 'Medical License / Board ID *', placeholder: 'e.g. MED-CA-948201-B', icon: IdCard },
  { id: 'npi', label: 'NPI / Registry Number', placeholder: '10-digit National NPI', icon: Hash },
  { id: 'mobile', label: 'Primary Contact Mobile *', placeholder: '+1 (555) 349-8821', icon: Phone },
  { id: 'email', label: 'Clinical Communication Email *', placeholder: 'dr.vance@curaclinic.org', icon: Mail },
];

export const credentialFields: DoctorFormField[] = [
  {
    id: 'specialty',
    label: 'Primary Specialty *',
    placeholder: 'Select Medical Specialty...',
    type: 'select',
    options: ['Neurology', 'Cardiology', 'Pediatrics', 'Dermatology', 'Orthopedics', 'Internal Medicine'],
  },
  { id: 'focus', label: 'Clinical Focus / Sub-Specialty', placeholder: 'e.g. Cognitive Disorders & Memory' },
  { id: 'degrees', label: 'Degrees & Qualifications *', placeholder: 'e.g. MD (Johns Hopkins), MBBS, MRCP (UK), FACC' },
  { id: 'experience', label: 'Years of Experience', placeholder: '12', suffix: 'Years' },
  { id: 'suite', label: 'Assigned Consultation Suite *', placeholder: 'Suite 101 — North Pavillion (Ground Floor)' },
  { id: 'fee', label: 'Standard Consultation Fee ($ USD)', placeholder: '180', icon: DollarSign, suffix: '/ 30 min' },
];

export const dutyDaysDefault: DutyDay[] = [
  { key: 'MON', active: true },
  { key: 'TUE', active: true },
  { key: 'WED', active: true },
  { key: 'THU', active: true },
  { key: 'FRI', active: true },
  { key: 'SAT', active: false },
  { key: 'SUN', active: false },
];

export const shiftTimesDefault = { start: '', end: '' };

export const capacityInfo: { cap: number; breakdown: CapacitySegment[] } = {
  cap: 16,
  breakdown: [
    { label: 'Light', value: 6 },
    { label: 'Standard', value: 16 },
    { label: 'High Vol', value: 32 },
  ],
};

export const onCallInfo = {
  enabledDefault: true,
  description: 'Authorizes urgent pager override and rapid trauma notifications.',
  linkLabel: 'Triage Dispatch Enabled',
};

export const addDoctorPreview: AddDoctorPreview = {
  name: 'Dr. Eleanor Vance',
  specialty: 'Neurology Specialist',
  location: 'Suite 101 · North Pavillion',
  avatar: 'https://i.pravatar.cc/100?img=48',
  fee: '$180.00',
  capacity: '16 / Day',
};

export const specialtyRoster: SpecialtyRosterItem[] = [
  { name: 'Neurology (Target Specialty)', count: '4 Active', percent: 34, highlight: true },
  { name: 'Cardiology', count: '8 Active', percent: 68 },
  { name: 'General Medicine', count: '12 Active', percent: 100 },
];

export const credentialingChecklist: string[] = [
  'State Medical Licensing Board validation',
  'Hospital privileges & malpractice verification',
  'EHR digital signature key generated on save',
];

export const addDoctorMeta = {
  status: 'Staff Registry: Active',
  step: 'Step 1 of 3: Profile Setup',
};
