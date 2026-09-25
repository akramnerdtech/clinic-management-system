import type { ClinicField, ScheduleRow, DurationOption } from '@/types';

export const settingsTabs = [
  '▦ Clinic Profile',
  '◷ Operating Hours & Slots',
  '♧ Staff & Access Roles',
  '♧ Notifications & SMS',
  '▣ Billing & Compliance',
];

export const clinicIdentityFields: ClinicField[] = [
  { label: 'LEGAL ENTITY NAME', value: 'CuraClinic Outpatient Medical Center (Main' },
  { label: 'BRANCH CODE / STATE LICENSE', value: 'CLN-2026-NY-904' },
  { label: 'PHYSICAL FACILITY ADDRESS', value: '⌖ 450 Lexington Avenue, Suite 1200, New York, NY 10017', wide: true },
  { label: 'GENERAL INQUIRIES PHONE', value: '⌕ +1 (212) 555-0188' },
  { label: 'EMERGENCY DIRECT LINE', value: '⌖ +1 (212) 555-0911', danger: true },
  { label: 'SUPPORT & FRONT DESK EMAIL', value: '✉ frontdesk@curaclinic.health' },
  { label: 'MEDICAL RECORDS LIAISON', value: '▣ records-ny@curaclinic.health' },
];

export const scheduleRows: ScheduleRow[] = [
  ['Weekday Routine', 'Monday through Friday', '08:00 AM', '06:00 PM', '10H SHIFT'],
  ['Saturday Clinic', 'Urgent Care & Dedicated Pediatrics', '09:00 AM', '02:00 PM', '5H SHIFT'],
  ['Sunday Regular Shift', 'Facility closed for sanitation & inventory replenishment', '', '', 'FACILITY CLOSED'],
];

export const durationOptions: DurationOption[] = [
  ['15 Min', 'Brief Consultations', 'Quick triage, seasonal vaccinations, and simple repeat scripts.'],
  ['30 Min', 'STANDARD EXAM', 'Comprehensive diagnostic reviews, new patient intakes, and vitals check.'],
  ['45 Min', 'Specialist Diagnostic', 'Pediatric cardiology, outpatient minor surgical triage, or multi-specialty reviews.'],
];

export const receptionDefaults = {
  intakeQueueBuffer: { value: '10 Mins', description: 'Scheduled lead time between consecutive appointments to allow for sanitization and entry.' },
  smsReminder: { value: '24h Prior', description: 'Patient receives automated SMS confirmation prompt with calendar integration links.' },
  walkInAutoCheckin: {
    description: 'When enabled, patients scanned at the front tablet kiosk are immediately routed into the pending vitals triage queue feed without receptionist manual approval.',
    enabled: true,
  },
};

export const campusInfo = {
  locationLabel: 'Midtown East Pavilion',
  buildingLabel: 'Building B, Level 12',
  timeZone: 'America/New_York (EDT)',
  suites: '24 Exam, 4 Trauma',
  activeStaff: '38 Registered',
};

export const slotSaturationBars = [25, 40, 62, 52, 36, 18];

export const complianceInfo = {
  description: 'Export clinical facility logs for HIPAA, GDPR, or state medical department compliance audits.',
  dangerZoneNote: 'Decommissioning this facility branch unlinks all future bookings, cancels on-call rotations, and restricts patient file access to read-only archival.',
  branchLabel: 'Decommission Branch CLN-2026-NY-904',
};
