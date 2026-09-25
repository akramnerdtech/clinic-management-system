import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Download, MoreVertical, Plus, Search } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Metric } from '@/components/ui/Metric';
import { IconButton } from '@/components/ui/IconButton';
import { PatientDossier } from '@/components/patients/PatientDossier';
import { usePatients } from '@/hooks/usePatients';
import { useToast } from '@/utils/toast';
import { downloadCsv } from '@/utils/exportFile';

export function PatientsPage() {
  const { patients, metrics, dossierDetails } = usePatients();
  const [selected, setSelected] = useState(0);
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const toast = useToast();

  const filtered = patients.filter((p) =>
    `${p[0]} ${p[1]} ${p[3]}`.toLowerCase().includes(query.trim().toLowerCase()),
  );

  const handleExport = () => {
    downloadCsv('patients-registry', ['ID', 'Name', 'Age/Sex', 'Condition', 'Specialist', 'Last Visit', 'Email', 'Blood Group'], patients);
    toast.success('Patient registry exported.');
  };

  return (
    <>
      <PageHeader
        eyebrow="CLINICAL REGISTRY / OUTPATIENT RECORDS"
        title="Patients Registry"
        description="Search, manage and view all registered patients with comprehensive medical records and active appointment history."
        actions={<>
          <IconButton className="white-button" onClick={handleExport}><Download size={14} /> Export CSV</IconButton>
          <IconButton className="teal-button" onClick={() => navigate('/patients/new')}><Plus size={14} /> Add Patient</IconButton>
        </>}
      />
      <div className="metrics-grid">
        {metrics.map((m) => <Metric key={m.label} {...m} />)}
      </div>
      <div className="filter-row patient-filters">
        <div className="small-search">
          <Search size={14} />
          <input placeholder="Search patient by name, MRN, phone number, national ID..." value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <select><option>Gender: All</option></select>
        <select><option>Age: All Groups</option></select>
        <select><option>Department: All</option></select>
        <select><option>Status: All</option></select>
      </div>
      <div className="filter-tabs">
        <b>All Patients ({patients.length})</b>
        <span>Today's Schedule (24)</span>
        <span>Walk-in Triage (6)</span>
        <span>Chronic Care Program (312)</span>
      </div>
      <div className="patients-layout">
        <section className="content-card patient-table">
          <div className="card-title">
            <h2>PATIENT MASTER INDEX</h2>
            <span>{filtered.length} active records displayed</span>
          </div>
          <table>
            <thead>
              <tr><th>ID</th><th>PATIENT NAME</th><th>AGE / SEX</th><th>CONDITION</th><th>SPECIALIST</th><th>LAST VISIT</th><th>ACTIONS</th></tr>
            </thead>
            <tbody>
              {filtered.map((p, i) => (
                <tr key={p[0]} onClick={() => setSelected(i)} className={selected === i ? 'row-selected' : ''}>
                  <td><span className="patient-id">{p[0]}</span></td>
                  <td><b>{p[1]} {i === 0 && <AlertTriangle size={12} className="text-red" />}</b><small>{p[6]}</small></td>
                  <td>{p[2]}</td>
                  <td><span className="condition-chip">{p[3]}</span></td>
                  <td>{p[4]}</td>
                  <td>{p[5]}</td>
                  <td>
                    <button className="book-button" onClick={(e) => { e.stopPropagation(); navigate('/appointments/new'); }}>Book</button>
                    <MoreVertical size={14} onClick={(e) => { e.stopPropagation(); toast.info('More actions for this patient are not yet available.'); }} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="pagination">
            Showing 1–{filtered.length} of {patients.length} patients
            <div>
              <button onClick={() => toast.info("You're already on the first page.")}>Prev</button>
              <b>1</b>
              <button onClick={() => toast.info('All matching patients are shown on this page.')}>2</button>
              <button onClick={() => toast.info('All matching patients are shown on this page.')}>3</button>
              <button onClick={() => toast.info('All matching patients are shown on this page.')}>...</button>
              <button onClick={() => toast.info('All matching patients are shown on this page.')}>208</button>
              <button onClick={() => toast.info('All matching patients are shown on this page.')}>Next</button>
            </div>
          </div>
        </section>
        <PatientDossier patient={patients[selected]} details={dossierDetails} />
      </div>
    </>
  );
}
