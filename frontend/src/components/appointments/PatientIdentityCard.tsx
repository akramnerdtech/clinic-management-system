import { useState } from 'react';
import type { KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Repeat2, UserSquare2, UserPlus, History } from 'lucide-react';
import { IconButton } from '@/components/ui/IconButton';
import { useToast } from '@/utils/toast';
import type { AppointmentPatientInfo } from '@/types';

export function PatientIdentityCard({ patient }: { patient: AppointmentPatientInfo }) {
  const navigate = useNavigate();
  const toast = useToast();
  const [lookup, setLookup] = useState('');

  const goToPatients = () => navigate('/patients');
  const handleLookup = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && lookup.trim()) {
      toast.info(`Searching patients for "${lookup.trim()}"...`);
      navigate('/patients');
    }
  };

  return (
    <section className="content-card appointment-form-card">
      <div className="card-title icon-title">
        <div className="form-icon"><UserSquare2 size={16} /></div>
        <div>
          <h2>1. Patient Identification</h2>
        </div>
        <div className="header-actions">
          <IconButton className="white-button" onClick={goToPatients}>Select Existing</IconButton>
          <IconButton className="soft-button" onClick={() => navigate('/patients/new')}><UserPlus size={13} /> New Patient</IconButton>
        </div>
      </div>

      <div className="patient-identity-box">
        <img src={patient.avatar} alt={patient.name} />
        <div className="patient-identity-info">
          <div className="patient-identity-head">
            <h3>{patient.name}</h3>
            <span className="patient-id-chip">{patient.patientId}</span>
            <span className="doctor-status">{patient.insuranceBadge}</span>
          </div>
          <div className="meta-row">
            <span>{patient.age} yrs • {patient.gender}</span>
            <span>{patient.phone}</span>
          </div>
          <small className="last-visit"><History size={10} /> {patient.lastVisit}</small>
        </div>
        <button type="button" className="change-patient-btn" onClick={goToPatients}><Repeat2 size={12} /> Change<br />Patient</button>
      </div>

      <div className="quick-find-bar">
        <Search size={13} />
        <input
          placeholder="Lookup another patient by Name, MRN, National ID or Phone..."
          value={lookup}
          onChange={(e) => setLookup(e.target.value)}
          onKeyDown={handleLookup}
        />
        <span>Quick Find</span>
      </div>
    </section>
  );
}
