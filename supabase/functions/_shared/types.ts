export type NotificationKind = 'booking' | 'reminder' | 'update' | 'cancellation';

export type NotificationStatus =
  | 'pending'
  | 'sending'
  | 'sent'
  | 'delivered'
  | 'failed'
  | 'cancelled'
  | 'skipped';

/** A row of public.sms_notifications. */
export interface SmsNotification {
  id: string;
  appointment_id: string;
  owner_id: string;
  kind: NotificationKind;
  doctor_key: string;
  revision: number;
  dedupe_key: string;
  scheduled_for: string;
  next_attempt_at: string;
  status: NotificationStatus;
  attempts: number;
  max_attempts: number;
  locked_at: string | null;
  payload: Record<string, unknown>;
  to_number: string | null;
  body: string | null;
  twilio_sid: string | null;
  delivery_status: string | null;
  error_code: string | null;
  last_error: string | null;
  sent_at: string | null;
  delivered_at: string | null;
}

/** A row of public.clinic_appointments. */
export interface ClinicAppointment {
  id: string;
  owner_id: string;
  token_id: string;
  revision: number;
  patient_name: string;
  doctor_name: string;
  doctor_key: string;
  room: string | null;
  visit_type: string | null;
  appointment_date: string; // YYYY-MM-DD (clinic-local / IST)
  slot_label: string;
  starts_at: string | null;
  status: string;
}

/** A row of public.doctor_contacts. */
export interface DoctorContact {
  owner_id: string;
  doctor_key: string;
  doctor_name: string;
  mobile_e164: string;
  sms_enabled: boolean;
}

export type NotificationPatch = Partial<
  Pick<
    SmsNotification,
    | 'status'
    | 'locked_at'
    | 'next_attempt_at'
    | 'twilio_sid'
    | 'delivery_status'
    | 'to_number'
    | 'body'
    | 'error_code'
    | 'last_error'
    | 'sent_at'
    | 'delivered_at'
  >
>;

export interface DeliveryUpdate {
  sid: string;
  status: string;
  errorCode: string | null;
  errorMessage: string | null;
}

/** Everything the worker needs from the database (implemented by store.ts). */
export interface QueueStore {
  /** Put notifications stuck in `sending` (crashed worker) back to `pending`. */
  releaseStaleLocks(olderThanIso: string): Promise<void>;
  listDue(nowIso: string, limit: number): Promise<SmsNotification[]>;
  /** Atomically move pending -> sending (attempts + 1). Returns null if another worker won. */
  claim(n: SmsNotification, nowIso: string): Promise<SmsNotification | null>;
  getAppointment(id: string): Promise<ClinicAppointment | null>;
  getContact(ownerId: string, doctorKey: string): Promise<DoctorContact | null>;
  finish(id: string, patch: NotificationPatch): Promise<void>;
  applyDeliveryStatus(update: DeliveryUpdate, nowIso: string): Promise<'updated' | 'ignored' | 'not_found'>;
}
