import { CalendarClock, Zap } from 'lucide-react';
import type { AppointmentCalendarDay, AppointmentSlotSession } from '@/types';

interface Props {
  monthLabel: string;
  days: AppointmentCalendarDay[];
  selectedDay: string;
  onSelectDay: (dateKey: string) => void;
  slotSessions: AppointmentSlotSession[];
  selectedSlot: string;
  onSelectSlot: (time: string) => void;
}

export function DateSlotCard({ monthLabel, days, selectedDay, onSelectDay, slotSessions, selectedSlot, onSelectSlot }: Props) {
  return (
    <section className="content-card side-card date-slot-card">
      <h2><CalendarClock size={14} /> 3. Select Date & Slot <em className="section-badge live-slots"><Zap size={10} /> Live Slots</em></h2>

      <div className="calendar-nav">
        <span>{monthLabel}</span>
        <small>Next 7 days</small>
      </div>

      <div className="date-grid">
        {days.map((d) => (
          <button
            type="button"
            key={d.dateKey}
            disabled={d.status !== 'open'}
            className={`date-cell ${d.status} ${selectedDay === d.dateKey ? 'selected' : ''}`}
            onClick={() => onSelectDay(d.dateKey)}
          >
            <span>{d.label}</span>
            <b>{d.date}</b>
            <small>{d.meta}</small>
          </button>
        ))}
      </div>

      {slotSessions.map((session) => (
        <div className="slot-session" key={session.title}>
          <div className="slot-session-head">
            <span>{session.title}</span>
            <small>{session.hours}</small>
          </div>
          <div className="slot-grid">
            {session.slots.map((slot) => {
              const isSelected = slot.time === selectedSlot;
              const disabled = slot.status === 'booked' || slot.status === 'offduty';
              const statusLabel = isSelected ? 'SELECTED' : slot.status === 'booked' ? 'BOOKED'
                : slot.status === 'offduty' ? 'Off-Duty' : slot.status === 'reserved' ? 'RESERVED' : 'AVAILABLE';
              return (
                <button
                  type="button"
                  key={slot.time}
                  disabled={disabled}
                  className={`slot-cell ${slot.status} ${isSelected ? 'selected' : ''}`}
                  onClick={() => onSelectSlot(slot.time)}
                >
                  <b>{slot.time}</b>
                  <small>{statusLabel}</small>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </section>
  );
}
