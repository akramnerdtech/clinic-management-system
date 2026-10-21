import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  Download,
  Plus,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Metric } from '@/components/ui/Metric';
import { IconButton } from '@/components/ui/IconButton';
import { AppointmentsTable } from '@/components/appointments/AppointmentsTable';
import { useAppointments } from '@/hooks/useAppointments';
import { useToast } from '@/utils/toast';
import { ReportModal } from '@/components/reports/ReportModal';
import type { AppointmentEntry } from '@/types';

function toDateKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function normalizeDate(value?: string): string {
  if (!value) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '' : toDateKey(parsed);
}

function isEntryToday(entry: AppointmentEntry): boolean {
  const todayKey = toDateKey(new Date());
  return normalizeDate(entry[11]) === todayKey;
}

function matchesTab(entry: AppointmentEntry, currentTab: string): boolean {
  if (currentTab === 'All') return true;
  const status = (entry[10] || '').trim();
  if (currentTab === 'Pending') {
    return (
      status === 'Pending' ||
      status === 'Slot Booked' ||
      status === 'Waiting' ||
      status.toLowerCase().includes('pending')
    );
  }
  if (currentTab === 'Confirmed') {
    return status === 'Confirmed' || status === 'Slot Booked';
  }
  if (currentTab === 'Completed') {
    return status === 'Completed' || status.toLowerCase().includes('completed');
  }
  if (currentTab === 'Cancelled') {
    return status === 'Cancelled' || status.toLowerCase().includes('cancel');
  }
  return status.toLowerCase() === currentTab.toLowerCase();
}

export function AppointmentsPage() {
  const { metrics, tabs, entries, statusStyles, updateStatus, deleteEntry } =
    useAppointments();
  const [tab, setTab] = useState(tabs[0] || 'All');
  const [query, setQuery] = useState('');
  const [reportOpen, setReportOpen] = useState(false);
  const [filterTodayOnly, setFilterTodayOnly] = useState(false);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  const syncLabel = now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const navigate = useNavigate();
  const toast = useToast();
  const todayLabel = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const toggleTodayOnly = () => {
    if (filterTodayOnly) {
      setFilterTodayOnly(false);
      toast.info('Showing all scheduled dates.');
    } else {
      setFilterTodayOnly(true);
      toast.success("Showing today's schedule.");
    }
  };

  const rows = useMemo(() => {
    return entries
      .filter((r) => !filterTodayOnly || isEntryToday(r))
      .filter((r) => matchesTab(r, tab))
      .filter((r) => {
        const q = query.trim().toLowerCase();
        if (!q) return true;
        return `${r[2]} ${r[3]} ${r[7]} ${r[5]} ${r[8]} ${r[10]}`
          .toLowerCase()
          .includes(q);
      });
  }, [entries, filterTodayOnly, tab, query]);

  return (
    <>
      <PageHeader
        eyebrow="OUTPATIENT DEPARTMENT / SCHEDULING"
        title="Appointments"
        description="Track today's schedule, waiting room status, and consultation progress across every suite."
        actions={
          <>
            <span className="live-sync">
              <i /> Live Sync: {syncLabel}
            </span>
            <IconButton
              className="white-button"
              onClick={() => setReportOpen(true)}
            >
              <Download size={14} /> Export Summary
            </IconButton>
            <IconButton
              className="white-button"
              onClick={() =>
                toast.info(
                  'Table column settings are not available in this build.',
                )
              }
            >
              <SlidersHorizontal size={14} /> Table Settings
            </IconButton>
            <IconButton
              className="teal-button"
              onClick={() => navigate('/appointments/new')}
            >
              <Plus size={14} /> New Appointment
            </IconButton>
          </>
        }
      />

      <div className="metrics-grid">
        {metrics.map((m) => (
          <Metric
            key={m.label}
            {...m}
          />
        ))}
      </div>

      <section className="content-card appointments-list-card">
        <div className="card-title">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <h2>Scheduled Appointments</h2>
              {filterTodayOnly && (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: 11,
                    fontWeight: 700,
                    backgroundColor: '#e6f7f5',
                    color: '#007d72',
                    padding: '3px 9px',
                    borderRadius: 999,
                    border: '1px solid #bfeadf',
                  }}
                >
                  <Calendar size={12} /> Today Only ({rows.length})
                  <button
                    type="button"
                    onClick={() => setFilterTodayOnly(false)}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                      padding: 0,
                      display: 'flex',
                      alignItems: 'center',
                      color: '#007d72',
                    }}
                    title="Clear Today Filter"
                  >
                    <X size={12} />
                  </button>
                </span>
              )}
            </div>
            <p>{todayLabel}</p>
          </div>

          <div className="inline-tools">
            <div className="small-search">
              <Search size={14} />
              <input
                placeholder="Search by patient, doctor, or token..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <IconButton
              className={filterTodayOnly ? 'teal-button' : 'soft-button'}
              onClick={toggleTodayOnly}
              title="Toggle Today's Appointments Filter"
            >
              <Calendar size={13} /> {filterTodayOnly ? 'Today Active' : 'Today'}
            </IconButton>
          </div>
        </div>

        <div className="tabs">
          {tabs.map((t) => (
            <button
              key={t}
              className={tab === t ? 'selected' : ''}
              onClick={() => {
                setTab(t);
              }}
            >
              {t}
            </button>
          ))}
        </div>

        <AppointmentsTable
          rows={rows}
          statusStyles={statusStyles}
          onAttend={(tokenId) => {
            updateStatus(tokenId, 'In Consultation');
            toast.success(`Appointment ${tokenId} is now in consultation.`);
          }}
          onComplete={(tokenId) => {
            updateStatus(tokenId, 'Completed');
            toast.success(`Appointment ${tokenId} marked as Completed.`);
          }}
          onCancel={(tokenId) => {
            updateStatus(tokenId, 'Cancelled');
            toast.success(`Appointment ${tokenId} cancelled.`);
          }}
          onStatusChange={(tokenId, status) => {
            updateStatus(tokenId, status);
            toast.success(`Appointment ${tokenId} updated to ${status}.`);
          }}
          onDelete={(tokenId) => {
            deleteEntry(tokenId);
            toast.success(`Appointment ${tokenId} deleted.`);
          }}
        />
      </section>

      {reportOpen && (
        <ReportModal
          module="appointments"
          onClose={() => setReportOpen(false)}
        />
      )}
    </>
  );
}
