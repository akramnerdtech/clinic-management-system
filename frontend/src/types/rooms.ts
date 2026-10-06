// ---------- Rooms ----------
export type WardType = 'general' | 'private' | 'emergency' | 'icu';

/** `beds[i]` is the patient name occupying bed `i + 1`, or `null` when the bed is free. */
export interface Room {
  id: string;
  number: string;
  ward: WardType;
  floor: string;
  area: string;
  capacity: number;
  beds: (string | null)[];
  status?: 'ACTIVE' | 'INACTIVE';
  inactiveBedIndexes?: number[];
}

export interface WardRate {
  ward: WardType;
  label: string;
  short: string;
  perDay: number;
}

export type RoomStayStatus = 'ACTIVE' | 'CLOSED';

/** One continuous stay of a patient in a single bed (a transfer closes one stay and opens another). */
export interface RoomStay {
  id: string;
  admissionId?: string;
  patientId: string;
  patientNameSnapshot: string;
  roomId: string;
  roomNumberSnapshot: string;
  bedId: string;
  bedNumberSnapshot: string;
  wardType: WardType;
  startAt: string;
  endAt: string | null;
  status: RoomStayStatus;
  ratePerDayPaise: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
  legacyBillingExempt?: boolean;
  migrationNote?: string;
}

export interface RoomBillingPolicy {
  basis: 'HOUR_BLOCKS_24';
  partialDayRule: 'ROUND_UP' | 'ROUND_DOWN';
  minimumBillableDaysPerStay: number;
  transferPolicy: 'PER_STAY_SEGMENT';
}
