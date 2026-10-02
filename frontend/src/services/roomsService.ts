import { rooms, wardRates } from '@/data/rooms';
import { loadFromStorage, saveToStorage } from '@/utils/storage';
import type { Room, WardRate } from '@/types/rooms';

const KEYS = {
  rooms: 'curaclinic.rooms.rooms.v2',
  rates: 'curaclinic.rooms.rates',
};

export const roomsService = {
  getRooms(): Room[] {
    return loadFromStorage<Room[]>(KEYS.rooms, rooms);
  },
  getRates(): WardRate[] {
    return loadFromStorage<WardRate[]>(KEYS.rates, wardRates);
  },
  /** Places `patient` in the given (free) bed and persists the result. */
  assignPatient(roomId: string, bedIndex: number, patient: string): Room[] {
    const updated = this.getRooms().map((r) =>
      r.id === roomId && r.beds[bedIndex] === null
        ? { ...r, beds: r.beds.map((b, i) => (i === bedIndex ? patient : b)) }
        : r,
    );
    saveToStorage(KEYS.rooms, updated);
    return updated;
  },
  /** Frees the given bed and persists the result. */
  dischargePatient(roomId: string, bedIndex: number): Room[] {
    const updated = this.getRooms().map((r) =>
      r.id === roomId ? { ...r, beds: r.beds.map((b, i) => (i === bedIndex ? null : b)) } : r,
    );
    saveToStorage(KEYS.rooms, updated);
    return updated;
  },
};