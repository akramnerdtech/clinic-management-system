import { useState } from 'react';
import { addDoctorService } from '@/services/addDoctorService';
import { doctorsService } from '@/services/doctorsService';
import { useToast } from '@/utils/toast';
import type { Doctor, DoctorFormField } from '@/types';

function buildInitialValues(fields: DoctorFormField[], saved: Record<string, string>) {
  const values: Record<string, string> = {};
  fields.forEach((f) => { values[f.id] = saved[f.id] ?? ''; });
  return values;
}

export function useAddDoctor() {
  const [basicInfoFields] = useState(() => addDoctorService.getBasicInfoFields());
  const [credentialFields] = useState(() => addDoctorService.getCredentialFields());
  const [dutyDays, setDutyDays] = useState(() => addDoctorService.getDutyDays());
  const [shiftTimes, setShiftTimes] = useState(() => addDoctorService.getShiftTimes());
  const [capacityInfo] = useState(() => addDoctorService.getCapacityInfo());
  const [onCallInfo] = useState(() => addDoctorService.getOnCallInfo());
  const [onCallEnabled, setOnCallEnabledState] = useState(() => addDoctorService.getOnCallEnabled());
  const [preview] = useState(() => addDoctorService.getPreview());
  const [specialtyRoster] = useState(() => addDoctorService.getSpecialtyRoster());
  const [checklist] = useState(() => addDoctorService.getChecklist());
  const [meta] = useState(() => addDoctorService.getMeta());

  const allFields = [...basicInfoFields, ...credentialFields];
  const [formValues, setFormValues] = useState(() => buildInitialValues(allFields, addDoctorService.getFormValues()));
  const [status, setStatus] = useState<string | null>(null);
  const toast = useToast();

  const updateField = (id: string, value: string) => {
    setFormValues((prev) => {
      const updated = { ...prev, [id]: value };
      addDoctorService.saveFormValues(updated);
      return updated;
    });
  };

  const toggleDutyDay = (key: string) => {
    setDutyDays((prev) => {
      const updated = prev.map((d) => (d.key === key ? { ...d, active: !d.active } : d));
      addDoctorService.saveDutyDays(updated);
      return updated;
    });
  };

  const updateShiftTime = (key: 'start' | 'end', value: string) => {
    setShiftTimes((prev) => {
      const updated = { ...prev, [key]: value };
      addDoctorService.saveShiftTimes(updated);
      return updated;
    });
  };

  const setOnCallEnabled = (value: boolean) => {
    setOnCallEnabledState(value);
    addDoctorService.saveOnCallEnabled(value);
  };

  const activeDaysCount = dutyDays.filter((d) => d.active).length;

  const saveDraft = () => {
    addDoctorService.saveFormValues(formValues);
    setStatus('Draft saved to this browser.');
    toast.success('Draft saved to this browser.');
  };

  const registerDoctor = (): Doctor | null => {
    const fullName = formValues.fullName?.trim();
    const specialty = formValues.specialty?.trim();
    if (!fullName || !specialty) {
      const message = 'Full Legal Name and Primary Specialty are required.';
      setStatus(message);
      toast.error(message);
      return null;
    }
    const title = formValues.title?.trim() || 'Dr.';
    const name = fullName.toLowerCase().startsWith(title.toLowerCase()) ? fullName : `${title} ${fullName}`;
    const room = formValues.suite?.trim() || 'Unassigned';
    const workingDays = dutyDays.filter((d) => d.active).map((d) => d.key[0]).join(' ') || '—';

    const doctor: Doctor = [
      name,
      specialty,
      room,
      workingDays,
      'ACTIVE FLOOR',
      `0 /${capacityInfo.cap}`,
      `https://i.pravatar.cc/80?u=${encodeURIComponent(name)}`,
    ];

    doctorsService.addDoctor(doctor);
    addDoctorService.resetForm();
    setFormValues(buildInitialValues(allFields, {}));
    setDutyDays(addDoctorService.getDutyDays());
    setShiftTimes(addDoctorService.getShiftTimes());
    setOnCallEnabledState(addDoctorService.getOnCallEnabled());
    setStatus('Doctor registered successfully.');
    toast.success(`${name} was registered successfully.`);
    return doctor;
  };

  return {
    basicInfoFields,
    credentialFields,
    formValues,
    updateField,
    dutyDays,
    toggleDutyDay,
    activeDaysCount,
    shiftTimes,
    updateShiftTime,
    capacityInfo,
    onCallInfo,
    onCallEnabled,
    setOnCallEnabled,
    preview,
    specialtyRoster,
    checklist,
    meta,
    status,
    saveDraft,
    registerDoctor,
  };
}
