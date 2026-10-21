import type { ClinicAppointment, SmsNotification } from './types.ts';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * Keeps messages inside the GSM-7 alphabet where practical (a single non-GSM character
 * such as a curly quote or the rupee sign flips the whole SMS to UCS-2 and halves the
 * segment size), strips control characters and caps the length of free-text fields.
 */
export function smsSafe(value: unknown, maxLength = 60): string {
  const text = String(value ?? '')
    .replace(/[\u2018\u2019\u201A\u2032]/g, "'")
    .replace(/[\u201C\u201D\u201E\u2033]/g, '"')
    .replace(/[\u2013\u2014\u2212]/g, '-')
    .replace(/[\u00B7\u2022\u2219]/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/\u20B9/g, 'Rs ')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > maxLength ? `${text.slice(0, maxLength - 1).trimEnd()}.` : text;
}

/** "2026-10-19" -> "Mon 19 Oct 2026" (the date is already clinic-local, so no timezone maths). */
export function formatClinicDate(dateKey: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey ?? '');
  if (!match) return smsSafe(dateKey, 20);
  const [, y, m, d] = match;
  const weekday = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d))).getUTCDay();
  return `${WEEKDAYS[weekday]} ${Number(d)} ${MONTHS[Number(m) - 1]} ${y}`;
}

function slotText(slot: string): string {
  return smsSafe(slot, 40);
}

function str(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

type MessageAppointment = Pick<
  ClinicAppointment,
  'token_id' | 'patient_name' | 'doctor_name' | 'room' | 'visit_type' | 'appointment_date' | 'slot_label'
>;

/**
 * Builds the SMS body. Deliberately contains NO chief complaint / clinical notes:
 * SMS is unencrypted, so only the operational details the recipient needs are included.
 */
export function buildMessage(
  notification: Pick<SmsNotification, 'kind' | 'payload'>,
  appointment: MessageAppointment,
  clinicName: string,
): string {
  const clinic = smsSafe(clinicName, 30) || 'CuraClinic';
  const token = smsSafe(appointment.token_id, 20);
  const patient = smsSafe(appointment.patient_name, 40);
  const room = appointment.room ? `Room: ${smsSafe(appointment.room, 50)}` : '';
  const visit = appointment.visit_type ? `Visit type: ${smsSafe(appointment.visit_type, 30)}` : '';
  const when = `${formatClinicDate(appointment.appointment_date)}`;
  const time = `${slotText(appointment.slot_label)} IST`;

  switch (notification.kind) {
    case 'booking':
      return [
        `${clinic} | NEW APPOINTMENT`,
        `Appointment ID: ${token}`,
        `Patient: ${patient}`,
        `Date: ${when}`,
        `Time: ${time}`,
        room,
        visit,
      ].filter(Boolean).join('\n');

    case 'reminder':
      return [
        `${clinic} | APPOINTMENT REMINDER`,
        `Reminder: appointment scheduled for today`,
        `Appointment ID: ${token}`,
        `Patient: ${patient}`,
        `Time: ${time}`,
        room,
      ].filter(Boolean).join('\n');

    case 'update': {
      const previous = (notification.payload?.previous ?? {}) as Record<string, unknown>;
      const was =
        str(previous.date) && str(previous.slot)
          ? ` Previously ${formatClinicDate(str(previous.date))}, ${slotText(str(previous.slot))} IST.`
          : '';
      return `${clinic} | APPOINTMENT UPDATED\nAppointment ID: ${token}\nPatient: ${patient}\nNew date: ${when}, ${time}.${was}${room ? `\n${room}` : ''}`;
    }

    case 'cancellation': {
      // Uses the snapshot taken when the notice was queued (the live row may already point elsewhere).
      const snap = (notification.payload?.snapshot ?? {}) as Record<string, unknown>;
      const snapToken = smsSafe(str(snap.token_id) || appointment.token_id, 20);
      const snapPatient = smsSafe(str(snap.patient_name) || appointment.patient_name, 40);
      const snapDate = str(snap.appointment_date) || appointment.appointment_date;
      const snapSlot = str(snap.slot_label) || appointment.slot_label;
      return `${clinic} | APPOINTMENT CANCELLED\nAppointment ID: ${snapToken}\nPatient: ${snapPatient}\nDate: ${formatClinicDate(snapDate)}\nTime: ${slotText(snapSlot)} IST`;
    }

    default:
      throw new Error(`Unknown notification kind: ${String(notification.kind)}`);
  }
}
