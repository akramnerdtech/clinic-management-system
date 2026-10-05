import { loadFromStorage, saveToStorage } from '@/utils/storage';
import { patientsService } from '@/services/patientsService';
import { doctorsService } from '@/services/doctorsService';
import { appointmentsService } from '@/services/appointmentsService';
import { emergencyService } from '@/services/emergencyService';
import type { Admission, AdmissionType } from '@/types/inpatient';
import type { RoomStay } from '@/types/rooms';

const KEY = 'curaclinic.admissions.records.v1';

function makeId(): string {
  return `ADM-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`}`;
}

function asIsoTimestamp(value: string): string {
  const parsed = new Date(value);
  if (!value || Number.isNaN(parsed.getTime())) throw new Error('Enter a valid admission date and time.');
  return parsed.toISOString();
}

function saveAdmissions(admissions: Admission[]): void {
  saveToStorage(KEY, admissions);
  const saved = loadFromStorage<Admission[] | null>(KEY, null);
  if (!Array.isArray(saved) || JSON.stringify(saved) !== JSON.stringify(admissions)) {
    throw new Error('Admission record could not be saved. Check browser storage availability.');
  }
}

function emitAdmissionUpdate(): void {
  window.dispatchEvent(new CustomEvent('clinic-admissions-updated'));
}

export const admissionService = {
  getAdmissions(): Admission[] {
    const stored = loadFromStorage<Admission[]>(KEY, []);
    return Array.isArray(stored) ? stored : [];
  },

  getAdmission(admissionId: string): Admission | undefined {
    return this.getAdmissions().find((admission) => admission.id === admissionId);
  },

  getAdmissionsForPatient(patientId: string): Admission[] {
    return this.getAdmissions()
      .filter((admission) => admission.patientId === patientId)
      .sort((left, right) => right.admissionAt.localeCompare(left.admissionAt));
  },

  getActiveAdmissions(): Admission[] {
    return this.getAdmissions().filter((admission) => admission.status === 'ADMITTED');
  },

  createAdmission(params: {
    patientId: string;
    admissionType: AdmissionType;
    admissionAt: string;
    admittingDoctorId?: string;
    sourceAppointmentId?: string;
    emergencyCaseId?: string;
    roomStay: RoomStay;
  }): Admission {
    const patient = patientsService.getPatients().find(([id]) => id === params.patientId);
    if (!patient) throw new Error('Admission must reference a registered patient.');
    if (this.getActiveAdmissions().some((admission) => admission.patientId === params.patientId)) {
      throw new Error(`${patient[1]} already has an active admission.`);
    }
    if (!params.admittingDoctorId || !doctorsService.getDoctors().some((doctor) => doctor[10] === params.admittingDoctorId && doctor[4] !== 'OFF DUTY')) {
      throw new Error('Select a registered admitting doctor.');
    }
    if (params.admissionType === 'OPD_TO_IPD' && !params.sourceAppointmentId) {
      throw new Error('Select the outpatient appointment that led to this admission.');
    }
    if (params.sourceAppointmentId) {
      const appointment = appointmentsService.getEntryByToken(params.sourceAppointmentId);
      if (!appointment || appointment[13] !== params.patientId) throw new Error('The source appointment does not belong to this patient.');
    }
    if (params.admissionType === 'EMERGENCY' && !params.emergencyCaseId) {
      throw new Error('Emergency admissions must reference an emergency case.');
    }
    if (params.admissionType === 'EMERGENCY' && !emergencyService.getCasesForPatient(params.patientId).some((item) => item.id === params.emergencyCaseId && ['ASSESSING', 'TREATING', 'WAITING_FOR_DOCTOR'].includes(item.status))) {
      throw new Error('Select an active emergency case for this patient.');
    }
    const admissionAt = asIsoTimestamp(params.admissionAt);
    if (params.roomStay.patientId !== params.patientId) throw new Error('Room allocation patient does not match the admission.');
    const now = new Date().toISOString();
    const admission: Admission = {
      id: params.roomStay.admissionId ?? makeId(),
      patientId: params.patientId,
      admissionType: params.admissionType,
      admittingDoctorId: params.admittingDoctorId,
      sourceAppointmentId: params.sourceAppointmentId,
      emergencyCaseId: params.emergencyCaseId,
      admissionAt,
      dischargeAt: null,
      status: 'ADMITTED',
      currentWard: params.roomStay.wardType,
      currentRoomId: params.roomStay.roomId,
      currentRoomNumber: params.roomStay.roomNumberSnapshot,
      currentBedId: params.roomStay.bedId,
      currentBedNumber: params.roomStay.bedNumberSnapshot,
      createdAt: now,
      updatedAt: now,
    };
    saveAdmissions([...this.getAdmissions(), admission]);
    emitAdmissionUpdate();
    return admission;
  },

  reconcileRoomStays(stays: RoomStay[]): void {
    const admissions = this.getAdmissions();
    const byAdmission = new Map<string, RoomStay[]>();
    stays.forEach((stay) => {
      const id = stay.admissionId ?? stay.id;
      byAdmission.set(id, [...(byAdmission.get(id) ?? []), stay]);
    });
    let changed = false;
    const next = [...admissions];
    byAdmission.forEach((segments, admissionId) => {
      const existingIndex = next.findIndex((admission) => admission.id === admissionId);
      const activeStay = segments.find((stay) => stay.status === 'ACTIVE');
      const sorted = [...segments].sort((a, b) => a.startAt.localeCompare(b.startAt));
      const first = sorted[0];
      const lastEnd = sorted.reduce((latest, stay) => stay.endAt && stay.endAt > latest ? stay.endAt : latest, '');
      if (existingIndex >= 0) {
        const current = next[existingIndex];
        const refreshed: Admission = {
          ...current,
          status: activeStay ? 'ADMITTED' : 'DISCHARGED',
          dischargeAt: activeStay ? null : lastEnd || current.dischargeAt,
          currentWard: activeStay?.wardType ?? null,
          currentRoomId: activeStay?.roomId ?? null,
          currentRoomNumber: activeStay?.roomNumberSnapshot ?? null,
          currentBedId: activeStay?.bedId ?? null,
          currentBedNumber: activeStay?.bedNumberSnapshot ?? null,
          updatedAt: current.updatedAt,
        };
        if (JSON.stringify(current) !== JSON.stringify(refreshed)) {
          next[existingIndex] = refreshed;
          changed = true;
        }
        return;
      }
      const now = new Date().toISOString();
      next.push({
        id: admissionId,
        patientId: first.patientId,
        admissionType: 'DIRECT_IPD',
        admissionAt: first.startAt,
        dischargeAt: activeStay ? null : lastEnd || null,
        status: activeStay ? 'ADMITTED' : 'DISCHARGED',
        currentWard: activeStay?.wardType ?? null,
        currentRoomId: activeStay?.roomId ?? null,
        currentRoomNumber: activeStay?.roomNumberSnapshot ?? null,
        currentBedId: activeStay?.bedId ?? null,
        currentBedNumber: activeStay?.bedNumberSnapshot ?? null,
        createdAt: now,
        updatedAt: now,
      });
      changed = true;
    });
    if (changed) {
      saveAdmissions(next);
      emitAdmissionUpdate();
    }
  },

  updateCurrentRoom(admissionId: string, stay: RoomStay): void {
    const admissions = this.getAdmissions();
    const admission = admissions.find((item) => item.id === admissionId && item.status === 'ADMITTED');
    if (!admission) throw new Error('Active admission not found for this transfer.');
    if (stay.patientId !== admission.patientId) throw new Error('Transfer stay belongs to a different patient.');
    const updated = admissions.map((item) => item.id === admissionId ? {
      ...item,
      currentWard: stay.wardType,
      currentRoomId: stay.roomId,
      currentRoomNumber: stay.roomNumberSnapshot,
      currentBedId: stay.bedId,
      currentBedNumber: stay.bedNumberSnapshot,
      updatedAt: new Date().toISOString(),
    } : item);
    saveAdmissions(updated);
    emitAdmissionUpdate();
  },

  dischargeAdmission(admissionId: string, dischargeAtValue: string): Admission {
    const dischargeAt = asIsoTimestamp(dischargeAtValue);
    const admissions = this.getAdmissions();
    const admission = admissions.find((item) => item.id === admissionId && item.status === 'ADMITTED');
    if (!admission) throw new Error('Active admission not found.');
    if (new Date(dischargeAt).getTime() <= new Date(admission.admissionAt).getTime()) {
      throw new Error('Discharge must be after admission.');
    }
    const updatedAdmission: Admission = {
      ...admission,
      status: 'DISCHARGED',
      dischargeAt,
      currentWard: null,
      currentRoomId: null,
      currentRoomNumber: null,
      currentBedId: null,
      currentBedNumber: null,
      updatedAt: new Date().toISOString(),
    };
    saveAdmissions(admissions.map((item) => item.id === admissionId ? updatedAdmission : item));
    emitAdmissionUpdate();
    return updatedAdmission;
  },

  restoreAdmission(admission: Admission): void {
    const admissions = this.getAdmissions();
    saveAdmissions(admissions.some((item) => item.id === admission.id)
      ? admissions.map((item) => item.id === admission.id ? admission : item)
      : [...admissions, admission]);
    emitAdmissionUpdate();
  },

  rollbackAdmission(admissionId: string): void {
    saveAdmissions(this.getAdmissions().filter((item) => item.id !== admissionId));
    emitAdmissionUpdate();
  },
};
