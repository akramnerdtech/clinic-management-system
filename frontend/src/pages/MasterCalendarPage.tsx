import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Download, Plus, SlidersHorizontal, DoorClosed, FilterX } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { IconButton } from '@/components/ui/IconButton';
import { CalendarGrid } from '@/components/calendar/CalendarGrid';
import { MonthGrid } from '@/components/calendar/MonthGrid';
import { DoctorFilter } from '@/components/calendar/DoctorFilter';
import { FilterDropdown } from '@/components/calendar/FilterDropdown';
import { EventDetailsModal } from '@/components/calendar/EventDetailsModal';
import { SuiteUtilization } from '@/components/calendar/SuiteUtilization';
import { PhysicianShiftReference } from '@/components/calendar/PhysicianShiftReference';
import { useMasterCalendar } from '@/hooks/useMasterCalendar';
import { CALENDAR_VIEWS, viewNoun } from '@/utils/calendarDates';
import { useToast } from '@/utils/toast';
import { downloadCsv } from '@/utils/exportFile';
import type { CalendarEvent } from '@/types';

export function MasterCalendarPage() {
  const {
    gridBounds, syncLabel, now, events, today, columns, monthWeeks,
    middayBanner, endBannerLabel, suiteUtilizationRows, roomStatuses, physicianShifts,
    view, setView, rangeLabel, goToday, goPrev, goNext, openDay,
    doctorOptions, selectedDoctor, setSelectedDoctor, appointmentCounts, totalAppointments,
    roomOptions, selectedRoom, setSelectedRoom, roomTotal,
    statusOptions, selectedStatus, setSelectedStatus, statusTotal,
    hasActiveFilters, clearFilters,
  } = useMasterCalendar();
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
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

  /** Physician cards filter the calendar; the doctor must still exist in the live roster. */
  const handleSelectDoctorCard = (name: string | null) => {
    if (name && !doctorOptions.some((d) => d.name === name)) {
      toast.info(`${name} is no longer on the doctor roster.`);
      return;
    }
    setSelectedDoctor(name);
    document.querySelector('.calendar-toolbar')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  const emptyMessage = events.length > 0
    ? undefined
    : hasActiveFilters
      ? 'No appointments match the selected filters in this period.'
      : 'No appointments scheduled in this period.';

  const noun = viewNoun(view);

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
        <div className="toolbar-stack">
          <div className="view-switch">
            {CALENDAR_VIEWS.map((t) => (
              <button key={t} className={view === t ? 'selected' : ''} aria-pressed={view === t} onClick={() => setView(t)}>{t}</button>
            ))}
          </div>
          <DoctorFilter
            doctors={doctorOptions}
            counts={appointmentCounts}
            totalAppointments={totalAppointments}
            selected={selectedDoctor}
            onSelect={setSelectedDoctor}
          />
        </div>
        <div className="date-nav">
          <button className="white-button" onClick={goToday}>Today</button>
          <button onClick={goPrev} aria-label={`Previous ${noun}`} title={`Previous ${noun}`}><ChevronLeft size={13} /></button>
          <span>{rangeLabel}</span>
          <button onClick={goNext} aria-label={`Next ${noun}`} title={`Next ${noun}`}><ChevronRight size={13} /></button>
        </div>
        <div className="spacer" />
        {hasActiveFilters && (
          <button className="dropdown-btn clear-filters" onClick={clearFilters}><FilterX size={12} /> Clear filters</button>
        )}
        <FilterDropdown
          icon={<DoorClosed size={12} />}
          allLabel="All Rooms (Suites 1-8)"
          prefix="Room"
          resetLabel="All rooms"
          options={roomOptions}
          totalCount={roomTotal}
          selected={selectedRoom}
          onSelect={setSelectedRoom}
        />
        <FilterDropdown
          icon={<SlidersHorizontal size={12} />}
          allLabel="Status: All"
          prefix="Status"
          resetLabel="All statuses"
          options={statusOptions}
          totalCount={statusTotal}
          selected={selectedStatus}
          onSelect={setSelectedStatus}
        />
      </div>
      <section className="content-card calendar-card">
        {view === 'Month' ? (
          <MonthGrid
            weeks={monthWeeks}
            events={events}
            today={today}
            emptyMessage={emptyMessage}
            onOpenDay={openDay}
            onSelectEvent={setSelectedEvent}
          />
        ) : (
          <CalendarGrid
            startHour={gridBounds.startHour}
            endHour={gridBounds.endHour}
            columns={columns}
            events={events}
            middayBanner={middayBanner}
            endBannerLabel={endBannerLabel}
            now={now}
            emptyMessage={emptyMessage}
            onSelectEvent={setSelectedEvent}
          />
        )}
      </section>
      <div className="calendar-bottom-grid">
        <SuiteUtilization rows={suiteUtilizationRows} roomStatuses={roomStatuses} />
        <PhysicianShiftReference shifts={physicianShifts} selectedDoctor={selectedDoctor} onSelectDoctor={handleSelectDoctorCard} />
      </div>
      {selectedEvent && (
        <EventDetailsModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onOpenAppointments={() => navigate('/appointments')}
        />
      )}
    </>
  );
}
