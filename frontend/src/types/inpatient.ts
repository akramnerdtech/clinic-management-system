import type { AppointmentStatus } from '@/types';
import type { WardType } from '@/types/rooms';

export type AdmissionType = 'DIRECT_IPD' | 'OPD_TO_IPD' | 'EMERGENCY';
export type AdmissionStatus = 'ADMITTED' | 'DISCHARGED' | 'CANCELLED';

export interface Admission {
  id: string;
  patientId: string;
  admissionType: AdmissionType;
  admittingDoctorId?: string;
  sourceAppointmentId?: string;
  emergencyCaseId?: string;
  admissionAt: string;
  dischargeAt: string | null;
  status: AdmissionStatus;
  currentWard: WardType | null;
  currentRoomId: string | null;
  currentRoomNumber: string | null;
  currentBedId: string | null;
  currentBedNumber: string | null;
  createdAt: string;
  updatedAt: string;
}

export type EmergencyPriority = 'URGENT' | 'CRITICAL';
export type EmergencyCaseStatus = 'WAITING_FOR_DOCTOR' | 'ASSESSING' | 'TREATING' | 'ADMITTED' | 'DISCHARGED' | 'CLOSED';

export interface EmergencyCase {
  id: string;
  patientId: string;
  priority: EmergencyPriority;
  assignedDoctorId: string;
  arrivedAt: string;
  status: EmergencyCaseStatus;
  assessment?: string;
  admissionId?: string;
  dischargedAt?: string;
  createdAt: string;
  updatedAt: string;
}