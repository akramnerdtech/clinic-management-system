import { useMemo, useState } from 'react';
import { UserPlus } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { IconButton } from '@/components/ui/IconButton';
import { WARD_LABELS } from '@/data/rooms';
import { freeCount } from '@/hooks/useRooms';
import { patientsService } from '@/services/patientsService';
import type { Room } from '@/types/rooms';

interface AssignPatientModalProps {
  rooms: Room[];
  initialRoomId?: string;
  initialBedIndex?: number;
  onAssign: (roomId: string, bedIndex: number, patient: string) => boolean;
  onClose: () => void;
}

const bedLabel = (index: number) => `Bed ${String(index + 1).padStart(2, '0')}`;
const field = 'flex flex-col gap-1';
const fieldLabel = 'text-[10px] font-semibold text-[#465166]';
const control = 'h-[34px] w-full rounded border border-[#e3e6ef] bg-[#f8f9fc] px-2.5 text-[11px] text-[#182236] outline-none focus:border-[#007d72]';

export function AssignPatientModal({ rooms, initialRoomId, initialBedIndex, onAssign, onClose }: AssignPatientModalProps) {
  const roomsWithVacancy = rooms.filter((r) => freeCount(r) > 0);
  const [roomId, setRoomId] = useState(initialRoomId ?? roomsWithVacancy[0]?.id ?? '');
  const room = rooms.find((r) => r.id === roomId);
  const freeBeds = room ? room.beds.map((b, i) => (b === null ? i : -1)).filter((i) => i >= 0) : [];
  const [bedIndex, setBedIndex] = useState(initialBedIndex ?? freeBeds[0] ?? 0);
  const [patient, setPatient] = useState('');

  // Only registered patients (from localStorage) who are not already admitted to a bed.
  const availablePatients = useMemo(() => {
    const admitted = new Set(rooms.flatMap((r) => r.beds).filter(Boolean).map((b) => (b as string).toLowerCase()));
    return patientsService
      .getPatients()
      .filter((p) => p[1] && !admitted.has(p[1].toLowerCase()))
      .map((p) => ({ id: p[0], name: p[1] }));
  }, [rooms]);

  const changeRoom = (id: string) => {
    setRoomId(id);
    const next = rooms.find((r) => r.id === id);
    setBedIndex(next ? next.beds.findIndex((b) => b === null) : 0);
  };

  const submit = () => {
    if (onAssign(roomId, bedIndex, patient)) onClose();
  };

  return (
    <Modal
      title="Assign Patient"
      subtitle="Admit a patient to an available bed."
      onClose={onClose}
      footer={<>
        <IconButton className="h-[35px] border border-[#e3e5ed] bg-white text-[#253148]" onClick={onClose}>Cancel</IconButton>
        <IconButton className="h-[35px] gap-1.5 bg-[#007d72] px-3.5 text-white" onClick={submit}><UserPlus size={14} /> Assign Patient</IconButton>
      </>}
    >
      {roomsWithVacancy.length === 0 ? (
        <p className="m-0 text-[11px] text-[#6d7685]">Every room is full right now. Discharge a patient to free up a bed.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <label className={field}>
            <span className={fieldLabel}>Room</span>
            <select className={control} value={roomId} onChange={(e) => changeRoom(e.target.value)}>
              {roomsWithVacancy.map((r) => (
                <option key={r.id} value={r.id}>
                  Room {r.number} · {WARD_LABELS[r.ward]} · {freeCount(r)} free
                </option>
              ))}
            </select>
          </label>
          <label className={field}>
            <span className={fieldLabel}>Bed</span>
            <select className={control} value={bedIndex} onChange={(e) => setBedIndex(Number(e.target.value))}>
              {freeBeds.map((i) => <option key={i} value={i}>{bedLabel(i)}</option>)}
            </select>
          </label>
          <label className={`${field} col-span-2`}>
            <span className={fieldLabel}>Patient *</span>
            <select className={control} value={patient} onChange={(e) => setPatient(e.target.value)}>
              <option value="">{availablePatients.length ? 'Select a registered patient' : 'No available patients'}</option>
              {availablePatients.map((p) => (
                <option key={p.id} value={p.name}>{p.name} ({p.id})</option>
              ))}
            </select>
            {availablePatients.length === 0 && (
              <small className="text-[10px] text-[#6d7685]">Register a patient first, or every registered patient is already admitted.</small>
            )}
          </label>
        </div>
      )}
    </Modal>
  );
}