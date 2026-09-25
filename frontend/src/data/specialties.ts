import { SlidersHorizontal, Users, FileText, ShieldCheck } from 'lucide-react';
import type { Specialty, MetricConfig } from '@/types';

export const specialties: Specialty[] = [
  ['Neurology & Brain Health', 'MED-NEU-01', 'Comprehensive diagnostic cognitive mapping, EEG neurology triage, and peripheral nerve...', '$85.00', '45 min', '2 Doctors'],
  ['Dermatology & Skin Care', 'MED-DER-02', 'Outpatient clinical dermatology, dermoscopic mole mapping, biopsies, and therapeutic laser...', '$75.00', '30 min', '2 Doctors'],
  ['Cardiology & Vascular', 'MED-CRD-03', 'Echocardiograms, stress test telemetry monitoring, hypertension management, and non-', '$95.00', '45 min', '2 Doctors'],
  ['General & Family Medicine', 'MED-GEN-04', 'Primary care physicals, preventive biometric screening, prescription refills, and seasonal...', '$60.00', '20 min', '3 Doctors'],
  ['Pediatrics & Child Health', 'MED-PED-05', 'Infant wellness audits, developmental milestones tracking, childhood immunizations, and urgent...', '$70.00', '30 min', '2 Doctors'],
  ['Orthopedics & Sports', 'MED-ORT-06', 'Musculoskeletal injury triage, surgical joint assessments, post-rehabilitation evaluations, and...', '$90.00', '40 min', '1 Doctor'],
];

export const specialtiesMetrics: MetricConfig[] = [
  { label: 'ACTIVE SPECIALTIES', value: '8', note: '100% capacity deployed', icon: SlidersHorizontal },
  { label: 'REGISTERED PRACTITIONERS', value: '14', note: 'Spread over 6 clinic wings', color: 'blue', icon: Users },
  { label: 'AVG CONSULTATION FEE', value: '$75.00', note: 'Range $60.00 – $95.00', color: 'green', icon: FileText },
  { label: 'ONBOARDING COMPLIANCE', value: '100%', note: 'Accreditation validated', color: 'green', icon: ShieldCheck },
];
