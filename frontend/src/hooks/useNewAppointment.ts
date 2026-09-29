import { useMemo, useState } from 'react';
import { newAppointmentService, type NewAppointmentFormState } from '@/services/newAppointmentService';
import { appointmentsService } from '@/services/appointmentsService';
import { patientsService } from '@/services/patientsService';
import { useToast } from '@/utils/toast';
import type { AppointmentEntry, Patient } from '@/types';

export function useNewAppointment() {
  const [patients] = useState(() => patientsService.getPatients());
  const [medicalSpecialties] = useState(() => newAppointmentService.getMedicalSpecialties());
  const [specialists] = useState(() => newAppointmentService.getSpecialists());
  const [formatOptions] = useState(() => newAppointmentService.getFormatOptions());
  const [priorityOptions] = useState(() => newAppointmentService.getPriorityOptions());
  const [meta] = useState(() => newAppointmentService.getMeta());
  const [draft] = useState(() => newAppointmentService.getFormState());
  const [appointments] = useState(() => appointmentsService.getEntries());
  const [specialty, setSpecialtyState] = useState(draft.specialty ?? medicalSpecialties[0]);
  const [specialist, setSpecialistState] = useState(draft.specialist ?? specialists[0]);
  const initialDays = newAppointmentService.getCalendarDays(specialist, appointments);

  const [selectedPatientId, setSelectedPatientId] = useState(() =>
    patients.some(([id]) => id === draft.patientId) ? draft.patientId! : patients[0]?.[0] ?? '',
  );
  const [selectedDay, setSelectedDayState] = useState(
    () => initialDays.some((day) => day.dateKey === draft.selectedDay && day.status === 'open')
      ? draft.selectedDay!
      : initialDays.find((day) => day.status === 'open')?.dateKey ?? initialDays[0]?.dateKey ?? '',
  );
  const [selectedSlot, setSelectedSlotState] = useState(() => {
    const slots = newAppointmentService.getSlotSessions(specialist, selectedDay, appointments)
      .flatMap((session) => session.slots);
    return slots.some((slot) => slot.time === draft.selectedSlot && slot.status === 'available')
      ? draft.selectedSlot!
      : slots.find((slot) => slot.status === 'available')?.time ?? '';
  });
  const [formatId, setFormatIdState] = useState(draft.formatId ?? formatOptions[0].id);
  const [priorityId, setPriorityIdState] = useState(draft.priorityId ?? priorityOptions[0].id);
  const [reason, setReasonState] = useState(draft.reason ?? '');
  const [intakeMemo, setIntakeMemoState] = useState(draft.intakeMemo ?? '');
  const [status, setStatus] = useState<string | null>(null);
  const toast = useToast();
  const days = useMemo(() => newAppointmentService.getCalendarDays(specialist, appointments), [specialist, appointments]);
  const slotSessions = useMemo(
    () => newAppointmentService.getSlotSessions(specialist, selectedDay, appointments),
    [specialist, selectedDay, appointments],
  );
  const monthLabel = newAppointmentService.getCalendarMonthLabel(days);

  const persist = (patch: Partial<NewAppointmentFormState>) => {
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
  };
}
