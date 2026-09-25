import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Download, Plus, Search, SlidersHorizontal } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Metric } from '@/components/ui/Metric';
import { IconButton } from '@/components/ui/IconButton';
import { AppointmentsTable } from '@/components/appointments/AppointmentsTable';
import { useAppointments } from '@/hooks/useAppointments';
import { useToast } from '@/utils/toast';
import { downloadCsv } from '@/utils/exportFile';

export function AppointmentsPage() {
  const { metrics, tabs, entries, statusStyles } = useAppointments();
  const [tab, setTab] = useState(tabs[0]);
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const toast = useToast();

  const rows = (tab === 'All' ? entries : entries.filter((r) => r[10] === tab))
    .filter((r) => `${r[2]} ${r[3]} ${r[7]}`.toLowerCase().includes(query.trim().toLowerCase()));

  const handleExport = () => {
    downloadCsv(
      'appointments-summary',
      ['Time', 'Slot', 'Token', 'Patient', 'Age/Sex', 'Complaint', 'Note', 'Doctor', 'Room', 'Visit Type', 'Status'],
      entries,
    );
    toast.success('Appointment summary exported.');
  };

  return (
    <>
      <PageHeader
        eyebrow="OUTPATIENT DEPARTMENT / SCHEDULING"
        title="Appointments"
        description="Track today's schedule, waiting room status, and consultation progress across every suite."
        actions={<>
          <span className="live-sync"><i /> Live Sync: 10:42 AM</span>
          <IconButton className="white-button" onClick={handleExport}><Download size={14} /> Export Summary</IconButton>
          <IconButton className="white-button" onClick={() => toast.info('Table column settings are not available in this build.')}><SlidersHorizontal size={14} /> Table Settings</IconButton>
          <IconButton className="teal-button" onClick={() => navigate('/appointments/new')}><Plus size={14} /> New Appointment</IconButton>
        </>}
      />
      <div className="metrics-grid">
        {metrics.map((m) => <Metric key={m.label} {...m} />)}
      </div>
      <section className="content-card appointments-list-card">
        <div className="card-title">
          <div>
            <h2>Scheduled Appointments</h2>
            <p>Thursday, 24 September 2026</p>
          </div>
          <div className="inline-tools">
            <div className="small-search">
              <Search size={14} />
              <input placeholder="Search by patient, doctor, or token..." value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
            <IconButton className="soft-button" onClick={() => toast.info("Showing today's schedule.")}><Calendar size={13} /> Today</IconButton>
          </div>
        </div>
        <div className="tabs">
          {tabs.map((t) => <button key={t} className={tab === t ? 'selected' : ''} onClick={() => setTab(t)}>{t}</button>)}
        </div>
        <AppointmentsTable rows={rows} statusStyles={statusStyles} />
      </section>
    </>
  );
}
