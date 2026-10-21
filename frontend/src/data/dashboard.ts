import { CalendarDays, Users, Stethoscope, Clock3, Activity, AlertTriangle } from 'lucide-react';
import type { AppointmentRow, AvailabilityEntry, VitalRow, ActivityItem, TrafficPoint, MetricConfig } from '@/types';

export const dashboardMetrics: MetricConfig[] = [
  { label: 'APPOINTMENTS THIS WEEK', value: '0', note: '0 scheduled today · Mon–Sun', color: 'green', icon: CalendarDays },
  { label: 'TOTAL PATIENTS', value: '0', note: '0 active visits this week', color: 'blue', icon: Users },
  { label: 'DOCTORS ON DUTY', value: '8 / 8', note: 'Active on shift today', icon: Stethoscope },
  { label: 'WEEKLY REVENUE', value: '₹0', note: '0 settled receipts this week', color: 'green', icon: CalendarDays },
  { label: 'WAITING QUEUE', value: '0', note: 'Queue currently clear', color: 'blue', icon: Clock3 },
];

export const dashboardTabs = ['All (24)', 'Waiting (6)', 'In Consultation (4)', 'Confirmed (12)', 'Completed (2)'];

export const appointmentRows: AppointmentRow[] = [
  ['09:00 AM', 'Ahmed Khan', '42 yrs, M', 'Dr. Ahmed Rahman', 'Chronic Migraine & Photo...'],
  ['09:30 AM', 'Maria Santos', '34 yrs, F', 'Dr. Priya Sharma', 'Eczema Flare-up'],
  ['10:00 AM', 'David Miller', '58 yrs, M', 'Dr. Robert Chen', 'Hypertension Follow-up'],
  ['10:30 AM', 'Sara Khan', '28 yrs, F', 'Dr. Priya Sharma', 'Acne Consultation'],
  ['11:15 AM', 'Emily Watson', '19 yrs, F', 'Dr. Ahmed Rahman', 'Post-concussion Review'],
];

export const availabilityEntries: AvailabilityEntry[] = [
  ['Dr. Ahmed Rahman', 'Neurologist • Suite 102', 'In Consult', ''],
  ['Dr. Priya Sharma', 'Dermatologist • Suite 205', 'Available', ''],
  ['Dr. Robert Chen', 'Cardiologist • Suite 310', 'Available', ''],
  ['Dr. Linda Gomez', 'General Med • Suite 104', 'Available', ''],
];

export const vitalsRows: VitalRow[] = [
  { room: 'ROOM 1 · Ahmed Khan', readingLabel: 'BP:', readingValue: '124/82 mmHg', note: 'Assigned to Suite 102', status: 'VITALS NORMAL' },
  { room: 'ROOM 2 · Sara Khan', readingLabel: 'SpO2:', readingValue: '98%', note: 'Pre-assessment completed', status: 'NORMAL' },
];

export const activityItems: ActivityItem[] = [
  { text: 'New appointment booked for 10:30 AM with Dr. Priya Sharma', meta: '3m ago • Reception Terminal #2' },
  { text: 'Lab results ready for David Miller (Lipid Profile Panel)', meta: '12m ago • Central Diagnostics' },
  { text: 'Emergency walk-in triaged to Room 104', meta: '25m ago • Triage Desk' },
];

export const activityIcons = [CalendarDays, Activity, AlertTriangle];

export const trafficPoints: TrafficPoint[] = [
  { hour: '08 AM', value: 4 }, { hour: '09 AM', value: 9 }, { hour: '10 AM', value: 16 },
  { hour: '11 AM', value: 14 }, { hour: '12 PM', value: 6 }, { hour: '01 PM', value: 8 },
  { hour: '02 PM', value: 11 }, { hour: '03 PM', value: 9 }, { hour: '04 PM', value: 6 },
  { hour: '05 PM', value: 3 },
];
