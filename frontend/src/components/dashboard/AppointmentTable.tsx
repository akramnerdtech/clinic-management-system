import { useNavigate } from 'react-router-dom';
import { useToast } from '@/utils/toast';
import type { AppointmentRow } from '@/types';

export function AppointmentTable({ rows }: { rows: AppointmentRow[] }) {
  const navigate = useNavigate();
  const toast = useToast();
  const notice = () => toast.info('All matching appointments are shown on this page.');
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr><th>TIME</th><th>PATIENT</th><th>AGE / SEX</th><th>DOCTOR & ROOM</th><th>REASON</th></tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r[0]}>
              <td><b className="time-dot" />{r[0]}</td>
              <td>
                <span className={`patient-dot dot-${i}`}>{r[1].slice(0, 2)}</span>
                <b>{r[1]}</b>
                <small>ID: PT-0084{i + 1}</small>
              </td>
              <td>{r[2]}</td>
              <td><b>{r[3]}</b><small>Suite {102 + i * 3} · Neuro</small></td>
              <td><span className="reason-chip">{r[4]}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="pagination">
        Showing {rows.length} of 24 scheduled appointments
        <div>
          <button onClick={notice}>‹</button><b>1</b><button onClick={notice}>2</button><button onClick={notice}>3</button><button onClick={notice}>›</button>
          <a style={{ cursor: 'pointer' }} onClick={() => navigate('/appointments')}>View All Appointments →</a>
        </div>
      </div>
    </div>
  );
}
