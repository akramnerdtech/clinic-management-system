import type { LucideIcon } from 'lucide-react';

// ---------- Navigation ----------
export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

// ---------- Patients ----------
/** Tuple shape: [id, name, ageSex, condition, specialist, lastVisit, email, bloodGroup] */
export type Patient = [string, string, string, string, string, string, string, string];

// ---------- Doctors ----------
/** Tuple shape: [name, specialty, room, workingDays, status, patients, avatarUrl] */
export type Doctor = [string, string, string, string, string, string, string];

// ---------- Specialties ----------
/** Tuple shape: [name, code, description, fee, duration, doctorsCount] */
export type Specialty = [string, string, string, string, string, string];

// ---------- Dashboard ----------
/** Tuple shape: [time, patient, ageSex, doctor, reason] */
export type AppointmentRow = [string, string, string, string, string];

/** Tuple shape: [name, roleAndRoom, status, avatarUrl] */
export type AvailabilityEntry = [string, string, string, string];

export interface VitalRow {
  room: string;
  readingLabel: string;
  readingValue: string;
  note: string;
  status: string;
}

export interface ActivityItem {
  text: string;
  meta: string;
}

export interface TrafficPoint {
  hour: string;
  value: number;
}

// ---------- Appointments ----------
/** Tuple shape: [time, subLabel, tokenId, patientName, ageSex, complaint, note, doctor, room, visitType, status] */
export type AppointmentEntry = [string, string, string, string, string, string, string, string, string, string, string];

// ---------- Patient Registration ----------
export interface RegistrationField {
  id: string;
  label: string;
  defaultValue: string;
  wide?: boolean;
  optional?: boolean;
  textarea?: boolean;
  icon?: LucideIcon;
}

// ---------- Add Doctor ----------
export interface DoctorFormField {
  id: string;
  label: string;
  placeholder: string;
  wide?: boolean;
  type?: 'select';
  options?: string[];
  icon?: LucideIcon;
  suffix?: string;
}

export interface DutyDay {
  key: string;
  active: boolean;
}

export interface SpecialtyRosterItem {
  name: string;
  count: string;
  percent: number;
  highlight?: boolean;
}

export interface AddDoctorPreview {
  name: string;
  specialty: string;
  location: string;
  avatar: string;
  fee: string;
  capacity: string;
}

export interface CapacitySegment {
  label: string;
  value: number;
}

// ---------- Master Calendar ----------
export interface CalendarDayHeader {
  label: string;
  date: number;
  today?: boolean;
}

export type CalendarEventTone = 'default' | 'confirmed' | 'consult' | 'waiting' | 'urgent';

export interface CalendarEvent {
  id: string;
  day: number;
  startMinutes: number;
  durationMinutes: number;
  time: string;
  patient: string;
  doctor?: string;
  badge?: string;
  status?: string;
  tone: CalendarEventTone;
}

export interface CalendarBanner {
  startMinutes: number;
  durationMinutes: number;
  label: string;
}

export interface SuiteUtilizationRow {
  label: string;
  fraction: string;
  percent: number;
  percentLabel: string;
  tone: 'red' | 'teal' | 'green';
}

export interface RoomStatus {
  label: string;
  tone: 'occupied' | 'vacant' | 'sanitizing';
}

export interface PhysicianShift {
  name: string;
  dept: string;
  avatar: string;
  shiftStart: string;
  shiftEnd: string;
  station: string;
  statusLabel: string;
  statusTone: 'on-floor' | 'in-consult';
  visits: string;
}

// ---------- Settings ----------
/** Tuple shape: [title, subtitle, start, end, badge] */
export type ScheduleRow = [string, string, string, string, string];

/** Tuple shape: [duration, label, description] */
export type DurationOption = [string, string, string];

export interface ClinicField {
  label: string;
  value: string;
  wide?: boolean;
  danger?: boolean;
}

// ---------- Account Settings ----------
export interface AccountProfileField {
  label: string;
  value: string;
  wide?: boolean;
  readOnly?: boolean;
}

export interface ToggleSetting {
  key: string;
  label: string;
  description: string;
  enabled: boolean;
}

export interface SessionEntry {
  id: string;
  device: string;
  location: string;
  lastActive: string;
  current?: boolean;
}

// ---------- New Appointment ----------
export interface AppointmentPatientInfo {
  name: string;
  patientId: string;
  insuranceBadge: string;
  age: number;
  gender: string;
  phone: string;
  lastVisit: string;
  avatar: string;
}

export interface AppointmentFormatOption {
  id: string;
  label: string;
  meta: string;
}

export interface PriorityOption {
  id: string;
  label: string;
  tone: 'blue' | 'red';
}

export interface AppointmentDoctorInfo {
  name: string;
  title: string;
  avatar: string;
  rating: string;
  suite: string;
  hours: string;
}

export interface AppointmentCalendarDay {
  label: string;
  date: number;
  status: 'past' | 'full' | 'open';
  meta: string;
}

export interface AppointmentSlot {
  time: string;
  status: 'available' | 'booked' | 'reserved' | 'offduty';
}

export interface AppointmentSlotSession {
  title: string;
  hours: string;
  slots: AppointmentSlot[];
}

export interface AppointmentOverviewRow {
  icon: LucideIcon;
  label: string;
  value: string;
}

export interface AppointmentMiniChip {
  icon: LucideIcon;
  label: string;
  value: string;
}

// ---------- Shared UI ----------
export interface MetricConfig {
  label: string;
  value: string;
  note: string;
  color?: string;
  icon?: LucideIcon;
}
