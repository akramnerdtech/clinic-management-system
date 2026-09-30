import { useNavigate } from 'react-router-dom';
import { Lock, CalendarCheck2, Stethoscope, User, MapPin, Clock3, FileEdit, X, CheckCircle2, Building2 } from 'lucide-react';
import { IconButton } from '@/components/ui/IconButton';

interface Props {
  holdMinutesLabel: string;
  overview: {
    schedule: string;
    doctor: string;
    patient: string;
    suite: string;
    duration: string;
    ward?: string;
    room?: string;
    allocationReason?: string;
    features?: string[];
  };
  fee: string;
  feeNote: string;
  syncNote: string;
  status: string | null;
  onBook: () => void;
  onSaveDraft: () => void;
  isEditing?: boolean;
}

export function AppointmentOverviewCard({ holdMinutesLabel, overview, fee, feeNote, syncNote, status, onBook, onSaveDraft, isEditing = false }: Props) {
  const navigate = useNavigate();

  const rows = [
    { icon: CalendarCheck2, label: 'Selected Schedule', value: overview.schedule },
    { icon: Stethoscope, label: 'Attending Doctor', value: overview.doctor },
    { icon: User, label: 'Patient', value: overview.patient },
    ...(overview.ward ? [{ icon: Building2, label: 'Assigned Ward', value: overview.ward }] : []),
    { icon: MapPin, label: 'Room / Suite', value: overview.room || overview.suite },
    { icon: Clock3, label: 'Visit Duration', value: overview.duration },
  ];

  return (
    <section className="content-card side-card overview-card">
      <div className="slot-held">
        <span><Lock size={11} /> Slot Held in Cache:</span>
        <b>{holdMinutesLabel}</b>
      </div>

      <h2>Appointment Overview</h2>
      <div className="overview-rows">
        {rows.map((r) => (
          <div className="overview-row" key={r.label}>
            <span><r.icon size={12} /> {r.label}</span>
            <b>{r.value}</b>
          </div>
        ))}
      </div>

      <div className="fee-row">
        <span>Consultation Fee</span>
        <span>{fee}</span>
      </div>
      <p className="fee-note">{feeNote}</p>

      {status && <p className="fee-note">{status}</p>}

      <IconButton className="teal-button full-button" onClick={onBook}><CheckCircle2 size={14} /> {isEditing ? 'Update Appointment' : 'Book & Confirm Appointment'}</IconButton>
      <div className="overview-actions">
        {!isEditing && <IconButton className="soft-button" onClick={onSaveDraft}><FileEdit size={13} /> Save Draft</IconButton>}
        <IconButton className="white-button" onClick={() => navigate('/appointments')}><X size={13} /> Cancel</IconButton>
      </div>

      <div className="sync-guarantee">
        <CheckCircle2 size={13} />
        <p><b>Direct Sync Guarantee:</b> {syncNote}</p>
      </div>
    </section>
  );
}