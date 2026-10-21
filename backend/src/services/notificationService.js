import { randomUUID } from 'node:crypto';
import { normalizeMobile } from '../utils/phone.js';
import {
  doctorKeyFromName,
  normalizeDateKey,
  normalizeSlot,
  planAppointmentSync,
  slotStartInstant,
} from '../utils/notificationPlanner.js';

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function dbCheck(error, action) {
  if (!error) return;
  const err = new Error(`${action} failed: ${error.message}`);
  err.status = 500;
  err.code = error.code;
  throw err;
}

const text = (value, max) => String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

/** Validates the browser payload and turns it into the shape the planner expects. */
function toIncoming(appointment, deleted, defaultCountryCode = '91') {
  if (!appointment || typeof appointment !== 'object') throw httpError(400, 'Appointment details are required.');

  const tokenId = text(appointment.tokenId, 40);
  const patientName = text(appointment.patientName, 120);
  const doctorName = text(appointment.doctorName, 120);
  const date = normalizeDateKey(appointment.date);
  const slot = normalizeSlot(appointment.slot).slice(0, 60);
  const status = text(appointment.status, 40) || 'Slot Booked';

  if (!tokenId) throw httpError(400, 'Appointment token is required.');
  if (!doctorName || !doctorKeyFromName(doctorName)) throw httpError(400, 'Doctor name is required.');
  if (!patientName) throw httpError(400, 'Patient name is required.');
  if (!date) throw httpError(400, 'Appointment date must be YYYY-MM-DD.');
  if (!slot) throw httpError(400, 'Appointment time slot is required.');

  return {
    tokenId,
    patientName,
    doctorName,
    doctorKey: doctorKeyFromName(doctorName),
    room: text(appointment.room, 160),
    visitType: text(appointment.visitType, 60),
    date,
    slot,
    startsAt: slotStartInstant(date, slot),
    status,
    deleted,
  };
}

const COUNTED_STATUSES = ['pending', 'sending', 'sent', 'delivered', 'failed'];

/**
 * @param {object} deps
 * @param {object} deps.db                  supabase-js client (service role)
 * @param {() => Date} [deps.now]
 * @param {boolean} [deps.notifyChanges]    also send "rescheduled" / "cancelled" SMS
 * @param {number} [deps.dailyLimit]        max SMS rows per account per rolling 24h
 * @param {string} [deps.defaultCountryCode]
 * @param {() => Promise<void>} [deps.triggerWorker]  asks the Edge Function to send due SMS right now
 */
export function createNotificationService({
  db,
  now = () => new Date(),
  notifyChanges = false,
  dailyLimit = 300,
  defaultCountryCode = '91',
  triggerWorker = async () => {},
}) {
  async function loadAppointment(ownerId, clientId, tokenId) {
    const { data, error } = await db
      .from('clinic_appointments')
      .select('*')
      .eq('owner_id', ownerId)
      .eq('client_id', clientId)
      .eq('token_id', tokenId)
      .maybeSingle();
    dbCheck(error, 'Loading appointment');
    return data ?? null;
  }

  async function loadNotifications(appointmentId) {
    const { data, error } = await db.from('sms_notifications').select('*').eq('appointment_id', appointmentId);
    dbCheck(error, 'Loading notifications');
    return data ?? [];
  }

  async function usedToday(ownerId) {
    const since = new Date(now().getTime() - 24 * 3600_000).toISOString();
    const { count, error } = await db
      .from('sms_notifications')
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', ownerId)
      .in('status', COUNTED_STATUSES)
      .gte('created_at', since);
    dbCheck(error, 'Counting recent notifications');
    return count ?? 0;
  }

  async function runOnce(ownerId, clientId, incoming) {
    const existing = await loadAppointment(ownerId, clientId, incoming.tokenId);
    const notifs = existing ? await loadNotifications(existing.id) : [];
    const plan = planAppointmentSync({ ownerId, clientId, existing, notifs, incoming, now: now(), notifyChanges, newId: randomUUID() });

    if (plan.result === 'noop' && !plan.appointment && plan.notifications.length === 0) {
      return { result: 'noop', queued: 0 };
    }

    // 1) Appointment row first, so a worker that has already claimed an SMS sees the new state.
    if (plan.appointment?.action === 'insert') {
      const { error } = await db.from('clinic_appointments').insert(plan.appointment.values);
      if (error?.code === '23505') {
        const race = new Error('Concurrent insert');
        race.code = 'RACE';
        throw race;
      }
      dbCheck(error, 'Saving appointment');
    } else if (plan.appointment?.action === 'update') {
      const { error } = await db.from('clinic_appointments').update(plan.appointment.values).eq('id', existing.id);
      dbCheck(error, 'Updating appointment');
    }

    // 2) Cancel SMS that are still waiting and are now obsolete.
    if (plan.cancelIds.length > 0) {
      const { error } = await db
        .from('sms_notifications')
        .update({ status: 'cancelled', locked_at: null, last_error: plan.cancelReason })
        .in('id', plan.cancelIds)
        .eq('status', 'pending');
      dbCheck(error, 'Cancelling notifications');
    }

    // 3) Per-account daily cap (SMS costs money and sign-up is open).
    let rows = plan.notifications;
    if (rows.some((row) => row.status === 'pending')) {
      let budget = Math.max(0, dailyLimit - (await usedToday(ownerId)));
      rows = rows.map((row) => {
        if (row.status !== 'pending') return row;
        if (budget > 0) {
          budget -= 1;
          return row;
        }
        return { ...row, status: 'skipped', last_error: 'Daily SMS limit reached for this account' };
      });
    }

    // 4) Queue new SMS one by one: a duplicate (unique dedupe_key) is simply ignored.
    let queued = 0;
    for (const row of rows) {
      const { error } = await db.from('sms_notifications').insert(row);
      if (error?.code === '23505') continue;
      dbCheck(error, 'Queueing notification');
      if (row.status === 'pending') queued += 1;
    }

    // 5) Anything due right now (booking SMS) goes out immediately; cron is the safety net.
    const dueNow = rows.some((row) => row.status === 'pending' && new Date(row.next_attempt_at) <= now());
    if (dueNow) {
      Promise.resolve()
        .then(triggerWorker)
        .catch((err) => console.warn('SMS worker trigger failed (cron will pick it up):', err?.message || err));
    }

    return { result: plan.result, queued };
  }

  return {
    /** action: 'upsert' (booked / edited / status change) or 'delete'. */
    async syncAppointment(ownerId, { clientId, action, appointment }) {
      const client = String(clientId ?? '');
      if (!/^[A-Za-z0-9_-]{8,64}$/.test(client)) throw httpError(400, 'A valid clientId is required.');
      if (action !== 'upsert' && action !== 'delete') throw httpError(400, 'action must be "upsert" or "delete".');

      const incoming = toIncoming(appointment, action === 'delete', defaultCountryCode);
      for (let attempt = 0; ; attempt++) {
        try {
          return await runOnce(ownerId, client, incoming);
        } catch (err) {
          if (err.code === 'RACE' && attempt < 2) continue; // someone inserted the same appointment concurrently
          throw err;
        }
      }
    },

    /** Stores the doctor's mobile (normalised to E.164) for this account. */
    async saveDoctorContact(ownerId, { name, mobile }) {
      const doctorName = text(name, 120);
      const doctorKey = doctorKeyFromName(doctorName);
      if (!doctorKey) throw httpError(400, 'Doctor name is required.');
      const e164 = normalizeMobile(mobile, defaultCountryCode);
      if (!e164) throw httpError(400, 'Enter a valid mobile number, including the country code if it is not an Indian number.');

      const { error } = await db
        .from('doctor_contacts')
        .upsert({ owner_id: ownerId, doctor_key: doctorKey, doctor_name: doctorName, mobile_e164: e164, sms_enabled: true }, { onConflict: 'owner_id,doctor_key' });
      dbCheck(error, 'Saving doctor contact');
      return { saved: true };
    },

    /** A doctor was renamed in the roster: keep SMS working under the new name. */
    async renameDoctorContact(ownerId, { from, to }) {
      const fromKey = doctorKeyFromName(from);
      const toName = text(to, 120);
      const toKey = doctorKeyFromName(toName);
      if (!fromKey || !toKey) throw httpError(400, 'Both doctor names are required.');
      if (fromKey === toKey) return { saved: false };

      const { data, error } = await db
        .from('doctor_contacts')
        .select('mobile_e164,sms_enabled')
        .eq('owner_id', ownerId)
        .eq('doctor_key', fromKey)
        .maybeSingle();
      dbCheck(error, 'Loading doctor contact');
      if (!data) return { saved: false };

      const result = await db
        .from('doctor_contacts')
        .upsert({ owner_id: ownerId, doctor_key: toKey, doctor_name: toName, mobile_e164: data.mobile_e164, sms_enabled: data.sms_enabled }, { onConflict: 'owner_id,doctor_key' });
      dbCheck(result.error, 'Copying doctor contact');
      return { saved: true };
    },
  };
}
