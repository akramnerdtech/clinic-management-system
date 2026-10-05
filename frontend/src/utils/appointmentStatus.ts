import type { AppointmentStatus } from '@/types';

export function normalizeAppointmentStatus(value: unknown): AppointmentStatus {
  const status = String(value ?? '').trim().toUpperCase().replace(/[\s-]+/g, '_');
  switch (status) {
    case 'SCHEDULED': return 'SCHEDULED';
    case 'CONFIRMED':
    case 'SLOT_BOOKED':
    case 'BOOKED': return 'CONFIRMED';
    case 'WAITING': return 'WAITING';
    case 'IN_PROGRESS':
    case 'IN_CONSULT':
    case 'IN_CONSULTATION': return 'IN_PROGRESS';
    case 'COMPLETED': return 'COMPLETED';
    case 'CANCELLED':
    case 'CANCELED': return 'CANCELLED';
    case 'NO_SHOW': return 'NO_SHOW';
    default: return 'SCHEDULED';
  }
}

export function appointmentStatusLabel(status: AppointmentStatus): string {
  return {
    SCHEDULED: 'Scheduled',
    CONFIRMED: 'Confirmed',
    WAITING: 'Waiting',
    IN_PROGRESS: 'In Consultation',
    COMPLETED: 'Completed',
    CANCELLED: 'Cancelled',
    NO_SHOW: 'No Show',
  }[status];
}

const transitions: Record<AppointmentStatus, AppointmentStatus[]> = {
  SCHEDULED: ['CONFIRMED', 'WAITING', 'CANCELLED', 'NO_SHOW'],
  CONFIRMED: ['WAITING', 'IN_PROGRESS', 'CANCELLED', 'NO_SHOW'],
  WAITING: ['IN_PROGRESS', 'CANCELLED', 'NO_SHOW'],
  IN_PROGRESS: ['COMPLETED'],
  COMPLETED: [],
  CANCELLED: [],
  NO_SHOW: [],
};

export function canTransitionAppointment(from: AppointmentStatus, to: AppointmentStatus): boolean {
  return from === to || transitions[from].includes(to);
}