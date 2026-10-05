import { loadFromStorage, saveToStorage } from '@/utils/storage';
import { patientsService } from '@/services/patientsService';
import { doctorsService } from '@/services/doctorsService';
import type { EmergencyCase, EmergencyCaseStatus, EmergencyPriority } from '@/types/inpatient';

const KEY = 'curaclinic.emergency.cases.v1';
const transitions: Record<EmergencyCaseStatus, EmergencyCaseStatus[]> = {
  WAITING_FOR_DOCTOR: ['ASSESSING', 'CLOSED'],
  ASSESSING: ['TREATING', 'ADMITTED', 'DISCHARGED', 'CLOSED'],
  TREATING: ['ADMITTED', 'DISCHARGED', 'CLOSED'],
  ADMITTED: ['DISCHARGED', 'CLOSED'],
  DISCHARGED: ['CLOSED'],
  CLOSED: [],
};

function createId(): string {
  return `ER-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`}`;
}

function saveCases(cases: EmergencyCase[]): void {
  saveToStorage(KEY, cases);
  const persisted = loadFromStorage<EmergencyCase[] | null>(KEY, null);
  if (!Array.isArray(persisted) || JSON.stringify(persisted) !== JSON.stringify(cases)) {
    throw new Error('Emergency case could not be saved. Check browser storage availability.');
  }
}

function publish(): void {
  window.dispatchEvent(new CustomEvent('clinic-emergency-cases-updated'));
}

export const emergencyService = {
  getCases(): EmergencyCase[] {
    const cases = loadFromStorage<EmergencyCase[]>(KEY, []);
    return Array.isArray(cases) ? cases : [];
  },

  getCasesForPatient(patientId: string): EmergencyCase[] {
    return this.getCases().filter((item) => item.patientId === patientId).sort((a, b) => b.arrivedAt.localeCompare(a.arrivedAt));
  },

  getOpenCases(): EmergencyCase[] {
    return this.getCases().filter((item) => !['DISCHARGED', 'CLOSED'].includes(item.status));
  },

  startCase(params: {
    patientId: string;
    priority: EmergencyPriority;
    assignedDoctorId: string;
    arrivedAt: string;
    assessment?: string;
  }): EmergencyCase {
    const patient = patientsService.getPatients().find(([id]) => id === params.patientId);
    if (!patient) throw new Error('Emergency case must reference a registered patient.');
    const doctor = doctorsService.getDoctors().find((item) => item[10] === params.assignedDoctorId);
    if (!doctor || doctor[4] === 'OFF DUTY') throw new Error('Assign an active registered doctor to the emergency case.');
    const arrivedAt = new Date(params.arrivedAt);
    if (Number.isNaN(arrivedAt.getTime())) throw new Error('Enter a valid emergency arrival time.');
    if (arrivedAt.getTime() > Date.now()) throw new Error('Emergency arrival time cannot be in the future.');
    const duplicateOpenCase = this.getOpenCases().find((item) => item.patientId === params.patientId);
    if (duplicateOpenCase) throw new Error(`${patient[1]} already has an open emergency case.`);
    const now = new Date().toISOString();
    const emergencyCase: EmergencyCase = {
      id: createId(),
      patientId: patient[0],
      priority: params.priority,
      assignedDoctorId: doctor[10]!,
      arrivedAt: arrivedAt.toISOString(),
      status: 'ASSESSING',
      assessment: params.assessment?.trim() || undefined,
      createdAt: now,
      updatedAt: now,
    };
    saveCases([...this.getCases(), emergencyCase]);
    publish();
    return emergencyCase;
  },

  updateAssessment(caseId: string, assessment: string): EmergencyCase {
    const current = this.getCases();
    const emergencyCase = current.find((item) => item.id === caseId);
    if (!emergencyCase || !['ASSESSING', 'TREATING'].includes(emergencyCase.status)) throw new Error('Only an active case can be updated.');
    const updated = { ...emergencyCase, assessment: assessment.trim(), updatedAt: new Date().toISOString() };
    saveCases(current.map((item) => item.id === caseId ? updated : item));
    publish();
    return updated;
  },

  assignDoctor(caseId: string, doctorId: string): EmergencyCase {
    const doctor = doctorsService.getDoctors().find((item) => item[10] === doctorId && item[4] !== 'OFF DUTY');
    if (!doctor) throw new Error('Select an active registered doctor.');
    const current = this.getCases();
    const emergencyCase = current.find((item) => item.id === caseId);
    if (!emergencyCase || ['DISCHARGED', 'CLOSED', 'ADMITTED'].includes(emergencyCase.status)) {
      throw new Error('Only an open emergency case can be reassigned.');
    }
    const updated = { ...emergencyCase, assignedDoctorId: doctorId, updatedAt: new Date().toISOString() };
    saveCases(current.map((item) => item.id === caseId ? updated : item));
    publish();
    return updated;
  },

  transition(caseId: string, status: EmergencyCaseStatus, details: { admissionId?: string; dischargedAt?: string } = {}): EmergencyCase {
    const current = this.getCases();
    const emergencyCase = current.find((item) => item.id === caseId);
    if (!emergencyCase) throw new Error('Emergency case was not found.');
    if (!transitions[emergencyCase.status].includes(status)) throw new Error(`Emergency case cannot move from ${emergencyCase.status} to ${status}.`);
    const dischargedAt = details.dischargedAt ? new Date(details.dischargedAt) : undefined;
    if (details.dischargedAt && (!dischargedAt || Number.isNaN(dischargedAt.getTime()) || dischargedAt.getTime() < new Date(emergencyCase.arrivedAt).getTime())) {
      throw new Error('Discharge time cannot precede emergency arrival.');
    }
    if (status === 'ADMITTED' && !details.admissionId) throw new Error('An emergency admission ID is required.');
    const updated: EmergencyCase = {
      ...emergencyCase,
      status,
      admissionId: details.admissionId ?? emergencyCase.admissionId,
      dischargedAt: dischargedAt?.toISOString() ?? emergencyCase.dischargedAt,
      updatedAt: new Date().toISOString(),
    };
    saveCases(current.map((item) => item.id === caseId ? updated : item));
    publish();
    return updated;
  },

  restoreCase(emergencyCase: EmergencyCase): void {
    const cases = this.getCases();
    saveCases(cases.some((item) => item.id === emergencyCase.id)
      ? cases.map((item) => item.id === emergencyCase.id ? emergencyCase : item)
      : [...cases, emergencyCase]);
    publish();
  },
};
