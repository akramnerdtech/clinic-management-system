import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronLeft, ChevronRight, Download, Plus, SlidersHorizontal, Stethoscope, DoorClosed } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { IconButton } from '@/components/ui/IconButton';
import { CalendarGrid } from '@/components/calendar/CalendarGrid';
import { SuiteUtilization } from '@/components/calendar/SuiteUtilization';
import { PhysicianShiftReference } from '@/components/calendar/PhysicianShiftReference';
import { useMasterCalendar } from '@/hooks/useMasterCalendar';
import { useToast } from '@/utils/toast';
import { downloadCsv } from '@/utils/exportFile';

const viewTabs = ['Day', 'Week', 'Month'];

export function MasterCalendarPage() {
  const {
    gridBounds, dayHeaders, weekRangeLabel, syncLabel, now, events,
    middayBanner, endBannerLabel, suiteUtilizationRows, roomStatuses, physicianShifts,
  } = useMasterCalendar();
  const [view, setView] = useState('Week');
  const navigate = useNavigate();
  const toast = useToast();

  const handleExport = () => {
    downloadCsv(
      'calendar-roster',
      ['Name', 'Department', 'Shift Start', 'Shift End', 'Station', 'Status', 'Visits'],
      physicianShifts.map((s) => [s.name, s.dept, s.shiftStart, s.shiftEnd, s.station, s.statusLabel, s.visits]),
    );
    toast.success('Calendar roster exported.');
  };

  return (
    <>
      <PageHeader
        eyebrow="OUTPATIENT SCHEDULING SYSTEM • LIVE BOARD"
        title="Master Calendar"
        description="Overview of scheduled patient visits, consultation rooms, and clinical time slots."
        actions={<>
          <span className="live-sync"><i /> {syncLabel}</span>
          <IconButton className="white-button" onClick={handleExport}><Download size={14} /> Export Roster</IconButton>
          <IconButton className="teal-button" onClick={() => navigate('/appointments/new')}><Plus size={14} /> Book Slot</IconButton>
        </>}
      />
      <div className="calendar-toolbar">
        <div className="view-switch">
          {viewTabs.map((t) => <button key={t} className={view === t ? 'selected' : ''} onClick={() => setView(t)}>{t}</button>)}
        </div>
        <div className="date-nav">
          <button className="white-button" onClick={() => toast.info("Already viewing today's schedule.")}>Today</button>
          <button onClick={() => toast.info('Only the current week is available in this demo calendar.')}><ChevronLeft size={13} /></button>
          <span>{weekRangeLabel}</span>
          <button onClick={() => toast.info('Only the current week is available in this demo calendar.')}><ChevronRight size={13} /></button>
        </div>
        <div className="spacer" />
        <button className="dropdown-btn" onClick={() => toast.info('Doctor filtering is not available in this demo build.')}><Stethoscope size={12} /> All Doctors (8 Active) <ChevronDown size={12} /></button>
        <button className="dropdown-btn" onClick={() => toast.info('Room filtering is not available in this demo build.')}><DoorClosed size={12} /> All Rooms (Suites 1-8) <ChevronDown size={12} /></button>
        <button className="dropdown-btn" onClick={() => toast.info('Status filtering is not available in this demo build.')}><SlidersHorizontal size={12} /> Status: All <ChevronDown size={12} /></button>
      </div>
      <section className="content-card calendar-card">
        <CalendarGrid
          startHour={gridBounds.startHour}
          endHour={gridBounds.endHour}
          dayHeaders={dayHeaders}
          events={events}
          middayBanner={middayBanner}
          endBannerLabel={endBannerLabel}
          now={now}
        />
      </section>
      <div className="calendar-bottom-grid">
        <SuiteUtilization rows={suiteUtilizationRows} roomStatuses={roomStatuses} />
        <PhysicianShiftReference shifts={physicianShifts} />
      </div>
    </>
  );
}
