import { useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '@/components/ui/PageHeader';
import { PatientIdentityCard } from '@/components/appointments/PatientIdentityCard';
import { ClinicalSetupCard } from '@/components/appointments/ClinicalSetupCard';
import { DateSlotCard } from '@/components/appointments/DateSlotCard';
import { AppointmentOverviewCard } from '@/components/appointments/AppointmentOverviewCard';
import { useNewAppointment } from '@/hooks/useNewAppointment';
import { IconButton } from '@/components/ui/IconButton';

export function NewAppointmentPage() {
  const { tokenId } = useParams<{ tokenId: string }>();
  const {
    patients, selectedPatientId, setSelectedPatient, medicalSpecialties, specialists, formatOptions, priorityOptions,
    monthLabel, days, slotSessions, meta,
    selectedDay, setSelectedDay, selectedSlot, setSelectedSlot,
    formatId, setFormatId, priorityId, setPriorityId,
    specialty, setSpecialty, specialist, setSpecialist,
    reason, setReason, intakeMemo, setIntakeMemo,
    overview, wardAllocation, status, saveDraft, bookAppointment, isEditing, editNotFound,
  } = useNewAppointment(tokenId);
  const navigate = useNavigate();

  const handleBook = () => {
    const entry = bookAppointment();
    if (entry) navigate('/appointments');
  };

  if (editNotFound) {
    return (
      <>
        <PageHeader
          eyebrow="APPOINTMENTS / EDIT APPOINTMENT"
          title="Appointment not found"
          description={`No appointment with ID ${tokenId} exists. It may have been deleted.`}
        />
        <IconButton className="teal-button" onClick={() => navigate('/appointments')}>Back to Appointments</IconButton>
      </>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow={isEditing ? `APPOINTMENTS / EDIT / ${tokenId}` : 'APPOINTMENTS / NEW APPOINTMENT'}
        title={isEditing
          ? <>Edit Appointment <span className="dispatch-badge">{tokenId}</span></>
          : <>Book New Appointment <span className="dispatch-badge"><i /> Live Dispatch</span></>}
        description={isEditing
          ? 'Update the patient, doctor, date or slot for this appointment. Changes are saved to the same booking.'
          : 'Schedule a patient consultation with a specialist doctor and review real-time suite availability.'}
      />

      <div className="appointment-layout">
        <div className="appointment-main">
          <PatientIdentityCard patients={patients} selectedPatientId={selectedPatientId} onSelectPatient={setSelectedPatient} />
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
            wardAllocation={wardAllocation}
          />
        </div>

        <div className="right-rail">
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
            isEditing={isEditing}
          />
        </div>
      </div>
    </>
  );
}