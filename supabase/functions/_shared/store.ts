import { deliveryPatch } from './rules.ts';
import type {
  ClinicAppointment,
  DeliveryUpdate,
  DoctorContact,
  NotificationPatch,
  QueueStore,
  SmsNotification,
} from './types.ts';

// Deliberately loose: only the query-builder surface we use, so this file has no
// import of @supabase/supabase-js (the client is injected by index.ts).
// deno-lint-ignore no-explicit-any
export type SupabaseLike = { from(table: string): any };

interface DbError {
  message: string;
  code?: string;
}

function check(error: DbError | null | undefined, action: string): void {
  if (error) throw new Error(`${action} failed: ${error.message}${error.code ? ` (${error.code})` : ''}`);
}

export function createSupabaseStore(client: SupabaseLike): QueueStore {
  return {
    async releaseStaleLocks(olderThanIso) {
      const { error } = await client
        .from('sms_notifications')
        .update({ status: 'pending', locked_at: null })
        .eq('status', 'sending')
        .lt('locked_at', olderThanIso);
      check(error, 'Releasing stale locks');
    },

    async listDue(nowIso, limit) {
      const { data, error } = await client
        .from('sms_notifications')
        .select('*')
        .eq('status', 'pending')
        .lte('next_attempt_at', nowIso)
        .order('next_attempt_at', { ascending: true })
        .limit(limit);
      check(error, 'Listing due notifications');
      return (data ?? []) as SmsNotification[];
    },

    /**
     * Compare-and-swap claim: the UPDATE only matches while the row is still `pending`
     * with the attempts value we read, so when the cron run and the backend's immediate
     * trigger overlap, exactly one of them gets the row and the SMS is sent once.
     */
    async claim(n, nowIso) {
      const { data, error } = await client
        .from('sms_notifications')
        .update({ status: 'sending', locked_at: nowIso, attempts: n.attempts + 1 })
        .eq('id', n.id)
        .eq('status', 'pending')
        .eq('attempts', n.attempts)
        .select('*');
      check(error, 'Claiming notification');
      return Array.isArray(data) && data.length > 0 ? (data[0] as SmsNotification) : null;
    },

    async getAppointment(id) {
      const { data, error } = await client.from('clinic_appointments').select('*').eq('id', id).maybeSingle();
      check(error, 'Loading appointment');
      return (data ?? null) as ClinicAppointment | null;
    },

    async getContact(ownerId, doctorKey) {
      const { data, error } = await client
        .from('doctor_contacts')
        .select('*')
        .eq('owner_id', ownerId)
        .eq('doctor_key', doctorKey)
        .maybeSingle();
      check(error, 'Loading doctor contact');
      return (data ?? null) as DoctorContact | null;
    },

    async finish(id, patch: NotificationPatch) {
      const { error } = await client.from('sms_notifications').update(patch).eq('id', id);
      check(error, 'Saving notification result');
    },

    async applyDeliveryStatus(update: DeliveryUpdate, nowIso) {
      const { data, error } = await client
        .from('sms_notifications')
        .select('id,status,delivery_status')
        .eq('twilio_sid', update.sid)
        .maybeSingle();
      check(error, 'Looking up message by SID');
      if (!data) return 'not_found';

      const patch = deliveryPatch(data, update.status, update.errorCode, update.errorMessage, nowIso);
      if (!patch) return 'ignored';

      const result = await client.from('sms_notifications').update(patch).eq('id', data.id);
      check(result.error, 'Saving delivery status');
      return 'updated';
    },
  };
}
