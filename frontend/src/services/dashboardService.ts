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

function parseAppointmentDate(value?: string): Date | null {
  if (!value) return null;
  const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const date = iso
    ? new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]))
    : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  return date;
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
    const { start, end } = getWeekBoundaries();

    const weeklyEntries = entries.filter((entry) => {
      if (!entry[11] || entry[10] === 'Cancelled') return false;
      const date = parseAppointmentDate(entry[11]);
      return date !== null && date >= start && date < end;
    });

    const todayEntries = appointmentsService.getTodayEntries();
    const patients = patientsService.getPatients();
    const doctors = doctorsService.getDoctors();
    const onDutyCount = doctors.filter((doctor) => doctor[4] === 'ON DUTY').length;

    // Real weekly revenue from payments settled this week
    const payments = billingService.getPayments();
    const weeklyPayments = payments.filter((p) => {
      const pDate = new Date(p.paidAt);
      return !Number.isNaN(pDate.getTime()) && pDate >= start && pDate < end;
    });
    const weeklyRevenuePaise = weeklyPayments.reduce((acc, p) => acc + (p.amountPaise || 0), 0);

    const waitingToday = todayEntries.filter(
      (e) => e[10] === 'Waiting' || e[10] === 'Slot Booked',
    );

    const inrFormatter = new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    });

    return [
      {
        label: 'APPOINTMENTS THIS WEEK',
        value: String(weeklyEntries.length),
        note: `${todayEntries.length} scheduled today · Mon–Sun`,
        color: 'blue',
        icon: CalendarDays,
      },
      {
        label: 'TOTAL PATIENTS',
        value: String(patients.length),
        note: `${weeklyEntries.length} active visits this week`,
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
        note: `${weeklyPayments.length} settled receipts this week`,
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
    const { start, end } = getWeekBoundaries();
    const weeklyEntries = entries.filter((entry) => {
      if (!entry[11] || entry[10] === 'Cancelled') return false;
      const date = parseAppointmentDate(entry[11]);
      return date !== null && date >= start && date < end;
    });
    const todayEntries = appointmentsService.getTodayEntries();
    const waiting = todayEntries.filter((e) => e[10] === 'Waiting' || e[10] === 'Slot Booked');
    const inConsult = todayEntries.filter((e) => e[10] === 'In Consultation');
    const completed = weeklyEntries.filter((e) => e[10] === 'Completed');

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
    const { start, end } = getWeekBoundaries();

    let filtered = entries.filter((entry) => entry[10] !== 'Cancelled');

    if (tab) {
      if (tab.startsWith('Today')) {
        const todayKey = new Date().toISOString().slice(0, 10);
        filtered = filtered.filter((e) => e[11] === todayKey);
      } else if (tab.startsWith('Waiting')) {
        filtered = filtered.filter((e) => e[10] === 'Waiting' || e[10] === 'Slot Booked');
      } else if (tab.startsWith('In Consultation')) {
        filtered = filtered.filter((e) => e[10] === 'In Consultation');
      } else if (tab.startsWith('Completed')) {
        filtered = filtered.filter((e) => e[10] === 'Completed');
      } else {
        // Default: This Week
        filtered = filtered.filter((entry) => {
          const date = parseAppointmentDate(entry[11]);
          return date !== null && date >= start && date < end;
        });
      }
    } else {
      // Default: This Week
      filtered = filtered.filter((entry) => {
        const date = parseAppointmentDate(entry[11]);
        return date !== null && date >= start && date < end;
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
        if (e[10] === 'Cancelled') return false;
        return e[11] === day.iso;
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
