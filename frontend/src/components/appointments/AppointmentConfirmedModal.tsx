import { CheckCircle2, Calendar, Clock, User, Stethoscope, DoorOpen, FileText } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { IconButton } from '@/components/ui/IconButton';

export interface AppointmentConfirmedDetails {
  token: string;
  patientName: string;
  patientAgeSex?: string;
  doctorName: string;
  date: string;
  timeSlot: string;
  roomSuite?: string;
  reason?: string;
}

interface AppointmentConfirmedModalProps {
  details: AppointmentConfirmedDetails;
  onClose: () => void;
  onBookAnother?: () => void;
  onViewAppointments?: () => void;
}

function formatDateDisplay(value?: string): string {
  if (!value) return 'Today';
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    const d = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    }
  }
  return value;
}

export function AppointmentConfirmedModal({
  details,
  onClose,
  onBookAnother,
  onViewAppointments,
}: AppointmentConfirmedModalProps) {
  return (
    <Modal
      title="Appointment Booked Confirmed"
      subtitle="The consultation slot has been reserved and registered in the outpatient schedule."
      onClose={onClose}
      className="!max-w-[480px]"
      footer={
        <div className="flex w-full items-center justify-between gap-2">
          {onBookAnother ? (
            <IconButton
              className="h-[36px] border border-[#d1d5db] bg-white text-xs text-[#374151] hover:bg-[#f9fafb]"
              onClick={onBookAnother}
            >
              + Book Another
            </IconButton>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <IconButton
              className="h-[36px] border border-[#e5e7eb] bg-white text-xs text-[#4b5563]"
              onClick={onClose}
            >
              Close
            </IconButton>
            <IconButton
              className="h-[36px] bg-[#007d72] px-4 text-xs font-semibold text-white hover:bg-[#00685e]"
              onClick={onViewAppointments || onClose}
            >
              View Appointments
            </IconButton>
          </div>
        </div>
      }
    >
      <div className="flex flex-col items-center text-center">
        {/* Success Icon */}
        <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-[#ecfdf5] text-[#059669] ring-8 ring-[#ecfdf5]/50">
          <CheckCircle2 size={36} />
        </div>

        <h3 className="text-lg font-bold text-[#0f172a]">Booking Confirmed</h3>
        <p className="mt-0.5 text-xs text-[#64748b]">
          Patient appointment status is set to <span className="font-semibold text-[#007d72]">Confirmed</span>.
        </p>

        {/* Token Badge */}
        <div className="my-3 inline-flex items-center gap-2 rounded-lg border border-[#a7f3d0] bg-[#f0fdf4] px-3.5 py-1.5 text-xs">
          <span className="font-semibold text-[#065f46]">TOKEN NUMBER:</span>
          <b className="font-mono text-sm font-bold tracking-wider text-[#047857]">{details.token}</b>
        </div>

        {/* Details Card */}
        <div className="w-full rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-3.5 text-left text-xs">
          <div className="grid grid-cols-2 gap-2.5">
            {/* Patient */}
            <div className="col-span-2 flex items-start gap-2 border-b border-[#e2e8f0] pb-2">
              <User size={15} className="mt-0.5 shrink-0 text-[#007d72]" />
              <div>
                <span className="text-[10px] font-semibold text-[#64748b] uppercase">Patient Name</span>
                <b className="block text-sm font-semibold text-[#0f172a]">
                  {details.patientName}{' '}
                  {details.patientAgeSex && (
                    <span className="text-xs font-normal text-[#64748b]">({details.patientAgeSex})</span>
                  )}
                </b>
              </div>
            </div>

            {/* Doctor */}
            <div className="flex items-start gap-2">
              <Stethoscope size={15} className="mt-0.5 shrink-0 text-[#007d72]" />
              <div>
                <span className="text-[10px] font-semibold text-[#64748b] uppercase">Assigned Doctor</span>
                <b className="block text-xs font-semibold text-[#0f172a]">{details.doctorName}</b>
              </div>
            </div>

            {/* Room / Suite */}
            <div className="flex items-start gap-2">
              <DoorOpen size={15} className="mt-0.5 shrink-0 text-[#007d72]" />
              <div>
                <span className="text-[10px] font-semibold text-[#64748b] uppercase">Room / Suite</span>
                <b className="block text-xs font-semibold text-[#0f172a]">{details.roomSuite || 'Consultation Suite'}</b>
              </div>
            </div>

            {/* Date */}
            <div className="flex items-start gap-2 border-t border-[#e2e8f0] pt-2">
              <Calendar size={15} className="mt-0.5 shrink-0 text-[#007d72]" />
              <div>
                <span className="text-[10px] font-semibold text-[#64748b] uppercase">Appointment Date</span>
                <b className="block text-xs font-semibold text-[#0f172a]">{formatDateDisplay(details.date)}</b>
              </div>
            </div>

            {/* Time Slot */}
            <div className="flex items-start gap-2 border-t border-[#e2e8f0] pt-2">
              <Clock size={15} className="mt-0.5 shrink-0 text-[#007d72]" />
              <div>
                <span className="text-[10px] font-semibold text-[#64748b] uppercase">Time Slot</span>
                <b className="block text-xs font-semibold text-[#0f172a]">{details.timeSlot}</b>
              </div>
            </div>

            {/* Reason */}
            {details.reason && (
              <div className="col-span-2 flex items-start gap-2 border-t border-[#e2e8f0] pt-2">
                <FileText size={15} className="mt-0.5 shrink-0 text-[#007d72]" />
                <div>
                  <span className="text-[10px] font-semibold text-[#64748b] uppercase">Reason / Chief Complaint</span>
                  <p className="mt-0.5 text-xs text-[#334155]">{details.reason}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
