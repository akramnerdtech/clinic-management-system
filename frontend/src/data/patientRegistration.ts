import { Phone } from 'lucide-react';
import type { RegistrationField } from '@/types';

export const patientRegistrationFields: RegistrationField[] = [
  { id: 'fullName', label: 'Patient Full Name *', defaultValue: 'Clara Vance-Montgomery', wide: true },
  { id: 'phone', label: 'Phone Number *', defaultValue: '+1 (555) 389-4021', icon: Phone },
  { id: 'age', label: 'Age *', defaultValue: '', numeric: true },
  { id: 'complaint', label: 'Primary Reason for Visit / Chief Complaint *', defaultValue: 'Acute chest tightness with dyspnea on exertion', wide: true },
  {
    id: 'bloodGroup',
    label: 'Blood Group',
    defaultValue: '',
    optional: true,
    wide: true,
    options: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
  },
  {
    id: 'recommendedTest',
    label: 'Recommended Test / Investigation',
    defaultValue: '',
    optional: true,
    wide: true,
    options: ['CBC', 'Metabolic panel', 'ECG', 'X-ray', 'Ultrasound', 'Echocardiogram', 'Urinalysis', 'Other'],
  },
  { id: 'notes', label: 'Notes / Remarks', defaultValue: 'Patient arrived independently. Mild respiratory splinting observed.', optional: true, wide: true, textarea: true },
];

export const genderOptions = ['Female', 'Male', 'Other'];

export const registrationMeta = {
  mrn: '#MRN-2026-9041',
  mode: 'Fast Intake Mode Active',
};