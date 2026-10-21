import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowRightLeft, Clock3, UserRound } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { IconButton } from '@/components/ui/IconButton';
import { WARD_LABELS } from '@/data/rooms';
import { inpatientService } from '@/services/inpatientService';
import { patientsService } from '@/services/patientsService';
import type { RoomStay, WardType } from '@/types/rooms';

const wards: WardType[] = ['emergency', 'general', 'icu', 'private'];
const field = 'grid gap-1.5 text-[10px] font-semibold text-[#465166]';
const control = 'h-[34px] w-full rounded border border-[#e3e6ef] bg-[#f8f9fc] px-2.5 text-[11px] text-[#182236] outline-none focus:border-[#007d72]';
const bedLabel = (index: number) => `Bed ${String(index + 1).padStart(2, '0')}`;
function localNow() { const date = new Date(); date.setMinutes(date.getMinutes() - date.getTimezoneOffset()); return date.toISOString().slice(0, 16); }
function duration(start: string) { const ms = Math.max(0, Date.now() - new Date(start).getTime()); const days = Math.floor(ms / 86400000); const hours = Math.floor((ms % 86400000) / 3600000); return days ? `${days}d ${hours}h` : `${hours}h ${Math.floor((ms % 3600000) / 60000)}m`; }
function location(stay: RoomStay) { return `${WARD_LABELS[stay.wardType]} · Room ${stay.roomNumberSnapshot} · Bed ${stay.bedNumberSnapshot}`; }

function TransferModal({ stay, onClose, onDone }: { stay: RoomStay; onClose: () => void; onDone: () => void }) {
  const [ward, setWard] = useState<WardType>(wards.find((item) => item !== stay.wardType) ?? 'general');
  const [roomId, setRoomId] = useState('');
  const [bed, setBed] = useState('');
  const [at, setAt] = useState(localNow);
  const [pending, setPending] = useState(false);
  const toast = useToast();
  const rooms = useMemo(() => inpatientService.getAvailableRooms(ward), [ward]);
  const selectedRoom = roomId || rooms[0]?.id || '';
  const beds = useMemo(() => inpatientService.getAvailableBedIndexes(selectedRoom, ward), [selectedRoom, ward]);
  const selectedBed = bed === '' ? beds[0] : Number(bed);
  const submit = () => {
    if (pending) return;
    if (!selectedRoom || !Number.isInteger(selectedBed)) { toast.error('Select an available room and bed.'); return; }
    if (!window.confirm(`Confirm transfer of ${stay.patientNameSnapshot} to ${WARD_LABELS[ward]}, Room ${rooms.find((r) => r.id === selectedRoom)?.number}, ${bedLabel(selectedBed)}?`)) return;
    setPending(true);
    try {
      inpatientService.transferStay(stay.id, ward, selectedRoom, selectedBed, new Date(at).toISOString());
      toast.success('Patient transfer completed.'); onDone();
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Transfer failed.'); setPending(false); }
  };
  return <Modal title="Transfer Patient" subtitle={`${stay.patientNameSnapshot} · ${location(stay)}`} onClose={onClose} className="!max-w-[560px]" footer={<><IconButton className="h-[35px] border border-[#e3e5ed] bg-white text-[#253148]" onClick={onClose}>Cancel</IconButton><IconButton className="h-[35px] gap-1.5 bg-[#007d72] px-3.5 text-white" onClick={submit} disabled={pending}><ArrowRightLeft size={14}/>{pending ? 'Transferring…' : 'Confirm Transfer'}</IconButton></>}>
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <label className={field}>Destination ward<select className={control} value={ward} onChange={(e) => { setWard(e.target.value as WardType); setRoomId(''); setBed(''); }}>{wards.map((item) => <option key={item} value={item}>{WARD_LABELS[item]}</option>)}</select></label>
      <label className={field}>Available room<select className={control} value={selectedRoom} onChange={(e) => { setRoomId(e.target.value); setBed(''); }}><option value="">Select room</option>{rooms.map((room) => <option key={room.id} value={room.id}>Room {room.number}</option>)}</select></label>
      <label className={field}>Available bed<select className={control} value={Number.isInteger(selectedBed) ? selectedBed : ''} onChange={(e) => setBed(e.target.value)}><option value="">Select bed</option>{beds.map((index) => <option key={index} value={index}>{bedLabel(index)}</option>)}</select></label>
      <label className={field}>Transfer date and time<input className={control} type="datetime-local" value={at} max={localNow()} onChange={(e) => setAt(e.target.value)}/></label>
    </div>
    {!rooms.length && <p className="mb-0 mt-3 text-[11px] text-[#b42318]">No available beds in this ward. Choose another ward or free a bed first.</p>}
    <p className="mb-0 mt-3 text-[10px] text-[#687285]">The current bed is released and the new stay is recorded only after the transfer validates successfully.</p>
  </Modal>;
}

export function ActiveRoomStays() {
  const [stays, setStays] = useState<RoomStay[]>(() => inpatientService.getActiveStays());
  const [selected, setSelected] = useState<RoomStay | null>(null);
  const refresh = useCallback(() => setStays(inpatientService.getActiveStays()), []);
  useEffect(() => {
    window.addEventListener('clinic-room-stays-updated', refresh);
    window.addEventListener('clinic-patients-updated', refresh);
    window.addEventListener('storage', refresh);
    return () => { window.removeEventListener('clinic-room-stays-updated', refresh); window.removeEventListener('clinic-patients-updated', refresh); window.removeEventListener('storage', refresh); };
  }, [refresh]);
  const patientDetails = (id: string) => patientsService.getPatients().find(([patientId]) => patientId === id);
  return <section className="mb-4 overflow-hidden rounded-[5px] border border-[#ebedf2] bg-white">
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#edf0f5] px-4 py-3"><div><h2 className="m-0 text-sm font-semibold text-[#182236]">Active Inpatient & Emergency Stays</h2><p className="mb-0 mt-1 text-[10px] text-[#687285]">Registered patient records, current bed assignments, and transfer history.</p></div><span className="rounded border border-[#dceee9] bg-[#f4fbf9] px-2 py-1 text-[10px] font-semibold text-[#08786e]">{stays.length} admitted</span></div>
    {stays.length ? <div className="grid grid-cols-1 gap-3 p-3 md:grid-cols-2 xl:grid-cols-3">{stays.map((stay) => { const patient = patientDetails(stay.patientId); return <article key={stay.id} className="rounded border border-[#e8ebf0] p-3">
      <div className="flex items-start justify-between gap-2"><div className="flex min-w-0 items-center gap-2"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#e6f6f3] text-[#007d72]"><UserRound size={16}/></span><div className="min-w-0"><h3 className="m-0 truncate text-xs font-semibold text-[#182236]">{stay.patientNameSnapshot}</h3><p className="m-0 mt-0.5 text-[10px] text-[#687285]">Patient ID: {stay.patientId}</p></div></div><span className={`rounded border px-2 py-1 text-[9px] font-semibold ${stay.wardType === 'emergency' ? 'border-[#ffd0d3] bg-[#fff0f1] text-[#e4393d]' : 'border-[#dceee9] bg-[#f4fbf9] text-[#08786e]'}`}>{stay.wardType === 'emergency' ? 'EMERGENCY' : 'ADMITTED'}</span></div>
      <div className="mt-3 space-y-1.5 text-[10px] text-[#465166]"><p className="m-0"><b>Current location:</b> {location(stay)}</p><p className="m-0"><b>Admission / stay start:</b> {new Date(stay.startAt).toLocaleString()}</p><p className="m-0"><b>Stay duration:</b> <span className="inline-flex items-center gap-1"><Clock3 size={11}/>{duration(stay.startAt)}</span></p>{patient && <p className="m-0"><b>Patient details:</b> {patient[2] || 'Details not recorded'}{patient[3] ? ` · ${patient[3]}` : ''}</p>}</div>
      <button type="button" className="mt-3 inline-flex h-8 w-full items-center justify-center gap-1.5 rounded border border-[#007d72] bg-[#f0faf8] text-[10px] font-semibold text-[#007d72] hover:bg-[#e0f5f1]" onClick={() => setSelected(stay)}><ArrowRightLeft size={13}/> Transfer patient</button>
    </article>; })}</div> : <div className="px-4 py-8 text-center text-[11px] text-[#687285]">No active inpatient stays. Use the existing admission workflow to admit a registered patient.</div>}
    {selected && <TransferModal stay={selected} onClose={() => setSelected(null)} onDone={() => { setSelected(null); refresh(); }}/ >}
  </section>;
}
