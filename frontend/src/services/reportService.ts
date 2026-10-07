import { patientsService } from '@/services/patientsService';
import { appointmentsService } from '@/services/appointmentsService';
import { roomsService } from '@/services/roomsService';
import { billingService } from '@/services/billingService';
import { settingsService } from '@/services/settingsService';
import { WARD_LABELS } from '@/data/rooms';
import { formatDay, includesToday, inRange, keyFromValue } from '@/utils/reportRange';
import type { DateRange } from '@/utils/reportRange';

/**
 * Report datasets. Every row comes from records the app already holds, filtered by the chosen
 * dates. Nothing is invented: a record with no usable date is left out of date-filtered results
 * (and the report says how many were skipped), and an empty period yields `recordCount: 0`.
 * Building a report only reads data - it never writes or migrates anything.
 */

export type ReportModule = 'patients' | 'appointments' | 'rooms' | 'billing' | 'dashboard';

export type Cell = string | number;

export interface ReportSection {
  title: string;
  headers: string[];
  rows: Cell[][];
  /** Columns left out of the PDF (kept in the CSV) so wide tables stay readable. */
  pdfHide?: string[];
  /** Header names whose number cells are money, shown as INR in the PDF. */
  money?: string[];
}

export interface ReportDataset {
  module: ReportModule;
  title: string;
  /** Used in the file name, e.g. `Patients`. */
  slug: string;
  orientation: 'portrait' | 'landscape';
  /** Dated records found in the range. Zero means there is nothing to report. */
  recordCount: number;
  summary: [string, string][];
  sections: ReportSection[];
  notes: string[];
}

export interface ClinicIdentity {
  name: string;
  address: string;
}

export const MODULE_LABELS: Record<ReportModule, string> = {
  patients: 'Patients',
  appointments: 'Appointments',
  rooms: 'Rooms & Beds',
  billing: 'Billing',
  dashboard: 'Dashboard Summary',
};

// ---------- small helpers ----------

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
const titleCase = (value: string) => value.toLowerCase().replace(/(^|\s)(\w)/g, (_, a, b) => a + b.toUpperCase());
const humanize = (value: string) => titleCase(value.replace(/_/g, ' '));
const rupees = (paise: number) => Math.round(paise) / 100;
const inr = (paise: number) => `INR ${rupees(paise).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function formatMoment(value?: string | null): string {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return `${formatDay(keyFromValue(value))} ${parsed.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
}

function timeToMinutes(time: string): number {
  const match = time.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!match) return 0;
  let hours = Number(match[1]);
  if (match[3]) hours = (hours % 12) + (/pm/i.test(match[3]) ? 12 : 0);
  return hours * 60 + Number(match[2]);
}

export function getClinicIdentity(): ClinicIdentity {
  const fields = settingsService.getClinicIdentityFields();
  const find = (label: RegExp) => fields.find((f) => label.test(f.label))?.value?.trim() ?? '';
  return { name: find(/legal entity|clinic name/i) || 'CuraClinic', address: find(/address/i) };
}

// ---------- room stays (read-only) ----------

/** Same key `inpatientService` uses. Read directly because `getRoomStays()` migrates and writes data. */
const ROOM_STAYS_KEY = 'curaclinic.rooms.roomStays.v1';

interface StayRecord {
  id: string;
  patientNameSnapshot: string;
  roomId: string;
  roomNumberSnapshot: string;
  bedId: string;
  bedNumberSnapshot: string;
  wardType: string;
  startAt: string;
  endAt: string | null;
  status: string;
  ratePerDayPaise: number;
  legacyBillingExempt?: boolean;
}

function readStays(): StayRecord[] {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(ROOM_STAYS_KEY) ?? '[]');
    return Array.isArray(parsed) ? (parsed as StayRecord[]) : [];
  } catch {
    return [];
  }
}

/** Beds that were migrated from a name-only assignment carry the migration time, not a real admission time. */
const isLegacyStay = (stay: StayRecord) => stay.legacyBillingExempt === true || String(stay.id).startsWith('legacy-stay');

// ---------- collectors (one per kind of record) ----------

function collectPatients(range: DateRange) {
  const all = patientsService.getPatients();
  const inPeriod = all.filter((p) => inRange(keyFromValue(p[9]), range));
  return { inPeriod, undated: all.filter((p) => !keyFromValue(p[9])).length };
}

function collectAppointments(range: DateRange) {
  const all = appointmentsService.getEntries();
  const inPeriod = all
    .filter((e) => inRange(keyFromValue(e[11]), range))
    .sort((a, b) => keyFromValue(a[11]).localeCompare(keyFromValue(b[11])) || timeToMinutes(a[0]) - timeToMinutes(b[0]));
  return { inPeriod, undated: all.filter((e) => !keyFromValue(e[11])).length };
}

function collectStays(range: DateRange) {
  const stays = readStays();
  const real = stays.filter((s) => !isLegacyStay(s));
  const overlapping = real.filter((s) => {
    const start = keyFromValue(s.startAt);
    const end = keyFromValue(s.endAt);
    if (!start || start > range.end) return false;
    return s.endAt ? Boolean(end) && end >= range.start : true;
  });
  const admitted = real.filter((s) => inRange(keyFromValue(s.startAt), range)).length;
  const discharged = real.filter((s) => s.endAt && inRange(keyFromValue(s.endAt), range)).length;
  return { all: stays, overlapping, admitted, discharged };
}

function collectBilling(range: DateRange) {
  const invoices = billingService.getInvoices();
  const payments = billingService.getPayments();
  const invoiceDay = (i: (typeof invoices)[number]) => keyFromValue(i.finalizedAt ?? i.createdAt);
  const invoicesInPeriod = invoices.filter((i) => inRange(invoiceDay(i), range));
  const paymentsInPeriod = payments.filter((p) => inRange(keyFromValue(p.paidAt), range));
  const live = invoicesInPeriod.filter((i) => i.status !== 'CANCELLED');
  return {
    invoices,
    invoicesInPeriod,
    paymentsInPeriod,
    billed: live.reduce((sum, i) => sum + i.totalPaise, 0),
    outstanding: live.reduce((sum, i) => sum + i.balancePaise, 0),
    collected: paymentsInPeriod.reduce((sum, p) => sum + p.amountPaise, 0),
  };
}

// ---------- report builders ----------

function buildPatients(range: DateRange): ReportDataset {
  const { inPeriod, undated } = collectPatients(range);
  const notes = [`Patients are filtered by registration date.`];
  if (undated) notes.push(`${plural(undated, 'patient record')} without a registration date ${undated === 1 ? 'is' : 'are'} not included.`);
  return {
    module: 'patients',
    title: 'Patient Registrations',
    slug: 'Patients',
    orientation: 'landscape',
    recordCount: inPeriod.length,
    summary: [['Patients registered', String(inPeriod.length)]],
    sections: [{
      title: 'Registered patients',
      headers: ['ID', 'Name', 'Age/Sex', 'Condition', 'Recommended Test', 'Last Visit', 'Email', 'Blood Group', 'Registration Date'],
      rows: inPeriod.map((p) => [p[0], p[1], p[2], p[3], p[8] ?? '', p[5], p[6], p[7], p[9] ?? '']),
    }],
    notes,
  };
}

const APPOINTMENT_HEADERS = ['Appointment Date', 'Time', 'Slot', 'Token', 'Patient', 'Age/Sex', 'Complaint', 'Note', 'Doctor', 'Room', 'Visit Type', 'Status'];
const STATUS_ORDER = ['Confirmed', 'Waiting', 'In Consultation', 'Completed', 'Cancelled'];

function statusCounts(entries: ReturnType<typeof collectAppointments>['inPeriod']): [string, number][] {
  const counts = new Map<string, number>();
  entries.forEach((e) => counts.set(e[10], (counts.get(e[10]) ?? 0) + 1));
  const known = STATUS_ORDER.filter((s) => counts.has(s)).map((s) => [s, counts.get(s)!] as [string, number]);
  const other = [...counts].filter(([s]) => !STATUS_ORDER.includes(s));
  return [...known, ...other];
}

function buildAppointments(range: DateRange): ReportDataset {
  const { inPeriod, undated } = collectAppointments(range);
  const notes = ['Appointments are filtered by appointment date.'];
  if (undated) notes.push(`${plural(undated, 'appointment')} without a date ${undated === 1 ? 'is' : 'are'} not included.`);
  return {
    module: 'appointments',
    title: 'Appointments Report',
    slug: 'Appointments',
    orientation: 'landscape',
    recordCount: inPeriod.length,
    summary: [['Appointments', String(inPeriod.length)], ...statusCounts(inPeriod).map(([s, n]): [string, string] => [s, String(n)])],
    sections: [{
      title: 'Appointments',
      headers: APPOINTMENT_HEADERS,
      pdfHide: ['Slot', 'Note', 'Age/Sex'],
      rows: inPeriod.map((e) => [keyFromValue(e[11]), e[0], e[1], e[2], e[3], e[4], e[5], e[6], e[7], e[8], e[9], e[10]]),
    }],
    notes,
  };
}

const STAY_HEADERS = ['Room', 'Ward', 'Bed', 'Patient', 'Admitted', 'Discharged', 'Status', 'Rate Per Day (INR)'];
const BED_HEADERS = ['Room', 'Ward', 'Location', 'Bed', 'Status', 'Patient', 'Admitted', 'Rate Per Day (INR)'];

interface RoomLike {
  id: string;
  number: string;
  ward: string;
  floor: string;
  area: string;
  capacity: number;
  beds: (string | null)[];
  status?: string;
  inactiveBedIndexes?: number[];
}

function buildRooms(range: DateRange, now: Date): ReportDataset {
  const { all, overlapping } = collectStays(range);
  const rooms = roomsService.getRooms() as unknown as RoomLike[];
  const rates = roomsService.getRates();
  const rateFor = (ward: string) => rates.find((r) => r.ward === ward)?.perDay ?? '';
  const wardLabel = (ward: string) => WARD_LABELS[ward as keyof typeof WARD_LABELS] ?? ward;

  const stayRows: Cell[][] = overlapping
    .sort((a, b) => a.startAt.localeCompare(b.startAt))
    .map((s) => [
      `Room ${s.roomNumberSnapshot}`, wardLabel(s.wardType), `Bed ${s.bedNumberSnapshot}`, s.patientNameSnapshot,
      formatMoment(s.startAt), s.endAt ? formatMoment(s.endAt) : '', s.status === 'ACTIVE' ? 'Admitted' : 'Discharged',
      rupees(s.ratePerDayPaise),
    ]);

  // The current bed board is only meaningful for "now", so it is included only when the range covers today.
  const showBoard = includesToday(range, now);
  const activeByBed = new Map(all.filter((s) => s.status === 'ACTIVE').map((s) => [s.bedId, s]));
  const representedBeds = new Set(overlapping.filter((s) => s.status === 'ACTIVE').map((s) => s.bedId));
  let occupiedNotInStays = 0;
  let occupiedTotal = 0;
  let totalBeds = 0;
  const boardRows: Cell[][] = [];
  if (showBoard) {
    rooms.forEach((room) => {
      for (let i = 0; i < room.capacity; i += 1) {
        const bedId = `${room.id}:bed:${i + 1}`;
        const stay = activeByBed.get(bedId);
        const legacyName = room.beds[i];
        const outOfService = room.status === 'INACTIVE' || room.inactiveBedIndexes?.includes(i);
        const patient = stay?.patientNameSnapshot ?? legacyName ?? '';
        const occupied = Boolean(patient);
        totalBeds += 1;
        if (occupied) {
          occupiedTotal += 1;
          if (!representedBeds.has(bedId)) occupiedNotInStays += 1;
        }
        let admitted = '';
        if (stay) admitted = isLegacyStay(stay) ? 'Not recorded' : formatMoment(stay.startAt);
        else if (legacyName) admitted = 'Not recorded';
        boardRows.push([
          `Room ${room.number}`, wardLabel(room.ward), `${room.floor} • ${room.area}`, `Bed ${String(i + 1).padStart(2, '0')}`,
          occupied ? 'Occupied' : outOfService ? 'Out of service' : 'Available', patient, admitted, rateFor(room.ward),
        ]);
      }
    });
  }

  const recordCount = stayRows.length + occupiedNotInStays;
  const sections: ReportSection[] = [];
  if (stayRows.length) sections.push({ title: 'Bed stays in period', headers: STAY_HEADERS, rows: stayRows, money: ['Rate Per Day (INR)'] });
  if (showBoard && recordCount > 0) {
    sections.push({ title: `Bed status as of ${formatMoment(now.toISOString())}`, headers: BED_HEADERS, rows: boardRows, money: ['Rate Per Day (INR)'] });
  }

  const notes = ['Bed stays are listed when the stay overlapped the selected dates.'];
  if (showBoard) notes.push('Bed status reflects the current state of every bed at the time this report was generated.');
  if (showBoard && occupiedNotInStays) notes.push('Beds shown as "Not recorded" were assigned without an admission time, so they appear only in the current bed status.');
  return {
    module: 'rooms',
    title: 'Rooms & Beds Report',
    slug: 'Rooms-Beds',
    orientation: 'landscape',
    recordCount,
    summary: [
      ['Bed stays in period', String(stayRows.length)],
      ...(showBoard ? [['Beds occupied now', `${occupiedTotal} of ${totalBeds}`] as [string, string]] : []),
    ],
    sections,
    notes,
  };
}

function buildBilling(range: DateRange): ReportDataset {
  const b = collectBilling(range);
  const patientName = new Map(b.invoices.map((i) => [i.id, i.patientNameSnapshot]));
  const invoiceNo = new Map(b.invoices.map((i) => [i.id, i.invoiceNumber]));

  const sections: ReportSection[] = [];
  if (b.invoicesInPeriod.length) {
    sections.push({
      title: 'Invoices',
      headers: ['Invoice No', 'Date', 'Patient', 'Type', 'Status', 'Total (INR)', 'Paid (INR)', 'Balance (INR)'],
      money: ['Total (INR)', 'Paid (INR)', 'Balance (INR)'],
      rows: b.invoicesInPeriod.map((i) => [
        i.invoiceNumber, keyFromValue(i.finalizedAt ?? i.createdAt), i.patientNameSnapshot, i.billingType ?? '',
        humanize(i.status), rupees(i.totalPaise), rupees(i.paidPaise), rupees(i.balancePaise),
      ]),
    });
  }
  if (b.paymentsInPeriod.length) {
    sections.push({
      title: 'Payments received',
      headers: ['Received', 'Invoice No', 'Patient', 'Method', 'Amount (INR)', 'Reference', 'Received By'],
      money: ['Amount (INR)'],
      rows: b.paymentsInPeriod.map((p) => [
        formatMoment(p.paidAt), invoiceNo.get(p.invoiceId) ?? '', patientName.get(p.invoiceId) ?? p.patientId,
        humanize(p.method), rupees(p.amountPaise), p.reference ?? '', p.createdBy,
      ]),
    });
  }
  return {
    module: 'billing',
    title: 'Billing Report',
    slug: 'Billing',
    orientation: 'landscape',
    recordCount: b.invoicesInPeriod.length + b.paymentsInPeriod.length,
    summary: [
      ['Invoices', String(b.invoicesInPeriod.length)],
      ['Total billed', inr(b.billed)],
      ['Payments collected', inr(b.collected)],
      ['Outstanding on these invoices', inr(b.outstanding)],
    ],
    sections,
    notes: [
      'Invoices are dated by finalisation date (or creation date for bills not yet finalised). Payments are dated by when they were received.',
      'Cancelled invoices are listed but excluded from billed and outstanding totals; voided payments are excluded.',
    ],
  };
}

function buildDashboard(range: DateRange, now: Date): ReportDataset {
  const patients = collectPatients(range).inPeriod;
  const appts = collectAppointments(range).inPeriod;
  const stays = collectStays(range);
  const billing = collectBilling(range);
  const rooms = buildRooms(range, now);

  const active = appts.filter((e) => e[10] !== 'Cancelled').length;
  const byDoctor = new Map<string, number>();
  appts.filter((e) => e[10] !== 'Cancelled').forEach((e) => byDoctor.set(e[7], (byDoctor.get(e[7]) ?? 0) + 1));

  const metrics: [string, string][] = [
    ['Patients registered', String(patients.length)],
    ['Appointments (excluding cancelled)', String(active)],
    ['Bed admissions', String(stays.admitted)],
    ['Bed discharges', String(stays.discharged)],
    ...rooms.summary.filter(([label]) => label === 'Beds occupied now'),
    ['Invoices', String(billing.invoicesInPeriod.length)],
    ['Total billed', inr(billing.billed)],
    ['Payments collected', inr(billing.collected)],
  ];

  const sections: ReportSection[] = [{ title: 'Key metrics', headers: ['Metric', 'Value'], rows: metrics }];
  if (appts.length) sections.push({ title: 'Appointments by status', headers: ['Status', 'Appointments'], rows: statusCounts(appts) });
  if (byDoctor.size) {
    sections.push({
      title: 'Appointments by doctor',
      headers: ['Doctor', 'Appointments'],
      rows: [...byDoctor].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])),
    });
  }

  return {
    module: 'dashboard',
    title: 'Dashboard Summary',
    slug: 'Dashboard-Summary',
    orientation: 'portrait',
    recordCount: patients.length + appts.length + billing.invoicesInPeriod.length + billing.paymentsInPeriod.length + rooms.recordCount,
    summary: [],
    sections,
    notes: ['Figures are calculated from recorded patients, appointments, bed stays, invoices and payments in the selected period.'],
  };
}

/** Builds the dataset for one module and date range. */
export function buildReport(module: ReportModule, range: DateRange, now = new Date()): ReportDataset {
  switch (module) {
    case 'patients': return buildPatients(range);
    case 'appointments': return buildAppointments(range);
    case 'rooms': return buildRooms(range, now);
    case 'billing': return buildBilling(range);
    case 'dashboard': return buildDashboard(range, now);
  }
}