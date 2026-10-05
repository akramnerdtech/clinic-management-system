import { useState } from 'react';
import { patientRegistrationService } from '@/services/patientRegistrationService';
import { patientsService } from '@/services/patientsService';
import { useToast } from '@/utils/toast';
import type { Patient, RegistrationField } from '@/types';

function buildInitialValues(fields: RegistrationField[], saved: Record<string, string>) {
  const values: Record<string, string> = {};
  fields.forEach((f) => { values[f.id] = saved[f.id] ?? ''; });
  return values;
}

function nextPatientId(existing: Patient[]): string {
  const max = existing.reduce((acc, p) => {
    const n = parseInt(p[0].replace(/\D/g, ''), 10);
    return Number.isNaN(n) ? acc : Math.max(acc, n);
  }, 0);
  return `PT-${String(max + 1).padStart(5, '0')}`;
}

function todayDateKey(): string {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${today.getFullYear()}-${month}-${day}`;
}

export function usePatientRegistration() {
  const [fields] = useState(() => patientRegistrationService.getFields());
  const [genderOptions] = useState(() => patientRegistrationService.getGenderOptions());
  const [meta] = useState(() => patientRegistrationService.getMeta());

  const [formValues, setFormValues] = useState(() => buildInitialValues(fields, patientRegistrationService.getFormValues()));
  const [gender, setGender] = useState(() => patientRegistrationService.getGenderValue() ?? genderOptions[0]);
  const [status, setStatus] = useState<string | null>(null);
  const toast = useToast();

  const updateField = (id: string, value: string) => {
    setFormValues((prev) => {
      const updated = { ...prev, [id]: value };
      patientRegistrationService.saveFormValues(updated);
      return updated;
    });
  };

  const updateGender = (value: string) => {
    setGender(value);
    patientRegistrationService.saveGenderValue(value);
  };

  const registerPatient = (): Patient | null => {
    const fullName = formValues.fullName?.trim();
    const complaint = formValues.complaint?.trim();
    const ageValue = Number(formValues.age?.trim());
    if (!fullName || !complaint) {
      const message = 'Patient name and reason for visit are required.';
      setStatus(message);
      toast.error(message);
      return null;
    }
    if (!formValues.age?.trim() || Number.isNaN(ageValue) || ageValue < 0 || ageValue > 120) {
      const message = 'Please enter a valid age (0–120).';
      setStatus(message);
      toast.error(message);
      return null;
    }

    const existing = patientsService.getPatients();
    const age = formValues.age?.trim();
    const ageSex = `${age || '—'} / ${gender.charAt(0)}`;
    const lastVisit = new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });

    const patient: Patient = [
      nextPatientId(existing),
      fullName,
      ageSex,
      complaint,
      '',
      lastVisit,
      '',
      formValues.bloodGroup?.trim() ?? '',
      formValues.recommendedTest?.trim() ?? '',
      todayDateKey(),
    ];

    patientsService.addPatient(patient);
    patientRegistrationService.resetForm();
    setFormValues(buildInitialValues(fields, {}));
    setGender(genderOptions[0]);
    setStatus('Patient registered successfully.');
    toast.success(`${fullName} was registered successfully.`);
    return patient;
  };

  return { fields, genderOptions, meta, formValues, updateField, gender, updateGender, status, registerPatient };
}