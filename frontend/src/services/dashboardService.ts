import {
  dashboardMetrics, dashboardTabs, appointmentRows, availabilityEntries,
  vitalsRows, activityItems, activityIcons, trafficPoints,
} from '@/data/dashboard';
import { appointmentsService } from '@/services/appointmentsService';
import { doctorsService } from '@/services/doctorsService';
import { loadFromStorage } from '@/utils/storage';
import type { AppointmentRow } from '@/types';

const KEYS = {
  metrics: 'curaclinic.dashboard.metrics',
  tabs: 'curaclinic.dashboard.tabs',
  appointmentRows: 'curaclinic.dashboard.appointmentRows',
  availabilityEntries: 'curaclinic.dashboard.availabilityEntries',
  vitalsRows: 'curaclinic.dashboard.vitalsRows',
  activityItems: 'curaclinic.dashboard.activityItems',
  activityIcons: 'curaclinic.dashboard.activityIcons',
  trafficPoints: 'curaclinic.dashboard.trafficPoints',
};

export const dashboardService = {
  getMetrics() {
    const metrics = loadFromStorage(KEYS.metrics, dashboardMetrics);
    const entries = appointmentsService.getEntries();
    const todayCount = appointmentsService.getTodayEntries().length;
    const weekStart = new Date();
    weekStart.setHours(0, 0, 0, 0);
    weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    const weeklyCount = entries.filter((entry) => {
      if (!entry[11] || entry[10] === 'Cancelled') return false;
      const date = parseAppointmentDate(entry[11]);
      return date !== null && date >= weekStart && date < weekEnd;
    }).length;
    const doctors = doctorsService.getDoctors();
    const onDutyCount = doctors.filter((doctor) => doctor[4] === 'ON DUTY').length;
    return metrics.map((metric) => {
      if (metric.label === "TODAY'S APPOINTMENTS") {
        return { ...metric, value: String(Number(metric.value.replace(/,/g, '')) + todayCount) };
      }
      if (metric.label === 'DOCTORS ON DUTY') {
        return { ...metric, value: `${onDutyCount} / ${doctors.length}`, note: `${onDutyCount} active today` };
      }
      if (metric.label === 'APPOINTMENTS THIS WEEK') {
        return { ...metric, value: String(weeklyCount), note: 'Monday to Sunday' };
      }
      return metric;
    });
  },
  getTabs() {
    const tabs = loadFromStorage(KEYS.tabs, dashboardTabs);
    const todayEntries = appointmentsService.getTodayEntries();
    return tabs.map((tab) => {
      const match = tab.match(/^(.*) \((\d+)\)$/);
      if (!match) return tab;
      const label = match[1];
      const increment = label === 'All' ? todayEntries.length
        : todayEntries.filter((entry) => entry[10] === label).length;
      return increment ? `${label} (${Number(match[2]) + increment})` : tab;
    });
  },
  getAppointmentRows() {
    const rows = loadFromStorage(KEYS.appointmentRows, appointmentRows);
    const todaysRows = appointmentsService.getTodayEntries().map((entry) => [
      entry[0], entry[3], entry[4], entry[7], entry[5],
    ] as AppointmentRow);
    return [...todaysRows, ...rows];
  },
  getAvailabilityEntries() {
    return loadFromStorage(KEYS.availabilityEntries, availabilityEntries);
  },
  getVitalsRows() {
    return loadFromStorage(KEYS.vitalsRows, vitalsRows);
  },
  getActivityItems() {
    return loadFromStorage(KEYS.activityItems, activityItems);
  },
  getActivityIcons() {
    return loadFromStorage(KEYS.activityIcons, activityIcons);
  },
  getTrafficPoints() {
    return loadFromStorage(KEYS.trafficPoints, trafficPoints);
  },
};

function parseAppointmentDate(value: string): Date | null {
  const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const date = iso
    ? new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]))
    : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  return date;
}
