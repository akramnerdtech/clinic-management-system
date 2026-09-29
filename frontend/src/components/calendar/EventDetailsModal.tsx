import { Modal } from '@/components/ui/Modal';
import { IconButton } from '@/components/ui/IconButton';
import type { CalendarEvent } from '@/types';
import { eventStatus } from '@/utils/calendarFilters';
import { formatLongDate } from '@/utils/calendarDates';

interface EventDetailsModalProps {
  event: CalendarEvent;
  onClose: () => void;
  onOpenAppointments: () => void;
}

/** Read-only summary of one calendar appointment. */
export function EventDetailsModal({ event, onClose, onOpenAppointments }: EventDetailsModalProps) {
  const rows: [string, string][] = [
    ['Date', event.date ? formatLongDate(event.date) : '—'],
    ['Time', event.time],
    ['Doctor', event.doctorName ?? event.doctor ?? 'Unassigned'],
    ['Room', event.room ?? '—'],
    ['Status', eventStatus(event)],
  ];

  return (
    <Modal
      title={event.patient}
      subtitle="Appointment details"
      onClose={onClose}
      footer={<>
        <IconButton className="white-button" onClick={onClose}>Close</IconButton>
        <IconButton className="teal-button auto-width" onClick={onOpenAppointments}>View Appointments</IconButton>
      </>}
    >
      <dl className="cal-detail-list">
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </Modal>
  );
}
