import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, UserPlus, UserRound } from 'lucide-react';
import { IconButton } from '@/components/ui/IconButton';
import type { Patient } from '@/types';

interface Props {
  patients: Patient[];
  selectedPatientId: string;
  onSelectPatient: (patientId: string) => void;
}

export function PatientIdentityCard({ patients, selectedPatientId, onSelectPatient }: Props) {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const filteredPatients = useMemo(() => patients.filter((patient) =>
    `${patient[0]} ${patient[1]} ${patient[3]}`.toLowerCase().includes(query.trim().toLowerCase()),
  ), [patients, query]);
  const selectedPatient = patients.find(([id]) => id === selectedPatientId);

  return (
    <section className="content-card appointment-form-card patient-select-card">
      <div className="card-title icon-title">
        <div className="form-icon"><UserRound size={17} /></div>
        <div>
          <h2>1. Select Patient</h2>
          <p>Choose a patient already registered in the clinic.</p>
        </div>
        <IconButton className="soft-button" onClick={() => navigate('/patients/new')}><UserPlus size={15} /> Add Patient</IconButton>
      </div>

      <label className="registered-patient-search">
        <Search size={17} />
        <input
          type="search"
          placeholder="Search by patient name, ID, or condition"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label="Search registered patients"
        />
      </label>

      {patients.length ? (
        <div className="registered-patient-list" role="group" aria-label="Registered patients">
          {filteredPatients.map((patient) => (
            <button
              type="button"
              id={`appointment-patient-${patient[0]}`}
              aria-pressed={selectedPatientId === patient[0]}
              key={patient[0]}
              className={`registered-patient-option ${selectedPatientId === patient[0] ? 'selected' : ''}`}
              onClick={() => onSelectPatient(patient[0])}
            >
              <span className="registered-patient-avatar">{patient[1].split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase()}</span>
              <span className="registered-patient-name"><b>{patient[1]}</b><small>{patient[0]} · {patient[3]}</small></span>
              <span className="registered-patient-age">{patient[2]}</span>
            </button>
          ))}
          {filteredPatients.length === 0 && <p className="patient-selector-empty">No registered patients match that search.</p>}
        </div>
      ) : (
        <div className="patient-selector-empty-state">
          <UserRound size={24} />
          <p>No registered patients yet.</p>
          <IconButton className="teal-button" onClick={() => navigate('/patients/new')}><UserPlus size={14} /> Register Patient</IconButton>
        </div>
      )}

      {selectedPatient && (
        <div className="selected-patient-summary">
          <span>Selected patient</span>
          <b>{selectedPatient[1]}</b>
          <small>{selectedPatient[0]} · {selectedPatient[2]}</small>
        </div>
      )}
    </section>
  );
}