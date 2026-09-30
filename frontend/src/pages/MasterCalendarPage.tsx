import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Plus,
  SlidersHorizontal,
  DoorClosed,
  FilterX,
  CheckCircle2,
  Clock,
} from 'lucide-react';

import { PageHeader } from '@/components/ui/PageHeader';
import { IconButton } from '@/components/ui/IconButton';
import { CalendarGrid } from '@/components/calendar/CalendarGrid';
import { MonthGrid } from '@/components/calendar/MonthGrid';
import { DoctorFilter } from '@/components/calendar/DoctorFilter';
import { FilterDropdown } from '@/components/calendar/FilterDropdown';
import { EventDetailsModal } from '@/components/calendar/EventDetailsModal';
import { BookSlotModal } from '@/components/calendar/BookSlotModal';
import { SuiteUtilization } from '@/components/calendar/SuiteUtilization';
import { PhysicianShiftReference } from '@/components/calendar/PhysicianShiftReference';
import { useMasterCalendar } from '@/hooks/useMasterCalendar';
import { CALENDAR_VIEWS, viewNoun } from '@/utils/calendarDates';
import { useToast } from '@/utils/toast';
import { downloadCsv } from '@/utils/exportFile';
import type { CalendarEvent } from '@/types';

export function MasterCalendarPage() {
  const {
    gridBounds,
    syncLabel,
    now,
    events,
    today,
    columns,
    monthWeeks,
    middayBanner,
    endBannerLabel,
    suiteUtilizationRows,
    roomStatuses,
    physicianShifts,

    view,
    setView,
    rangeLabel,
    goToday,
    goPrev,
    goNext,
    openDay,

    doctorOptions,
    selectedDoctor,
    setSelectedDoctor,
    appointmentCounts,
    totalAppointments,

    roomOptions,
    selectedRoom,
    setSelectedRoom,
    roomTotal,

    statusOptions,
    selectedStatus,
    setSelectedStatus,
    statusTotal,

    hasActiveFilters,
    clearFilters,
    refreshEvents,
    getDoctorSchedule,
  } = useMasterCalendar();

  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [bookingSlotModal, setBookingSlotModal] = useState<{
    isOpen: boolean;
    doctor: string;
    date: string;
    time: string;
  } | null>(null);

  const navigate = useNavigate();
  const toast = useToast();

  const handleExport = () => {
    downloadCsv(
      'calendar-roster',
      [
        'Name',
        'Department',
        'Shift Start',
        'Shift End',
        'Station',
        'Status',
        'Visits',
      ],
      physicianShifts.map((s) => [
        s.name,
        s.dept,
        s.shiftStart,
        s.shiftEnd,
        s.station,
        s.statusLabel,
        s.visits,
      ]),
    );

    toast.success('Calendar roster exported.');
  };

  const handleSelectDoctorCard = (name: string | null) => {
    if (name && !doctorOptions.some((doctor) => doctor.name === name)) {
      toast.info(`${name} is no longer on the doctor roster.`);
      return;
    }

    setSelectedDoctor(name);

    document.querySelector('.calendar-toolbar')?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
    });
  };

  const handleOpenSlotClick = (doctor: string, date: string, time: string) => {
    setBookingSlotModal({
      isOpen: true,
      doctor,
      date,
      time,
    });
  };

  const handleBookSlotHeaderClick = () => {
    const defaultDoctor = selectedDoctor || doctorOptions[0]?.name || 'Dr. XYZ';
    const activeDate = columns.find((c) => c.today)?.iso || columns[0]?.iso || today;
    setBookingSlotModal({
      isOpen: true,
      doctor: defaultDoctor,
      date: activeDate,
      time: '03:30 PM - 03:45 PM',
    });
  };

  const emptyMessage =
    events.length > 0
      ? undefined
      : hasActiveFilters
        ? 'No appointments match the selected filters in this period.'
        : 'No appointments scheduled in this period.';

  const noun = viewNoun(view);
  const selectedDoctorObj = doctorOptions.find((d) => d.name === selectedDoctor);

  return (
    <>
      <PageHeader
        eyebrow="OUTPATIENT SCHEDULING SYSTEM • LIVE BOARD"
        title="Master Calendar"
        description="Overview of scheduled patient visits, consultation rooms, and clinical 15-minute time slots."
        actions={
          <>
            <span className="live-sync">
              <i />
              {syncLabel}
            </span>

            <IconButton className="white-button" onClick={handleExport}>
              <Download size={14} />
              Export Roster
            </IconButton>

            <IconButton
              className="teal-button"
              onClick={handleBookSlotHeaderClick}
            >
              <Plus size={14} />
              Book Slot
            </IconButton>
          </>
        }
      />

      <div className="calendar-toolbar">
        <div className="toolbar-stack">
          <div className="view-switch">
            {CALENDAR_VIEWS.map((calendarView) => (
              <button
                key={calendarView}
                type="button"
                className={view === calendarView ? 'selected' : ''}
                aria-pressed={view === calendarView}
                onClick={() => setView(calendarView)}
              >
                {calendarView}
              </button>
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
          <button type="button" className="white-button" onClick={goToday}>
            Today
          </button>

          <button
            type="button"
            onClick={goPrev}
            aria-label={`Previous ${noun}`}
            title={`Previous ${noun}`}
          >
            <ChevronLeft size={13} />
          </button>

          <span>{rangeLabel}</span>

          <button
            type="button"
            onClick={goNext}
            aria-label={`Next ${noun}`}
            title={`Next ${noun}`}
          >
            <ChevronRight size={13} />
          </button>
        </div>

        <div className="spacer" />

        {hasActiveFilters && (
          <button
            type="button"
            className="dropdown-btn clear-filters"
            onClick={clearFilters}
          >
            <FilterX size={12} />
            Clear filters
          </button>
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

      {/* Doctor Availability Bar shown when a doctor is selected */}
      {selectedDoctor && (
        <div className="calendar-doctor-banner">
          <div className="doc-banner-left">
            {selectedDoctorObj?.avatar ? (
              <img
                src={selectedDoctorObj.avatar}
                alt={selectedDoctor}
                className="doc-banner-avatar"
              />
            ) : (
              <div className="doc-banner-avatar-fallback">
                {selectedDoctor.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <div className="doc-banner-title">
                <h3>{selectedDoctor}</h3>
                <span className="doc-specialty-badge">
                  {selectedDoctorObj?.specialty || 'Physician'}
                </span>
                <span className="doc-room-badge">
                  {selectedDoctorObj?.room || 'Suite 105'}
                </span>
                {selectedDoctorObj?.onDuty && (
                  <span className="doc-duty-badge">
                    <span className="doc-duty-dot" /> On Duty
                  </span>
                )}
              </div>
              <p className="doc-banner-sub">
                15-Minute Slot Engine Active • Booked slots marked{' '}
                <strong style={{ color: '#059669' }}>Green</strong> with status message &ldquo;Slot Booked&rdquo;.
              </p>
            </div>
          </div>

          <div className="doc-banner-right">
            <div className="slot-stat green">
              <CheckCircle2 size={13} style={{ color: '#059669' }} />
              <b>{appointmentCounts[selectedDoctor] ?? 0}</b>
              <span>Booked (Green)</span>
            </div>

            <button
              type="button"
              className="teal-button doc-banner-book-btn"
              onClick={() =>
                handleOpenSlotClick(
                  selectedDoctor,
                  columns.find((c) => c.today)?.iso || columns[0]?.iso || today,
                  '03:30 PM - 03:45 PM',
                )
              }
            >
              <Plus size={13} />
              Book 15-Min Slot
            </button>

            <button
              type="button"
              className="white-button doc-banner-clear-btn"
              onClick={() => setSelectedDoctor(null)}
            >
              Show All Doctors
            </button>
          </div>
        </div>
      )}

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
            selectedDoctor={selectedDoctor}
            doctorOptions={doctorOptions}
            getDoctorSchedule={getDoctorSchedule}
            onSelectOpenSlot={handleOpenSlotClick}
          />
        )}
      </section>

      <div className="calendar-bottom-grid">
        <SuiteUtilization
          rows={suiteUtilizationRows}
          roomStatuses={roomStatuses}
        />

        <PhysicianShiftReference
          shifts={physicianShifts}
          selectedDoctor={selectedDoctor}
          onSelectDoctor={handleSelectDoctorCard}
        />
      </div>

      {selectedEvent && (
        <EventDetailsModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onOpenAppointments={() => navigate('/appointments')}
        />
      )}

      {bookingSlotModal && (
        <BookSlotModal
          doctor={bookingSlotModal.doctor}
          date={bookingSlotModal.date}
          time={bookingSlotModal.time}
          doctorOptions={doctorOptions}
          onClose={() => setBookingSlotModal(null)}
          onBookSuccess={refreshEvents}
        />
      )}
    </>
  );
}
