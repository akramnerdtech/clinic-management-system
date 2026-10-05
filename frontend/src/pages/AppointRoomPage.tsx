import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ArrowRightLeft, BedDouble, CheckCircle2, Clock3, LogOut, Search, UserRoundPlus } from 'lucide-react';
import { IconButton } from '@/components/ui/IconButton';
import { Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { inpatientService, getBedId } from '@/services/inpatientService';
import { patientsService } from '@/services/patientsService';
import { doctorsService } from '@/services/doctorsService';
import { appointmentsService } from '@/services/appointmentsService';
import { emergencyService } from '@/services/emergencyService';
import { billingService, calculateRoomCharges } from '@/services/billingService';
import { WARD_LABELS } from '@/data/rooms';
import { useToast } from '@/utils/toast';
import type { RoomStay, WardType } from '@/types/rooms';
import type { AdmissionType, EmergencyCase } from '@/types/inpatient';

const allotableWards: WardType[] = ['general', 'icu', 'private', 'emergency'];
const selectClass = 'h-10 w-full rounded border border-[#dfe5e7] bg-white px-3 text-sm text-[#182236] outline-none focus:border-[#007d72]';
const labelClass = 'grid gap-1.5 text-xs font-semibold text-[#465166]';
const inputClass = `${selectClass} font-normal`;
const money = (paise: number) => `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function currentLocalDateTime(): string {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
}

function localDateTimeToIso(value: string): string {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) throw new Error('Enter a valid date and time.');
  return date.toISOString();
}

function bedNumber(index: number): string {
  return String(index + 1).padStart(2, '0');
}

function stayLocation(stay: RoomStay): string {
  return `${WARD_LABELS[stay.wardType]} · Room ${stay.roomNumberSnapshot} · Bed ${stay.bedNumberSnapshot}`;
}

interface AdmissionHandoff {
  patientId?: string;
  admissionType?: AdmissionType;
  admittingDoctorId?: string;
  sourceAppointmentId?: string;
  emergencyCaseId?: string;
  arrivedAt?: string;
}

function TransferDialog({ stay, onClose, onTransferred }: {
  stay: RoomStay;
  onClose: () => void;
  onTransferred: () => void;
}) {
  const [wardType, setWardType] = useState<WardType>(allotableWards.find((ward) => ward !== stay.wardType) ?? 'general');
  const [roomId, setRoomId] = useState('');
  const [bedIndexValue, setBedIndexValue] = useState('');
  const [transferAt, setTransferAt] = useState(currentLocalDateTime);
  const [pending, setPending] = useState(false);
  const toast = useToast();
  const rooms = inpatientService.getAvailableRooms(wardType);
  const selectedRoomId = roomId || rooms[0]?.id || '';
  const beds = inpatientService.getAvailableBedIndexes(selectedRoomId, wardType);
  const bedIndex = bedIndexValue === '' ? beds[0] : Number(bedIndexValue);
  const ratePaise = inpatientService.getWardRatePaise(wardType);
  const preview = useMemo(() => {
    if (!transferAt || Number.isNaN(new Date(transferAt).getTime())) return null;
    const transferIso = new Date(transferAt).toISOString();
    const endMs = new Date(transferIso).getTime();
    const estimateTime = new Date(endMs + 60 * 60 * 1000);
    const oldSegment = { ...stay, endAt: transferIso, status: 'CLOSED' as const };
    const newSegment: RoomStay = {
      ...stay,
      id: 'transfer-preview',
      wardType,
      roomId: selectedRoomId,
      roomNumberSnapshot: rooms.find((room) => room.id === selectedRoomId)?.number ?? '—',
      bedId: Number.isInteger(bedIndex) ? getBedId(selectedRoomId, bedIndex) : '',
      bedNumberSnapshot: Number.isInteger(bedIndex) ? bedNumber(bedIndex) : '—',
      startAt: transferIso,
      endAt: null,
      status: 'ACTIVE',
      ratePerDayPaise: ratePaise,
    };
    return calculateRoomCharges([oldSegment, newSegment], billingService.getPolicy(), estimateTime);
  }, [stay, transferAt, wardType, selectedRoomId, rooms, bedIndex, ratePaise]);

  const submit = () => {
    if (pending) return;
    setPending(true);
    try {
      if (!Number.isInteger(bedIndex)) throw new Error('Select an available bed.');
      inpatientService.transferStay(stay.id, wardType, selectedRoomId, bedIndex, localDateTimeToIso(transferAt));
      toast.success(`Transferred ${stay.patientNameSnapshot} to ${WARD_LABELS[wardType]}.`);
      onTransferred();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Transfer could not be completed.');
      setPending(false);
    }
  };

  return (
    <Modal title="Transfer Ward" subtitle={stay.patientNameSnapshot} onClose={onClose} className="!max-w-[620px]" footer={<>
      <IconButton className="white-button" onClick={onClose}>Cancel</IconButton>
      <IconButton className="teal-button" onClick={submit}><ArrowRightLeft size={14} /> Confirm Transfer</IconButton>
    </>}>
      <div className="mb-4 rounded border border-[#e7ebef] bg-[#f8fafb] p-3 text-sm">
        <b>Current stay</b>
        <p className="mb-1 mt-1 text-[#465166]">{stayLocation(stay)}</p>
        <p className="m-0 text-[#687285]">{new Date(stay.startAt).toLocaleString()} · {money(stay.ratePerDayPaise)}/day</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className={labelClass}>New ward
          <select className={inputClass} value={wardType} onChange={(event) => { setWardType(event.target.value as WardType); setRoomId(''); setBedIndexValue(''); }}>
            {allotableWards.map((ward) => <option key={ward} value={ward}>{WARD_LABELS[ward]}</option>)}
          </select>
        </label>
        <label className={labelClass}>Available room
          <select className={inputClass} value={selectedRoomId} onChange={(event) => { setRoomId(event.target.value); setBedIndexValue(''); }}>
            {rooms.map((room) => <option key={room.id} value={room.id}>Room {room.number} · {inpatientService.getAvailableBedIndexes(room.id, wardType).length} beds available</option>)}
          </select>
        </label>
        <label className={labelClass}>Available bed
          <select className={inputClass} value={Number.isInteger(bedIndex) ? bedIndex : ''} onChange={(event) => setBedIndexValue(event.target.value)}>
            {beds.map((index) => <option key={index} value={index}>Bed {bedNumber(index)}</option>)}
          </select>
        </label>
        <label className={labelClass}>Transfer date and time
          <input className={inputClass} type="datetime-local" value={transferAt} onChange={(event) => setTransferAt(event.target.value)} />
        </label>
        <div className="rounded border border-[#e7ebef] p-3 text-sm sm:col-span-2">
          <b>New rate: {money(ratePaise)}/day</b>
          <p className="mb-0 mt-1 text-xs text-[#687285]">Preview includes the current segment through transfer and one provisional hour in the new segment. Each ward segment has its own minimum-day charge under the current policy.</p>
          {preview && <p className="mb-0 mt-2 font-semibold text-[#182236]">Projected transfer-segment total: {money(preview.totalPaise)}</p>}
        </div>
      </div>
      {rooms.length === 0 && <p className="mb-0 mt-3 text-sm text-[#b42318]">No available rooms in this ward.</p>}
    </Modal>
  );
}

function DischargeDialog({ stay, onClose, onDischarged }: {
  stay: RoomStay;
  onClose: () => void;
  onDischarged: () => void;
}) {
  const [dischargedAt, setDischargedAt] = useState(currentLocalDateTime);
  const toast = useToast();
  const bill = billingService.calculatePatientBill(stay.patientId, stay.admissionId);
  const submit = () => {
    try {
      billingService.finalizeBillAndDischarge(stay.patientId, stay.id, localDateTimeToIso(dischargedAt));
      toast.success(`${stay.patientNameSnapshot} discharged, final bill saved, and bed released.`);
      onDischarged();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Discharge could not be completed.');
    }
  };
  return (
    <Modal title="Discharge Patient" subtitle={`${stay.patientNameSnapshot} · ${stayLocation(stay)}`} onClose={onClose} footer={<>
      <IconButton className="white-button" onClick={onClose}>Cancel</IconButton>
      <IconButton className="teal-button" onClick={submit}><LogOut size={14} /> Discharge</IconButton>
    </>}>
      <label className={labelClass}>Discharge date and time
        <input className={inputClass} type="datetime-local" value={dischargedAt} onChange={(event) => setDischargedAt(event.target.value)} />
      </label>
      <dl className="mb-0 mt-3 grid grid-cols-2 gap-2 rounded border border-[#e8ebef] bg-[#f8fafb] p-3 text-xs"><dt className="text-[#687285]">Current bill</dt><dd className="m-0 text-right font-semibold">{money(bill.totalPaise)}</dd><dt className="text-[#687285]">Paid</dt><dd className="m-0 text-right">{money(bill.paidPaise)}</dd><dt className="text-[#687285]">Balance due</dt><dd className="m-0 text-right font-semibold">{money(bill.balancePaise)}</dd></dl>
      <p className="mb-0 mt-3 text-xs text-[#687285]">The stay and admission close only after the final bill snapshot saves successfully.</p>
    </Modal>
  );
}

export function AppointRoomPage() {
  const location = useLocation();
  const handoff = location.state as AdmissionHandoff | null;
  const [patients, setPatients] = useState(() => patientsService.getPatients());
  const [activeStays, setActiveStays] = useState(() => inpatientService.getActiveStays());
  const [allStays, setAllStays] = useState(() => inpatientService.getRoomStays());
  const [patientQuery, setPatientQuery] = useState('');
  const [patientId, setPatientId] = useState(handoff?.patientId ?? '');
  const [admissionType, setAdmissionType] = useState<AdmissionType>(handoff?.admissionType ?? 'DIRECT_IPD');
  const [admittingDoctorId, setAdmittingDoctorId] = useState(handoff?.admittingDoctorId ?? '');
  const [sourceAppointmentId, setSourceAppointmentId] = useState(handoff?.sourceAppointmentId ?? '');
  const [emergencyCaseId, setEmergencyCaseId] = useState(handoff?.emergencyCaseId ?? '');
  const [wardType, setWardType] = useState<WardType>('general');
  const [roomId, setRoomId] = useState('');
  const [bedIndexValue, setBedIndexValue] = useState('');
  const [startAt, setStartAt] = useState(handoff?.arrivedAt ? handoff.arrivedAt.slice(0, 16) : currentLocalDateTime);
  const [pending, setPending] = useState(false);
  const [transferStay, setTransferStay] = useState<RoomStay | null>(null);
  const [dischargeStay, setDischargeStay] = useState<RoomStay | null>(null);
  const toast = useToast();
  const refresh = useCallback(() => {
    setPatients(patientsService.getPatients());
    setActiveStays(inpatientService.getActiveStays());
    setAllStays(inpatientService.getRoomStays());
  }, []);
  useEffect(() => {
    window.addEventListener('clinic-room-stays-updated', refresh);
    window.addEventListener('clinic-patients-updated', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('clinic-room-stays-updated', refresh);
      window.removeEventListener('clinic-patients-updated', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, [refresh]);

  const rooms = inpatientService.getAvailableRooms(wardType);
  const selectedRoomId = roomId || rooms[0]?.id || '';
  const availableBeds = inpatientService.getAvailableBedIndexes(selectedRoomId, wardType);
  const bedIndex = bedIndexValue === '' ? availableBeds[0] : Number(bedIndexValue);
  const selectedPatient = patients.find(([id]) => id === patientId);
  const availableDoctors = doctorsService.getDoctors().filter((doctor) => doctor[4] !== 'OFF DUTY');
  const patientAppointments = patientId ? appointmentsService.getEntries().filter((entry) => entry[13] === patientId && !['CANCELLED', 'NO_SHOW'].includes(entry[10])) : [];
  const patientEmergencyCases = patientId ? emergencyService.getCasesForPatient(patientId).filter((item) => !['DISCHARGED', 'CLOSED', 'ADMITTED'].includes(item.status)) : [];
  const rates = inpatientService.getRates();
  const ratePaise = inpatientService.getWardRatePaise(wardType);
  const filteredPatients = useMemo(() => {
    const query = patientQuery.trim().toLowerCase();
    const admitted = new Set(activeStays.map((stay) => stay.patientId));
    return patients.filter((patient) =>
      (!query || `${patient[0]} ${patient[1]}`.toLowerCase().includes(query))
      && (!admitted.has(patient[0]) || patient[0] === patientId),
    );
  }, [patients, activeStays, patientQuery, patientId]);

  const submitAllotment = () => {
    if (pending) return;
    setPending(true);
    try {
      if (!selectedPatient) throw new Error('Select a registered patient.');
      if (!selectedRoomId) throw new Error('Select an available room.');
      if (!Number.isInteger(bedIndex)) throw new Error('Select an available bed.');
      const stay = inpatientService.createAllotment(patientId, wardType, selectedRoomId, bedIndex, localDateTimeToIso(startAt), {
        admissionType,
        admittingDoctorId,
        sourceAppointmentId: admissionType === 'OPD_TO_IPD' ? sourceAppointmentId : undefined,
        emergencyCaseId: admissionType === 'EMERGENCY' ? emergencyCaseId : undefined,
      });
      toast.success(`${selectedPatient[1]} allotted to Room ${stay.roomNumberSnapshot}, Bed ${stay.bedNumberSnapshot}.`);
      setPatientId('');
      setAdmissionType('DIRECT_IPD');
      setAdmittingDoctorId('');
      setSourceAppointmentId('');
      setEmergencyCaseId('');
      setPatientQuery('');
      setRoomId('');
      setBedIndexValue('');
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Room allotment could not be completed.');
    } finally {
      setPending(false);
    }
  };

  const patientHistory = selectedPatient ? allStays.filter((stay) => stay.patientId === selectedPatient[0]) : allStays;

  return (
    <>
      <PageHeader
        eyebrow="PATIENT MANAGEMENT / INPATIENTS"
        title="Appoint Room"
        description="Allot beds, transfer patients between wards, and preserve every room-stay segment."
        actions={<span className="autosaved"><BedDouble size={13} /> {activeStays.length} active stays</span>}
      />
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(330px,.9fr)]">
        <section className="content-card p-4 sm:p-5">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 className="m-0 text-base font-semibold text-[#182236]">New room allotment</h2>
              <p className="mb-0 mt-1 text-xs text-[#687285]">Choose a registered patient and an active available bed.</p>
            </div>
            <UserRoundPlus size={18} className="text-[#007d72]" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={`${labelClass} sm:col-span-2`}>Patient search
              <span className="flex h-10 items-center gap-2 rounded border border-[#dfe5e7] bg-white px-3 focus-within:border-[#007d72]">
                <Search size={14} className="text-[#687285]" />
                <input className="w-full bg-transparent text-sm font-normal outline-none" value={patientQuery} onChange={(event) => setPatientQuery(event.target.value)} placeholder="Search by patient name or ID" />
              </span>
            </label>
            <label className={`${labelClass} sm:col-span-2`}>Patient
              <select className={inputClass} value={patientId} onChange={(event) => { setPatientId(event.target.value); setSourceAppointmentId(''); setEmergencyCaseId(''); setAdmittingDoctorId(''); }}>
                <option value="">Select a registered patient</option>
                {filteredPatients.map((patient) => <option key={patient[0]} value={patient[0]}>{patient[1]} · {patient[0]} · {patient[2]}</option>)}
              </select>
              {!filteredPatients.length && <small className="font-normal text-[#687285]">No eligible patient matches this search.</small>}
            </label>
            <label className={labelClass}>Admission pathway
              <select className={inputClass} value={admissionType} onChange={(event) => { setAdmissionType(event.target.value as AdmissionType); setSourceAppointmentId(''); setEmergencyCaseId(''); }}>
                <option value="DIRECT_IPD">Direct inpatient</option>
                <option value="OPD_TO_IPD">Convert OPD visit to inpatient</option>
                <option value="EMERGENCY">Emergency admission</option>
              </select>
            </label>
            <label className={labelClass}>Responsible doctor
              <select className={inputClass} value={admittingDoctorId} onChange={(event) => setAdmittingDoctorId(event.target.value)}>
                <option value="">Select registered doctor</option>
                {availableDoctors.map((doctor) => <option key={doctor[10]} value={doctor[10]}>{doctor[0]} · {doctor[1]}</option>)}
              </select>
            </label>
            {admissionType === 'OPD_TO_IPD' && <label className={labelClass}>Source outpatient visit
              <select className={inputClass} value={sourceAppointmentId} onChange={(event) => { setSourceAppointmentId(event.target.value); const visit = patientAppointments.find((entry) => entry[2] === event.target.value); if (visit?.[14]) setAdmittingDoctorId(visit[14]); }}>
                <option value="">Select this patient's visit</option>
                {patientAppointments.map((entry) => <option key={entry[2]} value={entry[2]}>{new Date(entry[11] ?? '').toLocaleString()} · {entry[7]} · {entry[5]}</option>)}
              </select>
            </label>}
            {admissionType === 'EMERGENCY' && <label className={labelClass}>Emergency case
              <select className={inputClass} value={emergencyCaseId} onChange={(event) => { setEmergencyCaseId(event.target.value); const emergency = patientEmergencyCases.find((item) => item.id === event.target.value); if (emergency) setAdmittingDoctorId(emergency.assignedDoctorId); }}>
                <option value="">Select this patient's active emergency case</option>
                {patientEmergencyCases.map((item) => <option key={item.id} value={item.id}>{item.priority} · {new Date(item.arrivedAt).toLocaleString()} · {item.status}</option>)}
              </select>
            </label>}
            <label className={labelClass}>Ward type
              <select className={inputClass} value={wardType} onChange={(event) => { setWardType(event.target.value as WardType); setRoomId(''); setBedIndexValue(''); }}>
                {allotableWards.map((ward) => <option key={ward} value={ward}>{WARD_LABELS[ward]}</option>)}
              </select>
            </label>
            <label className={labelClass}>Available room
              <select className={inputClass} value={selectedRoomId} onChange={(event) => { setRoomId(event.target.value); setBedIndexValue(''); }}>
                {rooms.map((room) => <option key={room.id} value={room.id}>Room {room.number} · {inpatientService.getAvailableBedIndexes(room.id, wardType).length} beds available</option>)}
              </select>
              {!rooms.length && <small className="font-normal text-[#b42318]">No active rooms with available beds in this ward.</small>}
            </label>
            <label className={labelClass}>Available bed
              <select className={inputClass} value={Number.isInteger(bedIndex) ? bedIndex : ''} onChange={(event) => setBedIndexValue(event.target.value)}>
                {availableBeds.map((index) => <option key={index} value={index}>Bed {bedNumber(index)}</option>)}
              </select>
            </label>
            <label className={labelClass}>Admission date and time
              <input className={inputClass} type="datetime-local" value={startAt} onChange={(event) => setStartAt(event.target.value)} />
            </label>
          </div>
          <div className="mt-4 rounded border border-[#dceee9] bg-[#f4fbf9] p-3.5">
            <h3 className="m-0 text-sm font-semibold text-[#182236]">Allotment summary</h3>
            <dl className="mb-0 mt-2 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
              <dt className="text-[#687285]">Patient</dt><dd className="m-0 text-right font-semibold text-[#182236]">{selectedPatient ? `${selectedPatient[1]} (${selectedPatient[0]})` : 'Select patient'}</dd>
              <dt className="text-[#687285]">Ward / room / bed</dt><dd className="m-0 text-right font-semibold text-[#182236]">{selectedRoomId ? `${WARD_LABELS[wardType]} · ${rooms.find((room) => room.id === selectedRoomId)?.number ?? '—'} · ${Number.isInteger(bedIndex) ? bedNumber(bedIndex) : 'Select bed'}` : 'Select room and bed'}</dd>
              <dt className="text-[#687285]">Admission</dt><dd className="m-0 text-right font-semibold text-[#182236]">{startAt ? new Date(startAt).toLocaleString() : 'Choose date and time'}</dd>
              <dt className="text-[#687285]">Daily rate</dt><dd className="m-0 text-right font-semibold text-[#182236]">{money(ratePaise)}/day</dd>
            </dl>
          </div>
          <div className="mt-4 flex justify-end">
            <IconButton className="teal-button" onClick={submitAllotment}><CheckCircle2 size={14} /> {pending ? 'Confirming…' : 'Confirm Allotment'}</IconButton>
          </div>
        </section>

        <section className="content-card p-4 sm:p-5">
          <div className="mb-3 flex items-start justify-between">
            <div><h2 className="m-0 text-base font-semibold text-[#182236]">Ward rates</h2><p className="mb-0 mt-1 text-xs text-[#687285]">Rate is snapshotted when each stay begins.</p></div>
            <Clock3 size={17} className="text-[#687285]" />
          </div>
          <div className="grid gap-2 sm:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3">
            {rates.filter((rate) => allotableWards.includes(rate.ward)).map((rate) => <div key={rate.ward} className="flex items-center justify-between rounded border border-[#e8ebef] px-3 py-2 text-sm"><span>{WARD_LABELS[rate.ward]}</span><b>{money(Math.round(rate.perDay * 100))}/day</b></div>)}
          </div>
        </section>
      </div>

      <section className="content-card mt-4 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#edf0f5] px-4 py-3 sm:px-5">
          <div><h2 className="m-0 text-base font-semibold text-[#182236]">Active allotments</h2><p className="mb-0 mt-1 text-xs text-[#687285]">One active inpatient stay per patient.</p></div>
          <span className="rounded border border-[#dceee9] bg-[#f4fbf9] px-2 py-1 text-xs font-semibold text-[#08786e]">{activeStays.length} active</span>
        </div>
        {activeStays.length ? <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-[#f8fafb] text-xs text-[#687285]"><tr><th className="px-4 py-3">Patient</th><th className="px-4 py-3">Ward / Room / Bed</th><th className="px-4 py-3">Started</th><th className="px-4 py-3">Rate / day</th><th className="px-4 py-3">Actions</th></tr></thead><tbody>{activeStays.map((stay) => <tr className="border-t border-[#edf0f5]" key={stay.id}><td className="px-4 py-3"><b>{stay.patientNameSnapshot}</b><small className="block text-xs text-[#687285]">{stay.patientId}</small></td><td className="px-4 py-3">{stayLocation(stay)}</td><td className="px-4 py-3">{new Date(stay.startAt).toLocaleString()}</td><td className="px-4 py-3">{money(stay.ratePerDayPaise)}</td><td className="px-4 py-3"><div className="flex gap-2"><button type="button" className="inline-flex items-center gap-1 rounded border border-[#dfe5e7] px-2 py-1.5 text-xs font-semibold text-[#007d72]" onClick={() => setTransferStay(stay)}><ArrowRightLeft size={13} /> Transfer</button><button type="button" className="inline-flex items-center gap-1 rounded border border-[#eadede] px-2 py-1.5 text-xs font-semibold text-[#b42318]" onClick={() => setDischargeStay(stay)}><LogOut size={13} /> Discharge</button></div></td></tr>)}</tbody></table></div> : <div className="px-4 py-9 text-center text-sm text-[#687285]">No active room allotments.</div>}
      </section>

      <section className="content-card mt-4 overflow-hidden">
        <div className="border-b border-[#edf0f5] px-4 py-3 sm:px-5"><h2 className="m-0 text-base font-semibold text-[#182236]">Room-stay history</h2><p className="mb-0 mt-1 text-xs text-[#687285]">Closed ward segments remain available for billing and audit.</p></div>
        {patientHistory.length ? <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead className="bg-[#f8fafb] text-xs text-[#687285]"><tr><th className="px-4 py-3">Patient</th><th className="px-4 py-3">Ward / Room / Bed</th><th className="px-4 py-3">Start</th><th className="px-4 py-3">End</th><th className="px-4 py-3">Rate snapshot</th><th className="px-4 py-3">Status</th></tr></thead><tbody>{patientHistory.slice().sort((a, b) => b.startAt.localeCompare(a.startAt)).map((stay) => <tr className="border-t border-[#edf0f5]" key={stay.id}><td className="px-4 py-3">{stay.patientNameSnapshot}<small className="block text-xs text-[#687285]">{stay.patientId}</small></td><td className="px-4 py-3">{stayLocation(stay)}</td><td className="px-4 py-3">{new Date(stay.startAt).toLocaleString()}</td><td className="px-4 py-3">{stay.endAt ? new Date(stay.endAt).toLocaleString() : '—'}</td><td className="px-4 py-3">{money(stay.ratePerDayPaise)}/day</td><td className="px-4 py-3">{stay.status}{stay.legacyBillingExempt ? ' · Legacy, billing excluded' : ''}</td></tr>)}</tbody></table></div> : <div className="px-4 py-9 text-center text-sm text-[#687285]">No room-stay history{selectedPatient ? ` for ${selectedPatient[1]}` : ''}.</div>}
      </section>

      {transferStay && <TransferDialog stay={transferStay} onClose={() => setTransferStay(null)} onTransferred={() => { setTransferStay(null); refresh(); }} />}
      {dischargeStay && <DischargeDialog stay={dischargeStay} onClose={() => setDischargeStay(null)} onDischarged={() => { setDischargeStay(null); refresh(); }} />}
    </>
  );
}
