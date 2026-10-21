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
// import { DoctorProfile } from '@/components/doctors/DoctorProfile';
import { formatDoctorShifts } from '@/utils/doctorSchedule';
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
    `${d[0]} ${d[1]} ${d[2]} ${d[9] || ''}`.toLowerCase().includes(query.trim().toLowerCase()),
  );

  const handleExport = () => {
    downloadCsv(
      'doctors-roster',
      ['Name', 'Specialty', 'Room & Wing', 'Visiting Shifts', 'Working Days', 'Consultation Fee', 'Contact / WhatsApp', 'Status', 'Patients'],
      doctors.map((d) => [
        d[0],
        d[1],
        d[2],
        formatDoctorShifts(d[7]),
        d[3],
        d[8] || '₹800.00',
        d[9] || 'Not specified',
        d[4],
        d[5],
      ]),
    );
    toast.success('Physician roster exported with visiting hours, fees, and contact details.');
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
                  <th>VISITING HOURS & DAYS</th>
                  <th>FEE</th>
                  <th>STATUS</th>
                  {/* <th>PATIENTS</th> */}
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((d) => (
                  <tr key={d[0]}>
                    <td>
                      <div className="doctor-cell">
                        {d[6] ? (
                          <img src={d[6]} alt="" />
                        ) : (
                          <div
                            className="doctor-avatar-fallback"
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: '50%',
                              backgroundColor: '#f0fdfa',
                              color: '#0d9488',
                              border: '1.5px solid #99f6e4',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: 12,
                              flexShrink: 0,
                            }}
                          >
                            {d[0].replace(/^Dr\.\s*/i, '').slice(0, 2).toUpperCase() || 'DR'}
                          </div>
                        )}
                        <div>
                          <b>{d[0]}</b>
                          <small>
                            ID: #DOC-{d[0].length * 142}
                            {d[9] ? ` • 💬 ${d[9]}` : ''}
                          </small>
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
                      <div style={{ display: 'flex', gap: 4, marginBottom: 4, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: '#fef3c7', color: '#92400e', fontWeight: 600 }}>
                          10:00 AM – 12:00 PM
                        </span>
                        <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: '#e0e7ff', color: '#3730a3', fontWeight: 600 }}>
                          06:00 PM – 08:00 PM
                        </span>
                      </div>
                      <div className="days">
                        {d[3].split(' ').map((x, i) => (
                          <b className={i < 4 ? 'on' : ''} key={i}>
                            {x}
                          </b>
                        ))}
                      </div>
                    </td>
                    <td>
                      <b style={{ color: '#007d72', fontSize: 13 }}>{d[8] || '₹800.00'}</b>
                      <small>per 15 min</small>
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
                          className={`doctor-duty-label ${d[4] === 'ON DUTY' ? 'on-duty' : 'off-duty'
                            }`}
                        >
                          {d[4]}
                        </span>
                      </label>
                    </td>
                    {/* <td>{d[5]}</td> */}
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
                  {d[6] ? (
                    <img src={d[6]} alt="" />
                  ) : (
                    <div
                      className="doctor-avatar-fallback"
                      style={{
                        width: 54,
                        height: 54,
                        borderRadius: '50%',
                        backgroundColor: '#f0fdfa',
                        color: '#0d9488',
                        border: '2px solid #99f6e4',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: 16,
                        margin: '0 auto 8px',
                      }}
                    >
                      {d[0].replace(/^Dr\.\s*/i, '').slice(0, 2).toUpperCase() || 'DR'}
                    </div>
                  )}
                  <b>{d[0]}</b>
                  <span>{d[1]}</span>
                  {d[9] && (
                    <span style={{ fontSize: 11, color: '#059669', background: '#ecfdf5', padding: '2px 8px', borderRadius: 12, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      💬 {d[9]}
                    </span>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3, margin: '6px 0', fontSize: 11 }}>
                    <span style={{ background: '#fef3c7', color: '#92400e', padding: '1px 6px', borderRadius: 4, fontWeight: 600 }}>
                      ☀️ Morning: 10:00 – 12:00
                    </span>
                    <span style={{ background: '#e0e7ff', color: '#3730a3', padding: '1px 6px', borderRadius: 4, fontWeight: 600 }}>
                      🌙 Evening: 18:00 – 20:00
                    </span>
                  </div>
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
                      className={`doctor-duty-label ${d[4] === 'ON DUTY' ? 'on-duty' : 'off-duty'
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
        {/* <DoctorProfile /> */}
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
            <div style={{ padding: '10px 12px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0', margin: '4px 0' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', display: 'block', marginBottom: 8 }}>
                Visiting Hours Configuration (Two Shifts / Day)
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div style={{ background: '#fefce8', padding: '8px 10px', borderRadius: 6, border: '1px solid #fef08a' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#854d0e', display: 'block' }}>
                    ☀️ Morning Shift
                  </span>
                  <span style={{ fontSize: 12, color: '#475569', marginTop: 4, display: 'block' }}>
                    10:00 AM – 12:00 PM
                  </span>
                </div>
                <div style={{ background: '#eef2ff', padding: '8px 10px', borderRadius: 6, border: '1px solid #c7d2fe' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#3730a3', display: 'block' }}>
                    🌙 Evening Shift
                  </span>
                  <span style={{ fontSize: 12, color: '#475569', marginTop: 4, display: 'block' }}>
                    06:00 PM – 08:00 PM
                  </span>
                </div>
              </div>
            </div>
            <label>
              <span>WhatsApp / Contact Mobile Number</span>
              <input
                value={editingDoctor[9] || ''}
                onChange={(event) =>
                  updateEditingDoctorField(9, event.target.value)
                }
                placeholder="e.g. +91 98765 43210"
              />
            </label>
            <label>
              <span>Consultation fee (₹ INR)</span>
              <input
                value={editingDoctor[8] || '₹800.00'}
                onChange={(event) =>
                  updateEditingDoctorField(8, event.target.value)
                }
                placeholder="e.g. ₹800.00"
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
