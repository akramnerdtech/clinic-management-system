import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/ui/PageHeader';
import { PatientIdentityCard } from '@/components/appointments/PatientIdentityCard';
import { ClinicalSetupCard } from '@/components/appointments/ClinicalSetupCard';
import { DoctorScheduleRail } from '@/components/appointments/DoctorScheduleRail';
import { DateSlotCard } from '@/components/appointments/DateSlotCard';
import { AppointmentOverviewCard } from '@/components/appointments/AppointmentOverviewCard';
import { useNewAppointment } from '@/hooks/useNewAppointment';

export function NewAppointmentPage() {
  const {
    patient, medicalSpecialties, specialists, formatOptions, priorityOptions, doctor, miniChips,
    monthLabel, days, slotSessions, meta,
    selectedDay, setSelectedDay, selectedSlot, setSelectedSlot,
    formatId, setFormatId, priorityId, setPriorityId,
    specialty, setSpecialty, specialist, setSpecialist,
    reason, setReason, intakeMemo, setIntakeMemo,
    overview, status, saveDraft, bookAppointment,
  } = useNewAppointment();
  const navigate = useNavigate();

  const handleBook = () => {
    const entry = bookAppointment();
    if (entry) navigate('/appointments');
  };

  return (
    <>
      <PageHeader
        eyebrow="APPOINTMENTS / NEW APPOINTMENT"
        title={<>Book New Appointment <span className="dispatch-badge"><i /> Live Dispatch</span></>}
        description="Schedule a patient consultation with a specialist doctor and review real-time suite availability."
      />

      <div className="appointment-layout">
        <div className="appointment-main">
          <PatientIdentityCard patient={patient} />
          <ClinicalSetupCard
            medicalSpecialties={medicalSpecialties}
            specialists={specialists}
            departmentLine={meta.departmentLine}
            onDutyLine={meta.onDutyLine}
            specialty={specialty}
            onSpecialtyChange={setSpecialty}
            specialist={specialist}
            onSpecialistChange={setSpecialist}
            reason={reason}
            onReasonChange={setReason}
            intakeMemo={intakeMemo}
            onIntakeMemoChange={setIntakeMemo}
            formatOptions={formatOptions}
            formatId={formatId}
            onFormatChange={setFormatId}
            priorityOptions={priorityOptions}
            priorityId={priorityId}
            onPriorityChange={setPriorityId}
          />
        </div>

        <div className="right-rail">
          <DoctorScheduleRail chips={miniChips} doctor={doctor} />
          <DateSlotCard
            monthLabel={monthLabel}
            days={days}
            selectedDay={selectedDay}
            onSelectDay={setSelectedDay}
            slotSessions={slotSessions}
            selectedSlot={selectedSlot}
            onSelectSlot={setSelectedSlot}
          />
          <AppointmentOverviewCard
            holdMinutesLabel={meta.holdMinutesLabel}
            overview={overview}
            fee={meta.fee}
            feeNote={meta.feeNote}
            syncNote={meta.syncNote}
            status={status}
            onBook={handleBook}
            onSaveDraft={saveDraft}
          />
        </div>
      </div>
    </>
  );
}
