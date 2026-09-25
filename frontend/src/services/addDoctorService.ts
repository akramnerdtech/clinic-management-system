import {
  basicInfoFields,
  credentialFields,
  dutyDaysDefault,
  shiftTimesDefault,
  capacityInfo,
  onCallInfo,
  addDoctorPreview,
  specialtyRoster,
  credentialingChecklist,
  addDoctorMeta,
} from '@/data/addDoctor';
import { loadFromStorage, saveToStorage } from '@/utils/storage';
import type { DoctorFormField, DutyDay, SpecialtyRosterItem, AddDoctorPreview } from '@/types';

const KEYS = {
  basicInfoFields: 'curaclinic.addDoctor.basicInfoFields',
  credentialFields: 'curaclinic.addDoctor.credentialFields',
  dutyDays: 'curaclinic.addDoctor.dutyDays',
  shiftTimes: 'curaclinic.addDoctor.shiftTimes',
  capacityInfo: 'curaclinic.addDoctor.capacityInfo',
  onCallInfo: 'curaclinic.addDoctor.onCallInfo',
  onCallEnabled: 'curaclinic.addDoctor.onCallEnabled',
  preview: 'curaclinic.addDoctor.preview',
  specialtyRoster: 'curaclinic.addDoctor.specialtyRoster',
  checklist: 'curaclinic.addDoctor.checklist',
  meta: 'curaclinic.addDoctor.meta',
  formValues: 'curaclinic.addDoctor.formValues',
};

export const addDoctorService = {
  getBasicInfoFields(): DoctorFormField[] {
    return loadFromStorage(KEYS.basicInfoFields, basicInfoFields);
  },
  getCredentialFields(): DoctorFormField[] {
    return loadFromStorage(KEYS.credentialFields, credentialFields);
  },
  getDutyDays(): DutyDay[] {
    return loadFromStorage(KEYS.dutyDays, dutyDaysDefault);
  },
  saveDutyDays(days: DutyDay[]): void {
    saveToStorage(KEYS.dutyDays, days);
  },
  getShiftTimes() {
    return loadFromStorage(KEYS.shiftTimes, shiftTimesDefault);
  },
  saveShiftTimes(times: { start: string; end: string }): void {
    saveToStorage(KEYS.shiftTimes, times);
  },
  getCapacityInfo() {
    return loadFromStorage(KEYS.capacityInfo, capacityInfo);
  },
  getOnCallInfo() {
    return loadFromStorage(KEYS.onCallInfo, onCallInfo);
  },
  getOnCallEnabled(): boolean {
    return loadFromStorage(KEYS.onCallEnabled, onCallInfo.enabledDefault);
  },
  saveOnCallEnabled(enabled: boolean): void {
    saveToStorage(KEYS.onCallEnabled, enabled);
  },
  getPreview(): AddDoctorPreview {
    return loadFromStorage(KEYS.preview, addDoctorPreview);
  },
  getSpecialtyRoster(): SpecialtyRosterItem[] {
    return loadFromStorage(KEYS.specialtyRoster, specialtyRoster);
  },
  getChecklist(): string[] {
    return loadFromStorage(KEYS.checklist, credentialingChecklist);
  },
  getMeta() {
    return loadFromStorage(KEYS.meta, addDoctorMeta);
  },
  /** Text field values typed into the Add Doctor form, keyed by field id. */
  getFormValues(): Record<string, string> {
    return loadFromStorage(KEYS.formValues, {});
  },
  saveFormValues(values: Record<string, string>): void {
    saveToStorage(KEYS.formValues, values);
  },
  /** Clears the saved draft after a successful registration (or on request). */
  resetForm(): void {
    saveToStorage(KEYS.formValues, {});
    saveToStorage(KEYS.dutyDays, dutyDaysDefault);
    saveToStorage(KEYS.shiftTimes, shiftTimesDefault);
    saveToStorage(KEYS.onCallEnabled, onCallInfo.enabledDefault);
  },
};
