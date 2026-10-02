import { ChevronRight } from 'lucide-react';
import { WARD_LABELS, WARD_STYLES } from '@/data/rooms';
import { freeCount, occupiedCount } from '@/hooks/useRooms';
import { Pill } from '@/components/rooms/RoomStats';
import type { Room } from '@/types/rooms';

interface RoomCardProps {
  room: Room;
  onAssign: (roomId: string, bedIndex: number) => void;
  onView: (roomId: string) => void;
}

const bedLabel = (index: number) => `Bed ${String(index + 1).padStart(2, '0')}`;
const bedBase = 'flex min-h-[42px] min-w-0 rounded-md px-[9px] py-[7px]';

export function RoomCard({ room, onAssign, onView }: RoomCardProps) {
  const occupied = occupiedCount(room);
  const free = freeCount(room);
  const full = free === 0;
  const fill = room.capacity ? (occupied / room.capacity) * 100 : 0;
  const style = WARD_STYLES[room.ward];

  return (
    <section className="rounded-lg border border-[#ebedf2] bg-white p-3.5 pb-3 shadow-sm">
      <header className="flex items-start justify-between gap-2.5">
        <div>
          <h2 className="m-0 flex flex-wrap items-center gap-[7px] text-sm font-semibold text-[#182338]">
            Room {room.number}
            <span className={`rounded border px-[7px] py-1 text-[9px] font-semibold leading-none ${style.badge}`}>
              {WARD_LABELS[room.ward]}
            </span>
          </h2>
          <small className="mt-[3px] block text-[10px] text-[#7b8494]">{room.floor} • {room.area}</small>
        </div>
        <div className="shrink-0 text-right">
          <b className="flex items-center justify-end gap-[5px] text-[12px] font-bold text-[#182236]">
            {occupied} / {room.capacity}
            {full && <Pill tone="red">Full</Pill>}
          </b>
          <small className="mt-[3px] block text-[10px] text-[#7b8494]">Occupied</small>
        </div>
      </header>

      <div
        className="mb-3 mt-[11px] h-1 overflow-hidden rounded-full bg-[#eef1f6]"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={room.capacity}
        aria-valuenow={occupied}
        aria-label={`Room ${room.number} occupancy`}
      >
        <i
          className={`block h-full rounded-full transition-[width] duration-300 ${full ? 'bg-[#e4393d]' : style.bar}`}
          style={{ width: `${fill}%` }}
        />
      </div>

      <p className="mb-[7px] mt-0 text-[8.5px] font-bold tracking-[0.06em] text-[#7b8494]">
        PATIENT BEDS ({room.capacity} CAPACITY)
      </p>
      <div className="grid grid-cols-2 gap-[7px]">
        {room.beds.map((patient, index) => {
          const wide = room.capacity % 2 === 1 && index === room.capacity - 1 ? 'col-span-2' : '';
          if (patient) {
            return (
              <div className={`${bedBase} ${wide} flex-col justify-center border border-[#e8ebf2] bg-[#f8f9fc]`} key={index}>
                <b className="block truncate text-[10.5px] font-semibold text-[#182236]">{patient}</b>
                <small className="mt-0.5 flex items-center gap-1 text-[9px] text-[#8a93a2]">{bedLabel(index)} · <span className="font-semibold text-[#e4393d]">Occupied</span></small>
              </div>
            );
          }
          return (
            <button
              type="button"
              key={index}
              onClick={() => onAssign(room.id, index)}
              aria-label={`Assign patient to Room ${room.number}, ${bedLabel(index)}`}
              className={`${bedBase} ${wide} cursor-pointer items-center justify-between gap-1.5 border border-dashed border-[#a9e3d6] bg-[#f1fcf9] text-left transition-colors hover:border-[#53c2ae] hover:bg-[#e3f7f2] focus-visible:border-[#53c2ae] focus-visible:bg-[#e3f7f2] focus-visible:outline-none`}
            >
              <span className="min-w-0">
                <b className="block truncate text-[10.5px] font-semibold text-[#0f5f56]">Available</b>
                <small className="mt-0.5 block text-[9px] text-[#8a93a2]">{bedLabel(index)} · Vacant</small>
              </span>
              <em className="shrink-0 text-[9.5px] font-semibold not-italic text-[#007d72]">
                {wide ? 'Assign Patient' : 'Assign'}
              </em>
            </button>
          );
        })}
      </div>

      <footer className="mt-3 flex items-center justify-between border-t border-[#f0f2f6] pt-2.5 text-[10px] text-[#9aa2b0]">
        <span className={free ? 'font-semibold text-[#007d72]' : ''}>{free} {free === 1 ? 'bed' : 'beds'} available</span>
        <button
          type="button"
          onClick={() => onView(room.id)}
          className="inline-flex items-center gap-0.5 bg-transparent py-0.5 text-[10.5px] font-semibold text-[#007d72] hover:underline"
        >
          View Details <ChevronRight size={13} />
        </button>
      </footer>
    </section>
  );
}