import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Pencil, Search, Trash2, UserPlus } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Metric } from '@/components/ui/Metric';
import { IconButton } from '@/components/ui/IconButton';
import { Modal } from '@/components/ui/Modal';
import { DoctorProfile } from '@/components/doctors/DoctorProfile';
import { useDoctors } from '@/hooks/useDoctors';
import { useToast } from '@/utils/toast';
import { downloadCsv } from '@/utils/exportFile';
import type { Doctor } from '@/types';

export function DoctorsPage() {
  const { doctors, metrics, updateDoctor, removeDoctor, setDutyStatus } = useDoctors();
  const [view, setView] = useState<'table' | 'cards'>('table');
  const [query, setQuery] = useState('');
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);
  const [editingDoctorName, setEditingDoctorName] = useState<string | null>(null);
  const navigate = useNavigate();
  const toast = useToast();

  const filtered = doctors.filter((d) =>
    `${d[0]} ${d[1]} ${d[2]}`.toLowerCase().includes(query.trim().toLowerCase()),
  );

  const handleExport = () => {
    downloadCsv('doctors-roster', ['Name', 'Specialty', 'Room & Wing', 'Working Days', 'Status', 'Patients'], doctors);
    toast.success('Physician roster exported.');
  };

  const updateEditingDoctorField = (index: number, value: string) => {
    setEditingDoctor((current) => {
      if (!current) return current;
      const updated: Doctor = [...current];
      updated[index] = value;
      return updated;
    });
  };

  return (
    <>
      <PageHeader
        eyebrow="MEDICAL STAFF ROSTER / CLINICAL OPERATIONS"
        title="Doctors"
        description="Manage physicians, medical specialties, consultation hours, and active floor status."
        actions={<>
          <IconButton className="white-button" onClick={handleExport}><Download size={14} /> Export Roster</IconButton>
          <IconButton className="teal-button" onClick={() => navigate('/doctors/new')}><UserPlus size={14} /> Add Doctor</IconButton>
        </>}
      />
      <div className="metrics-grid">
        {metrics.map((m) => <Metric key={m.label} {...m} />)}
      </div>
      <div className="filter-row">
        <div className="small-search">
          <Search size={12} />
          <input placeholder="Filter by name, ID, or suite..." value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <select><option>Neurology</option><option>All Specialties</option></select>
        <select><option>All Shifts</option></select>
        <div className="view-switch">
          <button className={view === 'table' ? 'selected' : ''} onClick={() => setView('table')}>▤ Table</button>
          <button className={view === 'cards' ? 'selected' : ''} onClick={() => setView('cards')}>▦ Cards</button>
        </div>
      </div>
      <div className="doctors-layout">
        <section className="content-card doctor-registry">
          <div className="card-title">
            <h2>Physician Registry <span className="count-chip">{filtered.length} Members</span></h2>
            <span className="floor-sync"><i /> Floor Sync Active</span>
          </div>
          {view === 'table' ? (
            <table>
              <thead>
                <tr><th>DOCTOR</th><th>SPECIALTY</th><th>ROOM & WING</th><th>WORKING DAYS</th><th>STATUS</th><th>PATIENTS</th><th>ACTIONS</th></tr>
              </thead>
              <tbody>
                {filtered.map((d) => (
                  <tr key={d[0]}>
                    <td>
                      <div className="doctor-cell">
                        <img src={d[6]} alt="" />
                        <div><b>{d[0]}</b><small>ID: #DOC-8821</small></div>
                      </div>
                    </td>
                    <td><span className="specialty-chip">{d[1]}</span></td>
                    <td><b>{d[2]}</b><small>East Tower, Fl 3</small></td>
                    <td>
                      <div className="days">
                        {d[3].split(' ').map((x, i) => <b className={i < 4 ? 'on' : ''} key={i}>{x}</b>)}
                      </div>
                    </td>
                    <td>
                      <label className="doctor-duty-control">
                        <input type="checkbox" checked={d[4] === 'ON DUTY'} onChange={(event) => setDutyStatus(d[0], event.target.checked)} aria-label={`${d[0]} duty status`} />
                        <span className="doctor-duty-switch" />
                        <span className={`doctor-duty-label ${d[4] === 'ON DUTY' ? 'on-duty' : 'off-duty'}`}>{d[4]}</span>
                      </label>
                    </td>
                    <td>{d[5]}</td>
                    <td className="doctor-row-actions">
                      <button type="button" className="patient-action-icon" title={`Edit ${d[0]}`} aria-label={`Edit ${d[0]}`} onClick={() => { setEditingDoctor([...d]); setEditingDoctorName(d[0]); }}>
                        <Pencil size={16} />
                      </button>
                      <button type="button" className="patient-action-icon delete-patient-icon" title={`Delete ${d[0]}`} aria-label={`Delete ${d[0]}`} onClick={() => {
                        removeDoctor(d[0]);
                        toast.success(`${d[0]} was removed from the roster.`);
                      }}>
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="doctor-cards">
              {filtered.map((d) => (
                <div className="doctor-card" key={d[0]}>
                  <img src={d[6]} alt="" />
                  <b>{d[0]}</b>
                  <span>{d[1]}</span>
                  <small>{d[2]} · {d[4]}</small>
                  <label className="doctor-duty-control">
                    <input type="checkbox" checked={d[4] === 'ON DUTY'} onChange={(event) => setDutyStatus(d[0], event.target.checked)} aria-label={`${d[0]} duty status`} />
                    <span className="doctor-duty-switch" />
                    <span className={`doctor-duty-label ${d[4] === 'ON DUTY' ? 'on-duty' : 'off-duty'}`}>{d[4]}</span>
                  </label>
                  <div className="doctor-card-actions">
                    <button type="button" className="patient-action-icon" title={`Edit ${d[0]}`} aria-label={`Edit ${d[0]}`} onClick={() => { setEditingDoctor([...d]); setEditingDoctorName(d[0]); }}>
                      <Pencil size={16} />
                    </button>
                    <button type="button" className="patient-action-icon delete-patient-icon" title={`Delete ${d[0]}`} aria-label={`Delete ${d[0]}`} onClick={() => {
                      removeDoctor(d[0]);
                      toast.success(`${d[0]} was removed from the roster.`);
                    }}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="pagination">
            Displaying 1–{filtered.length} of {filtered.length} total licensed specialists
            <div>
              <button onClick={() => toast.info("You're already on the first page.")}>‹</button>
              <b>1</b>
              <button onClick={() => toast.info('All matching doctors are shown on this page.')}>›</button>
            </div>
          </div>
        </section>
        {/* <DoctorProfile /> */}
      </div>
      {editingDoctor && (
        <Modal
          title="Edit doctor"
          subtitle="Update this physician's roster details."
              onClose={() => { setEditingDoctor(null); setEditingDoctorName(null); }}
          className="doctor-edit-modal"
          footer={<>
            <IconButton className="white-button" onClick={() => { setEditingDoctor(null); setEditingDoctorName(null); }}>Cancel</IconButton>
            <IconButton className="teal-button" onClick={() => {
              if (editingDoctorName) updateDoctor(editingDoctorName, editingDoctor);
              setEditingDoctor(null);
              setEditingDoctorName(null);
              toast.success(`${editingDoctor[0]} was updated.`);
            }}>Save Changes</IconButton>
          </>}
        >
          <div className="doctor-edit-form">
            <label><span>Doctor name</span><input value={editingDoctor[0]} onChange={(event) => updateEditingDoctorField(0, event.target.value)} /></label>
            <label><span>Specialty</span><input value={editingDoctor[1]} onChange={(event) => updateEditingDoctorField(1, event.target.value)} /></label>
            <label><span>Room / suite</span><input value={editingDoctor[2]} onChange={(event) => updateEditingDoctorField(2, event.target.value)} /></label>
            <label><span>Working days</span><input value={editingDoctor[3]} onChange={(event) => updateEditingDoctorField(3, event.target.value)} /></label>
            <label><span>Patient capacity</span><input value={editingDoctor[5]} onChange={(event) => updateEditingDoctorField(5, event.target.value)} /></label>
          </div>
        </Modal>
      )}
    </>
  );
}
