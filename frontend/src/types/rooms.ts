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
}

export interface WardRate {
  ward: WardType;
  label: string;
  short: string;
  perDay: number;
}