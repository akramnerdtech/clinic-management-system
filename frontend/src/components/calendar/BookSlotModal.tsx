import { useState, useEffect } from 'react';
import {
  CalendarClock,
  Check,
  Stethoscope,
  User,
  Clock,
  CheckCircle2,
  DoorClosed,
  Building2,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { IconButton } from '@/components/ui/IconButton';
import { patientsService } from '@/services/patientsService';
import { appointmentsService } from '@/services/appointmentsService';
import { newAppointmentService } from '@/services/newAppointmentService';
import {
  OPD_UNITS,
  CLINIC_ROOMS,
  getDoctorRoomAndOpd,
} from '@/services/wardAllocationService';
import { formatLongDate } from '@/utils/calendarDates';
import { useToast } from '@/utils/toast';
import type { AppointmentEntry, CalendarDoctorOption } from '@/types';

interface BookSlotModalProps {
  doctor: string;
  date: string;
  time: string;
  doctorOptions: CalendarDoctorOption[];
  onClose: () => void;
  onBookSuccess?: () => void;
}

export function BookSlotModal({
  doctor: initialDoctor,
  date,
  time,
  doctorOptions,
  onClose,
  onBookSuccess,
}: BookSlotModalProps) {
  const [patients, setPatients] = useState(() => patientsService.getPatients());
  const [selectedPatientId, setSelectedPatientId] = useState(patients[0]?.[0] || '');
  const [customPatientName, setCustomPatientName] = useState('');
  const [doctor, setDoctor] = useState(
    initialDoctor || doctorOptions[0]?.name || 'Dr. Registered',
  );

  // Initialize room & OPD according to doctor
  const selectedDoctorObj = doctorOptions.find((d) => d.name === doctor);
  const initialResolved = getDoctorRoomAndOpd({
    doctorName: doctor,
    specialty: selectedDoctorObj?.specialty,
    doctorSuite: selectedDoctorObj?.room,
  });

  const [assignedRoom, setAssignedRoom] = useState(initialResolved.room);
  const [assignedOpd, setAssignedOpd] = useState(initialResolved.opd);
  const [reason, setReason] = useState('Routine 15-Minute Clinical Review');
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  // Re-sync Room & OPD when doctor changes
  useEffect(() => {
    const docObj = doctorOptions.find((d) => d.name === doctor);
    const resolved = getDoctorRoomAndOpd({
      doctorName: doctor,
      specialty: docObj?.specialty,
      doctorSuite: docObj?.room,
    });
    setAssignedRoom(resolved.room);
    setAssignedOpd(resolved.opd);
  }, [doctor, doctorOptions]);

  const selectedPatient = patients.find((p) => p[0] === selectedPatientId);
  const patientDisplayName = selectedPatient ? selectedPatient[1] : customPatientName.trim();

  const handleConfirm = () => {
    if (!patientDisplayName) {
      toast.error('Please select an existing patient or type a patient name.');
      return;
    }

    setSubmitting(true);

    // If new quick patient name entered and not existing, save to patient directory
    let patientId = selectedPatient?.[0];
    let patientAgeSex = selectedPatient?.[2] || '32 / Unspecified';
    if (!selectedPatient) {
      patientId = `#MRN-${Date.now().toString().slice(-4)}`;
      const newPatientEntry = [
        patientId,
        patientDisplayName,
        patientAgeSex,
        reason || 'Outpatient Consultation',
        doctor,
        'Today',
        'patient@curaclinic.org',
        'O+',
        'Clinical Review',
        date,
      ] as import('@/types').Patient;
      patientsService.addPatient(newPatientEntry);
      setPatients(patientsService.getPatients());
    }

    const token = appointmentsService.getNextToken();
    const entry: AppointmentEntry = [
      time,
      '15 min slot',
      token,
      patientDisplayName,
      patientAgeSex,
      reason.trim() || 'Consultation',
      `Assigned to ${assignedRoom} (${assignedOpd}) via Master Calendar.`,
      doctor,
      assignedRoom,
      '15 Min Consultation',
      'Slot Booked',
      date,
      assignedOpd,
    ];

    appointmentsService.addEntry(entry);
    newAppointmentService.saveAppointmentToCalendar(entry);

    window.dispatchEvent(new CustomEvent('clinic-appointments-updated'));
    window.dispatchEvent(new CustomEvent('clinic-calendar-updated'));

    toast.success(
      `Slot ${time} booked for ${patientDisplayName} with ${doctor}. Assigned to ${assignedRoom} (${assignedOpd}). Marked Green on Master Calendar.`,
    );

    setSubmitting(false);
    onBookSuccess?.();
    onClose();
  };

  return (
    <Modal
      title="Book 15-Minute Slot"
      subtitle="Schedule this outpatient slot directly into the Master Calendar"
      onClose={onClose}
      footer={
        <>
          <IconButton
            className="white-button"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </IconButton>
          <IconButton
            className="teal-button auto-width"
            onClick={handleConfirm}
            disabled={submitting}
          >
            <CheckCircle2 size={14} />
            {submitting ? 'Booking Slot...' : 'Confirm & Book Slot'}
          </IconButton>
        </>
      }
    >
      <div className="book-slot-modal-body">
        {/* Slot Info Banner */}
        <div className="book-slot-summary-box">
          <div className="summary-chip green-chip">
            <Clock size={12} />
            <span>
              Time: <b>{time}</b> (15 min slot)
            </span>
          </div>
          <div className="summary-chip">
            <CalendarClock size={12} />
            <span>
              Date: <b>{date ? formatLongDate(date) : 'Today'}</b>
            </span>
          </div>
        </div>

        {/* Doctor Selector */}
        <div className="form-field-group">
          <label className="modal-label">
            <Stethoscope size={13} />
            <span>Assigned Doctor</span>
          </label>
          <select
            className="modal-select"
            value={doctor}
            onChange={(e) => setDoctor(e.target.value)}
          >
            {doctorOptions.length > 0 ? (
              doctorOptions.map((doc) => (
                <option key={doc.name} value={doc.name}>
                  {doc.name} ({doc.specialty} • {doc.room})
                </option>
              ))
            ) : (
              <option value={doctor}>{doctor}</option>
            )}
          </select>
          <small className="field-hint">
            Doctor availability: 15-min intervals during scheduled shift.
          </small>
        </div>

        {/* Room & OPD Logic (Which patient assigned which room and OPD) */}
        <div className="form-row-dual" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="form-field-group">
            <label className="modal-label">
              <DoorClosed size={13} />
              <span>Assigned Room / Suite</span>
            </label>
            <select
              className="modal-select"
              value={assignedRoom}
              onChange={(e) => setAssignedRoom(e.target.value)}
            >
              {CLINIC_ROOMS.map((rm) => (
                <option key={rm} value={rm.split(' ')[0]}>
                  {rm}
                </option>
              ))}
            </select>
          </div>

          <div className="form-field-group">
            <label className="modal-label">
              <Building2 size={13} />
              <span>Assigned OPD Unit</span>
            </label>
            <select
              className="modal-select"
              value={assignedOpd}
              onChange={(e) => setAssignedOpd(e.target.value)}
            >
              {OPD_UNITS.map((u) => (
                <option key={u.code} value={u.name}>
                  {u.name} ({u.floor})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Patient Selector */}
        <div className="form-field-group">
          <label className="modal-label">
            <User size={13} />
            <span>Patient Selection</span>
          </label>
          {patients.length > 0 ? (
            <select
              className="modal-select"
              value={selectedPatientId}
              onChange={(e) => setSelectedPatientId(e.target.value)}
            >
              {patients.map((pat) => (
                <option key={pat[0]} value={pat[0]}>
                  {pat[1]} ({pat[0]} • {pat[2]})
                </option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              className="modal-input"
              placeholder="Enter patient full legal name (e.g. Johnathan Miller)"
              value={customPatientName}
              onChange={(e) => setCustomPatientName(e.target.value)}
            />
          )}
          <small className="field-hint">
            {patients.length > 0
              ? 'Select registered patient from clinic EHR directory.'
              : 'No patients currently in registry. Type name for immediate quick intake.'}
          </small>
        </div>

        {/* Reason for Visit */}
        <div className="form-field-group">
          <label className="modal-label">
            <Check size={13} />
            <span>Reason for Visit / Complaint</span>
          </label>
          <input
            type="text"
            className="modal-input"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Follow-up consultation, Migraine review"
          />
        </div>

        {/* Green Notification Preview Banner */}
        <div className="slot-booked-preview-notice">
          <span className="live-dot green-dot" />
          <p>
            Upon booking, the <b>{time}</b> slot for <b>{doctor}</b> will be{' '}
            <strong style={{ color: '#059669' }}>marked green</strong> with status{' '}
            <span className="badge-preview">✓ Slot Booked</span> and allocated to{' '}
            <b>{assignedRoom}</b> • <b>{assignedOpd}</b> on the Master Calendar.
          </p>
        </div>
      </div>
    </Modal>
  );
}
