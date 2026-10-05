import { patientsService } from '@/services/patientsService';
import { roomsService } from '@/services/roomsService';
import { admissionService } from '@/services/admissionService';
import { emergencyService } from '@/services/emergencyService';
import { loadFromStorage, saveToStorage } from '@/utils/storage';
import type { Patient } from '@/types';
import type { Room, RoomStay, WardRate, WardType } from '@/types/rooms';
import type { AdmissionType } from '@/types/inpatient';

const STAYS_KEY = 'curaclinic.rooms.roomStays.v1';
const ALLOTABLE_WARDS: WardType[] = ['general', 'icu', 'private', 'emergency'];

export interface RoomInventoryView extends Room {
  activeStaysByBed: Array<RoomStay | null>;
  occupantsByBed: Array<string | null>;
}

export function getBedId(roomId: string, bedIndex: number): string {
  return `${roomId}:bed:${bedIndex + 1}`;
}

function makeId(prefix: string): string {
  return `${prefix}-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`}`;
}

function paiseFromRupees(amount: number): number {
  return Math.round(amount * 100);
}

function getWardRatePaise(ward: WardType, rates = roomsService.getRates()): number {
  const rate = rates.find((item) => item.ward === ward)?.perDay;
  return paiseFromRupees(typeof rate === 'number' && Number.isFinite(rate) ? rate : 0);
}

function findPatientByName(patients: Patient[], name: string): Patient | undefined {
  return patients.find((patient) => patient[1].trim().toLowerCase() === name.trim().toLowerCase());
}

function assertValidTimestamp(value: string): string {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) throw new Error('Enter a valid admission date and time.');
  if (date.getTime() > Date.now()) throw new Error('Room admission, transfer, and discharge times cannot be in the future.');
  return date.toISOString();
}

function assertAvailableBed(
  rooms: Room[],
  stays: RoomStay[],
  roomId: string,
  bedIndex: number,
  wardType: WardType,
  ignoreStayId?: string,
): Room {
  const room = rooms.find((item) => item.id === roomId);
  if (!room || room.status === 'INACTIVE' || room.ward !== wardType) {
    throw new Error('Select an active room in the chosen ward.');
  }
  if (!Number.isInteger(bedIndex) || bedIndex < 0 || bedIndex >= room.capacity) {
    throw new Error('Select a valid bed.');
  }
  if (room.inactiveBedIndexes?.includes(bedIndex)) throw new Error('That bed is inactive.');
  const bedId = getBedId(roomId, bedIndex);
  if (stays.some((stay) => stay.status === 'ACTIVE' && stay.bedId === bedId && stay.id !== ignoreStayId)) {
    throw new Error('That bed is already occupied.');
  }
  const hasStayHistory = stays.some((stay) => stay.bedId === bedId);
  if (room.beds[bedIndex] && !hasStayHistory) throw new Error('That bed is occupied by an existing room assignment.');
  return room;
}

function makeStay(params: {
  admissionId: string;
  patientId: string;
  patientName: string;
  room: Room;
  bedIndex: number;
  startAt: string;
  ratePerDayPaise: number;
}): RoomStay {
  const timestamp = new Date().toISOString();
  return {
    id: makeId('stay'),
    admissionId: params.admissionId,
    patientId: params.patientId,
    patientNameSnapshot: params.patientName,
    roomId: params.room.id,
    roomNumberSnapshot: params.room.number,
    bedId: getBedId(params.room.id, params.bedIndex),
    bedNumberSnapshot: String(params.bedIndex + 1).padStart(2, '0'),
    wardType: params.room.ward,
    startAt: params.startAt,
    endAt: null,
    status: 'ACTIVE',
    ratePerDayPaise: params.ratePerDayPaise,
    currency: 'INR',
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function dispatchStayUpdate(): void {
  window.dispatchEvent(new CustomEvent('clinic-room-stays-updated'));
}

function persistRoomStays(stays: RoomStay[]): void {
  saveToStorage(STAYS_KEY, stays);
  const saved = loadFromStorage<RoomStay[] | null>(STAYS_KEY, null);
  if (!Array.isArray(saved) || JSON.stringify(saved) !== JSON.stringify(stays)) {
    throw new Error('Room-stay data could not be saved. Check browser storage availability.');
  }
}

export const inpatientService = {
  getRoomStays(): RoomStay[] {
    const loaded = loadFromStorage<RoomStay[]>(STAYS_KEY, []);
    const stays = Array.isArray(loaded) ? loaded : [];
    const rooms = roomsService.getRooms();
    const patients = patientsService.getPatients();
    const activeByBed = new Set(stays.filter((stay) => stay.status === 'ACTIVE').map((stay) => stay.bedId));
    const activePatientIds = new Set(stays.filter((stay) => stay.status === 'ACTIVE').map((stay) => stay.patientId));
    const migrated: RoomStay[] = [];
    const clearedRooms = rooms.map((room) => {
      const beds = [...room.beds];
      room.beds.forEach((occupant, index) => {
        if (!occupant) return;
        const bedId = getBedId(room.id, index);
        if (!activeByBed.has(bedId)) {
          const patient = findPatientByName(patients, occupant);
          const rate = getWardRatePaise(room.ward);
          const timestamp = new Date().toISOString();
          const duplicatePatientStay = Boolean(patient && activePatientIds.has(patient[0]));
          migrated.push({
            id: makeId('legacy-stay'),
            admissionId: makeId('legacy-admission'),
            patientId: patient?.[0] ?? `legacy:${room.id}:${index + 1}`,
            patientNameSnapshot: patient?.[1] ?? occupant,
            roomId: room.id,
            roomNumberSnapshot: room.number,
            bedId,
            bedNumberSnapshot: String(index + 1).padStart(2, '0'),
            wardType: room.ward,
            startAt: timestamp,
            endAt: duplicatePatientStay ? timestamp : null,
            status: duplicatePatientStay ? 'CLOSED' : 'ACTIVE',
            ratePerDayPaise: rate,
            currency: 'INR',
            createdAt: timestamp,
            updatedAt: timestamp,
            legacyBillingExempt: true,
            migrationNote: duplicatePatientStay
              ? 'Migrated duplicate legacy assignment as closed history to preserve the one-active-stay invariant; original timestamps were not stored.'
              : 'Migrated from a name-only room assignment; the original admission time and agreed rate were not stored.',
          });
          if (patient && !duplicatePatientStay) activePatientIds.add(patient[0]);
          activeByBed.add(bedId);
        }
        beds[index] = null;
      });
      return { ...room, beds };
    });

    if (migrated.length) {
      const updatedStays = [...stays, ...migrated];
      try {
        persistRoomStays(updatedStays);
      } catch {
        return stays;
      }
      try {
        roomsService.saveRooms(clearedRooms);
      } catch {
        // Stay records remain authoritative; inventory cache cleanup is retried on later reads.
      }
      dispatchStayUpdate();
      admissionService.reconcileRoomStays(updatedStays);
      return updatedStays;
    }

    if (rooms.some((room, index) => room.beds.some((bed, bedIndex) => bed && clearedRooms[index].beds[bedIndex] === null))) {
      try {
        roomsService.saveRooms(clearedRooms);
      } catch {
        // Stay records remain authoritative; inventory cache cleanup is retried on later reads.
      }
    }
    admissionService.reconcileRoomStays(stays);
    return stays;
  },

  getActiveStays(): RoomStay[] {
    return this.getRoomStays().filter((stay) => stay.status === 'ACTIVE');
  },

  getRoomInventory(): RoomInventoryView[] {
    const rooms = roomsService.getRooms();
    const stays = this.getRoomStays();
    const activeStays = stays.filter((stay) => stay.status === 'ACTIVE');
    return rooms.map((room) => {
      const activeStaysByBed = Array.from({ length: room.capacity }, (_, index) =>
        activeStays.find((stay) => stay.bedId === getBedId(room.id, index)) ?? null,
      );
      return {
        ...room,
        activeStaysByBed,
        occupantsByBed: activeStaysByBed.map((stay, index) => stay?.patientNameSnapshot
          ?? (stays.some((history) => history.bedId === getBedId(room.id, index)) ? null : room.beds[index] ?? null)),
      };
    });
  },

  getAvailableBedIndexes(roomId: string, wardType: WardType): number[] {
    const room = roomsService.getRooms().find((item) => item.id === roomId);
    if (!room || room.status === 'INACTIVE' || room.ward !== wardType) return [];
    const stays = this.getRoomStays();
    return Array.from({ length: room.capacity }, (_, index) => index).filter((index) =>
      !room.inactiveBedIndexes?.includes(index)
      && (!room.beds[index] || stays.some((stay) => stay.bedId === getBedId(roomId, index)))
      && !stays.some((stay) => stay.status === 'ACTIVE' && stay.bedId === getBedId(roomId, index)),
    );
  },

  getAvailableRooms(wardType: WardType): Room[] {
    return roomsService.getRooms().filter((room) =>
      room.ward === wardType
      && room.status !== 'INACTIVE'
      && this.getAvailableBedIndexes(room.id, wardType).length > 0,
    );
  },

  getWardRatePaise(wardType: WardType): number {
    return getWardRatePaise(wardType);
  },

  getRates(): WardRate[] {
    return roomsService.getRates();
  },

  saveRates(rates: WardRate[]): void {
    if (rates.some((rate) => !Number.isSafeInteger(paiseFromRupees(rate.perDay)) || rate.perDay < 0)) {
      throw new Error('Ward rates must be valid non-negative amounts.');
    }
    roomsService.saveRates(rates);
    dispatchStayUpdate();
  },

  createAllotment(
    patientId: string,
    wardType: WardType,
    roomId: string,
    bedIndex: number,
    startAt: string,
    admissionDetails: { admissionType?: AdmissionType; admittingDoctorId?: string; sourceAppointmentId?: string; emergencyCaseId?: string } = {},
  ): RoomStay {
    if (!ALLOTABLE_WARDS.includes(wardType)) throw new Error('Select a supported ward type.');
    const patient = patientsService.getPatients().find(([id]) => id === patientId);
    if (!patient) throw new Error('Select a registered patient.');
    const timestamp = assertValidTimestamp(startAt);
    const stays = this.getRoomStays();
    if (stays.some((stay) => stay.status === 'ACTIVE' && stay.patientId === patientId)) {
      throw new Error(`${patient[1]} already has an active room stay.`);
    }
    const room = assertAvailableBed(roomsService.getRooms(), stays, roomId, bedIndex, wardType);
    const admissionId = makeId('admission');
    const stay = makeStay({
      admissionId,
      patientId,
      patientName: patient[1],
      room,
      bedIndex,
      startAt: timestamp,
      ratePerDayPaise: getWardRatePaise(wardType),
    });
    persistRoomStays([...stays, stay]);
    try {
      admissionService.createAdmission({
        patientId,
        admissionType: admissionDetails.admissionType ?? 'DIRECT_IPD',
        admissionAt: timestamp,
        admittingDoctorId: admissionDetails.admittingDoctorId,
        sourceAppointmentId: admissionDetails.sourceAppointmentId,
        emergencyCaseId: admissionDetails.emergencyCaseId,
        roomStay: stay,
      });
      if (admissionDetails.emergencyCaseId) {
        emergencyService.transition(admissionDetails.emergencyCaseId, 'ADMITTED', { admissionId });
      }
    } catch (error) {
      persistRoomStays(stays);
      admissionService.rollbackAdmission(admissionId);
      throw error;
    }
    dispatchStayUpdate();
    return stay;
  },

  transferStay(stayId: string, wardType: WardType, roomId: string, bedIndex: number, transferAt: string): RoomStay {
    if (!ALLOTABLE_WARDS.includes(wardType)) throw new Error('Select a supported ward type.');
    const timestamp = assertValidTimestamp(transferAt);
    const stays = this.getRoomStays();
    const activeStay = stays.find((stay) => stay.id === stayId && stay.status === 'ACTIVE');
    if (!activeStay) throw new Error('The active room stay could not be found. Refresh and try again.');
    if (new Date(timestamp).getTime() <= new Date(activeStay.startAt).getTime()) {
      throw new Error('Transfer time must be after the current stay start time.');
    }
    if (getBedId(roomId, bedIndex) === activeStay.bedId) throw new Error('Select a different bed for the transfer.');
    const room = assertAvailableBed(roomsService.getRooms(), stays, roomId, bedIndex, wardType, activeStay.id);
    const admissionId = activeStay.admissionId ?? activeStay.id;
    const contiguousStayIds = new Set([activeStay.id]);
    let segmentStart = activeStay.startAt;
    while (true) {
      const previous = stays.find((stay) => stay.patientId === activeStay.patientId
        && stay.status === 'CLOSED'
        && stay.endAt === segmentStart
        && !contiguousStayIds.has(stay.id));
      if (!previous) break;
      contiguousStayIds.add(previous.id);
      segmentStart = previous.startAt;
    }
    const closedStay: RoomStay = { ...activeStay, admissionId, endAt: timestamp, status: 'CLOSED', updatedAt: new Date().toISOString() };
    const newStay = makeStay({
      admissionId,
      patientId: activeStay.patientId,
      patientName: activeStay.patientNameSnapshot,
      room,
      bedIndex,
      startAt: timestamp,
      ratePerDayPaise: getWardRatePaise(wardType),
    });
    const updatedStays = stays.map((stay) => stay.id === activeStay.id
      ? closedStay
      : contiguousStayIds.has(stay.id) ? { ...stay, admissionId } : stay).concat(newStay);
    persistRoomStays(updatedStays);
    try {
      admissionService.updateCurrentRoom(admissionId, newStay);
    } catch (error) {
      persistRoomStays(stays);
      throw error;
    }
    dispatchStayUpdate();
    return newStay;
  },

  dischargeStay(stayId: string, dischargedAt: string): RoomStay {
    return this.dischargeStayWith(stayId, dischargedAt, () => undefined).stay;
  },

  dischargeStayWith<T>(stayId: string, dischargedAt: string, afterClose: () => T): { stay: RoomStay; result: T } {
    const timestamp = assertValidTimestamp(dischargedAt);
    const stays = this.getRoomStays();
    const activeStay = stays.find((stay) => stay.id === stayId && stay.status === 'ACTIVE');
    if (!activeStay) throw new Error('The active room stay could not be found. Refresh and try again.');
    if (new Date(timestamp).getTime() <= new Date(activeStay.startAt).getTime()) {
      throw new Error('Discharge time must be after the stay start time.');
    }
    const closedStay: RoomStay = { ...activeStay, endAt: timestamp, status: 'CLOSED', updatedAt: new Date().toISOString() };
    const updatedStays = stays.map((stay) => stay.id === activeStay.id ? closedStay : stay);
    const admissionId = activeStay.admissionId ?? activeStay.id;
    const previousAdmission = admissionService.getAdmission(admissionId);
    const previousEmergencyCase = previousAdmission?.emergencyCaseId
      ? emergencyService.getCasesForPatient(activeStay.patientId).find((item) => item.id === previousAdmission.emergencyCaseId)
      : undefined;
    persistRoomStays(updatedStays);
    let result: T;
    try {
      if (previousAdmission) admissionService.dischargeAdmission(admissionId, timestamp);
      if (previousEmergencyCase?.status === 'ADMITTED') {
        emergencyService.transition(previousEmergencyCase.id, 'DISCHARGED', { dischargedAt: timestamp });
      }
      result = afterClose();
    } catch (error) {
      persistRoomStays(stays);
      if (previousAdmission) admissionService.restoreAdmission(previousAdmission);
      if (previousEmergencyCase) emergencyService.restoreCase(previousEmergencyCase);
      throw error;
    }
    dispatchStayUpdate();
    return { stay: closedStay, result };
  },
};
