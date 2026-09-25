import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Download, Plus, Search } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Metric } from '@/components/ui/Metric';
import { IconButton } from '@/components/ui/IconButton';
import { AppointmentTable } from '@/components/dashboard/AppointmentTable';
import { Availability } from '@/components/dashboard/Availability';
import { Vitals } from '@/components/dashboard/Vitals';
import { ActivityFeed } from '@/components/dashboard/ActivityFeed';
import { Traffic } from '@/components/dashboard/Traffic';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useToast } from '@/utils/toast';
import { downloadCsv } from '@/utils/exportFile';

export function DashboardPage() {
  const { metrics, tabs, appointmentRows, availabilityEntries, vitalsRows, activityItems, activityIcons, trafficPoints } = useDashboardData();
  const [tab, setTab] = useState(tabs[0]);
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const toast = useToast();

  const filteredRows = appointmentRows.filter((r) =>
    `${r[1]} ${r[3]} ${r[4]}`.toLowerCase().includes(query.trim().toLowerCase()),
  );

  const handleExport = () => {
    downloadCsv('dashboard-summary', ['Time', 'Patient', 'Age/Sex', 'Doctor & Room', 'Reason'], appointmentRows);
    toast.success('Dashboard summary exported.');
  };

  return (
    <>
      <PageHeader
        eyebrow="CLINICAL OPERATIONS / TODAY"
        title="Good Morning, Sarah"
        description="Here is what is happening at Central Clinic today · Thursday, 24 September 2026"
        actions={<>
          <span className="live-sync"><i /> Live Sync</span>
          <IconButton className="white-button" onClick={handleExport}><Download size={14} /> Export Summary</IconButton>
          <IconButton className="teal-button" onClick={() => navigate('/appointments/new')}><Plus size={14} /> New Appointment</IconButton>
        </>}
      />
      <div className="metrics-grid">
        {metrics.map((m) => <Metric key={m.label} {...m} />)}
      </div>
      <div className="dashboard-grid">
        <section className="content-card appointments-card">
          <div className="card-title">
            <div>
              <h2>Today's Appointments Queue</h2>
              <p>Real-time patient intake and status telemetry</p>
            </div>
            <div className="inline-tools">
              <div className="small-search">
                <Search size={14} />
                <input placeholder="Filter patient or room..." value={query} onChange={(e) => setQuery(e.target.value)} />
              </div>
              <IconButton className="soft-button" onClick={() => toast.info("Showing today's schedule.")}><Calendar size={13} /> Today</IconButton>
            </div>
          </div>
          <div className="tabs">
            {tabs.map((t) => <button key={t} className={tab === t ? 'selected' : ''} onClick={() => setTab(t)}>{t}</button>)}
          </div>
          <AppointmentTable rows={filteredRows} />
        </section>
        <div className="right-rail">
          <Availability entries={availabilityEntries} />
          <Vitals rows={vitalsRows} />
          <ActivityFeed items={activityItems} icons={activityIcons} />
        </div>
        <Traffic points={trafficPoints} />
      </div>
    </>
  );
}
