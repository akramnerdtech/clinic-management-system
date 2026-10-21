import { useNavigate } from 'react-router-dom';
import { CalendarDays, Plus } from 'lucide-react';
import { useToast } from '@/utils/toast';
import type { AppointmentRow } from '@/types';

export function AppointmentTable({ rows }: { rows: AppointmentRow[] }) {
  const navigate = useNavigate();
  const toast = useToast();
  const notice = () => toast.info('All matching appointments are shown on this page.');

  if (rows.length === 0) {
    return (
      <div
        style={{
          padding: '48px 20px',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            background: 'var(--card-bg, #f0fdfa)',
            color: '#007d72',
            border: '1.5px solid #99f6e4',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <CalendarDays size={20} />
        </div>
        <div>
          <b style={{ fontSize: 14, color: 'var(--text-main, #182236)', display: 'block' }}>
            No appointments in this queue
          </b>
          <p style={{ fontSize: 12, color: 'var(--text-muted, #687285)', margin: '4px 0 0 0' }}>
            No patient appointments scheduled for this filter.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/appointments/new')}
          style={{
            marginTop: 4,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: '#007d72',
            color: '#fff',
            border: 0,
            borderRadius: 4,
            padding: '8px 16px',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <Plus size={14} /> Book New Appointment
        </button>
      </div>
    );
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>TIME</th>
            <th>PATIENT</th>
            <th>AGE / SEX</th>
            <th>DOCTOR & SUITE</th>
            <th>REASON / NOTES</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={`${r[0]}-${r[1]}-${i}`}>
              <td>
                <b className="time-dot" />
                {r[0]}
              </td>
              <td>
                <span className={`patient-dot dot-${i % 5}`}>{r[1].slice(0, 2).toUpperCase()}</span>
                <b>{r[1]}</b>
              </td>
              <td>{r[2]}</td>
              <td>
                <b>{r[3]}</b>
              </td>
              <td>
                <span className="reason-chip">{r[4]}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="pagination">
        Showing {rows.length} of {rows.length} scheduled appointments
        <div>
          <button onClick={notice}>‹</button>
          <b>1</b>
          <button onClick={notice}>›</button>
          <a style={{ cursor: 'pointer', marginLeft: 12 }} onClick={() => navigate('/appointments')}>
            View All Appointments →
          </a>
        </div>
      </div>
    </div>
  );
}
