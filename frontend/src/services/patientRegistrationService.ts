import { patientRegistrationFields, genderOptions, registrationMeta } from '@/data/patientRegistration';
import { loadFromStorage, saveToStorage } from '@/utils/storage';
import type { RegistrationField } from '@/types';

const KEYS = {
  fields: 'curaclinic.patientRegistration.fields',
  genderOptions: 'curaclinic.patientRegistration.genderOptions',
  meta: 'curaclinic.patientRegistration.meta',
  formValues: 'curaclinic.patientRegistration.formValues',
  genderValue: 'curaclinic.patientRegistration.genderValue',
};

export const patientRegistrationService = {
  getFields(): RegistrationField[] {
    const savedFields = loadFromStorage(KEYS.fields, patientRegistrationFields);
    return patientRegistrationFields.map((field) => {
      const saved = savedFields.find((savedField) => savedField.id === field.id);
      return { ...field, ...(saved ? { label: saved.label, defaultValue: saved.defaultValue } : {}) };
    });
  },
  getGenderOptions(): string[] {
    return loadFromStorage(KEYS.genderOptions, genderOptions);
  },
  getMeta() {
    return loadFromStorage(KEYS.meta, registrationMeta);
  },
  /** Text field values typed into the Add Patient form, keyed by field id. */
  getFormValues(): Record<string, string> {
    return loadFromStorage(KEYS.formValues, {});
  },
  saveFormValues(values: Record<string, string>): void {
    saveToStorage(KEYS.formValues, values);
  },
  getGenderValue(): string | undefined {
    return loadFromStorage<string | undefined>(KEYS.genderValue, undefined);
  },
  saveGenderValue(value: string): void {
    saveToStorage(KEYS.genderValue, value);
  },
  /** Clears the saved draft after a successful registration. */
  resetForm(): void {
    saveToStorage(KEYS.formValues, {});
    saveToStorage(KEYS.genderValue, undefined);
  },
};
