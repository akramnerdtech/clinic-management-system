import { useMemo, useState } from 'react';
import { newAppointmentService, type NewAppointmentFormState } from '@/services/newAppointmentService';
import { appointmentsService } from '@/services/appointmentsService';
import { useToast } from '@/utils/toast';
import type { AppointmentEntry } from '@/types';

export function useNewAppointment() {
  const [patient] = useState(() => newAppointmentService.getPatient());
  const [medicalSpecialties] = useState(() => newAppointmentService.getMedicalSpecialties());
  const [specialists] = useState(() => newAppointmentService.getSpecialists());
  const [formatOptions] = useState(() => newAppointmentService.getFormatOptions());
  const [priorityOptions] = useState(() => newAppointmentService.getPriorityOptions());
  const [doctor] = useState(() => newAppointmentService.getDoctor());
  const [miniChips] = useState(() => newAppointmentService.getMiniChips());
  const [monthLabel] = useState(() => newAppointmentService.getCalendarMonthLabel());
  const [days] = useState(() => newAppointmentService.getCalendarDays());
  const [slotSessions] = useState(() => newAppointmentService.getSlotSessions());
  const [meta] = useState(() => newAppointmentService.getMeta());
  const [draft] = useState(() => newAppointmentService.getFormState());

  const [selectedDay, setSelectedDayState] = useState(
    () => draft.selectedDay ?? days.find((d) => d.status === 'open')?.date ?? days[0].date,
  );
  const [selectedSlot, setSelectedSlotState] = useState(() => {
    if (draft.selectedSlot) return draft.selectedSlot;
    const reserved = slotSessions.flatMap((s) => s.slots).find((s) => s.status === 'reserved');
    return reserved?.time ?? slotSessions[0].slots[0].time;
  });
  const [formatId, setFormatIdState] = useState(draft.formatId ?? formatOptions[0].id);
  const [priorityId, setPriorityIdState] = useState(draft.priorityId ?? priorityOptions[0].id);
  const [specialty, setSpecialtyState] = useState(draft.specialty ?? medicalSpecialties[0]);
  const [specialist, setSpecialistState] = useState(draft.specialist ?? specialists[0]);
  const [reason, setReasonState] = useState(draft.reason ?? '');
  const [intakeMemo, setIntakeMemoState] = useState(draft.intakeMemo ?? '');
  const [status, setStatus] = useState<string | null>(null);
  const toast = useToast();

  const persist = (patch: Partial<NewAppointmentFormState>) => {
    newAppointmentService.saveFormState({
      selectedDay, selectedSlot, formatId, priorityId, specialty, specialist, reason, intakeMemo,
      ...patch,
    });
  };

  const setSelectedDay = (v: number) => { setSelectedDayState(v); persist({ selectedDay: v }); };
  const setSelectedSlot = (v: string) => { setSelectedSlotState(v); persist({ selectedSlot: v }); };
  const setFormatId = (v: string) => { setFormatIdState(v); persist({ formatId: v }); };
  const setPriorityId = (v: string) => { setPriorityIdState(v); persist({ priorityId: v }); };
  const setSpecialty = (v: string) => { setSpecialtyState(v); persist({ specialty: v }); };
  const setSpecialist = (v: string) => { setSpecialistState(v); persist({ specialist: v }); };
  const setReason = (v: string) => { setReasonState(v); persist({ reason: v }); };
  const setIntakeMemo = (v: string) => { setIntakeMemoState(v); persist({ intakeMemo: v }); };

  const selectedDayLabel = useMemo(() => {
    const day = days.find((d) => d.date === selectedDay);
    return day ? `Thu, Sep ${day.date}` : '';
  }, [days, selectedDay]);

  const selectedFormat = useMemo(
    () => formatOptions.find((f) => f.id === formatId) ?? formatOptions[0],
    [formatOptions, formatId],
  );

  const overview = useMemo(() => ({
    schedule: `${selectedDayLabel} @ ${selectedSlot}`,
    doctor: doctor.name,
    patient: `${patient.name} (${patient.patientId})`,
    suite: doctor.suite,
    duration: `${selectedFormat.meta.split(' • ')[0]} (${selectedFormat.label})`,
  }), [selectedDayLabel, selectedSlot, doctor, patient, selectedFormat]);

  const saveDraft = () => {
    persist({});
    setStatus('Draft saved to this browser.');
    toast.success('Draft saved to this browser.');
  };

  const bookAppointment = (): AppointmentEntry | null => {
    if (!reason.trim()) {
      const message = 'Reason for Visit / Chief Complaint is required.';
      setStatus(message);
      toast.error(message);
      return null;
    }

    const entry: AppointmentEntry = [
      selectedSlot,
      '30 min slot',
      `TK-${100 + appointmentsService.getEntries().length + 1}`,
      patient.name,
      `${patient.age} / ${patient.gender.charAt(0)}`,
      reason.trim(),
      intakeMemo.trim(),
      specialist,
      doctor.suite,
      selectedFormat.label,
      'Confirmed',
    ];

    appointmentsService.addEntry(entry);
    newAppointmentService.resetFormState();
    setStatus('Appointment booked successfully.');
    toast.success(`Appointment booked for ${patient.name} at ${selectedSlot}.`);
    return entry;
  };

  return {
    patient, medicalSpecialties, specialists, formatOptions, priorityOptions, doctor, miniChips,
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
