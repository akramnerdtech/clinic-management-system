import { DoorOpen } from 'lucide-react';
import { useToast } from '@/utils/toast';
import type { AppointmentEntry } from '@/types';

export function AppointmentsTable({ rows, statusStyles }: { rows: AppointmentEntry[]; statusStyles: Record<string, string> }) {
  const toast = useToast();
  const notice = () => toast.info('All matching appointments are shown on this page.');
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
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const cancelled = r[10] === 'Cancelled';
            return (
              <tr key={r[2]} className={cancelled ? 'row-cancelled' : ''}>
                <td><b className="time-dot" />{r[0]}<small>{r[1]}</small></td>
                <td><span className="patient-id">{r[2]}</span></td>
                <td>
                  <span className={`patient-dot dot-${i % 4}`}>{r[3].split(' ').map((w) => w[0]).join('').slice(0, 2)}</span>
                  <b>{r[3]}</b>
                  <small>{r[4]}</small>
                </td>
                <td><b>{r[5]}</b><small>{r[6]}</small></td>
                <td><b>{r[7]}</b><small><DoorOpen size={10} /> {r[8]}</small></td>
                <td><span className="reason-chip">{r[9]}</span></td>
                <td><span className={`status-pill ${statusStyles[r[10]] ?? ''}`}>{r[10]}</span></td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="pagination">
        Showing 1–{rows.length} of 24 scheduled appointments
        <div>
          <button onClick={notice}>‹</button><b>1</b><button onClick={notice}>2</button><button onClick={notice}>3</button><button onClick={notice}>›</button>
        </div>
      </div>
    </div>
  );
}
