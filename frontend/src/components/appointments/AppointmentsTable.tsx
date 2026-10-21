import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DoorOpen, Pencil, Trash2, CheckCircle2, XCircle, RotateCcw } from 'lucide-react';

import { useToast } from '@/utils/toast';
import { Modal } from '@/components/ui/Modal';
import type { AppointmentEntry } from '@/types';

function formatAppointmentDate(value?: string): string {
  if (!value) {
    return 'Date not recorded';
  }

  const match = value.match(
    /^(\d{4})-(\d{2})-(\d{2})$/,
  );

  const date = match
    ? new Date(
      Number(match[1]),
      Number(match[2]) - 1,
      Number(match[3]),
    )
    : new Date(value);

  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
}

export function AppointmentsTable({
  rows,
  statusStyles,
  onAttend,
  onComplete,
  onCancel,
  onDelete,
  onStatusChange,
}: {
  rows: AppointmentEntry[];
  statusStyles: Record<string, string>;
  onAttend: (tokenId: string) => void;
  onComplete?: (tokenId: string) => void;
  onCancel?: (tokenId: string) => void;
  onDelete: (tokenId: string) => void;
  onStatusChange?: (tokenId: string, status: string) => void;
}) {
  const toast = useToast();
  const navigate = useNavigate();
  const [deleteTarget, setDeleteTarget] =
    useState<AppointmentEntry | null>(null);

  const [selectedAppointment, setSelectedAppointment] =
    useState<AppointmentEntry | null>(null);

  const notice = () => {
    toast.info(
      'All matching appointments are shown on this page.',
    );
  };

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>TOKEN ID</th>
            <th>PATIENT PROFILE</th>
            <th>CHIEF COMPLAINT</th>
            <th>ASSIGNED DOCTOR & SUITE</th>
            <th>VISIT TYPE</th>
            <th>STATUS</th>
            <th>DETAILS</th>
            {/* <th>MANAGE</th> */}
            <th>ACTION</th>
          </tr>
        </thead>

        <tbody>
          {rows.map((r, index) => {
            const cancelled = r[10] === 'Cancelled';

            /*
             * IMPORTANT:
             * r[2] = token ID.
             *
             * Token IDs are not guaranteed to be unique.
             * Therefore, do NOT use:
             *
             * key={r[2]}
             *
             * We create a stable composite key using:
             * token + appointment date + time + index fallback.
             */
            const rowKey = [
              r[2],
              r[11] ?? '',
              r[0] ?? '',
              r[1] ?? '',
              index,
            ].join('-');

            return (
              <tr
                key={rowKey}
                className={
                  cancelled ? 'row-cancelled' : ''
                }
              >
                {/* TOKEN ID */}
                <td>
                  <span className="patient-id">
                    {r[2]}
                  </span>
                </td>

                {/* PATIENT PROFILE */}
                <td>
                  <span
                    className={`patient-dot dot-${index % 4
                      }`}
                  >
                    {r[3]
                      .split(' ')
                      .map((word) => word[0])
                      .join('')
                      .slice(0, 2)}
                  </span>

                  <b>{r[3]}</b>

                  <small>{r[4]}</small>
                </td>

                {/* CHIEF COMPLAINT */}
                <td>
                  <b>{r[5]}</b>

                  <small>{r[6]}</small>
                </td>

                {/* DOCTOR / SUITE & OPD */}
                <td>
                  <b>{r[7]}</b>

                  <small style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap', marginTop: 2 }}>
                    <DoorOpen size={11} style={{ flexShrink: 0 }} />
                    <span>{r[8]}</span>
                    {r[12] && (
                      <span className="specialty-chip" style={{ fontSize: '9px', padding: '1px 5px' }}>
                        {r[12].includes('•') ? r[12].split('•')[0].trim() : r[12]}
                      </span>
                    )}
                  </small>
                </td>

                {/* VISIT TYPE */}
                <td>
                  <span className="reason-chip">
                    {r[9]}
                  </span>
                </td>

                {/* STATUS */}
                <td>
                  <span
                    className={`status-pill ${statusStyles[r[10]] ?? ''
                      }`}
                  >
                    {r[10]}
                  </span>
                </td>

                {/* DETAILS */}
                <td>
                  <button
                    type="button"
                    className="appointment-detail-button"
                    onClick={() =>
                      setSelectedAppointment(r)
                    }
                  >
                    Details
                  </button>
                </td>

                {/* ACTION */}
                {/* <td className="appointment-list-actions">
                  {['Confirmed', 'Waiting'].includes(
                    r[10],
                  ) ? (
                    <button
                      type="button"
                      className="appointment-attend-button"
                      onClick={() => onAttend(r[2])}
                    >
                      Attend
                    </button>
                  ) : r[10] === 'In Consultation' ? (
                    <span className="appointment-attending-label">
                      Attending
                    </span>
                  ) : (
                    '—'
                  )}
                </td> */}

                {/* ACTION: EDIT / DELETE */}
                <td className="appointment-row-actions">
                  <button
                    type="button"
                    className="appointment-action-icon"
                    title={`Edit ${r[2]}`}
                    aria-label={`Edit appointment ${r[2]}`}
                    onClick={() =>
                      navigate(
                        `/appointments/${encodeURIComponent(r[2])}/edit`,
                      )
                    }
                  >
                    <Pencil size={15} />
                  </button>

                  <button
                    type="button"
                    className={`appointment-action-icon complete-appointment-icon ${r[10] === 'Completed' ? 'is-completed' : ''}`}
                    title={
                      r[10] === 'Completed'
                        ? `Appointment ${r[2]} is already completed`
                        : `Mark ${r[2]} as Completed`
                    }
                    aria-label={`Mark appointment ${r[2]} as completed`}
                    disabled={r[10] === 'Completed'}
                    onClick={() => onComplete?.(r[2])}
                    style={{
                      marginLeft: '10px',
                      color: r[10] === 'Completed' ? '#94a3b8' : '#059669',
                      borderColor: r[10] === 'Completed' ? '#e2e8f0' : '#a7f3d0',
                      backgroundColor: r[10] === 'Completed' ? '#f8fafc' : '#f0fdf4',
                      cursor: r[10] === 'Completed' ? 'default' : 'pointer',
                    }}
                  >
                    <CheckCircle2 size={15} />
                  </button>

                  <button
                    type="button"
                    className={`appointment-action-icon cancel-appointment-icon ${r[10] === 'Cancelled' ? 'is-cancelled' : ''}`}
                    title={
                      r[10] === 'Cancelled'
                        ? `Appointment ${r[2]} is already cancelled`
                        : `Cancel appointment ${r[2]}`
                    }
                    aria-label={`Cancel appointment ${r[2]}`}
                    disabled={r[10] === 'Cancelled'}
                    onClick={() => onCancel?.(r[2])}
                    style={{
                      marginLeft: '10px',
                      color: r[10] === 'Cancelled' ? '#94a3b8' : '#ef4444',
                      borderColor: r[10] === 'Cancelled' ? '#e2e8f0' : '#fecaca',
                      backgroundColor: r[10] === 'Cancelled' ? '#f8fafc' : '#fef2f2',
                      cursor: r[10] === 'Cancelled' ? 'default' : 'pointer',
                    }}
                  >
                    <XCircle size={15} />
                  </button>

                  <button
                    type="button"
                    className="appointment-action-icon delete-appointment-icon"
                    title={`Delete ${r[2]}`}
                    aria-label={`Delete appointment ${r[2]}`}
                    onClick={() => setDeleteTarget(r)}
                    style={{
                      marginLeft: '10px'
                    }}
                  >
                    <Trash2 size={15} />
                  </button>
                </td>
              </tr>
            );
          })}

          {rows.length === 0 && (
            <tr>
              <td
                colSpan={9}
                className="patient-empty-row"
              >
                No appointments match this search.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* PAGINATION */}
      <div className="pagination">
        Showing 1–{rows.length} of 24 scheduled
        appointments

        <div>
          <button
            type="button"
            onClick={notice}
            aria-label="Previous page"
          >
            ‹
          </button>

          <b>1</b>

          <button
            type="button"
            onClick={notice}
          >
            2
          </button>

          <button
            type="button"
            onClick={notice}
          >
            3
          </button>

          <button
            type="button"
            onClick={notice}
            aria-label="Next page"
          >
            ›
          </button>
        </div>
      </div>

      {/* DELETE CONFIRMATION MODAL */}
      {deleteTarget && (
        <Modal
          title="Delete appointment?"
          subtitle={`${deleteTarget[2]} · ${deleteTarget[3]}`}
          onClose={() => setDeleteTarget(null)}
          footer={
            <>
              <button
                type="button"
                className="appointment-detail-button"
                onClick={() => setDeleteTarget(null)}
              >
                Keep appointment
              </button>

              <button
                type="button"
                className="appointment-delete-confirm"
                onClick={() => {
                  onDelete(deleteTarget[2]);
                  setDeleteTarget(null);
                }}
              >
                Delete
              </button>
            </>
          }
        >
          <p>
            This will permanently remove the appointment for{' '}
            <b>{deleteTarget[3]}</b> with <b>{deleteTarget[7]}</b> and free
            the slot. This cannot be undone.
          </p>
        </Modal>
      )}

      {/* APPOINTMENT DETAILS MODAL */}
      {selectedAppointment && (
        <Modal
          title="Appointment details"
          subtitle={`${selectedAppointment[2]} · ${selectedAppointment[10]}`}
          onClose={() =>
            setSelectedAppointment(null)
          }
          className="appointment-details-modal"
          footer={
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {selectedAppointment[10] !== 'Completed' && (
                  <button
                    type="button"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '8px 14px',
                      borderRadius: 6,
                      backgroundColor: '#059669',
                      color: '#fff',
                      border: 'none',
                      fontWeight: 600,
                      fontSize: 13,
                      cursor: 'pointer',
                    }}
                    onClick={() => {
                      onComplete?.(selectedAppointment[2]);
                      setSelectedAppointment((prev) =>
                        prev ? ([...prev.slice(0, 10), 'Completed', ...prev.slice(11)] as AppointmentEntry) : null,
                      );
                    }}
                  >
                    <CheckCircle2 size={15} /> Mark as Completed
                  </button>
                )}

                {selectedAppointment[10] !== 'Cancelled' && (
                  <button
                    type="button"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '8px 14px',
                      borderRadius: 6,
                      backgroundColor: '#fff',
                      color: '#dc2626',
                      border: '1px solid #fecaca',
                      fontWeight: 600,
                      fontSize: 13,
                      cursor: 'pointer',
                    }}
                    onClick={() => {
                      onStatusChange?.(selectedAppointment[2], 'Cancelled');
                      setSelectedAppointment((prev) =>
                        prev ? ([...prev.slice(0, 10), 'Cancelled', ...prev.slice(11)] as AppointmentEntry) : null,
                      );
                    }}
                  >
                    <XCircle size={15} /> Cancel Appointment
                  </button>
                )}

                {(selectedAppointment[10] === 'Completed' || selectedAppointment[10] === 'Cancelled') && (
                  <button
                    type="button"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '8px 14px',
                      borderRadius: 6,
                      backgroundColor: '#f1f5f9',
                      color: '#334155',
                      border: '1px solid #cbd5e1',
                      fontWeight: 600,
                      fontSize: 13,
                      cursor: 'pointer',
                    }}
                    onClick={() => {
                      onStatusChange?.(selectedAppointment[2], 'Pending');
                      setSelectedAppointment((prev) =>
                        prev ? ([...prev.slice(0, 10), 'Pending', ...prev.slice(11)] as AppointmentEntry) : null,
                      );
                    }}
                  >
                    <RotateCcw size={15} /> Reopen (Set Pending)
                  </button>
                )}
              </div>

              <button
                type="button"
                className="appointment-detail-button"
                onClick={() => setSelectedAppointment(null)}
              >
                Close
              </button>
            </div>
          }
        >
          <div className="appointment-detail-grid">
            <div>
              <span>Appointment date</span>

              <b>
                {formatAppointmentDate(
                  selectedAppointment[11],
                )}
              </b>
            </div>

            <div>
              <span>Time and slot</span>

              <b>
                {selectedAppointment[0]} ·{' '}
                {selectedAppointment[1]}
              </b>
            </div>

            <div>
              <span>Patient</span>

              <b>{selectedAppointment[3]}</b>
            </div>

            <div>
              <span>Age / sex</span>

              <b>{selectedAppointment[4]}</b>
            </div>

            <div>
              <span>Doctor</span>

              <b>{selectedAppointment[7]}</b>
            </div>

            <div>
              <span>Assigned room</span>

              <b>{selectedAppointment[8]}</b>
            </div>

            <div>
              <span>Assigned OPD unit</span>

              <b>{selectedAppointment[12] || 'OPD-1 • General Medicine'}</b>
            </div>

            <div>
              <span>Visit type</span>

              <b>{selectedAppointment[9]}</b>
            </div>

            <div>
              <span>Status</span>

              <b>
                <span
                  className={`status-pill ${statusStyles[
                    selectedAppointment[10]
                  ] ?? ''
                    }`}
                >
                  {selectedAppointment[10]}
                </span>
              </b>
            </div>

            <div className="appointment-detail-wide">
              <span>Reason for visit</span>

              <b>
                {selectedAppointment[5]}
              </b>
            </div>

            <div className="appointment-detail-wide">
              <span>Notes</span>

              <b>
                {selectedAppointment[6] ||
                  'No notes recorded.'}
              </b>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}