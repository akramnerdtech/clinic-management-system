import {
  LayoutDashboard, Users, UserPlus, CalendarDays, Plus, Calendar,
  Stethoscope, SlidersHorizontal, Building2, Settings,
} from 'lucide-react';
import type { NavGroup } from '@/types';

export const navGroups: NavGroup[] = [
  { label: 'DASHBOARD', items: [{ label: 'Dashboard', to: '/', icon: LayoutDashboard }] },
  { label: 'PATIENT MANAGEMENT', items: [{ label: 'Patients', to: '/patients', icon: Users }, { label: 'Add Patient', to: '/patients/new', icon: UserPlus }] },
  { label: 'APPOINTMENTS', items: [{ label: 'Appointments', to: '/appointments', icon: CalendarDays }, { label: 'New Appointment', to: '/appointments/new', icon: Plus }, { label: 'Master Calendar', to: '/calendar', icon: Calendar }] },
  { label: 'DOCTORS', items: [{ label: 'Doctors', to: '/doctors', icon: Stethoscope }, { label: 'Add Doctor', to: '/doctors/new', icon: UserPlus }] },
  { label: 'SPECIALTIES', items: [{ label: 'Specialties & Categories', to: '/specialties', icon: SlidersHorizontal }] },
  { label: 'SETTINGS', items: [{ label: 'Clinic Profile', to: '/settings', icon: Building2 }, { label: 'Account Settings', to: '/account', icon: Settings }] },
];
