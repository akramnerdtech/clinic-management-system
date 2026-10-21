/**
 * Pure decision logic for SMS notifications (no database, no network, no clock of its own),
 * so every rule can be unit-tested. The service feeds it the current database state plus the
 * appointment as the browser now sees it, and executes the plan it returns.
 *
 * Rules (doctor = the appointment's assigned doctor):
 *  - New active appointment ............ booking SMS now + reminder at 08:00 IST on the day
 *  - Rescheduled (same doctor) ......... pending reminder cancelled, new reminder queued
 *  - Doctor changed .................... old doctor's pending SMS cancelled; NEW doctor gets
 *                                        booking SMS + reminder (it is a new booking for them)
 *  - Cancelled / completed / deleted ... every pending SMS cancelled
 *  - Re-opened (same token reused) ..... treated as a brand-new booking
 *  - Optional change notices (update / cancellation SMS) only when `notifyChanges` is on
 *    and the doctor had already been told about the appointment.
 *  - SMS is sent ONLY to the assigned doctor's registered mobile. Patient SMS is never queued.
 */

export const IST_OFFSET_MINUTES = 330; // UTC+05:30, no daylight saving
export const REMINDER_MINUTES_IST = 8 * 60; // 08:00 IST

/** Statuses that still occupy a dedupe slot (mirrors the partial unique index in SQL). */
export const LIVE_STATUSES = new Set(['pending', 'sending', 'sent', 'delivered', 'skipped']);

const INACTIVE_STATUSES = new Set(['cancelled', 'canceled', 'completed', 'no show', 'noshow', 'deleted']);
const CANCELLED_STATUSES = new Set(['cancelled', 'canceled', 'deleted']);

const normalizeStatus = (status) => String(status ?? '').trim().toLowerCase().replace(/[\s_-]+/g, ' ');

/** Whether an appointment should still notify its doctor (mirrors supabase/functions/_shared/rules.ts). */
export const isActiveStatus = (status) => !INACTIVE_STATUSES.has(normalizeStatus(status));
export const isCancelledStatus = (status) => CANCELLED_STATUSES.has(normalizeStatus(status));

/** Must stay identical to the SQL function public.doctor_key(). */
export function doctorKeyFromName(name) {
  return String(name ?? '')
    .replace(/\s*\([^)]*\)/g, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export const normalizeSlot = (slot) => String(slot ?? '').replace(/\s+/g, ' ').trim();

/** Returns the date as YYYY-MM-DD if it is a real calendar date, else ''. */
export function normalizeDateKey(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value ?? '').trim());
  if (!match) return '';
  const [, y, m, d] = match.map(Number);
  const check = new Date(Date.UTC(y, m - 1, d));
  const valid = check.getUTCFullYear() === y && check.getUTCMonth() === m - 1 && check.getUTCDate() === d;
  return valid ? match[0] : '';
}

/** "03:30 PM - 03:45 PM" / "03:30 PM" / "15:30" -> minutes after midnight (start of the slot), or null. */
export function parseSlotStartMinutes(slot) {
  const text = String(slot ?? '');
  const twelveHour = /(\d{1,2}):(\d{2})\s*(AM|PM)/i.exec(text);
  if (twelveHour) {
    const hour = Number(twelveHour[1]);
    const minute = Number(twelveHour[2]);
    if (hour < 1 || hour > 12 || minute > 59) return null;
    return ((hour % 12) + (twelveHour[3].toUpperCase() === 'PM' ? 12 : 0)) * 60 + minute;
  }
  const twentyFourHour = /^\s*(\d{1,2}):(\d{2})(?!\d)/.exec(text);
  if (twentyFourHour) {
    const hour = Number(twentyFourHour[1]);
    const minute = Number(twentyFourHour[2]);
    if (hour > 23 || minute > 59) return null;
    return hour * 60 + minute;
  }
  return null;
}

/** A clinic-local (IST) date + minutes-after-midnight as a real UTC instant. */
export function istInstant(dateKey, minutesAfterMidnight) {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 0, minutesAfterMidnight) - IST_OFFSET_MINUTES * 60_000);
}

export function slotStartInstant(dateKey, slot) {
  const minutes = parseSlotStartMinutes(slot);
  return minutes === null ? null : istInstant(dateKey, minutes);
}

/** 08:00 IST on the appointment day (= 02:30 UTC). */
export const reminderInstant = (dateKey) => istInstant(dateKey, REMINDER_MINUTES_IST);

const time = (value) => (value ? new Date(value).getTime() : null);

function notificationRow({ ownerId, appointmentId, kind, doctorKey, revision, at, status = 'pending', reason = null, payload = {}, toNumber = null }) {
  const when = at.toISOString();
  return {
    ...(toNumber ? { to_number: toNumber } : {}),
    appointment_id: appointmentId,
    owner_id: ownerId,
    kind,
    doctor_key: doctorKey,
    revision,
    dedupe_key: `${kind}:${appointmentId}:r${revision}`,
    scheduled_for: when,
    next_attempt_at: when,
    status,
    last_error: reason,
    payload,
  };
}

/**
 * @param {object} ctx
 * @param {string} ctx.ownerId        app account (from the verified session token)
 * @param {string} ctx.clientId       browser profile id
 * @param {object|null} ctx.existing  current clinic_appointments row (or null)
 * @param {object[]} ctx.notifs       current sms_notifications rows of that appointment
 * @param {object} ctx.incoming       { tokenId, patientName, doctorName, doctorKey, room, visitType,
 *                                      date, slot, startsAt: Date|null, status, deleted,
 *                                      (patient mobile numbers are not used for SMS)
 * @param {Date} ctx.now
 * @param {boolean} ctx.notifyChanges send update / cancellation notices too
 * @param {string} ctx.newId          uuid to use if a new appointment row is inserted
 * @returns {{result: 'created'|'updated'|'cancelled'|'noop', appointment: null|{action:'insert'|'update', values:object},
 *            cancelIds: string[], cancelReason: string, notifications: object[]}}
 */
export function planAppointmentSync({ ownerId, clientId, existing, notifs = [], incoming, now, notifyChanges = false, newId }) {
  const active = isActiveStatus(incoming.status) && !incoming.deleted;
  const fields = {
    patient_name: incoming.patientName,
    doctor_name: incoming.doctorName,
    doctor_key: incoming.doctorKey,
    room: incoming.room || null,
    visit_type: incoming.visitType || null,
    appointment_date: incoming.date,
    slot_label: incoming.slot,
    starts_at: incoming.startsAt ? incoming.startsAt.toISOString() : null,
    status: incoming.deleted ? 'Deleted' : incoming.status,
  };

  const plan = { result: 'noop', appointment: null, cancelIds: [], cancelReason: '', notifications: [] };
  const rowFor = (appointmentId, kind, revision, extra = {}) =>
    notificationRow({ ownerId, appointmentId, kind, doctorKey: incoming.doctorKey, revision, at: now, ...extra });

  const bookingRow = (appointmentId, revision) =>
    incoming.startsAt && incoming.startsAt <= now
      ? rowFor(appointmentId, 'booking', revision, { status: 'skipped', reason: 'Appointment time had already passed when it was booked' })
      : rowFor(appointmentId, 'booking', revision);

  const reminderRow = (appointmentId, revision) => {
    const at = reminderInstant(incoming.date);
    if (incoming.startsAt && at >= incoming.startsAt) {
      return rowFor(appointmentId, 'reminder', revision, { at, status: 'skipped', reason: 'Appointment starts before the 08:00 IST reminder time' });
    }
    if (at <= now) {
      return rowFor(appointmentId, 'reminder', revision, { at, status: 'skipped', reason: 'The 08:00 IST reminder time had already passed' });
    }
    return rowFor(appointmentId, 'reminder', revision, { at });
  };

  // ---- never seen before ---------------------------------------------------
  if (!existing) {
    if (!active) return plan; // nothing to notify about, nothing worth storing
    plan.result = 'created';
    plan.appointment = { action: 'insert', values: { id: newId, owner_id: ownerId, client_id: clientId, token_id: incoming.tokenId, revision: 1, ...fields } };
    plan.notifications.push(bookingRow(newId, 1), reminderRow(newId, 1));
    return plan;
  }

  const appointmentId = existing.id;
  const wasActive = isActiveStatus(existing.status);
  const pending = notifs.filter((n) => n.status === 'pending');
  const cancelPending = (list, reason) => {
    plan.cancelIds = list.map((n) => n.id);
    plan.cancelReason = reason;
  };
  const update = (revision) => {
    plan.appointment = { action: 'update', values: { ...fields, revision } };
  };
  const toldDoctor = (doctorKey) =>
    notifs.some((n) => n.doctor_key === doctorKey && (n.kind === 'booking' || n.kind === 'update') && ['sent', 'delivered'].includes(n.status));

  const sameRow =
    existing.patient_name === fields.patient_name &&
    existing.doctor_name === fields.doctor_name &&
    existing.doctor_key === fields.doctor_key &&
    (existing.room ?? null) === fields.room &&
    (existing.visit_type ?? null) === fields.visit_type &&
    existing.appointment_date === fields.appointment_date &&
    existing.slot_label === fields.slot_label &&
    time(existing.starts_at) === time(fields.starts_at) &&
    existing.status === fields.status;

  // ---- inactive -> inactive (e.g. Cancelled -> Deleted) ----------------------
  if (!wasActive && !active) {
    if (!sameRow) {
      update(existing.revision);
      plan.result = 'updated';
    }
    return plan;
  }

  // ---- inactive -> active: the token was reused / the appointment re-opened ---
  if (!wasActive && active) {
    const revision = existing.revision + 1;
    update(revision);
    cancelPending(pending, 'Appointment was re-opened');
    plan.result = 'updated';
    plan.notifications.push(bookingRow(appointmentId, revision), reminderRow(appointmentId, revision));
    return plan;
  }

  // ---- active -> inactive: cancelled / completed / no-show / deleted ----------
  if (wasActive && !active) {
    update(existing.revision);
    cancelPending(pending, 'Appointment is no longer active');
    plan.result = 'cancelled';
    if (notifyChanges && (incoming.deleted || isCancelledStatus(incoming.status)) && toldDoctor(existing.doctor_key)) {
      plan.notifications.push(
        notificationRow({
          ownerId, appointmentId, kind: 'cancellation', doctorKey: existing.doctor_key, revision: existing.revision, at: now,
          payload: { snapshot: { token_id: existing.token_id, patient_name: existing.patient_name, appointment_date: existing.appointment_date, slot_label: existing.slot_label } },
        }),
      );
    }
    return plan;
  }

  // ---- active -> active ---------------------------------------------------------
  const doctorChanged = existing.doctor_key !== incoming.doctorKey;
  const scheduleChanged =
    existing.appointment_date !== incoming.date ||
    existing.slot_label !== incoming.slot ||
    time(existing.starts_at) !== (incoming.startsAt ? incoming.startsAt.getTime() : null);

  if (doctorChanged) {
    // For the new doctor this is a fresh booking; the previous doctor is released.
    const revision = existing.revision + 1;
    update(revision);
    cancelPending(pending, 'Appointment was reassigned to another doctor');
    plan.result = 'updated';
    if (notifyChanges && toldDoctor(existing.doctor_key)) {
      plan.notifications.push(
        notificationRow({
          ownerId, appointmentId, kind: 'cancellation', doctorKey: existing.doctor_key, revision: existing.revision, at: now,
          payload: { snapshot: { token_id: existing.token_id, patient_name: existing.patient_name, appointment_date: existing.appointment_date, slot_label: existing.slot_label } },
        }),
      );
    }
    plan.notifications.push(bookingRow(appointmentId, revision), reminderRow(appointmentId, revision));
    return plan;
  }

  if (scheduleChanged) {
    // Same doctor, new date/time: the old reminder is void, a new one is queued.
    const revision = existing.revision + 1;
    update(revision);
    cancelPending(pending.filter((n) => n.kind === 'reminder' || n.kind === 'update'), 'Appointment was rescheduled');
    plan.result = 'updated';
    if (notifyChanges && toldDoctor(existing.doctor_key)) {
      plan.notifications.push(
        rowFor(appointmentId, 'update', revision, { payload: { previous: { date: existing.appointment_date, slot: existing.slot_label } } }),
      );
    }
    plan.notifications.push(reminderRow(appointmentId, revision));
    return plan;
  }

  // Same doctor, same schedule: only details changed (or a previous sync stopped half-way).
  // Self-heal: make sure the doctor has been booked and a reminder exists; the dedupe
  // keys guarantee nothing is queued twice.
  if (!sameRow) update(existing.revision);

  const hasBooking = notifs.some((n) => n.kind === 'booking' && n.doctor_key === incoming.doctorKey && n.status !== 'cancelled');
  if (!hasBooking) plan.notifications.push(bookingRow(appointmentId, existing.revision));

  const reminderKey = `reminder:${appointmentId}:r${existing.revision}`;
  if (!notifs.some((n) => n.dedupe_key === reminderKey && LIVE_STATUSES.has(n.status))) {
    plan.notifications.push(reminderRow(appointmentId, existing.revision));
  }

  plan.result = plan.appointment || plan.notifications.length ? 'updated' : 'noop';
  return plan;
}
