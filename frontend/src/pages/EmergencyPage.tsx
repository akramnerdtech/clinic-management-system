import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, AlertTriangle, BedDouble, CheckCircle2, ReceiptText, Search, Siren, UserRound } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { IconButton } from '@/components/ui/IconButton';
import { emergencyService } from '@/services/emergencyService';
import { doctorsService } from '@/services/doctorsService';
import { patientsService } from '@/services/patientsService';
import { useToast } from '@/utils/toast';
import type { Patient } from '@/types';
import type { EmergencyCase, EmergencyPriority } from '@/types/inpatient';

const inputClass = 'h-10 w-full rounded border border-[#dfe5e7] bg-white px-3 text-sm text-[#182236] outline-none focus:border-[#007d72]';
const labelClass = 'grid gap-1.5 text-xs font-semibold text-[#465166]';

function localDateTime(): string {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
}

function nextPatientId(patients: Patient[]): string {
  const largest = patients.reduce((current, patient) => {
    const number = Number.parseInt(patient[0].replace(/\D/g, ''), 10);
    return Number.isFinite(number) ? Math.max(current, number) : current;
  }, 0);
  return `PT-${String(largest + 1).padStart(5, '0')}`;
}

export function EmergencyPage() {
  const [patients, setPatients] = useState(() => patientsService.getPatients());
  const [cases, setCases] = useState(() => emergencyService.getCases());
  const [mode, setMode] = useState<'existing' | 'new'>('existing');
  const [query, setQuery] = useState('');
  const [patientId, setPatientId] = useState('');
  const [patientName, setPatientName] = useState('');
  const [mobile, setMobile] = useState('');
  const [ageSex, setAgeSex] = useState('');
  const [condition, setCondition] = useState('');
  const [priority, setPriority] = useState<EmergencyPriority>('URGENT');
  const [doctorId, setDoctorId] = useState('');
  const [arrivedAt, setArrivedAt] = useState(localDateTime);
  const [assessment, setAssessment] = useState('');
  const navigate = useNavigate();
  const toast = useToast();

  const refresh = useCallback(() => {
    setPatients(patientsService.getPatients());
    setCases(emergencyService.getCases());
  }, []);
  useEffect(() => {
    const eventNames = ['clinic-emergency-cases-updated', 'clinic-patients-updated', 'clinic-doctors-updated', 'clinic-admissions-updated', 'storage'];
    eventNames.forEach((name) => window.addEventListener(name, refresh));
    return () => eventNames.forEach((name) => window.removeEventListener(name, refresh));
  }, [refresh]);

  const filteredPatients = useMemo(() => {
    const search = query.trim().toLowerCase();
    return patients.filter((patient) => !search || `${patient[0]} ${patient[1]} ${patient[10] ?? ''}`.toLowerCase().includes(search));
  }, [patients, query]);
  const availableDoctors = doctorsService.getDoctors().filter((doctor) => doctor[4] !== 'OFF DUTY');
  const openCases = cases.filter((emergencyCase) => !['DISCHARGED', 'CLOSED'].includes(emergencyCase.status));

  const startEmergency = () => {
    try {
      if (!doctorId) throw new Error('Assign an active registered doctor before starting the case.');
      let patient = patients.find(([id]) => id === patientId);
      if (mode === 'new') {
        const name = patientName.trim();
        const normalizedMobile = mobile.replace(/\D/g, '');
        if (!name || !normalizedMobile || !condition.trim()) throw new Error('Name, mobile number, and presenting condition are required for emergency intake.');
        const duplicate = patients.find((item) => item[10]?.replace(/\D/g, '') === normalizedMobile);
        if (duplicate) throw new Error(`${duplicate[1]} already has this mobile number. Select the existing patient instead.`);
        const lastVisit = new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
        patient = [nextPatientId(patients), name, ageSex.trim() || '— / U', condition.trim(), '', lastVisit, '', '', '', new Date().toISOString().slice(0, 10), mobile.trim()];
        patientsService.addPatient(patient);
      }
      if (!patient) throw new Error('Select a registered patient.');
      const emergencyCase = emergencyService.startCase({
        patientId: patient[0],
        priority,
        assignedDoctorId: doctorId,
        arrivedAt: new Date(arrivedAt).toISOString(),
        assessment,
      });
      setPatientId(patient[0]);
      setMode('existing');
      setPatientName('');
      setMobile('');
      setCondition('');
      setQuery('');
      setAssessment('');
      toast.success(`${priority} case ${emergencyCase.id} started for ${patient[1]}.`);
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Emergency case could not be started.');
    }
  };

  const progressCase = (emergencyCase: EmergencyCase) => {
    try {
      emergencyService.transition(emergencyCase.id, 'TREATING');
      toast.success(`${emergencyCase.patientId} moved to emergency treatment.`);
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Case status could not be updated.');
    }
  };

  const dischargeCase = (emergencyCase: EmergencyCase) => {
    try {
      emergencyService.transition(emergencyCase.id, 'DISCHARGED', { dischargedAt: new Date().toISOString() });
      toast.success('Emergency visit completed. No inpatient room charge was created.');
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Emergency case could not be discharged.');
    }
  };

  const admitCase = (emergencyCase: EmergencyCase) => {
    navigate('/rooms/appoint', { state: {
      patientId: emergencyCase.patientId,
      admissionType: 'EMERGENCY',
      admittingDoctorId: emergencyCase.assignedDoctorId,
      emergencyCaseId: emergencyCase.id,
      arrivedAt: emergencyCase.arrivedAt,
    } });
  };

  const assignDoctor = (emergencyCase: EmergencyCase, nextDoctorId: string) => {
    try {
      emergencyService.assignDoctor(emergencyCase.id, nextDoctorId);
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Doctor could not be assigned.');
    }
  };

  return (
    <>
      <PageHeader eyebrow="PATIENT MANAGEMENT / TRIAGE" title="Emergency & Urgent Cases" description="Register urgent arrivals, assign a doctor immediately, treat, admit, or discharge without a routine appointment." actions={<span className="autosaved"><Siren size={13} /> {openCases.length} open cases</span>} />
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(360px,.9fr)]">
        <section className="content-card p-4 sm:p-5">
          <div className="mb-4 flex items-start justify-between gap-3"><div><h2 className="m-0 text-base font-semibold text-[#182236]">Start emergency case</h2><p className="mb-0 mt-1 text-xs text-[#687285]">Doctor assignment is required before the case starts.</p></div><AlertTriangle size={18} className="text-[#b42318]" /></div>
          <div className="mb-4 flex gap-1 border-b border-[#e8ebef]"><button type="button" className={`px-3 py-2 text-sm font-semibold ${mode === 'existing' ? 'border-b-2 border-[#007d72] text-[#007d72]' : 'text-[#687285]'}`} onClick={() => setMode('existing')}>Existing patient</button><button type="button" className={`px-3 py-2 text-sm font-semibold ${mode === 'new' ? 'border-b-2 border-[#007d72] text-[#007d72]' : 'text-[#687285]'}`} onClick={() => { setMode('new'); setPatientId(''); }}>New emergency patient</button></div>
          <div className="grid gap-3 sm:grid-cols-2">
            {mode === 'existing' ? <>
              <label className={`${labelClass} sm:col-span-2`}>Search patient
                <span className="flex h-10 items-center gap-2 rounded border border-[#dfe5e7] bg-white px-3"><Search size={14} className="text-[#687285]" /><input className="w-full bg-transparent text-sm font-normal outline-none" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name, patient ID, or mobile" /></span>
              </label>
              <label className={`${labelClass} sm:col-span-2`}>Patient
                <select className={inputClass} value={patientId} onChange={(event) => setPatientId(event.target.value)}><option value="">Select patient</option>{filteredPatients.map((patient) => <option key={patient[0]} value={patient[0]}>{patient[1]} · {patient[0]} · {patient[10] || 'No mobile'}</option>)}</select>
              </label>
            </> : <>
              <label className={labelClass}>Patient name<input className={inputClass} value={patientName} onChange={(event) => setPatientName(event.target.value)} /></label>
              <label className={labelClass}>Mobile number<input className={inputClass} type="tel" value={mobile} onChange={(event) => setMobile(event.target.value)} /></label>
              <label className={labelClass}>Age / sex<input className={inputClass} value={ageSex} onChange={(event) => setAgeSex(event.target.value)} placeholder="e.g. 42 / M" /></label>
              <label className={labelClass}>Presenting condition<input className={inputClass} value={condition} onChange={(event) => setCondition(event.target.value)} /></label>
            </>}
            <label className={labelClass}>Priority<select className={inputClass} value={priority} onChange={(event) => setPriority(event.target.value as EmergencyPriority)}><option value="URGENT">Urgent</option><option value="CRITICAL">Critical</option></select></label>
            <label className={labelClass}>Assign doctor<select className={inputClass} value={doctorId} onChange={(event) => setDoctorId(event.target.value)}><option value="">Select active registered doctor</option>{availableDoctors.map((doctor) => <option key={doctor[10]} value={doctor[10]}>{doctor[0]} · {doctor[1]}</option>)}</select></label>
            <label className={labelClass}>Arrival date and time<input className={inputClass} type="datetime-local" value={arrivedAt} onChange={(event) => setArrivedAt(event.target.value)} /></label>
            <label className={`${labelClass} sm:col-span-2`}>Initial assessment<textarea className="min-h-20 rounded border border-[#dfe5e7] bg-white p-3 text-sm outline-none focus:border-[#007d72]" value={assessment} onChange={(event) => setAssessment(event.target.value)} /></label>
          </div>
          <div className="mt-4 flex justify-end"><IconButton className="teal-button" onClick={startEmergency}><Activity size={14} /> Start Emergency Case</IconButton></div>
        </section>

        <section className="content-card overflow-hidden">
          <div className="flex items-center justify-between gap-2 border-b border-[#edf0f5] px-4 py-3 sm:px-5"><div><h2 className="m-0 text-base font-semibold text-[#182236]">Emergency queue</h2><p className="mb-0 mt-1 text-xs text-[#687285]">Appointments are not required for these cases.</p></div><span className="rounded border border-[#f1d0cf] bg-[#fff6f5] px-2 py-1 text-xs font-semibold text-[#b42318]">{openCases.length} open</span></div>
          {cases.length ? <div className="divide-y divide-[#edf0f5]">{cases.slice().sort((a, b) => b.arrivedAt.localeCompare(a.arrivedAt)).map((emergencyCase) => {
            const patient = patients.find(([id]) => id === emergencyCase.patientId);
            const doctor = doctorsService.getDoctors().find((item) => item[10] === emergencyCase.assignedDoctorId);
            const open = !['DISCHARGED', 'CLOSED', 'ADMITTED'].includes(emergencyCase.status);
            return <article className="p-4" key={emergencyCase.id}><div className="flex flex-wrap items-start justify-between gap-2"><div><b className="text-sm text-[#182236]">{patient?.[1] ?? emergencyCase.patientId}</b><small className="ml-2 text-xs text-[#687285]">{emergencyCase.patientId}</small><div className="mt-1 text-xs text-[#687285]">{new Date(emergencyCase.arrivedAt).toLocaleString()} · {emergencyCase.priority} · {emergencyCase.status.replaceAll('_', ' ')}</div><div className="mt-1 text-xs text-[#465166]">Doctor: {doctor?.[0] ?? 'Unassigned'}</div>{emergencyCase.assessment && <p className="mb-0 mt-2 text-xs text-[#687285]">{emergencyCase.assessment}</p>}</div><span className="rounded border border-[#f1d0cf] bg-[#fff6f5] px-2 py-1 text-[10px] font-bold text-[#b42318]">{emergencyCase.priority}</span></div>
              {open && <div className="mt-3 flex flex-wrap gap-2"><label className="flex items-center gap-2 text-[11px] text-[#687285]">Change doctor<select className="h-8 rounded border border-[#dfe5e7] bg-white px-2 text-xs" value={emergencyCase.assignedDoctorId} onChange={(event) => assignDoctor(emergencyCase, event.target.value)}>{availableDoctors.map((item) => <option key={item[10]} value={item[10]}>{item[0]}</option>)}</select></label>{emergencyCase.status === 'ASSESSING' && <button type="button" className="rounded border border-[#dfe5e7] px-2.5 py-1.5 text-xs font-semibold text-[#007d72]" onClick={() => progressCase(emergencyCase)}>Start treatment</button>}<button type="button" className="inline-flex items-center gap-1 rounded bg-[#007d72] px-2.5 py-1.5 text-xs font-semibold text-white" onClick={() => admitCase(emergencyCase)}><BedDouble size={13} /> Admit to ward</button>{emergencyCase.status !== 'ADMITTED' && <button type="button" className="rounded border border-[#dfe5e7] px-2.5 py-1.5 text-xs font-semibold text-[#465166]" onClick={() => dischargeCase(emergencyCase)}>Treat & discharge</button>}</div>}
              {emergencyCase.status === 'ADMITTED' && <p className="mb-0 mt-3 text-xs font-semibold text-[#08786e]">Linked admission: {emergencyCase.admissionId}</p>}
              <button type="button" className="mt-3 inline-flex items-center gap-1 rounded border border-[#dfe5e7] px-2.5 py-1.5 text-xs font-semibold text-[#007d72]" onClick={() => navigate(`/billing?patientId=${encodeURIComponent(emergencyCase.patientId)}&emergencyCaseId=${encodeURIComponent(emergencyCase.id)}`)}><ReceiptText size={13} /> Open emergency bill</button>
            </article>;
          })}</div> : <div className="px-4 py-10 text-center text-sm text-[#687285]">No emergency cases recorded.</div>}
        </section>
      </div>
    </>
  );
}
