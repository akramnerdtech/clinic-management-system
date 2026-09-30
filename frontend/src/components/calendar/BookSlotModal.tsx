import { useState } from 'react';
import { CalendarClock, Check, Stethoscope, User, Clock, CheckCircle2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { IconButton } from '@/components/ui/IconButton';
import { patientsService } from '@/services/patientsService';
import { appointmentsService } from '@/services/appointmentsService';
import { newAppointmentService } from '@/services/newAppointmentService';
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
  const patients = patientsService.getPatients();
  const [selectedPatientId, setSelectedPatientId] = useState(patients[0]?.[0] || '');
  const [doctor, setDoctor] = useState(initialDoctor || doctorOptions[0]?.name || 'Dr. XYZ');
  const [reason, setReason] = useState('Routine 15-Minute Clinical Review');
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  const selectedPatient = patients.find((p) => p[0] === selectedPatientId) || patients[0];
  const selectedDoctorObj = doctorOptions.find((d) => d.name === doctor);
  const suite = selectedDoctorObj?.room || 'Suite 105';

  const handleConfirm = () => {
    if (!selectedPatient) {
      toast.error('Please choose a patient.');
      return;
    }

    setSubmitting(true);

    const token = appointmentsService.getNextToken();
    const entry: AppointmentEntry = [
      time,
      '15 min slot',
      token,
      selectedPatient[1],
      selectedPatient[2],
      reason.trim() || 'Consultation',
      'Intake scheduled via Master Calendar Live Board.',
      doctor,
      suite,
      '15 Min Consultation',
      'Slot Booked',
      date,
    ];

    appointmentsService.addEntry(entry);
    newAppointmentService.saveAppointmentToCalendar(entry);

    window.dispatchEvent(new CustomEvent('clinic-appointments-updated'));
    window.dispatchEvent(new CustomEvent('clinic-calendar-updated'));

    toast.success(
      `Slot ${time} booked for ${selectedPatient[1]} with ${doctor}. Marked Green on Master Calendar.`,
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
          <IconButton className="white-button" onClick={onClose} disabled={submitting}>
            Cancel
          </IconButton>
          <IconButton className="teal-button auto-width" onClick={handleConfirm} disabled={submitting}>
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
            <span>Time: <b>{time}</b> (15 min slot)</span>
          </div>
          <div className="summary-chip">
            <CalendarClock size={12} />
            <span>Date: <b>{date ? formatLongDate(date) : 'Today'}</b></span>
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
            {doctorOptions.map((doc) => (
              <option key={doc.name} value={doc.name}>
                {doc.name} ({doc.specialty} • {doc.room})
              </option>
            ))}
          </select>
          <small className="field-hint">
            Doctor availability: 15-min intervals during active shift.
          </small>
        </div>

        {/* Patient Selector */}
        <div className="form-field-group">
          <label className="modal-label">
            <User size={13} />
            <span>Registered Patient</span>
          </label>
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

        {/* Green Notification Preview */}
        <div className="slot-booked-preview-notice">
          <span className="live-dot green-dot" />
          <p>
            Upon booking, the <b>{time}</b> schedule time for <b>{doctor}</b> will be{' '}
            <strong style={{ color: '#059669' }}>marked green</strong> with message{' '}
            <span className="badge-preview">✓ Slot Booked</span> on the Master Calendar.
          </p>
        </div>
      </div>
    </Modal>
  );
}
