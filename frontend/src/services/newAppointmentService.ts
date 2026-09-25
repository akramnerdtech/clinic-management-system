import {
  appointmentPatient, medicalSpecialtyOptions, specialistOptions, appointmentFormatOptions,
  priorityOptions, appointmentDoctor, appointmentMiniChips, calendarMonthLabel, calendarDays,
  slotSessions, appointmentMeta,
} from '@/data/newAppointment';
import { loadFromStorage, saveToStorage } from '@/utils/storage';

const KEYS = {
  patient: 'curaclinic.newAppointment.patient',
  medicalSpecialties: 'curaclinic.newAppointment.medicalSpecialties',
  specialists: 'curaclinic.newAppointment.specialists',
  formatOptions: 'curaclinic.newAppointment.formatOptions',
  priorityOptions: 'curaclinic.newAppointment.priorityOptions',
  doctor: 'curaclinic.newAppointment.doctor',
  miniChips: 'curaclinic.newAppointment.miniChips',
  calendarMonthLabel: 'curaclinic.newAppointment.calendarMonthLabel',
  calendarDays: 'curaclinic.newAppointment.calendarDays',
  slotSessions: 'curaclinic.newAppointment.slotSessions',
  meta: 'curaclinic.newAppointment.meta',
  formState: 'curaclinic.newAppointment.formState',
};

export interface NewAppointmentFormState {
  selectedDay?: number;
  selectedSlot?: string;
  formatId?: string;
  priorityId?: string;
  specialty?: string;
  specialist?: string;
  reason?: string;
  intakeMemo?: string;
}

export const newAppointmentService = {
  getPatient() { return loadFromStorage(KEYS.patient, appointmentPatient); },
  getMedicalSpecialties() { return loadFromStorage(KEYS.medicalSpecialties, medicalSpecialtyOptions); },
  getSpecialists() { return loadFromStorage(KEYS.specialists, specialistOptions); },
  getFormatOptions() { return loadFromStorage(KEYS.formatOptions, appointmentFormatOptions); },
  getPriorityOptions() { return loadFromStorage(KEYS.priorityOptions, priorityOptions); },
  getDoctor() { return loadFromStorage(KEYS.doctor, appointmentDoctor); },
  getMiniChips() { return loadFromStorage(KEYS.miniChips, appointmentMiniChips); },
  getCalendarMonthLabel() { return loadFromStorage(KEYS.calendarMonthLabel, calendarMonthLabel); },
  getCalendarDays() { return loadFromStorage(KEYS.calendarDays, calendarDays); },
  getSlotSessions() { return loadFromStorage(KEYS.slotSessions, slotSessions); },
  getMeta() { return loadFromStorage(KEYS.meta, appointmentMeta); },
  /** In-progress selections for the New Appointment form (survives a page reload). */
  getFormState(): NewAppointmentFormState {
    return loadFromStorage(KEYS.formState, {});
  },
  saveFormState(state: NewAppointmentFormState): void {
    saveToStorage(KEYS.formState, state);
  },
  resetFormState(): void {
    saveToStorage(KEYS.formState, {});
  },
};
