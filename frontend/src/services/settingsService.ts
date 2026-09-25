import {
  settingsTabs, clinicIdentityFields, scheduleRows, durationOptions,
  receptionDefaults, campusInfo, slotSaturationBars, complianceInfo,
} from '@/data/settings';
import { loadFromStorage, saveToStorage } from '@/utils/storage';
import type { ClinicField } from '@/types';

const KEYS = {
  tabs: 'curaclinic.settings.tabs',
  clinicIdentityFields: 'curaclinic.settings.clinicIdentityFields',
  scheduleRows: 'curaclinic.settings.scheduleRows',
  durationOptions: 'curaclinic.settings.durationOptions',
  receptionDefaults: 'curaclinic.settings.receptionDefaults',
  campusInfo: 'curaclinic.settings.campusInfo',
  slotSaturationBars: 'curaclinic.settings.slotSaturationBars',
  complianceInfo: 'curaclinic.settings.complianceInfo',
};

export const settingsService = {
  getTabs() {
    return loadFromStorage(KEYS.tabs, settingsTabs);
  },
  getClinicIdentityFields(): ClinicField[] {
    return loadFromStorage(KEYS.clinicIdentityFields, clinicIdentityFields);
  },
  saveClinicIdentityFields(fields: ClinicField[]): void {
    saveToStorage(KEYS.clinicIdentityFields, fields);
  },
  getScheduleRows() {
    return loadFromStorage(KEYS.scheduleRows, scheduleRows);
  },
  getDurationOptions() {
    return loadFromStorage(KEYS.durationOptions, durationOptions);
  },
  getReceptionDefaults() {
    return loadFromStorage(KEYS.receptionDefaults, receptionDefaults);
  },
  saveReceptionDefaults(defaults: typeof receptionDefaults): void {
    saveToStorage(KEYS.receptionDefaults, defaults);
  },
  getCampusInfo() {
    return loadFromStorage(KEYS.campusInfo, campusInfo);
  },
  getSlotSaturationBars() {
    return loadFromStorage(KEYS.slotSaturationBars, slotSaturationBars);
  },
  getComplianceInfo() {
    return loadFromStorage(KEYS.complianceInfo, complianceInfo);
  },
};
