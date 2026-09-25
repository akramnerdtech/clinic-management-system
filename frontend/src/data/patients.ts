import { Users, Clock3, AlertTriangle, ShieldCheck } from 'lucide-react';
import type { Patient, MetricConfig } from '@/types';

export const patients: Patient[] = [
  ['PT-00841', 'Ahmed Khan', '42 / M', 'Chronic Migraine', 'Dr. A. Rahman', 'Sep 12, 2026', 'ahmed.k@example.com', 'Q+'],
  ['PT-00842', 'Elena Rostova', '29 / F', 'Seasonal Allergies', 'Dr. Priya Sharma', 'Aug 28, 2026', 'elena.r@email.com', 'A+'],
  ['PT-00843', 'James MacIntyre', '61 / M', 'Hypertension', 'Dr. Robert Chen', 'Sep 04, 2026', 'james.m@domain.org', 'O+'],
  ['PT-00844', 'Sarah Lin-Wu', '35 / F', 'Prenatal Care', 'Dr. Clara Oswald', 'Sep 18, 2026', 'slinwu@healthnet.com', 'B+'],
  ['PT-00845', "David O'Connor", '54 / M', 'Type 2 Diabetes', 'Dr. Linda Gomez', 'Jul 15, 2026', 'doconnor@fastpost.org', 'O-'],
  ['PT-00846', 'Maria Torres', '38 / F', 'Dermatology Check', 'Dr. Priya Sharma', 'Aug 02, 2026', 'm.torres@cloud.io', 'AB+'],
];

export const patientsMetrics: MetricConfig[] = [
  { label: 'TOTAL DIRECTORY', value: '1,248', note: '↗ +14 this wk', color: 'blue', icon: Users },
  { label: 'ACTIVE TODAY', value: '38', note: '24 confirmed', color: 'blue', icon: Clock3 },
  { label: 'CRITICAL ALERTS', value: '3', note: 'Requires review', color: 'red', icon: AlertTriangle },
  { label: 'VERIFICATION RATE', value: '99.4%', note: 'Insured', icon: ShieldCheck },
];

/** Static dossier details shown in the patient side panel, independent of the selected row. */
export const patientDossierDetails = {
  medicalRecordNumber: '#994-01-8841-A',
  phone: '+1 (555) 234-8901',
  allergy: 'Penicillin (Anaphylactoid Reaction)',
  diagnosis: {
    label: 'Active Care',
    title: 'Chronic Migraine with Aura & Photophobia',
    description: 'Chronic secondary history. Mild intermittent asthma (Albuterol inhaler managed).',
  },
  upcomingAppointment: {
    when: 'Today · 09:00 AM',
    reason: 'Neurology Follow-up',
    attending: 'Attending: Dr. Ahmed Rahman • Specialty Suite 102',
  },
  encounterHistory: [
    { doctor: 'Dr. Ahmed Rahman', date: 'Aug 14, 2026', note: 'Initial Neurological Assessment (Brain MRI review, no acute focal lesions noted).' },
    { doctor: 'Dr. Linda Gomez', date: 'Jul 02, 2026', note: 'General Health Checkup & Routine Labs. Escalated migraine symptoms to Neurology.' },
  ],
  triageMemo: 'Patient reports severe morning headache triggered by sunlight. Provided quiet waiting room.',
};
