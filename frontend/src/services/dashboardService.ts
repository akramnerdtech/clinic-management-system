import {
  CalendarDays,
  Users,
  Stethoscope,
  Banknote,
  Clock3,
  Activity,
  ShieldCheck,
} from 'lucide-react';
import { appointmentsService } from '@/services/appointmentsService';
import { doctorsService } from '@/services/doctorsService';
import { patientsService } from '@/services/patientsService';
import { billingService } from '@/services/billingService';
import { inpatientService } from '@/services/inpatientService';
import type { AppointmentRow, MetricConfig, TrafficPoint, ActivityItem } from '@/types';

function toDateKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function normalizeDate(value?: string): string {
  if (!value) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '' : toDateKey(parsed);
}

export function getWeekBoundaries(): {
  start: Date;
  end: Date;
  days: { name: string; iso: string; date: Date }[];
} {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const day = now.getDay();
  const diffToMonday = (day + 6) % 7;
  const start = new Date(now);
  start.setDate(now.getDate() - diffToMonday);

  const days: { name: string; iso: string; date: Date }[] = [];
  const dayNames = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const dayStr = String(d.getDate()).padStart(2, '0');
    days.push({
      name: dayNames[i],
      iso: `${year}-${month}-${dayStr}`,
      date: d,
    });
  }

  const end = new Date(start);
  end.setDate(start.getDate() + 7);

  return { start, end, days };
}

export const dashboardService = {
  getMetrics(): MetricConfig[] {
    const entries = appointmentsService.getEntries();
    const { days } = getWeekBoundaries();
    const weekIsoSet = new Set(days.map((d) => d.iso));
    const today = toDateKey(new Date());

    const weeklyEntries = entries.filter((entry) => {
      const status = (entry[10] || '').trim().toLowerCase();
      if (status === 'cancelled' || status.includes('cancel')) return false;
      const apptDate = normalizeDate(entry[11]) || normalizeDate(entry[15]);
      return apptDate ? weekIsoSet.has(apptDate) : false;
    });

    const todayEntries = entries.filter((entry) => {
      const status = (entry[10] || '').trim().toLowerCase();
      if (status === 'cancelled' || status.includes('cancel')) return false;
      const apptDate = normalizeDate(entry[11]) || normalizeDate(entry[15]);
      return apptDate === today;
    });

    const patients = patientsService.getPatients();
    const doctors = doctorsService.getDoctors();
    const onDutyCount = doctors.filter((doctor) => doctor[4] === 'ON DUTY').length;

    // Real weekly revenue from payments settled this week
    const payments = billingService.getPayments();
    const weeklyPayments = payments.filter((p) => {
      const pDate = new Date(p.paidAt);
      if (Number.isNaN(pDate.getTime())) return false;
      const pIso = toDateKey(pDate);
      return weekIsoSet.has(pIso);
    });
    const weeklyRevenuePaise = weeklyPayments.reduce((acc, p) => acc + (p.amountPaise || 0), 0);

    const waitingToday = todayEntries.filter((e) => {
      const s = (e[10] || '').trim();
      return s === 'Waiting' || s === 'Slot Booked';
    });

    const inrFormatter = new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    });

    return [
      {
        label: 'APPOINTMENTS THIS WEEK',
        value: String(weeklyEntries.length),
        note: todayEntries.length === 1 ? '1 scheduled today · Mon–Sun' : `${todayEntries.length} scheduled today · Mon–Sun`,
        color: 'green',
        icon: CalendarDays,
      },
      {
        label: 'TOTAL PATIENTS',
        value: String(patients.length),
        note: `${weeklyEntries.length} active visit${weeklyEntries.length === 1 ? '' : 's'} this week`,
        color: 'blue',
        icon: Users,
      },
      {
        label: 'DOCTORS ON DUTY',
        value: `${onDutyCount} / ${doctors.length}`,
        note: `${onDutyCount} active on shift today`,
        icon: Stethoscope,
      },
      {
        label: 'WEEKLY REVENUE',
        value: inrFormatter.format(weeklyRevenuePaise / 100),
        note: `${weeklyPayments.length} settled receipt${weeklyPayments.length === 1 ? '' : 's'} this week`,
        color: 'green',
        icon: Banknote,
      },
      {
        label: 'WAITING QUEUE',
        value: String(waitingToday.length),
        note: waitingToday.length > 0 ? `Avg wait: ~12 mins` : 'Queue currently clear',
        color: 'blue',
        icon: Clock3,
      },
    ];
  },

  getTabs(): string[] {
    const entries = appointmentsService.getEntries();
    const { days } = getWeekBoundaries();
    const weekIsoSet = new Set(days.map((d) => d.iso));
    const today = toDateKey(new Date());

    const weeklyEntries = entries.filter((entry) => {
      const status = (entry[10] || '').trim().toLowerCase();
      if (status === 'cancelled' || status.includes('cancel')) return false;
      const apptDate = normalizeDate(entry[11]) || normalizeDate(entry[15]);
      return apptDate ? weekIsoSet.has(apptDate) : false;
    });

    const todayEntries = entries.filter((entry) => {
      const status = (entry[10] || '').trim().toLowerCase();
      if (status === 'cancelled' || status.includes('cancel')) return false;
      const apptDate = normalizeDate(entry[11]) || normalizeDate(entry[15]);
      return apptDate === today;
    });

    const waiting = todayEntries.filter((e) => {
      const s = (e[10] || '').trim();
      return s === 'Waiting' || s === 'Slot Booked';
    });

    const inConsult = todayEntries.filter((e) => (e[10] || '').trim() === 'In Consultation');
    const completed = weeklyEntries.filter((e) => (e[10] || '').toLowerCase().includes('completed'));

    return [
      `This Week (${weeklyEntries.length})`,
      `Today (${todayEntries.length})`,
      `Waiting (${waiting.length})`,
      `In Consultation (${inConsult.length})`,
      `Completed (${completed.length})`,
    ];
  },

  getAppointmentRows(tab?: string): AppointmentRow[] {
    const entries = appointmentsService.getEntries();
    const { days } = getWeekBoundaries();
    const weekIsoSet = new Set(days.map((d) => d.iso));
    const today = toDateKey(new Date());

    let filtered = entries.filter((entry) => {
      const status = (entry[10] || '').trim().toLowerCase();
      return status !== 'cancelled' && !status.includes('cancel');
    });

    if (tab) {
      if (tab.startsWith('Today')) {
        filtered = filtered.filter((e) => {
          const apptDate = normalizeDate(e[11]) || normalizeDate(e[15]);
          return apptDate === today;
        });
      } else if (tab.startsWith('Waiting')) {
        filtered = filtered.filter((e) => {
          const s = (e[10] || '').trim();
          return s === 'Waiting' || s === 'Slot Booked' || s.toLowerCase().includes('wait');
        });
      } else if (tab.startsWith('In Consultation')) {
        filtered = filtered.filter((e) => (e[10] || '').trim() === 'In Consultation');
      } else if (tab.startsWith('Completed')) {
        filtered = filtered.filter((e) => (e[10] || '').toLowerCase().includes('completed'));
      } else {
        // Default: This Week
        filtered = filtered.filter((entry) => {
          const apptDate = normalizeDate(entry[11]) || normalizeDate(entry[15]);
          return apptDate ? weekIsoSet.has(apptDate) : false;
        });
      }
    } else {
      // Default: This Week
      filtered = filtered.filter((entry) => {
        const apptDate = normalizeDate(entry[11]) || normalizeDate(entry[15]);
        return apptDate ? weekIsoSet.has(apptDate) : false;
      });
    }

    return filtered.map((e) => [
      e[0],
      e[3],
      e[4] || 'Adult',
      `${e[7] || 'Doctor'} · ${e[8] || 'Suite 105'}`,
      e[5] || 'Routine Consult',
    ]);
  },

  getTrafficPoints(): TrafficPoint[] {
    const entries = appointmentsService.getEntries();
    const { days } = getWeekBoundaries();

    return days.map((day) => {
      const count = entries.filter((e) => {
        const status = (e[10] || '').trim().toLowerCase();
        if (status === 'cancelled' || status.includes('cancel')) return false;
        const apptDate = normalizeDate(e[11]) || normalizeDate(e[15]);
        return apptDate === day.iso;
      }).length;

      return {
        hour: day.name,
        value: count,
      };
    });
  },

  getActivityItems(): ActivityItem[] {
    const items: ActivityItem[] = [];
    const appointments = appointmentsService.getEntries().filter((e) => e[10] !== 'Cancelled');
    const payments = billingService.getPayments();
    const stays = inpatientService.getRoomStays();
    const doctors = doctorsService.getDoctors();

    // 1. Latest booked appointments
    appointments.slice(0, 2).forEach((appt) => {
      items.push({
        text: `Appointment for ${appt[3]} with ${appt[7]} (${appt[0]})`,
        meta: `${appt[11] || 'Today'} • Scheduled slot`,
      });
    });

    // 2. Recent payments
    payments.slice(0, 2).forEach((p) => {
      const amt = (p.amountPaise / 100).toFixed(2);
      items.push({
        text: `Payment of ₹${amt} settled via ${p.method}`,
        meta: `${new Date(p.paidAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • Receipt logged`,
      });
    });

    // 3. Active inpatient admission
    const activeStay = stays.find((s) => s.status === 'ADMITTED');
    if (activeStay) {
      items.push({
        text: `Inpatient admitted in ${activeStay.wardType} (Room ${activeStay.roomNumber})`,
        meta: `Active room stay`,
      });
    }

    // 4. Doctors on duty
    const onDuty = doctors.filter((d) => d[4] === 'ON DUTY');
    if (onDuty.length > 0) {
      items.push({
        text: `${onDuty[0][0]} (${onDuty[0][1]}) on duty`,
        meta: `Station: ${onDuty[0][2]}`,
      });
    }

    if (items.length === 0) {
      items.push({
        text: 'Clinical operations live. System ready for patient appointments.',
        meta: 'Central Clinic Telemetry',
      });
    }

    return items.slice(0, 4);
  },

  getActivityIcons() {
    return [CalendarDays, Banknote, Activity, Stethoscope, ShieldCheck];
  },

  getAvailabilityEntries() {
    const doctors = doctorsService.getDoctors();
    return doctors.map((d) => [
      d[0],
      `${d[1]} • ${d[2]}`,
      d[4] === 'ON DUTY' ? 'Available' : 'Off Duty',
      d[6] || '',
    ] as [string, string, string, string]);
  },

  getVitalsRows() {
    return [];
  },
};
