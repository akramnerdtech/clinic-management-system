import { useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { IconButton } from '@/components/ui/IconButton';
import { WhatsAppPromptModal } from '@/components/appointments/WhatsAppPromptModal';
import type { AppointmentNotificationParams } from '@/services/whatsappService';
import type { CalendarEvent } from '@/types';
import { eventStatus } from '@/utils/calendarFilters';
import { formatLongDate } from '@/utils/calendarDates';

interface EventDetailsModalProps {
  event: CalendarEvent;
  onClose: () => void;
  onOpenAppointments: () => void;
}

/** Read-only summary of one calendar appointment showing assigned Room and OPD. */
export function EventDetailsModal({
  event,
  onClose,
  onOpenAppointments,
}: EventDetailsModalProps) {
  const [whatsappTarget, setWhatsappTarget] = useState<AppointmentNotificationParams | null>(null);

  const isBooked =
    event.status?.toLowerCase().includes('book') ||
    event.tone === 'confirmed';

  const rows: [string, string][] = [
    ['Patient Name', event.patient],
    ['Assigned Doctor', event.doctorName ?? event.doctor ?? 'Unassigned'],
    ['Scheduled Date', event.date ? formatLongDate(event.date) : 'Today'],
    ['Scheduled Time', `${event.time} (${event.durationMinutes || 15} Min Slot)`],
    ['Assigned Room / Suite', event.room ?? 'Suite 105'],
    ['Assigned OPD Unit', event.opd ?? 'OPD-1 • General Medicine'],
    ['Calendar Status', isBooked ? 'Slot Booked (Marked Green)' : eventStatus(event)],
  ];

  return (
    <>
      <Modal
        title={event.patient}
        subtitle="Appointment & Consultation Room Allocation"
        onClose={onClose}
        footer={
          <>
            <IconButton className="white-button" onClick={onClose}>
              Close
            </IconButton>
            <IconButton
              className="soft-button"
              style={{ color: '#059669', borderColor: '#a7f3d0' }}
              onClick={() =>
                setWhatsappTarget({
                  doctorName: event.doctorName ?? event.doctor ?? '',
                  patientName: event.patient,
                  date: event.date ?? '',
                  timeSlot: event.time,
                  roomSuite: event.room,
                  opdUnit: event.opd,
                  reason: 'Master Calendar Consultation',
                  token: event.id,
                })
              }
            >
              <MessageCircle size={14} /> WhatsApp Doctor
            </IconButton>
            <IconButton
              className="teal-button auto-width"
              onClick={onOpenAppointments}
            >
              View in Appointments Table
            </IconButton>
          </>
        }
      >
      <dl className="cal-detail-list">
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>
              {label === 'Calendar Status' ? (
                <span className="cal-status-msg" style={{ display: 'inline-flex' }}>
                  ✓ {value}
                </span>
              ) : (
                value
              )}
            </dd>
          </div>
        ))}
      </dl>
    </Modal>

    {whatsappTarget && (
      <WhatsAppPromptModal
        params={whatsappTarget}
        onClose={() => setWhatsappTarget(null)}
      />
    )}
  </>
  );
}
