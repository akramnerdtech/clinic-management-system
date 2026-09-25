import { CalendarClock, ChevronLeft, ChevronRight, Zap } from 'lucide-react';
import { IconButton } from '@/components/ui/IconButton';
import { useToast } from '@/utils/toast';
import type { AppointmentCalendarDay, AppointmentSlotSession } from '@/types';

interface Props {
  monthLabel: string;
  days: AppointmentCalendarDay[];
  selectedDay: number;
  onSelectDay: (date: number) => void;
  slotSessions: AppointmentSlotSession[];
  selectedSlot: string;
  onSelectSlot: (time: string) => void;
}

export function DateSlotCard({ monthLabel, days, selectedDay, onSelectDay, slotSessions, selectedSlot, onSelectSlot }: Props) {
  const toast = useToast();
  const noticeMonth = () => toast.info('Only the current month is available in this demo calendar.');
  return (
    <section className="content-card side-card date-slot-card">
      <h2><CalendarClock size={14} /> 3. Select Date & Slot <em className="section-badge live-slots"><Zap size={10} /> Live Slots</em></h2>

      <div className="calendar-nav">
        <span>{monthLabel}</span>
        <div>
          <IconButton className="soft-button" onClick={noticeMonth}><ChevronLeft size={13} /></IconButton>
          <IconButton className="soft-button" onClick={noticeMonth}><ChevronRight size={13} /></IconButton>
        </div>
      </div>

      <div className="date-grid">
        {days.map((d) => (
          <button
            type="button"
            key={d.date}
            disabled={d.status === 'past' || d.status === 'full'}
            className={`date-cell ${d.status} ${selectedDay === d.date ? 'selected' : ''}`}
            onClick={() => onSelectDay(d.date)}
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
