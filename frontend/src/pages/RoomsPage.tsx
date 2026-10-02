import { useState } from 'react';
import { Download, Plus, Search } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { IconButton } from '@/components/ui/IconButton';
import { RoomStats } from '@/components/rooms/RoomStats';
import { RoomCard } from '@/components/rooms/RoomCard';
import { AssignPatientModal } from '@/components/rooms/AssignPatientModal';
import { RoomDetailsModal } from '@/components/rooms/RoomDetailsModal';
import { WARD_LABELS } from '@/data/rooms';
import { freeCount, useRooms } from '@/hooks/useRooms';
import type { SortKey, StatusFilter, WardFilter } from '@/hooks/useRooms';
import { useToast } from '@/utils/toast';
import { downloadCsv } from '@/utils/exportFile';

const filterLabel = 'flex items-center gap-1.5 text-[10px] text-[#6d7685] max-sm:flex-[1_1_140px]';
const filterSelect = 'h-[29px] rounded border border-[#e3e6ef] bg-[#f1f3ff] px-2 text-[10px] text-[#465166] max-sm:min-w-0 max-sm:flex-1';
const pageBtn = 'rounded-[5px] border border-[#e3e6ef] bg-white px-2.5 py-1.5 text-[10px] text-[#687285] disabled:cursor-not-allowed disabled:opacity-50';

interface AssignTarget {
  roomId?: string;
  bedIndex?: number;
}

export function RoomsPage() {
  const {
    rooms, rates, metrics, filters, setQuery, setWard, setStatus, setSort,
    filtered, pageRooms, page, totalPages, setPage, assignPatient, dischargePatient,
  } = useRooms();
  const [assignTarget, setAssignTarget] = useState<AssignTarget | null>(null);
  const [detailsRoomId, setDetailsRoomId] = useState<string | null>(null);
  const toast = useToast();

  const detailsRoom = rooms.find((r) => r.id === detailsRoomId);
  const filteredBeds = filtered.reduce((sum, r) => sum + r.capacity, 0);

  const openAssign = (target: AssignTarget = {}) => {
    if (!rooms.some((r) => freeCount(r) > 0)) {
      toast.error('Every room is full. Discharge a patient to free up a bed.');
      return;
    }
    setAssignTarget(target);
  };

  const handleExport = () => {
    const rows = rooms.flatMap((r) =>
      r.beds.map((patient, i) => [
        `Room ${r.number}`,
        WARD_LABELS[r.ward],
        `${r.floor} • ${r.area}`,
        `Bed ${String(i + 1).padStart(2, '0')}`,
        patient ? 'Occupied' : 'Available',
        patient ?? '',
        rates.find((rate) => rate.ward === r.ward)?.perDay ?? '',
      ]),
    );
    downloadCsv('rooms-report', ['Room', 'Ward', 'Location', 'Bed', 'Status', 'Patient', 'Rate Per Day (INR)'], rows);
    toast.success('Rooms report exported.');
  };

  return (
    <>
      <PageHeader
        eyebrow="WARD OPERATIONS"
        title="Rooms"
        description="Manage rooms and monitor patient occupancy."
        actions={<>
          <IconButton className="h-[35px] gap-1.5 border border-[#e3e5ed] bg-white text-[#253148]" onClick={handleExport}><Download size={14} /> Export Report</IconButton>
          <IconButton className="h-[35px] gap-1.5 bg-[#007d72] px-3.5 text-white" onClick={() => openAssign()}><Plus size={14} /> Assign New Patient</IconButton>
        </>}
      />

      <RoomStats {...metrics} rates={rates} />

      <div className="mb-3.5 flex flex-wrap items-center gap-3 rounded-[5px] border border-[#ebedf2] bg-white p-3">
        <div className="flex h-[29px] min-w-0 flex-[1_1_260px] cursor-text items-center gap-2 rounded border border-[#e6e9f4] bg-[#f1f3ff] px-[9px] text-[#6c7482]">
          <Search size={14} className="shrink-0" />
          <input
            className="w-full bg-transparent p-0 text-[10px] text-[#465166] outline-none placeholder:text-[#6c7482]"
            placeholder="Search rooms by room number or patient..."
            value={filters.query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search rooms"
          />
        </div>
        <label className={filterLabel}>
          <span>Type:</span>
          <select className={filterSelect} value={filters.ward} onChange={(e) => setWard(e.target.value as WardFilter)}>
            <option value="all">All Wards</option>
            {Object.entries(WARD_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select>
        </label>
        <label className={filterLabel}>
          <span>Status:</span>
          <select className={filterSelect} value={filters.status} onChange={(e) => setStatus(e.target.value as StatusFilter)}>
            <option value="all">All</option>
            <option value="available">Has Vacancy</option>
            <option value="full">Full</option>
          </select>
        </label>
        <label className={filterLabel}>
          <span>Sort:</span>
          <select className={filterSelect} value={filters.sort} onChange={(e) => setSort(e.target.value as SortKey)}>
            <option value="number-asc">Room Number (Asc)</option>
            <option value="number-desc">Room Number (Desc)</option>
            <option value="occupancy-desc">Most Occupied</option>
            <option value="vacancy-desc">Most Vacant</option>
          </select>
        </label>
      </div>

      {pageRooms.length ? (
        <div className="mb-3.5 grid grid-cols-1 items-start gap-3.5 md:grid-cols-2 min-[1101px]:grid-cols-3">
          {pageRooms.map((room) => (
            <RoomCard
              key={room.id}
              room={room}
              onAssign={(roomId, bedIndex) => openAssign({ roomId, bedIndex })}
              onView={setDetailsRoomId}
            />
          ))}
        </div>
      ) : (
        <div className="mb-3.5 rounded-[5px] border border-[#ebedf2] bg-white px-4 py-9 text-center text-[#6d7685]">
          No rooms match your search or filters.
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2.5 border-t border-[#edf0f5] pt-3 text-[10px] text-[#6d7685] max-sm:justify-center max-sm:text-center">
        <span>Showing {pageRooms.length} of {filtered.length} clinical rooms ({filteredBeds} total bed slots)</span>
        <div className="flex gap-[5px]">
          <button type="button" className={pageBtn} disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
            <button
              type="button"
              key={n}
              className={`${pageBtn} ${n === page ? '!border-[#007d72] !bg-[#e6f6f3] font-bold !text-[#007d72]' : ''}`}
              onClick={() => setPage(n)}
            >
              {n}
            </button>
          ))}
          <button type="button" className={pageBtn} disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</button>
        </div>
      </div>

      {assignTarget && (
        <AssignPatientModal
          rooms={rooms}
          initialRoomId={assignTarget.roomId}
          initialBedIndex={assignTarget.bedIndex}
          onAssign={assignPatient}
          onClose={() => setAssignTarget(null)}
        />
      )}

      {detailsRoom && (
        <RoomDetailsModal
          room={detailsRoom}
          rate={rates.find((rate) => rate.ward === detailsRoom.ward)}
          onAssign={(roomId, bedIndex) => { setDetailsRoomId(null); openAssign({ roomId, bedIndex }); }}
          onDischarge={dischargePatient}
          onClose={() => setDetailsRoomId(null)}
        />
      )}
    </>
  );
}