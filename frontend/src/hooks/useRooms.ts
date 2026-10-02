import { useMemo, useState } from 'react';
import { roomsService } from '@/services/roomsService';
import { useToast } from '@/utils/toast';
import type { Room, WardType } from '@/types/rooms';

export type WardFilter = 'all' | WardType;
export type StatusFilter = 'all' | 'available' | 'full';
export type SortKey = 'number-asc' | 'number-desc' | 'occupancy-desc' | 'vacancy-desc';

export const PAGE_SIZE = 9;

export const occupiedCount = (room: Room) => room.beds.filter(Boolean).length;
export const freeCount = (room: Room) => room.capacity - occupiedCount(room);

const SORTERS: Record<SortKey, (a: Room, b: Room) => number> = {
  'number-asc': (a, b) => a.number.localeCompare(b.number, undefined, { numeric: true }),
  'number-desc': (a, b) => b.number.localeCompare(a.number, undefined, { numeric: true }),
  'occupancy-desc': (a, b) => occupiedCount(b) / b.capacity - occupiedCount(a) / a.capacity,
  'vacancy-desc': (a, b) => freeCount(b) - freeCount(a),
};

export function useRooms() {
  const [rooms, setRooms] = useState(() => roomsService.getRooms());
  const [rates] = useState(() => roomsService.getRates());
  const [query, setQuery] = useState('');
  const [ward, setWard] = useState<WardFilter>('all');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [sort, setSort] = useState<SortKey>('number-asc');
  const [page, setPage] = useState(1);
  const toast = useToast();

  const metrics = useMemo(() => {
    const totalBeds = rooms.reduce((sum, r) => sum + r.capacity, 0);
    const occupied = rooms.reduce((sum, r) => sum + occupiedCount(r), 0);
    const capacities = new Set(rooms.map((r) => r.capacity));
    return {
      totalRooms: rooms.length,
      totalBeds,
      occupied,
      available: totalBeds - occupied,
      occupancyRate: totalBeds ? (occupied / totalBeds) * 100 : 0,
      slotsPerRoom: capacities.size === 1 ? `${[...capacities][0]} slots per room` : 'Mixed room capacities',
    };
  }, [rooms]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return rooms
      .filter((r) => ward === 'all' || r.ward === ward)
      .filter((r) => status === 'all' || (status === 'full' ? freeCount(r) === 0 : freeCount(r) > 0))
      .filter((r) => !term || `${r.number} room ${r.number} ${r.beds.join(' ')}`.toLowerCase().includes(term))
      .sort(SORTERS[sort]);
  }, [rooms, query, ward, status, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRooms = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // Any filter change returns to the first page.
  const withReset = <T,>(setter: (value: T) => void) => (value: T) => {
    setter(value);
    setPage(1);
  };

  const assignPatient = (roomId: string, bedIndex: number, name: string): boolean => {
    const patient = name.trim();
    if (!patient) {
      toast.error('Patient name is required.');
      return false;
    }
    const alreadyAdmitted = rooms.some((r) => r.beds.some((b) => b?.toLowerCase() === patient.toLowerCase()));
    if (alreadyAdmitted) {
      toast.error(`${patient} is already admitted to a room.`);
      return false;
    }
    const target = rooms.find((r) => r.id === roomId);
    if (!target || target.beds[bedIndex] !== null) {
      toast.error('That bed is no longer available.');
      return false;
    }
    setRooms(roomsService.assignPatient(roomId, bedIndex, patient));
    toast.success(`${patient} assigned to Room ${target.number}, Bed ${String(bedIndex + 1).padStart(2, '0')}.`);
    return true;
  };

  const dischargePatient = (roomId: string, bedIndex: number) => {
    const target = rooms.find((r) => r.id === roomId);
    const patient = target?.beds[bedIndex];
    if (!target || !patient) return;
    setRooms(roomsService.dischargePatient(roomId, bedIndex));
    toast.success(`${patient} discharged from Room ${target.number}.`);
  };

  return {
    rooms,
    rates,
    metrics,
    filters: { query, ward, status, sort },
    setQuery: withReset(setQuery),
    setWard: withReset(setWard),
    setStatus: withReset(setStatus),
    setSort: withReset(setSort),
    filtered,
    pageRooms,
    page: currentPage,
    totalPages,
    setPage,
    assignPatient,
    dischargePatient,
  };
}