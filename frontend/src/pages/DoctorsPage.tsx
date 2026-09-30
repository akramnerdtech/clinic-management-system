import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Pencil, Search, Trash2, UserPlus, AlertTriangle } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Metric } from '@/components/ui/Metric';
import { IconButton } from '@/components/ui/IconButton';
import { Modal } from '@/components/ui/Modal';
import { useDoctors } from '@/hooks/useDoctors';
import { useToast } from '@/utils/toast';
import { downloadCsv } from '@/utils/exportFile';
import type { Doctor } from '@/types';

export function DoctorsPage() {
  const { doctors, metrics, updateDoctor, removeDoctor, clearAllDoctors, setDutyStatus } = useDoctors();
  const [view, setView] = useState<'table' | 'cards'>('table');
  const [query, setQuery] = useState('');
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);
  const [editingDoctorName, setEditingDoctorName] = useState<string | null>(null);
  const [doctorToDelete, setDoctorToDelete] = useState<Doctor | null>(null);
  const [clearAllModalOpen, setClearAllModalOpen] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();

  const filtered = doctors.filter((d) =>
    `${d[0]} ${d[1]} ${d[2]}`.toLowerCase().includes(query.trim().toLowerCase()),
  );

  const handleExport = () => {
    downloadCsv(
      'doctors-roster',
      ['Name', 'Specialty', 'Room & Wing', 'Working Days', 'Status', 'Patients'],
      doctors,
    );
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

  const confirmDeleteDoctor = () => {
    if (!doctorToDelete) return;
    const name = doctorToDelete[0];
    removeDoctor(name);
    toast.success(`${name} was successfully removed from the physician registry.`);
    setDoctorToDelete(null);
  };

  const confirmClearAll = () => {
    clearAllDoctors();
    toast.success('All doctor records have been permanently cleared.');
    setClearAllModalOpen(false);
  };

  return (
    <>
      <PageHeader
        eyebrow="MEDICAL STAFF ROSTER / CLINICAL OPERATIONS"
        title="Doctors"
        description="Manage physicians, medical specialties, consultation hours, and active floor status."
        actions={
          <>
            <IconButton className="white-button" onClick={handleExport}>
              <Download size={14} /> Export Roster
            </IconButton>
            {doctors.length > 0 && (
              <IconButton
                className="white-button"
                onClick={() => setClearAllModalOpen(true)}
                style={{ color: '#dc2626', borderColor: '#fca5a5' }}
              >
                <Trash2 size={14} /> Clear All Doctors
              </IconButton>
            )}
            <IconButton className="teal-button" onClick={() => navigate('/doctors/new')}>
              <UserPlus size={14} /> Add Doctor
            </IconButton>
          </>
        }
      />

      <div className="metrics-grid">
        {metrics.map((m) => (
          <Metric key={m.label} {...m} />
        ))}
      </div>

      <div className="filter-row">
        <div className="small-search">
          <Search size={12} />
          <input
            placeholder="Filter by name, ID, or suite..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <select>
          <option>All Specialties</option>
          <option>Neurology</option>
          <option>Cardiology</option>
          <option>Pediatrics</option>
          <option>Dermatology</option>
          <option>General Medicine</option>
        </select>
        <select>
          <option>All Shifts</option>
          <option>10:00 AM - 08:00 PM</option>
        </select>
        <div className="view-switch">
          <button
            className={view === 'table' ? 'selected' : ''}
            onClick={() => setView('table')}
          >
            ▤ Table
          </button>
          <button
            className={view === 'cards' ? 'selected' : ''}
            onClick={() => setView('cards')}
          >
            ▦ Cards
          </button>
        </div>
      </div>

      <div className="doctors-layout">
        <section className="content-card doctor-registry">
          <div className="card-title">
            <h2>
              Physician Registry{' '}
              <span className="count-chip">{filtered.length} Members</span>
            </h2>
            <span className="floor-sync">
              <i /> Floor Sync Active
            </span>
          </div>

          {view === 'table' ? (
            <table>
              <thead>
                <tr>
                  <th>DOCTOR</th>
                  <th>SPECIALTY</th>
                  <th>ROOM & WING</th>
                  <th>WORKING DAYS</th>
                  <th>STATUS</th>
                  <th>PATIENTS</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((d) => (
                  <tr key={d[0]}>
                    <td>
                      <div className="doctor-cell">
                        <img src={d[6]} alt="" />
                        <div>
                          <b>{d[0]}</b>
                          <small>ID: #DOC-{d[0].length * 142}</small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="specialty-chip">{d[1]}</span>
                    </td>
                    <td>
                      <b>{d[2]}</b>
                      <small>Clinical Wing</small>
                    </td>
                    <td>
                      <div className="days">
                        {d[3].split(' ').map((x, i) => (
                          <b className={i < 4 ? 'on' : ''} key={i}>
                            {x}
                          </b>
                        ))}
                      </div>
                    </td>
                    <td>
                      <label className="doctor-duty-control">
                        <input
                          type="checkbox"
                          checked={d[4] === 'ON DUTY'}
                          onChange={(event) =>
                            setDutyStatus(d[0], event.target.checked)
                          }
                          aria-label={`${d[0]} duty status`}
                        />
                        <span className="doctor-duty-switch" />
                        <span
                          className={`doctor-duty-label ${
                            d[4] === 'ON DUTY' ? 'on-duty' : 'off-duty'
                          }`}
                        >
                          {d[4]}
                        </span>
                      </label>
                    </td>
                    <td>{d[5]}</td>
                    <td className="doctor-row-actions">
                      <button
                        type="button"
                        className="patient-action-icon"
                        title={`Edit ${d[0]}`}
                        aria-label={`Edit ${d[0]}`}
                        onClick={() => {
                          setEditingDoctor([...d]);
                          setEditingDoctorName(d[0]);
                        }}
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        type="button"
                        className="patient-action-icon delete-patient-icon"
                        title={`Delete ${d[0]}`}
                        aria-label={`Delete ${d[0]}`}
                        onClick={() => setDoctorToDelete(d)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}

                {filtered.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      style={{
                        textAlign: 'center',
                        padding: '48px 16px',
                        color: '#64748b',
                      }}
                    >
                      <b style={{ display: 'block', fontSize: 15, color: '#1e293b' }}>
                        No physicians currently registered
                      </b>
                      <p style={{ marginTop: 6, fontSize: 13 }}>
                        Click &ldquo;+ Add Doctor&rdquo; above to register a physician with consultation hours and room assignments.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : (
            <div className="doctor-cards">
              {filtered.map((d) => (
                <div className="doctor-card" key={d[0]}>
                  <img src={d[6]} alt="" />
                  <b>{d[0]}</b>
                  <span>{d[1]}</span>
                  <small>
                    {d[2]} · {d[4]}
                  </small>
                  <label className="doctor-duty-control">
                    <input
                      type="checkbox"
                      checked={d[4] === 'ON DUTY'}
                      onChange={(event) =>
                        setDutyStatus(d[0], event.target.checked)
                      }
                      aria-label={`${d[0]} duty status`}
                    />
                    <span className="doctor-duty-switch" />
                    <span
                      className={`doctor-duty-label ${
                        d[4] === 'ON DUTY' ? 'on-duty' : 'off-duty'
                      }`}
                    >
                      {d[4]}
                    </span>
                  </label>
                  <div className="doctor-card-actions">
                    <button
                      type="button"
                      className="patient-action-icon"
                      title={`Edit ${d[0]}`}
                      aria-label={`Edit ${d[0]}`}
                      onClick={() => {
                        setEditingDoctor([...d]);
                        setEditingDoctorName(d[0]);
                      }}
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      type="button"
                      className="patient-action-icon delete-patient-icon"
                      title={`Delete ${d[0]}`}
                      aria-label={`Delete ${d[0]}`}
                      onClick={() => setDoctorToDelete(d)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}

              {filtered.length === 0 && (
                <div
                  style={{
                    gridColumn: '1 / -1',
                    textAlign: 'center',
                    padding: '48px 16px',
                    color: '#64748b',
                  }}
                >
                  <b style={{ display: 'block', fontSize: 15, color: '#1e293b' }}>
                    No physicians currently registered
                  </b>
                  <p style={{ marginTop: 6, fontSize: 13 }}>
                    Click &ldquo;+ Add Doctor&rdquo; above to register a physician with consultation hours and room assignments.
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="pagination">
            Displaying {filtered.length} of {doctors.length} licensed specialists
            <div>
              <button onClick={() => toast.info("You're already on the first page.")}>
                ‹
              </button>
              <b>1</b>
              <button
                onClick={() =>
                  toast.info('All matching doctors are shown on this page.')
                }
              >
                ›
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* Delete Confirmation Modal */}
      {doctorToDelete && (
        <Modal
          title="Delete Doctor"
          subtitle={`Are you sure you want to remove ${doctorToDelete[0]}?`}
          onClose={() => setDoctorToDelete(null)}
          footer={
            <>
              <IconButton
                className="white-button"
                onClick={() => setDoctorToDelete(null)}
              >
                Cancel
              </IconButton>
              <IconButton
                className="teal-button auto-width"
                style={{ backgroundColor: '#dc2626', borderColor: '#b91c1c' }}
                onClick={confirmDeleteDoctor}
              >
                <Trash2 size={14} /> Confirm Delete
              </IconButton>
            </>
          }
        >
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: '#fee2e2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#dc2626',
                flexShrink: 0,
              }}
            >
              <AlertTriangle size={20} />
            </div>
            <div>
              <p style={{ fontSize: 14, color: '#1e293b', margin: 0, fontWeight: 600 }}>
                This will delete {doctorToDelete[0]} ({doctorToDelete[1]}) from the clinic roster.
              </p>
              <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0 0' }}>
                Assigned suite: {doctorToDelete[2]}. All related schedule shifts will be updated.
              </p>
            </div>
          </div>
        </Modal>
      )}

      {/* Clear All Doctors Modal */}
      {clearAllModalOpen && (
        <Modal
          title="Clear All Doctor Records"
          subtitle="Are you sure you want to delete every registered doctor?"
          onClose={() => setClearAllModalOpen(false)}
          footer={
            <>
              <IconButton
                className="white-button"
                onClick={() => setClearAllModalOpen(false)}
              >
                Cancel
              </IconButton>
              <IconButton
                className="teal-button auto-width"
                style={{ backgroundColor: '#dc2626', borderColor: '#b91c1c' }}
                onClick={confirmClearAll}
              >
                <Trash2 size={14} /> Clear All Doctors
              </IconButton>
            </>
          }
        >
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: '#fee2e2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#dc2626',
                flexShrink: 0,
              }}
            >
              <AlertTriangle size={20} />
            </div>
            <div>
              <p style={{ fontSize: 14, color: '#1e293b', margin: 0, fontWeight: 600 }}>
                This will delete all {doctors.length} doctor records permanently.
              </p>
              <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0 0' }}>
                You can register new doctors anytime via the &ldquo;+ Add Doctor&rdquo; page.
              </p>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit Doctor Modal */}
      {editingDoctor && (
        <Modal
          title="Edit doctor"
          subtitle="Update this physician's roster details."
          onClose={() => {
            setEditingDoctor(null);
            setEditingDoctorName(null);
          }}
          className="doctor-edit-modal"
          footer={
            <>
              <IconButton
                className="white-button"
                onClick={() => {
                  setEditingDoctor(null);
                  setEditingDoctorName(null);
                }}
              >
                Cancel
              </IconButton>
              <IconButton
                className="teal-button"
                onClick={() => {
                  if (editingDoctorName)
                    updateDoctor(editingDoctorName, editingDoctor);
                  setEditingDoctor(null);
                  setEditingDoctorName(null);
                  toast.success(`${editingDoctor[0]} was updated.`);
                }}
              >
                Save Changes
              </IconButton>
            </>
          }
        >
          <div className="doctor-edit-form">
            <label>
              <span>Doctor name</span>
              <input
                value={editingDoctor[0]}
                onChange={(event) =>
                  updateEditingDoctorField(0, event.target.value)
                }
              />
            </label>
            <label>
              <span>Specialty</span>
              <input
                value={editingDoctor[1]}
                onChange={(event) =>
                  updateEditingDoctorField(1, event.target.value)
                }
              />
            </label>
            <label>
              <span>Room / suite</span>
              <input
                value={editingDoctor[2]}
                onChange={(event) =>
                  updateEditingDoctorField(2, event.target.value)
                }
              />
            </label>
            <label>
              <span>Working days</span>
              <input
                value={editingDoctor[3]}
                onChange={(event) =>
                  updateEditingDoctorField(3, event.target.value)
                }
              />
            </label>
            <label>
              <span>Patient capacity</span>
              <input
                value={editingDoctor[5]}
                onChange={(event) =>
                  updateEditingDoctorField(5, event.target.value)
                }
              />
            </label>
          </div>
        </Modal>
      )}
    </>
  );
}
