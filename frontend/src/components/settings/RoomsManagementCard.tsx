import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BedDouble,
  Plus,
  Search,
  Pencil,
  Trash2,
  ExternalLink,
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
  Building2,
} from 'lucide-react';
import { AddRoomModal } from '@/components/rooms/AddRoomModal';
import { WARD_LABELS, WARD_STYLES } from '@/data/rooms';
import { roomsService } from '@/services/roomsService';
import type { AddRoomInput } from '@/services/roomsService';
import type { Room, WardType } from '@/types/rooms';
import { useToast } from '@/utils/toast';

interface RoomsManagementCardProps {
  rooms: Room[];
  onRoomsChanged: () => void;
}

export function RoomsManagementCard({ rooms, onRoomsChanged }: RoomsManagementCardProps) {
  const navigate = useNavigate();
  const toast = useToast();

  const [search, setSearch] = useState('');
  const [wardFilter, setWardFilter] = useState<'all' | WardType>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [deletingRoom, setDeletingRoom] = useState<Room | null>(null);

  // Filtered rooms
  const filteredRooms = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rooms.filter((r) => {
      const matchesWard = wardFilter === 'all' || r.ward === wardFilter;
      const matchesSearch =
        !q ||
        r.number.toLowerCase().includes(q) ||
        r.floor.toLowerCase().includes(q) ||
        r.area.toLowerCase().includes(q) ||
        (WARD_LABELS[r.ward] && WARD_LABELS[r.ward].toLowerCase().includes(q));
      return matchesWard && matchesSearch;
    });
  }, [rooms, search, wardFilter]);

  // Metrics
  const totalBeds = useMemo(() => rooms.reduce((acc, r) => acc + r.capacity, 0), [rooms]);
  const occupiedBeds = useMemo(
    () => rooms.reduce((acc, r) => acc + r.beds.filter(Boolean).length, 0),
    [rooms],
  );
  const availableBeds = totalBeds - occupiedBeds;

  const handleOpenAdd = () => {
    setEditingRoom(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (room: Room) => {
    setEditingRoom(room);
    setModalOpen(true);
  };

  const handleSaveRoom = (data: AddRoomInput) => {
    if (editingRoom) {
      const res = roomsService.updateRoom(editingRoom.id, {
        number: data.number,
        ward: data.ward,
        capacity: data.capacity,
        floor: data.floor,
        area: data.area,
      });
      if (res.success) {
        toast.success(res.message);
        onRoomsChanged();
        return true;
      } else {
        toast.error(res.message);
        return { success: false, message: res.message };
      }
    } else {
      const res = roomsService.addRoom(data);
      if (res.success) {
        toast.success(res.message);
        onRoomsChanged();
        return true;
      } else {
        toast.error(res.message);
        return { success: false, message: res.message };
      }
    }
  };

  const handleDeleteRoom = (room: Room) => {
    const occupiedCount = room.beds.filter(Boolean).length;
    if (occupiedCount > 0) {
      toast.error(
        `Cannot delete Room ${room.number}: ${occupiedCount} patient(s) are admitted. Discharge patients first.`,
      );
      return;
    }
    setDeletingRoom(room);
  };

  const confirmDelete = () => {
    if (!deletingRoom) return;
    const res = roomsService.deleteRoom(deletingRoom.id);
    if (res.success) {
      toast.success(res.message);
      onRoomsChanged();
      setDeletingRoom(null);
    } else {
      toast.error(res.message);
    }
  };

  return (
    <section className="sp-card sp-rooms-card">
      {/* Header */}
      <header className="sp-card-head">
        <span className="sp-card-icon">
          <BedDouble size={20} />
        </span>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2>Clinical Rooms &amp; Ward Setup</h2>
            <span className="sp-badge teal">
              <CheckCircle2 size={12} /> Syncs with Rooms Module
            </span>
          </div>
          <p>
            Add and manage facility rooms, ward categories, and bed capacities. Any room configured here is
            immediately available in the <b>Rooms module</b> for inpatient bed allocations.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="sp-btn !bg-[#007d72] !text-white hover:!bg-[#00685e] !border-transparent shadow-sm"
            onClick={handleOpenAdd}
          >
            <Plus size={15} /> Add New Room
          </button>
        </div>
      </header>

      {/* Quick Summary Pill Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-5">
        <div className="rounded-xl border border-[#e5e7eb] bg-[#f8fafc] p-3 text-center transition-all hover:bg-white hover:shadow-sm">
          <span className="text-[11px] font-semibold text-[#64748b]">Total Rooms</span>
          <b className="mt-0.5 block text-xl font-bold text-[#0f172a]">{rooms.length}</b>
        </div>
        <div className="rounded-xl border border-[#e5e7eb] bg-[#f8fafc] p-3 text-center transition-all hover:bg-white hover:shadow-sm">
          <span className="text-[11px] font-semibold text-[#64748b]">Total Bed Slots</span>
          <b className="mt-0.5 block text-xl font-bold text-[#007d72]">{totalBeds}</b>
        </div>
        <div className="rounded-xl border border-[#e5e7eb] bg-[#f8fafc] p-3 text-center transition-all hover:bg-white hover:shadow-sm">
          <span className="text-[11px] font-semibold text-[#64748b]">Available Beds</span>
          <b className="mt-0.5 block text-xl font-bold text-[#10b981]">{availableBeds}</b>
        </div>
        <div className="rounded-xl border border-[#e5e7eb] bg-[#f8fafc] p-3 text-center transition-all hover:bg-white hover:shadow-sm">
          <span className="text-[11px] font-semibold text-[#64748b]">Occupied Beds</span>
          <b className="mt-0.5 block text-xl font-bold text-[#f59e0b]">{occupiedBeds}</b>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 rounded-xl border border-[#e5e7eb] bg-[#f8fafc] p-2.5">
        <div className="flex flex-1 items-center gap-2 rounded-lg border border-[#e2e8f0] bg-white px-3 py-1.5 min-w-[220px]">
          <Search size={14} className="text-[#94a3b8]" />
          <input
            type="text"
            placeholder="Search room no, floor, or wing..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs text-[#1e293b] outline-none placeholder:text-[#94a3b8] bg-transparent"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-[#64748b]">Ward:</span>
          <select
            value={wardFilter}
            onChange={(e) => setWardFilter(e.target.value as 'all' | WardType)}
            className="h-8 rounded-lg border border-[#e2e8f0] bg-white px-2.5 text-xs font-semibold text-[#334155] outline-none focus:border-[#007d72]"
          >
            <option value="all">All Wards ({rooms.length})</option>
            {Object.entries(WARD_LABELS).map(([key, label]) => {
              const count = rooms.filter((r) => r.ward === key).length;
              return (
                <option key={key} value={key}>
                  {label} ({count})
                </option>
              );
            })}
          </select>

          <button
            type="button"
            className="sp-btn !h-8 !px-2.5 !text-xs !gap-1 text-[#007d72]"
            onClick={() => navigate('/rooms')}
            title="Open Ward Operations Room Module"
          >
            Go to Rooms <ExternalLink size={12} />
          </button>
        </div>
      </div>

      {/* Rooms Table / Grid */}
      {filteredRooms.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#cbd5e1] p-8 text-center bg-white">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#f1f5f9] text-[#64748b] mb-3">
            <BedDouble size={22} />
          </div>
          <h3 className="text-sm font-bold text-[#1e293b]">No Clinical Rooms Found</h3>
          <p className="mt-1 text-xs text-[#64748b] max-w-sm mx-auto">
            {search || wardFilter !== 'all'
              ? 'No rooms match your filter criteria. Try clearing search or selecting All Wards.'
              : 'No clinical rooms are set up yet. Click "Add New Room" above to add your first room.'}
          </p>
          <button
            type="button"
            className="sp-btn !bg-[#007d72] !text-white mt-4"
            onClick={handleOpenAdd}
          >
            <Plus size={14} /> Add New Room
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[#e2e8f0] bg-white shadow-sm">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#e2e8f0] bg-[#f8fafc] text-[11px] font-bold uppercase tracking-wider text-[#64748b]">
                <th className="py-3 px-4">Room No</th>
                <th className="py-3 px-3">Ward Category</th>
                <th className="py-3 px-3">Bed Capacity</th>
                <th className="py-3 px-3">Floor &amp; Area</th>
                <th className="py-3 px-3">Occupancy Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f1f5f9]">
              {filteredRooms.map((room) => {
                const occupiedCount = room.beds.filter(Boolean).length;
                const freeCount = room.capacity - occupiedCount;
                const isFull = freeCount === 0;
                const fillPercent = room.capacity ? (occupiedCount / room.capacity) * 100 : 0;
                const style = WARD_STYLES[room.ward] ?? WARD_STYLES.general;

                return (
                  <tr key={room.id} className="hover:bg-[#f8fafc]/80 transition-colors">
                    {/* Room No */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#f1f5f9] text-[#007d72] font-bold">
                          <BedDouble size={16} />
                        </div>
                        <div>
                          <b className="text-sm font-bold text-[#0f172a]">Room {room.number}</b>
                          <small className="block text-[10px] text-[#64748b]">ID: {room.id}</small>
                        </div>
                      </div>
                    </td>

                    {/* Ward Category */}
                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10.5px] font-bold ${style.badge}`}
                      >
                        {WARD_LABELS[room.ward] ?? room.ward}
                      </span>
                    </td>

                    {/* Bed Capacity with mini bar */}
                    <td className="py-3 px-3">
                      <div className="w-36">
                        <div className="flex justify-between items-center mb-1 text-[11px]">
                          <span className="font-semibold text-[#0f172a]">{room.capacity} Beds</span>
                          <span className={occupiedCount > 0 ? 'text-[#007d72] font-semibold' : 'text-[#64748b]'}>
                            {occupiedCount} / {room.capacity}
                          </span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-[#e2e8f0] overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              isFull ? 'bg-[#e4393d]' : 'bg-[#007d72]'
                            }`}
                            style={{ width: `${fillPercent}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Floor & Area */}
                    <td className="py-3 px-3">
                      <div className="text-[11.5px] text-[#334155] font-medium">
                        {room.floor}
                      </div>
                      <div className="text-[10px] text-[#64748b]">{room.area}</div>
                    </td>

                    {/* Occupancy Status */}
                    <td className="py-3 px-3">
                      {isFull ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#fef2f2] px-2 py-0.5 text-[10px] font-bold text-[#dc2626]">
                          <span className="h-1.5 w-1.5 rounded-full bg-[#dc2626]" /> Full (0 Free)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#ecfdf5] px-2 py-0.5 text-[10px] font-bold text-[#059669]">
                          <span className="h-1.5 w-1.5 rounded-full bg-[#059669]" /> {freeCount} Vacant
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          className="flex h-7 w-7 items-center justify-center rounded-md border border-[#e2e8f0] bg-white text-[#475569] hover:bg-[#f1f5f9] hover:text-[#007d72]"
                          onClick={() => handleOpenEdit(room)}
                          title="Edit Room Configuration"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          type="button"
                          disabled={occupiedCount > 0}
                          className={`flex h-7 w-7 items-center justify-center rounded-md border border-[#e2e8f0] bg-white transition-colors ${
                            occupiedCount > 0
                              ? 'cursor-not-allowed opacity-40 text-[#94a3b8]'
                              : 'text-[#ef4444] hover:bg-[#fef2f2] hover:border-[#fecaca]'
                          }`}
                          onClick={() => handleDeleteRoom(room)}
                          title={
                            occupiedCount > 0
                              ? `Cannot delete: ${occupiedCount} patient(s) currently admitted`
                              : 'Delete Room'
                          }
                        >
                          <Trash2 size={13} />
                        </button>
                        <button
                          type="button"
                          className="flex h-7 items-center gap-1 rounded-md border border-[#e2e8f0] bg-white px-2 text-[11px] font-semibold text-[#007d72] hover:bg-[#f0faf8]"
                          onClick={() => navigate('/rooms')}
                          title="Open Room in Rooms Module"
                        >
                          Manage <ExternalLink size={11} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add / Edit Room Modal */}
      {modalOpen && (
        <AddRoomModal
          initialRoom={editingRoom}
          onClose={() => {
            setModalOpen(false);
            setEditingRoom(null);
          }}
          onSubmit={handleSaveRoom}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {deletingRoom && (
        <div className="modal-overlay" onClick={() => setDeletingRoom(null)}>
          <div
            className="modal-card !max-w-[420px]"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div className="flex items-center gap-2 text-[#dc2626]">
                <ShieldAlert size={20} />
                <h2 className="!text-[#dc2626]">Delete Room {deletingRoom.number}?</h2>
              </div>
            </div>
            <div className="modal-body text-xs text-[#475569] leading-relaxed">
              <p>
                Are you sure you want to delete <b>Room {deletingRoom.number}</b> ({WARD_LABELS[deletingRoom.ward]}, {deletingRoom.capacity} beds)?
              </p>
              <p className="mt-2 text-[#64748b]">
                This room will be permanently removed from both Clinic Profile and the Rooms module.
              </p>
            </div>
            <div className="modal-footer flex justify-end gap-2">
              <button
                type="button"
                className="sp-btn"
                onClick={() => setDeletingRoom(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="sp-btn danger !bg-[#dc2626] !text-white !border-transparent hover:!bg-[#b91c1c]"
                onClick={confirmDelete}
              >
                Delete Room
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
