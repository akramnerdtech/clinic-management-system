import {
  dashboardMetrics, dashboardTabs, appointmentRows, availabilityEntries,
  vitalsRows, activityItems, activityIcons, trafficPoints,
} from '@/data/dashboard';
import { loadFromStorage } from '@/utils/storage';

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
    return loadFromStorage(KEYS.metrics, dashboardMetrics);
  },
  getTabs() {
    return loadFromStorage(KEYS.tabs, dashboardTabs);
  },
  getAppointmentRows() {
    return loadFromStorage(KEYS.appointmentRows, appointmentRows);
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
