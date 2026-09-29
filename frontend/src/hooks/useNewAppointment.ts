import { useMemo, useState } from 'react';
import { newAppointmentService, type NewAppointmentFormState } from '@/services/newAppointmentService';
import { appointmentsService } from '@/services/appointmentsService';
import { patientsService } from '@/services/patientsService';
import { useToast } from '@/utils/toast';
import type { AppointmentEntry, Patient } from '@/types';

function toDateKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function normalizeDate(value?: string): string {
  if (!value) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '' : toDateKey(parsed);
}

/**
 * Drives the New Appointment form. When `editToken` is given, the form is
 * prefilled from that appointment and submitting updates it in place.
 */
export function useNewAppointment(editToken?: string) {
  const isEditing = Boolean(editToken);
  const [editEntry] = useState(() => (editToken ? appointmentsService.getEntryByToken(editToken) : undefined));
  const editNotFound = isEditing && !editEntry;

  const [patients] = useState(() => {
    const list = patientsService.getPatients();
    // Older/sample appointments may reference a patient who is not in the directory; keep them selectable.
    if (editEntry && !list.some((p) => p[1] === editEntry[3])) {
      const record: Patient = ['On record', editEntry[3], editEntry[4], '', '', '', '', ''];
      return [record, ...list];
    }
    return list;
  });
  const [medicalSpecialties] = useState(() => newAppointmentService.getMedicalSpecialties());
  const [specialists] = useState(() => {
    const list = newAppointmentService.getSpecialists();
    return editEntry && !list.includes(editEntry[7]) ? [editEntry[7], ...list] : list;
  });
  const [formatOptions] = useState(() => newAppointmentService.getFormatOptions());
  const [priorityOptions] = useState(() => newAppointmentService.getPriorityOptions());
  const [meta] = useState(() => newAppointmentService.getMeta());
  // Editing never reads or writes the in-progress "new appointment" draft.
  const [draft] = useState<NewAppointmentFormState>(() => (isEditing ? {} : newAppointmentService.getFormState()));
  const [allAppointments] = useState(() => appointmentsService.getEntries());
  // The appointment being edited must not block its own slot.
  const appointments = useMemo(
    () => (editToken ? allAppointments.filter((entry) => entry[2] !== editToken) : allAppointments),
    [allAppointments, editToken],
  );
  const originalDayKey = editEntry ? normalizeDate(editEntry[11]) : '';
  const originalFormat = editEntry
    ? formatOptions.find((f) => f.label.toLowerCase() === editEntry[9].toLowerCase())
    : undefined;
  const editSpecialty = editEntry
    ? medicalSpecialties.find((s) => editEntry[8].split(' · ')[1] === s)
    : undefined;

  const [specialty, setSpecialtyState] = useState(draft.specialty ?? editSpecialty ?? medicalSpecialties[0]);
  const [specialist, setSpecialistState] = useState(draft.specialist ?? editEntry?.[7] ?? specialists[0]);
  const initialDays = newAppointmentService.getCalendarDays(specialist, appointments);

  const [selectedPatientId, setSelectedPatientId] = useState(() => {
    if (editEntry) return patients.find((p) => p[1] === editEntry[3])?.[0] ?? patients[0]?.[0] ?? '';
    return patients.some(([id]) => id === draft.patientId) ? draft.patientId! : patients[0]?.[0] ?? '';
  });
  const [selectedDay, setSelectedDayState] = useState(
    () => originalDayKey || initialDays.some((day) => day.dateKey === draft.selectedDay && day.status === 'open')
      ? draft.selectedDay!
      : initialDays.find((day) => day.status === 'open')?.dateKey ?? initialDays[0]?.dateKey ?? '',
  );
  const [selectedSlot, setSelectedSlotState] = useState(() => {
    if (editEntry) return editEntry[0];
    const slots = newAppointmentService.getSlotSessions(specialist, selectedDay, appointments)
      .flatMap((session) => session.slots);
    return slots.some((slot) => slot.time === draft.selectedSlot && slot.status === 'available')
      ? draft.selectedSlot!
      : slots.find((slot) => slot.status === 'available')?.time ?? '';
  });
  const [formatId, setFormatIdState] = useState(draft.formatId ?? originalFormat?.id ?? formatOptions[0].id);
  const [priorityId, setPriorityIdState] = useState(draft.priorityId ?? priorityOptions[0].id);
  const [reason, setReasonState] = useState(draft.reason ?? editEntry?.[5] ?? '');
  const [intakeMemo, setIntakeMemoState] = useState(draft.intakeMemo ?? editEntry?.[6] ?? '');
  const [status, setStatus] = useState<string | null>(null);
  const toast = useToast();
  const days = useMemo(() => newAppointmentService.getCalendarDays(specialist, appointments), [specialist, appointments]);
  const slotSessions = useMemo(
    () => newAppointmentService.getSlotSessions(specialist, selectedDay, appointments),
    [specialist, selectedDay, appointments],
  );
  const monthLabel = newAppointmentService.getCalendarMonthLabel(days);

  const persist = (patch: Partial<NewAppointmentFormState>) => {
    if (isEditing) return;
    newAppointmentService.saveFormState({
      patientId: selectedPatientId, selectedDay, selectedSlot, formatId, priorityId, specialty, specialist, reason, intakeMemo,
      ...patch,
    });
  };

  const setSelectedPatient = (patientId: string) => {
    setSelectedPatientId(patientId);
    persist({ patientId });
  };
  const setSelectedDay = (dateKey: string) => {
    const availableSlots = newAppointmentService.getSlotSessions(specialist, dateKey, appointments)
      .flatMap((session) => session.slots)
      .filter((slot) => slot.status === 'available');
    const nextSlot = availableSlots[0]?.time ?? '';
    setSelectedDayState(dateKey);
    setSelectedSlotState(nextSlot);
    persist({ selectedDay: dateKey, selectedSlot: nextSlot });
  };
  const setSelectedSlot = (v: string) => { setSelectedSlotState(v); persist({ selectedSlot: v }); };
  const setFormatId = (v: string) => { setFormatIdState(v); persist({ formatId: v }); };
  const setPriorityId = (v: string) => { setPriorityIdState(v); persist({ priorityId: v }); };
  const setSpecialty = (v: string) => { setSpecialtyState(v); persist({ specialty: v }); };
  const setSpecialist = (v: string) => {
    const nextDays = newAppointmentService.getCalendarDays(v, appointments);
    const nextDay = nextDays.find((day) => day.status === 'open') ?? nextDays[0];
    const nextSlots = nextDay
      ? newAppointmentService.getSlotSessions(v, nextDay.dateKey, appointments).flatMap((session) => session.slots)
      : [];
    const nextSlot = nextSlots.find((slot) => slot.status === 'available')?.time ?? '';
    setSpecialistState(v);
    setSelectedDayState(nextDay?.dateKey ?? '');
    setSelectedSlotState(nextSlot);
    persist({ specialist: v, selectedDay: nextDay?.dateKey ?? '', selectedSlot: nextSlot });
  };
  const setReason = (v: string) => { setReasonState(v); persist({ reason: v }); };
  const setIntakeMemo = (v: string) => { setIntakeMemoState(v); persist({ intakeMemo: v }); };

  const selectedDayLabel = useMemo(() => {
    if (!selectedDay) return '';
    const [year, month, day] = selectedDay.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
    });
  }, [selectedDay]);

  const selectedFormat = useMemo(
    () => formatOptions.find((f) => f.id === formatId) ?? formatOptions[0],
    [formatOptions, formatId],
  );

  const patient: Patient | undefined = patients.find(([id]) => id === selectedPatientId);
  const selectedDoctor = useMemo(
    () => newAppointmentService.getDoctorForSpecialist(specialist, specialty),
    [specialist, specialty],
  );

  const overview = useMemo(() => ({
    schedule: `${selectedDayLabel} @ ${selectedSlot}`,
    doctor: selectedDoctor.name,
    patient: patient ? `${patient[1]} (${patient[0]})` : 'Select a patient',
    suite: selectedDoctor.suite,
    duration: `${selectedFormat.meta.split(' • ')[0]} (${selectedFormat.label})`,
  }), [selectedDayLabel, selectedSlot, selectedDoctor, patient, selectedFormat]);

  const saveDraft = () => {
    if (isEditing) return;
    persist({});
    setStatus('Draft saved to this browser.');
    toast.success('Draft saved to this browser.');
  };

  const bookAppointment = (): AppointmentEntry | null => {
    if (!patient) {
      const message = 'Select a registered patient before booking.';
      setStatus(message);
      toast.error(message);
      return null;
    }
    if (!reason.trim()) {
      const message = 'Reason for Visit / Chief Complaint is required.';
      setStatus(message);
      toast.error(message);
      return null;
    }
    if (!selectedDay || !selectedSlot) {
      const message = 'Choose an available date and time slot for this doctor.';
      setStatus(message);
      toast.error(message);
      return null;
    }

    if (editEntry && editToken) {
      const sameDoctor = specialist === editEntry[7];
      const sameSlot = selectedSlot === editEntry[0] && selectedDay === originalDayKey;
      // Keep values the form cannot change (or never knew about) when the user did not touch them.
      const updated: AppointmentEntry = [
        selectedSlot,
        sameSlot ? editEntry[1] : '30 min slot',
        editToken,
        patient[1],
        patient[2],
        reason.trim(),
        intakeMemo.trim(),
        specialist,
        sameDoctor ? editEntry[8] : selectedDoctor.suite,
        !originalFormat && formatId === formatOptions[0].id ? editEntry[9] : selectedFormat.label,
        editEntry[10],
        selectedDay,
      ];
      appointmentsService.updateEntry(editToken, updated);
      setStatus('Appointment updated successfully.');
      toast.success(`Appointment ${editToken} updated for ${patient[1]}.`);
      return updated;
    }

    const entry: AppointmentEntry = [
      selectedSlot,
      '30 min slot',
      appointmentsService.getNextToken(),
      patient[1],
      patient[2],
      reason.trim(),
      intakeMemo.trim(),
      specialist,
      selectedDoctor.suite,
      selectedFormat.label,
      'Confirmed',
      selectedDay,
    ];

    appointmentsService.addEntry(entry);
    newAppointmentService.resetFormState();
    setStatus('Appointment booked successfully.');
    toast.success(`Appointment booked for ${patient[1]} with ${selectedDoctor.name} at ${selectedSlot}.`);
    return entry;
  };

  return {
    patients, selectedPatientId, setSelectedPatient, medicalSpecialties, specialists, formatOptions, priorityOptions,
    monthLabel, days, slotSessions, meta,
    selectedDay, setSelectedDay,
    selectedSlot, setSelectedSlot,
    formatId, setFormatId,
    priorityId, setPriorityId,
    specialty, setSpecialty,
    specialist, setSpecialist,
    reason, setReason,
    intakeMemo, setIntakeMemo,
    overview,
    status, saveDraft, bookAppointment,
    isEditing, editNotFound,
  };
}