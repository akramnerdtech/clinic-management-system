import { Check, Clock, Plus } from 'lucide-react';
import type {
  CalendarBanner,
  CalendarColumn,
  CalendarEvent,
} from '@/types';
import type { DoctorScheduleDayInfo } from '@/services/calendarService';
import { timeToMinutes } from '@/services/calendarService';

const PX_PER_MIN = 32 / 15; // 32px per 15-minute slot

const END_BANNER_HEIGHT = 30;

function formatTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const hour12 = hours % 12 || 12;
  const period = hours >= 12 ? 'PM' : 'AM';

  return `${String(hour12).padStart(2, '0')}:${String(mins).padStart(2, '0')} ${period}`;
}

interface CalendarGridProps {
  startHour: number;
  endHour: number;
  columns: CalendarColumn[];
  events: CalendarEvent[];
  middayBanner: CalendarBanner;
  endBannerLabel: string;
  now: {
    label: string;
    minutes: number;
  } | null;
  emptyMessage?: string;
  onSelectEvent?: (event: CalendarEvent) => void;
  selectedDoctor?: string | null;
  getDoctorSchedule?: (doctorName: string, dateKey: string) => DoctorScheduleDayInfo;
  onSelectOpenSlot?: (doctor: string, date: string, time: string) => void;
}

export function CalendarGrid({
  startHour,
  endHour,
  columns,
  events,
  middayBanner,
  endBannerLabel,
  now,
  emptyMessage,
  onSelectEvent,
  selectedDoctor,
  getDoctorSchedule,
  onSelectOpenSlot,
}: CalendarGridProps) {
  const startMinutes = startHour * 60;
  const endMinutes = endHour * 60;
  const totalMinutes = endMinutes - startMinutes;
  const gridHeight = totalMinutes * PX_PER_MIN;
  const wrapperHeight = gridHeight + END_BANNER_HEIGHT;

  /*
   * 30-minute time labels along the time column
   */
  const timeSlots: number[] = [];
  for (let minutes = startMinutes; minutes <= endMinutes; minutes += 30) {
    timeSlots.push(minutes);
  }

  const single = columns.length === 1;

  const trackStyle = {
    gridTemplateColumns: `75px repeat(${columns.length}, minmax(${single ? 260 : 130
      }px, 1fr))`,
    minWidth: single ? 0 : 960,
  };

  /*
   * Convert appointment start time into exact pixel position
   */
  const getEventTop = (event: CalendarEvent) => {
    let minutes = 0;
    if (event.time) {
      minutes = timeToMinutes(event.time);
    } else if (Number(event.startMinutes) >= 480) {
      minutes = Number(event.startMinutes);
    } else {
      minutes = startMinutes + Number(event.startMinutes);
    }
    return Math.max(0, (minutes - startMinutes) * PX_PER_MIN);
  };

  /*
   * Normalize booked status
   */
  const isSlotBooked = (event: CalendarEvent) => {
    const status = (event.status || '').trim().toLowerCase();
    return (
      status === 'booked' ||
      status === 'confirmed' ||
      status === 'slot booked' ||
      status.includes('book')
    );
  };

  return (
    <div className="cal-grid-wrap">
      {/* HEADER */}
      <div className="cal-header-row" style={trackStyle}>
        <div className="cal-header-cell cal-header-gutter">
          <small>LOCAL TIME</small>
        </div>

        {columns.map((column) => (
          <div
            key={column.iso}
            className={`cal-header-cell${column.today ? ' today' : ''}`}
          >
            <span className="cal-day-label">{column.label}</span>
            <span className="cal-day-num">{column.date}</span>
            {column.today && <span className="cal-today-pill">TODAY</span>}
          </div>
        ))}
      </div>

      {/* BODY */}
      <div className="cal-body" style={trackStyle}>
        {/* TIME COLUMN */}
        <div className="cal-time-col" style={{ height: wrapperHeight }}>
          {timeSlots.map((minutes) => (
            <span
              key={minutes}
              className="cal-time-label"
              style={{
                top: (minutes - startMinutes) * PX_PER_MIN,
              }}
            >
              {formatTime(minutes)}
            </span>
          ))}
        </div>

        {/* DAY COLUMNS */}
        <div
          className="cal-days-area"
          style={{
            height: wrapperHeight,
            /* 15-minute grid lines (32px per 15 min) */
            backgroundSize: `100% ${15 * PX_PER_MIN}px`,
            gridTemplateColumns: `repeat(${columns.length}, 1fr)`,
          }}
        >
          {columns.map((column) => {
            const columnEvents = events.filter(
              (event) => event.date === column.iso,
            );

            // If a doctor is selected, retrieve their availability schedule for this day
            const docSchedule =
              selectedDoctor && getDoctorSchedule
                ? getDoctorSchedule(selectedDoctor, column.iso)
                : null;

            return (
              <div key={column.iso} className="cal-day-col">
                {/* 1. If doctor has active schedule on this day, render available open slots */}
                {selectedDoctor && docSchedule?.hasSchedule && (
                  <>
                    {/* Shift Window Header Badge */}
                    <div
                      className="cal-shift-badge"
                      style={{
                        top: Math.max(0, (docSchedule.startMinutes - startMinutes) * PX_PER_MIN - 24),
                      }}
                      title={`${selectedDoctor} scheduled ${docSchedule.start} - ${docSchedule.end}`}
                    >
                      <Clock size={10} />
                      <span>{selectedDoctor}: {formatTime(docSchedule.startMinutes)} – {formatTime(docSchedule.endMinutes)}</span>
                    </div>

                    {/* Open slots for this doctor during their shift */}
                    {docSchedule.slots.map((slot) => {
                      // Check if a booked event occupies this slot
                      const isOccupied = columnEvents.some((ev) => {
                        const evStart = ev.time ? timeToMinutes(ev.time) : ev.startMinutes;
                        return Math.abs(evStart - slot.startMinutes) < 10;
                      });

                      if (isOccupied) return null; // Booked slot will be rendered below in GREEN

                      const slotTop = (slot.startMinutes - startMinutes) * PX_PER_MIN;
                      const slotHeight = slot.durationMinutes * PX_PER_MIN - 4;

                      return (
                        <div
                          key={`open-${column.iso}-${slot.startMinutes}`}
                          className="cal-open-slot"
                          style={{
                            top: slotTop,
                            height: Math.max(26, slotHeight),
                          }}
                          role="button"
                          tabIndex={0}
                          title={`Click to book 15-min slot for ${selectedDoctor} at ${slot.time}`}
                          onClick={() =>
                            onSelectOpenSlot?.(
                              selectedDoctor,
                              column.iso,
                              slot.time,
                            )
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              onSelectOpenSlot?.(
                                selectedDoctor,
                                column.iso,
                                slot.time,
                              );
                            }
                          }}
                        >
                          <span className="cal-open-slot-time">
                            {slot.time}
                          </span>
                          <span className="cal-open-slot-action">
                            <Plus size={10} /> Available Slot
                          </span>
                        </div>
                      );
                    })}
                  </>
                )}

                {/* 2. Render all booked and active appointments for this column */}
                {columnEvents.map((event) => {
                  const booked = isSlotBooked(event);

                  return (
                    <div
                      key={event.id}
                      className={`cal-event ${booked
                        ? 'tone-confirmed tone-booked cal-event-green'
                        : `tone-${event.tone ?? 'confirmed'}`
                        }`}
                      style={{
                        top: getEventTop(event),
                        height: Math.max(
                          34,
                          (event.durationMinutes || 15) * PX_PER_MIN,
                        ),
                      }}
                      role="button"
                      tabIndex={0}
                      onClick={() => onSelectEvent?.(event)}
                      onKeyDown={(keyboardEvent) => {
                        if (
                          keyboardEvent.key === 'Enter' ||
                          keyboardEvent.key === ' '
                        ) {
                          keyboardEvent.preventDefault();
                          onSelectEvent?.(event);
                        }
                      }}
                    >
                      <div className="cal-event-top-row">
                        <span className="cal-time-text">
                          <Clock size={9} style={{ display: 'inline', marginRight: 3 }} />
                          {event.time}
                        </span>

                        {booked ? (
                          <em className="cal-booked-badge">
                            <Check size={9} /> Slot Booked
                          </em>
                        ) : (
                          event.badge && (
                            <em className="cal-badge">{event.badge}</em>
                          )
                        )}
                      </div>

                      <b className="cal-patient-name">{event.patient}</b>

                      <div className="cal-event-sub-row">
                        {booked && (
                          <span className="cal-status-msg">
                            Slot Booked
                          </span>
                        )}
                        {event.doctor && (
                          <small className="cal-doc-name">
                            {event.doctor}
                          </small>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* EMPTY MESSAGE */}
        {emptyMessage && events.length === 0 && !selectedDoctor && (
          <div className="cal-empty">{emptyMessage}</div>
        )}

        {/* MIDDAY BANNER */}
        <div
          className="cal-banner-row"
          style={{
            top: (middayBanner.startMinutes - startMinutes) * PX_PER_MIN,
            height: middayBanner.durationMinutes * PX_PER_MIN,
          }}
        >
          {middayBanner.label}
        </div>

        {/* END OF SCHEDULE BANNER */}
        <div
          className="cal-banner-row cal-banner-end"
          style={{
            top: gridHeight,
          }}
        >
          {endBannerLabel}
        </div>

        {/* CURRENT TIME LINE */}
        {now &&
          now.minutes >= startMinutes &&
          now.minutes <= endMinutes && (
            <>
              <div
                className="cal-now-line"
                style={{
                  top: (now.minutes - startMinutes) * PX_PER_MIN,
                }}
              />
              <span
                className="cal-now-chip"
                style={{
                  top: (now.minutes - startMinutes) * PX_PER_MIN,
                }}
              >
                {now.label}
              </span>
            </>
          )}
      </div>
    </div>
  );
}