import { Users, Clock3, AlertTriangle, ShieldCheck } from 'lucide-react';
import type { Patient, MetricConfig } from '@/types';


export const patients: Patient[] = []

export const patientsMetrics: MetricConfig[] = [
  { label: 'TOTAL DIRECTORY', value: '0', note: 'Register new patients', color: 'blue', icon: Users },
  { label: 'ACTIVE TODAY', value: '0', note: '0 confirmed', color: 'blue', icon: Clock3 },
  { label: 'CRITICAL ALERTS', value: '0', note: 'Requires review', color: 'red', icon: AlertTriangle },
  { label: 'VERIFICATION RATE', value: '100%', note: 'Verified', icon: ShieldCheck },
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
