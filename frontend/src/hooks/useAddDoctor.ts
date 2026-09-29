import { useState } from 'react';
import { addDoctorService } from '@/services/addDoctorService';
import { doctorsService } from '@/services/doctorsService';
import { useToast } from '@/utils/toast';
import type { Doctor, DoctorDaySchedule, DoctorFormField } from '@/types';

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

  const updateDaySchedule = (dayKey: string, patch: Partial<DoctorDaySchedule>) => {
    setDutyDays((prev) => {
      const updated = prev.map((day) => day.key === dayKey ? { ...day, ...patch } : day);
      addDoctorService.saveDutyDays(updated);
      return updated;
    });
  };

  const changePhoto = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Choose an image file for the doctor photo.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Choose a photo smaller than 2 MB.');
      return;
    }
    try {
      const image = await createImageBitmap(file);
      const scale = Math.min(1, 512 / Math.max(image.width, image.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Unable to process image');
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      image.close();
      updateField('photo', canvas.toDataURL('image/jpeg', 0.82));
      toast.success('Doctor photo uploaded.');
    } catch {
      toast.error('This photo could not be loaded. Try another image.');
    }
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
    if (dutyDays.some((day) => day.active && (!day.start || !day.end || day.start >= day.end))) {
      const message = 'Set a valid start and end time for every scheduled day.';
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
      'ON DUTY',
      `0 /${capacityInfo.cap}`,
      formValues.photo || `https://i.pravatar.cc/80?u=${encodeURIComponent(name)}`,
      Object.fromEntries(dutyDays.filter((day) => day.active).map((day) => [day.key, { start: day.start, end: day.end }])),
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
    updateDaySchedule,
    changePhoto,
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
