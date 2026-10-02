import { LogOut, UserPlus } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { IconButton } from '@/components/ui/IconButton';
import { WARD_LABELS } from '@/data/rooms';
import { freeCount, occupiedCount } from '@/hooks/useRooms';
import type { Room, WardRate } from '@/types/rooms';

interface RoomDetailsModalProps {
  room: Room;
  rate?: WardRate;
  onAssign: (roomId: string, bedIndex: number) => void;
  onDischarge: (roomId: string, bedIndex: number) => void;
  onClose: () => void;
}

const bedLabel = (index: number) => `Bed ${String(index + 1).padStart(2, '0')}`;
const summaryCell = 'flex flex-col gap-[3px] rounded-md border border-[#e8ebf2] bg-[#f8f9fc] px-2.5 py-[9px] text-[8.5px] font-bold tracking-[0.06em] text-[#7b8494]';
const summaryValue = 'text-[13px] tracking-normal text-[#182236]';
const linkBtn = 'inline-flex items-center gap-1 bg-transparent text-[10.5px] font-semibold hover:underline';

export function RoomDetailsModal({ room, rate, onAssign, onDischarge, onClose }: RoomDetailsModalProps) {
  return (
    <Modal
      title={`Room ${room.number}`}
      subtitle={`${WARD_LABELS[room.ward]} · ${room.floor} • ${room.area}`}
      onClose={onClose}
      className="!max-w-[460px]"
      footer={<IconButton className="h-[35px] border border-[#e3e5ed] bg-white text-[#253148]" onClick={onClose}>Close</IconButton>}
    >
      <div className="mb-3 grid grid-cols-3 gap-2">
        <span className={summaryCell}>OCCUPIED<b className={summaryValue}>{occupiedCount(room)} / {room.capacity}</b></span>
        <span className={summaryCell}>AVAILABLE<b className={summaryValue}>{freeCount(room)}</b></span>
        <span className={summaryCell}>RATE PER DAY<b className={summaryValue}>{rate ? `₹${rate.perDay.toLocaleString('en-IN')}` : '—'}</b></span>
      </div>

      <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
        {room.beds.map((patient, index) => (
          <li key={index} className="flex items-center justify-between gap-2.5 rounded-md border border-[#edf0f5] px-2.5 py-2">
            <div>
              <b className="block text-[11px] text-[#182236]">{patient ?? 'Available'}</b>
              <small className="text-[9px] text-[#8a93a2]">{bedLabel(index)} · {patient ? 'Occupied' : 'Available'}</small>
            </div>
            {patient ? (
              <button type="button" className={`${linkBtn} text-[#e4393d]`} onClick={() => onDischarge(room.id, index)}>
                <LogOut size={13} /> Discharge
              </button>
            ) : (
              <button type="button" className={`${linkBtn} text-[#007d72]`} onClick={() => onAssign(room.id, index)}>
                <UserPlus size={13} /> Assign
              </button>
            )}
          </li>
        ))}
      </ul>
    </Modal>
  );
}