import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Search, UserPlus } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Metric } from '@/components/ui/Metric';
import { IconButton } from '@/components/ui/IconButton';
import { DoctorProfile } from '@/components/doctors/DoctorProfile';
import { useDoctors } from '@/hooks/useDoctors';
import { useToast } from '@/utils/toast';
import { downloadCsv } from '@/utils/exportFile';

export function DoctorsPage() {
  const { doctors, metrics } = useDoctors();
  const [view, setView] = useState<'table' | 'cards'>('table');
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const toast = useToast();

  const filtered = doctors.filter((d) =>
    `${d[0]} ${d[1]} ${d[2]}`.toLowerCase().includes(query.trim().toLowerCase()),
  );

  const handleExport = () => {
    downloadCsv('doctors-roster', ['Name', 'Specialty', 'Room & Wing', 'Working Days', 'Status', 'Patients'], doctors);
    toast.success('Physician roster exported.');
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
          <Search size={14} />
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
                <tr><th>DOCTOR</th><th>SPECIALTY</th><th>ROOM & WING</th><th>WORKING DAYS</th><th>STATUS</th><th>PATIENTS</th></tr>
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
                    <td><span className="doctor-status">{d[4]}</span></td>
                    <td>{d[5]}</td>
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
        <DoctorProfile />
      </div>
    </>
  );
}
