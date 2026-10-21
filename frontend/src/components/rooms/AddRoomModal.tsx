import { useState } from 'react';
import { BedDouble, Check, Plus, Building2, MapPin } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { IconButton } from '@/components/ui/IconButton';
import { WARD_LABELS, WARD_STYLES, wardRates } from '@/data/rooms';
import type { Room, WardType } from '@/types/rooms';
import type { AddRoomInput } from '@/services/roomsService';

interface AddRoomModalProps {
  initialRoom?: Room | null;
  onClose: () => void;
  onSubmit: (data: AddRoomInput) => boolean | { success: boolean; message?: string };
}

const WARD_OPTIONS: { id: WardType; label: string; desc: string; badgeClass: string }[] = [
  {
    id: 'general',
    label: 'General Ward',
    desc: 'Multi-bed shared recovery ward',
    badgeClass: 'border-[#bfeadf] bg-[#e6f8f4] text-[#007d72]',
  },
  {
    id: 'private',
    label: 'Private Ward',
    desc: 'Single/family private executive suites',
    badgeClass: 'border-[#e6d3ff] bg-[#f6edff] text-[#7c3aed]',
  },
  {
    id: 'emergency',
    label: 'Emergency',
    desc: 'Acute triage & emergency observation',
    badgeClass: 'border-[#ffd0d3] bg-[#fff0f1] text-[#e4393d]',
  },
  {
    id: 'icu',
    label: 'ICU',
    desc: 'Intensive Critical Care & monitoring',
    badgeClass: 'border-[#bfeadf] bg-[#e6f8f4] text-[#007d72]',
  },
];

const FLOOR_PRESETS = ['Ground Floor', '1st Floor', '2nd Floor', '3rd Floor', '4th Floor', 'Basement Level'];
const AREA_PRESETS = [
  'East Wing',
  'West Wing',
  'North Wing',
  'South Wing',
  'Executive Suite',
  'Trauma Wing',
  'Critical Care Unit',
  'Main Block',
];
const CAPACITY_PRESETS = [1, 2, 4, 5, 6, 8, 10];

export function AddRoomModal({ initialRoom, onClose, onSubmit }: AddRoomModalProps) {
  const isEditing = Boolean(initialRoom);

  const [roomNumber, setRoomNumber] = useState(initialRoom?.number ?? '');
  const [ward, setWard] = useState<WardType>(initialRoom?.ward ?? 'general');
  const [capacity, setCapacity] = useState<number>(initialRoom?.capacity ?? 5);
  const [floor, setFloor] = useState(initialRoom?.floor ?? 'Ground Floor');
  const [area, setArea] = useState(initialRoom?.area ?? 'East Wing');
  const [customFloor, setCustomFloor] = useState(
    initialRoom && !FLOOR_PRESETS.includes(initialRoom.floor) ? initialRoom.floor : '',
  );
  const [customArea, setCustomArea] = useState(
    initialRoom && !AREA_PRESETS.includes(initialRoom.area) ? initialRoom.area : '',
  );
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedNumber = roomNumber.trim();
    if (!trimmedNumber) {
      setError('Please enter a room number (e.g. 109, 201).');
      return;
    }

    const cap = Math.floor(Number(capacity));
    if (isNaN(cap) || cap < 1) {
      setError('Bed capacity must be at least 1 bed.');
      return;
    }
    if (cap > 50) {
      setError('Bed capacity cannot exceed 50 beds.');
      return;
    }

    const finalFloor = customFloor.trim() || floor;
    const finalArea = customArea.trim() || area;

    const res = onSubmit({
      number: trimmedNumber,
      ward,
      capacity: cap,
      floor: finalFloor,
      area: finalArea,
    });

    if (typeof res === 'boolean') {
      if (res) onClose();
    } else if (res && res.success) {
      onClose();
    } else if (res && !res.success) {
      setError(res.message || 'Failed to save room.');
    }
  };

  const currentRate = wardRates.find((r) => r.ward === ward);

  return (
    <Modal
      title={isEditing ? `Edit Room ${initialRoom?.number}` : 'Add New Clinical Room'}
      subtitle={
        isEditing
          ? 'Update room number, ward category, and bed capacity.'
          : 'Configure room details, assign ward type, and define bed capacity for patient admissions.'
      }
      onClose={onClose}
      className="!max-w-[560px]"
      footer={
        <>
          <IconButton className="h-[38px] border border-[#e3e5ed] bg-white text-[#253148]" onClick={onClose}>
            Cancel
          </IconButton>
          <IconButton
            className="h-[38px] gap-1.5 bg-[#007d72] px-4 text-white hover:bg-[#00685e]"
            onClick={handleSubmit}
          >
            {isEditing ? <Check size={15} /> : <Plus size={15} />}
            {isEditing ? 'Save Changes' : 'Add Room'}
          </IconButton>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-left">
        {error && (
          <div className="rounded-lg border border-[#fecaca] bg-[#fef2f2] p-3 text-xs font-semibold text-[#dc2626]">
            {error}
          </div>
        )}

        {/* Room Number & Ward Type */}
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-xs font-semibold text-[#374151]">
            <span>
              Room Number <span className="text-red-500">*</span>
            </span>
            <div className="flex h-10 items-center rounded-lg border border-[#d1d5db] bg-white px-3 transition-colors focus-within:border-[#007d72] focus-within:ring-2 focus-within:ring-[#007d72]/15">
              <span className="mr-2 text-xs font-bold text-[#6b7280]">RM-</span>
              <input
                type="text"
                placeholder="e.g. 109, 204, ICU-02"
                value={roomNumber}
                onChange={(e) => {
                  setRoomNumber(e.target.value);
                  setError(null);
                }}
                className="w-full bg-transparent text-sm font-semibold text-[#111827] outline-none placeholder:font-normal placeholder:text-[#9ca3af]"
                autoFocus
                required
              />
            </div>
            <span className="text-[11px] font-normal text-[#6b7280]">Unique identifier across the facility</span>
          </label>

          <label className="flex flex-col gap-1.5 text-xs font-semibold text-[#374151]">
            <span>
              Ward Name / Category <span className="text-red-500">*</span>
            </span>
            <select
              value={ward}
              onChange={(e) => setWard(e.target.value as WardType)}
              className="h-10 rounded-lg border border-[#d1d5db] bg-white px-3 text-sm font-semibold text-[#111827] outline-none transition-colors focus:border-[#007d72] focus:ring-2 focus:ring-[#007d72]/15"
            >
              {WARD_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
            <span className="text-[11px] font-normal text-[#6b7280]">
              Base Rate: ₹{currentRate?.perDay.toLocaleString('en-IN') ?? 0} / day
            </span>
          </label>
        </div>

        {/* Ward Category Cards (Quick visual selection) */}
        <div>
          <span className="mb-1.5 block text-xs font-semibold text-[#374151]">Select Ward Classification</span>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {WARD_OPTIONS.map((opt) => {
              const selected = ward === opt.id;
              const style = WARD_STYLES[opt.id];
              return (
                <button
                  type="button"
                  key={opt.id}
                  onClick={() => setWard(opt.id)}
                  className={`flex flex-col items-start rounded-lg border p-2.5 text-left transition-all ${
                    selected
                      ? 'border-[#007d72] bg-[#f0faf8] ring-2 ring-[#007d72]/20 shadow-sm'
                      : 'border-[#e5e7eb] bg-white hover:border-[#cbd5e1] hover:bg-[#f8fafc]'
                  }`}
                >
                  <span
                    className={`inline-block rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${style.badge}`}
                  >
                    {WARD_LABELS[opt.id]}
                  </span>
                  <span className="mt-1.5 text-[11px] text-[#6b7280] leading-tight line-clamp-1">{opt.desc}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Bed Capacity */}
        <div className="rounded-xl border border-[#e5e7eb] bg-[#f9fafb] p-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <div>
              <span className="text-xs font-semibold text-[#111827]">
                Bed Capacity <span className="text-red-500">*</span>
              </span>
              <p className="text-[11px] text-[#6b7280]">Number of patient beds to allocate in this room</p>
            </div>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min={1}
                max={50}
                value={capacity}
                onChange={(e) => setCapacity(Math.max(1, parseInt(e.target.value) || 1))}
                className="h-9 w-20 rounded-lg border border-[#d1d5db] bg-white text-center text-sm font-bold text-[#111827] outline-none focus:border-[#007d72]"
              />
              <span className="text-xs font-semibold text-[#4b5563]">Beds</span>
            </div>
          </div>

          {/* Quick preset chips */}
          <div className="flex flex-wrap gap-1.5">
            {CAPACITY_PRESETS.map((cap) => (
              <button
                type="button"
                key={cap}
                onClick={() => setCapacity(cap)}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                  capacity === cap
                    ? 'bg-[#007d72] text-white'
                    : 'border border-[#d1d5db] bg-white text-[#4b5563] hover:bg-[#f3f4f6]'
                }`}
              >
                {cap} {cap === 1 ? 'Bed' : 'Beds'}
              </button>
            ))}
          </div>

          {/* Bed Layout Visual Preview */}
          <div className="mt-3 border-t border-[#e5e7eb] pt-2.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#9ca3af]">
              Generated Bed Layout Preview ({capacity} {capacity === 1 ? 'Bed' : 'Beds'})
            </span>
            <div className="mt-1.5 flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
              {Array.from({ length: capacity }, (_, i) => (
                <div
                  key={i}
                  className="flex items-center gap-1 rounded border border-[#d1fae5] bg-[#ecfdf5] px-2 py-1 text-[11px] font-medium text-[#065f46]"
                >
                  <BedDouble size={12} className="text-[#059669]" />
                  <span>Bed {String(i + 1).padStart(2, '0')}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Floor and Wing / Area Details */}
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-xs font-semibold text-[#374151]">
            <span className="flex items-center gap-1">
              <Building2 size={13} className="text-[#007d72]" /> Floor Level
            </span>
            <select
              value={FLOOR_PRESETS.includes(floor) ? floor : 'custom'}
              onChange={(e) => {
                if (e.target.value === 'custom') {
                  setFloor('Custom Floor');
                } else {
                  setFloor(e.target.value);
                  setCustomFloor('');
                }
              }}
              className="h-10 rounded-lg border border-[#d1d5db] bg-white px-3 text-sm text-[#111827] outline-none focus:border-[#007d72]"
            >
              {FLOOR_PRESETS.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
              <option value="custom">Other / Custom Floor...</option>
            </select>
            {(!FLOOR_PRESETS.includes(floor) || floor === 'Custom Floor') && (
              <input
                type="text"
                placeholder="Enter floor name..."
                value={customFloor}
                onChange={(e) => setCustomFloor(e.target.value)}
                className="mt-1 h-9 rounded-lg border border-[#d1d5db] bg-white px-3 text-xs text-[#111827] outline-none focus:border-[#007d72]"
              />
            )}
          </label>

          <label className="flex flex-col gap-1.5 text-xs font-semibold text-[#374151]">
            <span className="flex items-center gap-1">
              <MapPin size={13} className="text-[#007d72]" /> Wing / Department Area
            </span>
            <select
              value={AREA_PRESETS.includes(area) ? area : 'custom'}
              onChange={(e) => {
                if (e.target.value === 'custom') {
                  setArea('Custom Wing');
                } else {
                  setArea(e.target.value);
                  setCustomArea('');
                }
              }}
              className="h-10 rounded-lg border border-[#d1d5db] bg-white px-3 text-sm text-[#111827] outline-none focus:border-[#007d72]"
            >
              {AREA_PRESETS.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
              <option value="custom">Other / Custom Wing...</option>
            </select>
            {(!AREA_PRESETS.includes(area) || area === 'Custom Wing') && (
              <input
                type="text"
                placeholder="Enter wing or block..."
                value={customArea}
                onChange={(e) => setCustomArea(e.target.value)}
                className="mt-1 h-9 rounded-lg border border-[#d1d5db] bg-white px-3 text-xs text-[#111827] outline-none focus:border-[#007d72]"
              />
            )}
          </label>
        </div>
      </form>
    </Modal>
  );
}
