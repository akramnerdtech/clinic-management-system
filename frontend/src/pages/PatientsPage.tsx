import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { AlertTriangle, Download, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Metric } from '@/components/ui/Metric';
import { IconButton } from '@/components/ui/IconButton';
import { usePatients } from '@/hooks/usePatients';
import { useToast } from '@/utils/toast';
import { downloadCsv } from '@/utils/exportFile';
import type { Patient } from '@/types';

export function PatientsPage() {
  const { patients, metrics, removePatient } = usePatients();
  const [query, setQuery] = useState('');
  const [exportRangeOpen, setExportRangeOpen] = useState(false);
  const [exportFrom, setExportFrom] = useState(todayDate());
  const [exportTo, setExportTo] = useState(todayDate());
  const navigate = useNavigate();
  const toast = useToast();
  const today = new Date();
  const todayDateKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const todayPatients = patients.filter((patient) => patient[9] === todayDateKey);

  const filtered = todayPatients.filter((p) =>
    `${p[0]} ${p[1]} ${p[3]}`.toLowerCase().includes(query.trim().toLowerCase()),
  );

  const handleExport = () => {
    if (!exportFrom || !exportTo || exportFrom > exportTo) {
      toast.error('Choose a valid date range.');
      return;
    }
    const exportPatients = patients.filter((patient) => Boolean(patient[9]) && patient[9]! >= exportFrom && patient[9]! <= exportTo);
    const exportRows = exportPatients.map((patient) => [
      patient[0], patient[1], patient[2], patient[3], patient[8] ?? '',
      patient[5], patient[6], patient[7], patient[9] ?? '',
    ]);
    downloadCsv(`patients-${exportFrom}-to-${exportTo}`, ['ID', 'Name', 'Age/Sex', 'Condition', 'Recommended Test', 'Last Visit', 'Email', 'Blood Group', 'Registration Date'], exportRows);
    toast.success(`${exportPatients.length} patient records exported.`);
    setExportRangeOpen(false);
  };

  const handleDeletePatient = (patient: Patient) => {
    removePatient(patient[0]);
    toast.success(`${patient[1]} was deleted from the patient registry.`);
  };

  return (
    <>
      <PageHeader
        eyebrow="CLINICAL REGISTRY / OUTPATIENT RECORDS"
        title="Patients Registry"
        description="Search, manage and view all registered patients with comprehensive medical records and active appointment history."
        actions={<>
          <IconButton className="white-button" onClick={() => setExportRangeOpen(true)}><Download size={14} /> Export by Date</IconButton>
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
        <b>Registered Today ({todayPatients.length})</b>
        <span>Today's Schedule (24)</span>
        <span>Walk-in Triage (6)</span>
        <span>Chronic Care Program (312)</span>
      </div>
      <div className="patients-layout patient-list-layout">
        <section className="content-card patient-table">
          <div className="card-title">
            <h2>PATIENT MASTER INDEX</h2>
            <span>{filtered.length} of {todayPatients.length} registered today</span>
          </div>
          <div className="registry-table-wrap">
            <table>
              <thead>
                <tr><th>ID</th><th>PATIENT NAME</th><th>AGE / SEX</th><th>CONDITION</th><th>RECOMMENDED TEST</th><th>LAST VISIT</th><th>ACTIONS</th></tr>
              </thead>
              <tbody>
                {filtered.map((p, i) => (
                  <tr key={p[0]}>
                    <td><span className="patient-id">{p[0]}</span></td>
                    <td><b>{p[1]} {i === 0 && <AlertTriangle size={12} className="text-red" />}</b><small>{p[6]}</small></td>
                    <td>{p[2]}</td>
                    <td><span className="condition-chip">{p[3]}</span></td>
                    <td>{p[8] || 'Not specified'}</td>
                    <td>{p[5]}</td>
                    <td className="patient-row-actions">
                      <button type="button" className="patient-action-icon" title={`Edit ${p[1]}`} aria-label={`Edit ${p[1]}`} onClick={() => navigate(`/patients/${encodeURIComponent(p[0])}/edit`)}>
                        <Pencil size={16} />
                      </button>
                      <button type="button" className="patient-action-icon delete-patient-icon" title={`Delete ${p[1]}`} aria-label={`Delete ${p[1]}`} onClick={() => handleDeletePatient(p)}>
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && <tr><td colSpan={7} className="patient-empty-row">{todayPatients.length ? 'No patients match this search.' : 'No patients have been registered today.'}</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="pagination">
            Showing {filtered.length} of {todayPatients.length} patients registered today
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
      </div>
      {exportRangeOpen && (
        <div className="modal-overlay" onClick={() => setExportRangeOpen(false)}>
          <section className="modal-card patient-export-modal" role="dialog" aria-modal="true" aria-labelledby="patient-export-title" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2 id="patient-export-title">Export patient records</h2>
                <p>Choose the registration date range to include.</p>
              </div>
              <button type="button" className="modal-close" aria-label="Close export dialog" onClick={() => setExportRangeOpen(false)}><X size={16} /></button>
            </div>
            <div className="patient-export-fields">
              <label><span>From</span><input type="date" value={exportFrom} max={exportTo || undefined} onChange={(event) => setExportFrom(event.target.value)} /></label>
              <label><span>To</span><input type="date" value={exportTo} min={exportFrom || undefined} onChange={(event) => setExportTo(event.target.value)} /></label>
            </div>
            <div className="modal-footer">
              <IconButton className="white-button" onClick={() => setExportRangeOpen(false)}>Cancel</IconButton>
              <IconButton className="teal-button" onClick={handleExport}><Download size={14} /> Download CSV</IconButton>
            </div>
          </section>
        </div>
      )}
    </>
  );
}

function todayDate(): string {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
}
