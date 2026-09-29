import { useState } from 'react';
import { DoorOpen } from 'lucide-react';

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
}: {
  rows: AppointmentEntry[];
  statusStyles: Record<string, string>;
  onAttend: (tokenId: string) => void;
}) {
  const toast = useToast();

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
            <th>SLOT / TIME</th>
            <th>TOKEN ID</th>
            <th>PATIENT PROFILE</th>
            <th>CHIEF COMPLAINT</th>
            <th>ASSIGNED DOCTOR & SUITE</th>
            <th>VISIT TYPE</th>
            <th>STATUS</th>
            <th>DETAILS</th>
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
                {/* SLOT / TIME */}
                <td>
                  <b className="time-dot" />

                  {r[0]}

                  <small>{r[1]}</small>
                </td>

                {/* TOKEN ID */}
                <td>
                  <span className="patient-id">
                    {r[2]}
                  </span>
                </td>

                {/* PATIENT PROFILE */}
                <td>
                  <span
                    className={`patient-dot dot-${
                      index % 4
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

                {/* DOCTOR / SUITE */}
                <td>
                  <b>{r[7]}</b>

                  <small>
                    <DoorOpen size={10} />
                    {r[8]}
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
                    className={`status-pill ${
                      statusStyles[r[10]] ?? ''
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
                <td className="appointment-list-actions">
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

      {/* APPOINTMENT DETAILS MODAL */}
      {selectedAppointment && (
        <Modal
          title="Appointment details"
          subtitle={`${selectedAppointment[2]} · ${selectedAppointment[10]}`}
          onClose={() =>
            setSelectedAppointment(null)
          }
          className="appointment-details-modal"
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
              <span>Suite / room</span>

              <b>{selectedAppointment[8]}</b>
            </div>

            <div>
              <span>Visit type</span>

              <b>{selectedAppointment[9]}</b>
            </div>

            <div>
              <span>Status</span>

              <b>
                <span
                  className={`status-pill ${
                    statusStyles[
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