import { rooms, wardRates } from '@/data/rooms';
import { loadFromStorage, saveToStorage } from '@/utils/storage';
import type { Room, WardRate, WardType } from '@/types/rooms';

const KEYS = {
  rooms: 'curaclinic.rooms.rooms.v2',
  rates: 'curaclinic.rooms.rates',
};

export interface AddRoomInput {
  number: string;
  ward: WardType;
  capacity: number;
  floor?: string;
  area?: string;
}

export interface UpdateRoomInput {
  number?: string;
  ward?: WardType;
  capacity?: number;
  floor?: string;
  area?: string;
}

export interface RoomOperationResult {
  success: boolean;
  message: string;
  room?: Room;
}

export const roomsService = {
  notifyChange(): void {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('curaclinic:rooms-updated'));
    }
  },

  getRooms(): Room[] {
    return loadFromStorage<Room[]>(KEYS.rooms, rooms);
  },

  getRates(): WardRate[] {
    return loadFromStorage<WardRate[]>(KEYS.rates, wardRates);
  },

  /** Persists the full room list (used by stay migration / inventory cleanup). */
  saveRooms(updated: Room[]): void {
    saveToStorage(KEYS.rooms, updated);
    this.notifyChange();
  },

  /** Persists the ward rate card. */
  saveRates(updated: WardRate[]): void {
    saveToStorage(KEYS.rates, updated);
  },

  /** Adds a new room with specified capacity and empty beds. */
  addRoom(input: AddRoomInput): RoomOperationResult {
    const rawNumber = input.number ? String(input.number).trim() : '';
    if (!rawNumber) {
      return { success: false, message: 'Room number is required.' };
    }

    const capacity = Math.floor(Number(input.capacity));
    if (isNaN(capacity) || capacity < 1) {
      return { success: false, message: 'Bed capacity must be at least 1 bed.' };
    }
    if (capacity > 50) {
      return { success: false, message: 'Bed capacity cannot exceed 50 beds.' };
    }

    const currentRooms = this.getRooms();
    const isDuplicate = currentRooms.some(
      (r) => r.number.trim().toLowerCase() === rawNumber.toLowerCase(),
    );
    if (isDuplicate) {
      return { success: false, message: `Room "${rawNumber}" already exists in the system.` };
    }

    const slug = rawNumber.toLowerCase().replace(/[^a-z0-9_-]/g, '-');
    let id = `room-${slug}`;
    if (currentRooms.some((r) => r.id === id)) {
      id = `room-${slug}-${Date.now().toString(36)}`;
    }

    const newRoom: Room = {
      id,
      number: rawNumber,
      ward: input.ward,
      floor: input.floor?.trim() || 'Ground Floor',
      area: input.area?.trim() || 'Main Wing',
      capacity,
      beds: Array.from({ length: capacity }, () => null),
      status: 'ACTIVE',
    };

    const updated = [...currentRooms, newRoom];
    this.saveRooms(updated);
    return {
      success: true,
      message: `Room ${rawNumber} added successfully with ${capacity} bed capacity.`,
      room: newRoom,
    };
  },

  /** Updates an existing room's configuration. */
  updateRoom(roomId: string, updates: UpdateRoomInput): RoomOperationResult {
    const currentRooms = this.getRooms();
    const target = currentRooms.find((r) => r.id === roomId);
    if (!target) {
      return { success: false, message: 'Room not found.' };
    }

    let finalNumber = target.number;
    if (updates.number !== undefined) {
      finalNumber = updates.number.trim();
      if (!finalNumber) {
        return { success: false, message: 'Room number cannot be empty.' };
      }
      const duplicate = currentRooms.some(
        (r) => r.id !== roomId && r.number.trim().toLowerCase() === finalNumber.toLowerCase(),
      );
      if (duplicate) {
        return { success: false, message: `Room "${finalNumber}" already exists in the system.` };
      }
    }

    let finalCapacity = target.capacity;
    let finalBeds = [...target.beds];
    if (updates.capacity !== undefined) {
      const cap = Math.floor(Number(updates.capacity));
      if (isNaN(cap) || cap < 1) {
        return { success: false, message: 'Bed capacity must be at least 1 bed.' };
      }
      if (cap > 50) {
        return { success: false, message: 'Bed capacity cannot exceed 50 beds.' };
      }

      const occupiedCount = target.beds.filter(Boolean).length;
      if (cap < occupiedCount) {
        return {
          success: false,
          message: `Cannot reduce bed capacity to ${cap}. Room ${target.number} currently has ${occupiedCount} patient(s) admitted. Please discharge or transfer patients before reducing capacity.`,
        };
      }

      finalCapacity = cap;
      if (cap > target.capacity) {
        finalBeds = [...target.beds, ...Array.from({ length: cap - target.capacity }, () => null)];
      } else if (cap < target.capacity) {
        finalBeds = target.beds.slice(0, cap);
      }
    }

    const updatedRoom: Room = {
      ...target,
      number: finalNumber,
      ward: updates.ward ?? target.ward,
      floor: updates.floor !== undefined ? updates.floor.trim() : target.floor,
      area: updates.area !== undefined ? updates.area.trim() : target.area,
      capacity: finalCapacity,
      beds: finalBeds,
    };

    const updatedList = currentRooms.map((r) => (r.id === roomId ? updatedRoom : r));
    this.saveRooms(updatedList);
    return {
      success: true,
      message: `Room ${updatedRoom.number} updated successfully.`,
      room: updatedRoom,
    };
  },

  /** Deletes a room if it has no active occupants. */
  deleteRoom(roomId: string): RoomOperationResult {
    const currentRooms = this.getRooms();
    const target = currentRooms.find((r) => r.id === roomId);
    if (!target) {
      return { success: false, message: 'Room not found.' };
    }

    const occupiedCount = target.beds.filter(Boolean).length;
    if (occupiedCount > 0) {
      return {
        success: false,
        message: `Cannot delete Room ${target.number}. There are ${occupiedCount} patient(s) currently admitted. Please discharge or transfer them first.`,
      };
    }

    const updated = currentRooms.filter((r) => r.id !== roomId);
    this.saveRooms(updated);
    return {
      success: true,
      message: `Room ${target.number} removed successfully.`,
    };
  },

  /** Places `patient` in the given (free) bed and persists the result. */
  assignPatient(roomId: string, bedIndex: number, patient: string): Room[] {
    const updated = this.getRooms().map((r) =>
      r.id === roomId && r.beds[bedIndex] === null
        ? { ...r, beds: r.beds.map((b, i) => (i === bedIndex ? patient : b)) }
        : r,
    );
    this.saveRooms(updated);
    return updated;
  },

  /** Frees the given bed and persists the result. */
  dischargePatient(roomId: string, bedIndex: number): Room[] {
    const updated = this.getRooms().map((r) =>
      r.id === roomId ? { ...r, beds: r.beds.map((b, i) => (i === bedIndex ? null : b)) } : r,
    );
    this.saveRooms(updated);
    return updated;
  },
};