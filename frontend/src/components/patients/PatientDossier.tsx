import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock3, FileText, X } from 'lucide-react';
import { IconButton } from '@/components/ui/IconButton';
import { useToast } from '@/utils/toast';
import type { Patient } from '@/types';
import type { patientDossierDetails } from '@/data/patients';

interface PatientDossierProps {
  patient: Patient;
  details: typeof patientDossierDetails;
}

function EditIcon() {
  return <FileText size={15} />;
}

const CHECKIN_STATES = ['Confirm', 'Waiting', 'In Consult', 'Complete', 'Cancel'];

export function PatientDossier({ patient, details }: PatientDossierProps) {
  const navigate = useNavigate();
  const toast = useToast();
  const [checkinStatus, setCheckinStatus] = useState('Waiting');

  return (
    <section className="content-card patient-dossier">
      <div className="dossier-title">
        <h2>Patient Dossier <span>{patient[0]}</span></h2>
        <EditIcon />
        <X size={16} onClick={() => toast.info('Dossier view closed.')} />
      </div>
      <IconButton className="teal-button full-button" onClick={() => navigate('/appointments/new')}><Clock3 size={14} /> Book Appointment</IconButton>
      <div className="dossier-profile">
        <div className="patient-avatar">{patient[1].slice(0, 2)}</div>
        <div>
          <h2>{patient[1]}</h2>
          <p>{patient[2]} • Male • Blood Group: {patient[7]}</p>
        </div>
      </div>
      <div className="dossier-fields">
        <span>MEDICAL RECORD NUMBER<b>{details.medicalRecordNumber}</b></span>
        <span>PHONE<b>{details.phone}</b></span>
        <span>PRIMARY EMAIL<b>{patient[6]}</b></span>
      </div>
      <div className="alert-box">
        <b>◉ ALLERGY ALERT</b>
        <strong>{details.allergy}</strong>
      </div>
      <div className="diagnosis">
        <span>PRIMARY DIAGNOSIS <b>{details.diagnosis.label}</b></span>
        <strong>{details.diagnosis.title}</strong>
        <p>{details.diagnosis.description}</p>
      </div>
      <div className="upcoming-box">
        <b>▣ UPCOMING APPOINTMENT <span>{details.upcomingAppointment.when}</span></b>
        <p>{details.upcomingAppointment.reason}</p>
        <small>{details.upcomingAppointment.attending}</small>
      </div>
      <h4>DESK CHECK-IN STATUS:</h4>
      <div className="checkin">
        {CHECKIN_STATES.map((s) => (
          <button
            key={s}
            type="button"
            className={checkinStatus === s ? 'active' : ''}
            onClick={() => { setCheckinStatus(s); toast.success(`${patient[1]}'s check-in status set to "${s}".`); }}
          >
            {s}
          </button>
        ))}
      </div>
      <h4>RECENT ENCOUNTER HISTORY</h4>
      <div className="encounter">
        {details.encounterHistory.map((e) => (
          <p key={e.doctor + e.date}>
            <b>● {e.doctor}</b>
            <span>{e.date}</span>
            <small>{e.note}</small>
          </p>
        ))}
      </div>
      <h4>FRONT DESK TRIAGE MEMO <span>Auto-saved</span></h4>
      <p className="memo">{details.triageMemo}</p>
    </section>
  );
}
