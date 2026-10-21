import test from 'node:test';
import assert from 'node:assert/strict';
import { FakePostgrest, FakeTwilio } from './helpers/fakePostgrest.js';
import { createNotificationService } from '../src/services/notificationService.js';
import { createSupabaseStore } from '../../supabase/functions/_shared/store.ts';
import { handleStatusCallback } from '../../supabase/functions/_shared/statusCallback.ts';
import { computeTwilioSignature } from '../../supabase/functions/_shared/twilio.ts';
import { processQueue, readWorkerEnv, handleWorkerRequest } from '../../supabase/functions/_shared/worker.ts';

const OWNER = 'user-1';
const CLIENT = 'client-abcdef12';
const CALLBACK = 'https://abc.supabase.co/functions/v1/twilio-status-callback';
const SECRETS = { TWILIO_ACCOUNT_SID: 'AC123', TWILIO_AUTH_TOKEN: 'tok', TWILIO_FROM_NUMBER: '+15550001111', SMS_WORKER_SECRET: 's3cret', SUPABASE_URL: 'https://abc.supabase.co' };

/** Monday 19 Oct 2026, 08:30 IST (03:00 UTC). */
function setup({ notifyChanges = false, dailyLimit = 300, secrets = SECRETS } = {}) {
  const clock = { t: new Date('2026-10-19T03:00:00Z') };
  const now = () => new Date(clock.t);
  const db = new FakePostgrest(now);
  const client = db.client();
  const twilio = new FakeTwilio();
  const triggers = { n: 0 };
  const service = createNotificationService({ db: client, now, notifyChanges, dailyLimit, triggerWorker: async () => { triggers.n++; } });
  const store = createSupabaseStore(client);
  const env = readWorkerEnv((k) => secrets[k]);
  return {
    clock, db, twilio, triggers, service, store, env,
    advance: (minutes) => { clock.t = new Date(clock.t.getTime() + minutes * 60_000); },
    setTime: (iso) => { clock.t = new Date(iso); },
    run: () => processQueue({ store, env, fetchImpl: twilio.fetch, now }),
    contact: (name, mobile) => service.saveDoctorContact(OWNER, { name, mobile }),
    sync: (a, action = 'upsert') => service.syncAppointment(OWNER, { clientId: CLIENT, action, appointment: appt(a) }),
    notifs: (where = () => true) => db.rows('sms_notifications', where),
    byKind: (kind, status) => db.rows('sms_notifications', (n) => n.kind === kind && (!status || n.status === status)),
  };
}
const appt = (o = {}) => ({ tokenId: 'TK-001', patientName: 'Rahul Sharma', doctorName: 'Dr. Priya Patel', date: '2026-10-20', slot: '10:00 AM - 10:15 AM', status: 'Slot Booked', room: 'Suite 101', visitType: '15 Min Consultation', ...o });

test('booking: SMS goes to the doctor immediately; reminder is scheduled for 08:00 IST on the day', async () => {
  const t = setup();
  await t.contact('Dr. Priya Patel', '98765 43210');
  const res = await t.sync();
  assert.deepEqual(res, { result: 'created', queued: 2 });
  assert.equal(t.triggers.n, 1, 'worker nudged immediately');

  const [booking] = t.byKind('booking');
  const [reminder] = t.byKind('reminder');
  assert.equal(booking.scheduled_for, '2026-10-19T03:00:00.000Z');
  assert.equal(reminder.scheduled_for, '2026-10-20T02:30:00.000Z'); // 08:00 IST

  const summary = await t.run();
  assert.equal(summary.sent, 1);
  assert.equal(t.twilio.calls.length, 1);
  const call = t.twilio.calls[0];
  assert.equal(call.form.To, '+919876543210');
  assert.equal(call.form.From, '+15550001111');
  assert.equal(call.form.StatusCallback, CALLBACK);
  assert.match(call.form.Body, /NEW APPOINTMENT\nAppointment ID: TK-001\nPatient: Rahul Sharma\nDate: Tue 20 Oct 2026\nTime: 10:00 AM - 10:15 AM IST/);
  assert.equal(call.headers.Authorization, `Basic ${Buffer.from('AC123:tok').toString('base64')}`);
  const sent = t.byKind('booking')[0];
  assert.equal(sent.status, 'sent');
  assert.match(sent.twilio_sid, /^SM/);
  assert.equal(t.byKind('reminder')[0].status, 'pending', 'reminder not sent early');
});

test('reminder is sent exactly at 08:00 IST on the appointment day, once', async () => {
  const t = setup();
  await t.contact('Dr. Priya Patel', '+919876543210');
  await t.sync();
  await t.run();
  t.setTime('2026-10-20T02:29:00Z');
  assert.equal((await t.run()).claimed, 0, '07:59 IST: nothing yet');
  t.setTime('2026-10-20T02:30:00Z');
  assert.equal((await t.run()).sent, 1);
  assert.match(t.twilio.calls[1].form.Body, /APPOINTMENT REMINDER\nReminder: appointment scheduled for today\nAppointment ID: TK-001/);
  t.advance(60);
  assert.equal((await t.run()).claimed, 0);
  assert.equal(t.twilio.calls.length, 2, 'booking + reminder only');
});

test('duplicates: re-syncing and overlapping workers never double-send', async () => {
  const t = setup();
  await t.contact('Dr. Priya Patel', '+919876543210');
  await t.sync();
  assert.deepEqual(await t.sync(), { result: 'noop', queued: 0 }); // identical payload
  assert.deepEqual(await t.sync({ patientName: 'Rahul Sharma' }), { result: 'noop', queued: 0 });
  assert.equal(t.notifs().length, 2);

  const [a, b, c] = await Promise.all([t.run(), t.run(), t.run()]); // cron + trigger overlapping
  assert.equal(a.sent + b.sent + c.sent, 1);
  assert.equal(t.twilio.calls.length, 1);
  await t.sync({ room: 'Suite 202' }); // details edit after sending: no new SMS
  await t.run();
  assert.equal(t.twilio.calls.length, 1);
  assert.equal(t.db.rows('clinic_appointments').length, 1);
});

test('concurrent first-time syncs of the same appointment create one booking', async () => {
  const t = setup();
  await t.contact('Dr. Priya Patel', '+919876543210');
  await Promise.all([t.sync(), t.sync(), t.sync()]);
  assert.equal(t.db.rows('clinic_appointments').length, 1);
  assert.equal(t.byKind('booking').length, 1);
  assert.equal(t.byKind('reminder').length, 1);
});

test('reschedule: old reminder cancelled, new one queued, no extra booking SMS', async () => {
  const t = setup();
  await t.contact('Dr. Priya Patel', '+919876543210');
  await t.sync();
  await t.run();
  const res = await t.sync({ date: '2026-10-21', slot: '02:00 PM - 02:15 PM' });
  assert.equal(res.result, 'updated');
  assert.equal(t.byKind('reminder', 'cancelled').length, 1);
  const live = t.byKind('reminder', 'pending');
  assert.equal(live.length, 1);
  assert.equal(live[0].scheduled_for, '2026-10-21T02:30:00.000Z');
  assert.equal(t.db.rows('clinic_appointments')[0].revision, 2);

  t.setTime('2026-10-20T02:30:00Z');
  assert.equal((await t.run()).claimed, 0, 'nothing on the OLD date');
  t.setTime('2026-10-21T02:30:00Z');
  assert.equal((await t.run()).sent, 1);
  assert.match(t.twilio.calls[1].form.Body, /02:00 PM - 02:15 PM/);
  assert.equal(t.twilio.calls.length, 2);
  assert.equal(t.byKind('booking').length, 1);
});

test('reschedule A -> B -> A recreates the reminder (cancelled rows do not block the dedupe key)', async () => {
  const t = setup();
  await t.contact('Dr. Priya Patel', '+919876543210');
  await t.sync();
  await t.sync({ date: '2026-10-21' });
  await t.sync({ date: '2026-10-20' });
  const pending = t.byKind('reminder', 'pending');
  assert.equal(pending.length, 1);
  assert.equal(pending[0].scheduled_for, '2026-10-20T02:30:00.000Z');
});

test('cancel before the SMS went out: nothing is ever sent', async () => {
  const t = setup();
  await t.contact('Dr. Priya Patel', '+919876543210');
  await t.sync();
  const res = await t.sync({ status: 'Cancelled' });
  assert.equal(res.result, 'cancelled');
  assert.equal(t.notifs((n) => n.status === 'cancelled').length, 2);
  await t.run();
  t.setTime('2026-10-20T02:31:00Z');
  await t.run();
  assert.equal(t.twilio.calls.length, 0);
});

test('cancel / delete after the booking SMS: reminder cancelled, nothing more is sent', async () => {
  for (const mode of ['status', 'delete']) {
    const t = setup();
    await t.contact('Dr. Priya Patel', '+919876543210');
    await t.sync();
    await t.run();
    if (mode === 'status') await t.sync({ status: 'Cancelled' });
    else await t.sync({}, 'delete');
    assert.equal(t.byKind('reminder', 'cancelled').length, 1, mode);
    t.setTime('2026-10-20T02:31:00Z');
    await t.run();
    assert.equal(t.twilio.calls.length, 1, `${mode}: only the original booking SMS`);
  }
});

test('worker safety net: if the appointment is cancelled while an SMS is already claimed, it is not sent', async () => {
  const t = setup();
  await t.contact('Dr. Priya Patel', '+919876543210');
  await t.sync();
  // simulate the race: appointment cancelled directly in the table after the row was queued
  t.db.rows('clinic_appointments')[0].status = 'Cancelled';
  await t.run();
  assert.equal(t.twilio.calls.length, 0);
  assert.equal(t.byKind('booking')[0].status, 'cancelled');
});

test('token reuse after delete is treated as a brand-new booking', async () => {
  const t = setup();
  await t.contact('Dr. Priya Patel', '+919876543210');
  await t.sync();
  await t.run();
  await t.sync({}, 'delete');
  await t.sync({ patientName: 'Anita Rao', date: '2026-10-22' });
  await t.run();
  assert.equal(t.twilio.calls.length, 2);
  assert.match(t.twilio.calls[1].form.Body, /Patient: Anita Rao\. Thu 22 Oct 2026/);
  assert.equal(t.db.rows('clinic_appointments')[0].revision, 2);
});

test('doctor change: new doctor is booked, old doctor never gets the reminder', async () => {
  const t = setup();
  await t.contact('Dr. Priya Patel', '+919876543210');
  await t.contact('Dr. Marcus Vale', '+919811122233');
  await t.sync();
  await t.run();
  await t.sync({ doctorName: 'Dr. Marcus Vale' });
  await t.run();
  assert.equal(t.twilio.calls.length, 2);
  assert.equal(t.twilio.calls[1].form.To, '+919811122233');
  t.setTime('2026-10-20T02:30:00Z');
  await t.run();
  assert.equal(t.twilio.calls.length, 3);
  assert.equal(t.twilio.calls[2].form.To, '+919811122233');
  assert.ok(!t.twilio.calls.slice(1).some((c) => c.form.To === '+919876543210'));
});

test('failures: transient errors retry with back-off and send once; permanent errors stop', async () => {
  const t = setup();
  await t.contact('Dr. Priya Patel', '+919876543210');
  await t.sync();
  t.twilio.script.push({ status: 503, body: { message: 'unavailable' } });
  assert.equal((await t.run()).retried, 1);
  let b = t.byKind('booking')[0];
  assert.deepEqual([b.status, b.attempts, b.error_code], ['pending', 1, 'HTTP_503']);
  assert.equal(b.next_attempt_at, '2026-10-19T03:01:00.000Z');
  assert.equal((await t.run()).claimed, 0, 'not before the back-off elapsed');
  t.advance(1);
  t.twilio.script.push('network');
  assert.equal((await t.run()).retried, 1);
  b = t.byKind('booking')[0];
  assert.equal(b.attempts, 2);
  assert.equal(b.next_attempt_at, '2026-10-19T03:06:00.000Z'); // +5 min
  t.advance(5);
  assert.equal((await t.run()).sent, 1);
  b = t.byKind('booking')[0];
  assert.deepEqual([b.status, b.attempts, b.last_error], ['sent', 3, null]);
  assert.equal(t.twilio.calls.length, 3);

  // permanent: invalid number is not retried
  const p = setup();
  await p.contact('Dr. Priya Patel', '+919876543210');
  await p.sync();
  p.twilio.script.push({ status: 400, body: { code: 21211, message: "Invalid 'To' Phone Number" } });
  assert.equal((await p.run()).failed, 1);
  const pb = p.byKind('booking')[0];
  assert.deepEqual([pb.status, pb.error_code], ['failed', '21211']);
  p.advance(600);
  assert.equal((await p.run()).claimed, 0);

  // gives up after max_attempts
  const g = setup();
  await g.contact('Dr. Priya Patel', '+919876543210');
  await g.sync();
  for (let i = 0; i < 5; i++) { g.twilio.script.push({ status: 500, body: {} }); await g.run(); g.advance(300); }
  const gb = g.byKind('booking')[0];
  assert.deepEqual([gb.status, gb.attempts], ['failed', 5]);
  assert.equal(g.twilio.calls.length, 5);
});

test('missing doctor mobile: booking fails visibly, reminder still works once the number is added', async () => {
  const t = setup();
  await t.sync(); // no contact registered yet
  await t.run();
  const b = t.byKind('booking')[0];
  assert.deepEqual([b.status, b.error_code], ['failed', 'NO_DOCTOR_MOBILE']);
  assert.equal(t.twilio.calls.length, 0);
  await t.contact('Dr. Priya Patel', '+919876543210'); // number added later (number is looked up at send time)
  t.setTime('2026-10-20T02:30:00Z');
  await t.run();
  assert.equal(t.twilio.calls.length, 1);
  assert.match(t.twilio.calls[0].form.Body, /reminder/);
});

test('stale locks from a crashed worker are recovered', async () => {
  const t = setup();
  await t.contact('Dr. Priya Patel', '+919876543210');
  await t.sync();
  const n = t.byKind('booking')[0];
  Object.assign(n, { status: 'sending', attempts: 1, locked_at: '2026-10-19T02:40:00.000Z' }); // 20 min ago
  assert.equal((await t.run()).sent, 1);
  const fresh = setup();
  await fresh.contact('Dr. Priya Patel', '+919876543210');
  await fresh.sync();
  Object.assign(fresh.byKind('booking')[0], { status: 'sending', attempts: 1, locked_at: '2026-10-19T02:58:00.000Z' }); // 2 min ago: still in flight
  assert.equal((await fresh.run()).claimed, 0);
});

test('edge cases: past slot, same-day after 8 AM, slot before 8 AM, daily cap', async () => {
  const t = setup();
  await t.contact('Dr. Priya Patel', '+919876543210');
  await t.sync({ tokenId: 'TK-010', date: '2026-10-19', slot: '10:00 AM - 10:15 AM' }); // 08:30 IST now: booked for later today
  assert.equal(t.byKind('reminder')[0].status, 'skipped', '08:00 already passed');
  assert.equal(t.byKind('booking')[0].status, 'pending');
  await t.sync({ tokenId: 'TK-011', date: '2026-10-19', slot: '08:00 AM - 08:15 AM' }); // already started
  assert.equal(t.byKind('booking').find((n) => n.dedupe_key.includes(t.db.rows('clinic_appointments')[1].id)).status, 'skipped');
  await t.sync({ tokenId: 'TK-012', date: '2026-10-21', slot: '07:30 AM - 07:45 AM' }); // before 08:00 IST
  const early = t.byKind('reminder').find((n) => n.dedupe_key.includes(t.db.rows('clinic_appointments')[2].id));
  assert.equal(early.status, 'skipped');
  assert.match(early.last_error, /before the 08:00 IST/);

  const c = setup({ dailyLimit: 3 });
  await c.contact('Dr. Priya Patel', '+919876543210');
  for (const n of [1, 2, 3]) await c.sync({ tokenId: `TK-10${n}` }); // 6 SMS wanted, 3 allowed
  const pending = c.notifs((x) => x.status === 'pending').length;
  const capped = c.notifs((x) => x.last_error === 'Daily SMS limit reached for this account').length;
  assert.equal(pending, 3);
  assert.equal(capped, 3);
});

test('optional change notices (SMS_NOTIFY_CHANGES): off by default, on when enabled', async () => {
  const off = setup();
  await off.contact('Dr. Priya Patel', '+919876543210');
  await off.sync();
  await off.run();
  await off.sync({ date: '2026-10-21' });
  await off.sync({ status: 'Cancelled', date: '2026-10-21' });
  await off.run();
  assert.equal(off.twilio.calls.length, 1, 'only the booking SMS');

  const on = setup({ notifyChanges: true });
  await on.contact('Dr. Priya Patel', '+919876543210');
  await on.sync();
  await on.run();
  await on.sync({ date: '2026-10-21' });
  await on.run();
  assert.match(on.twilio.calls[1].form.Body, /rescheduled to Wed 21 Oct 2026.*Previously Tue 20 Oct 2026/);
  await on.sync({ date: '2026-10-21', status: 'Cancelled' });
  await on.run();
  assert.match(on.twilio.calls[2].form.Body, /Appointment TK-001 \(Rahul Sharma, Wed 21 Oct 2026, 10:00 AM - 10:15 AM IST\) has been cancelled/);
  assert.equal(on.twilio.calls.length, 3);
  // a booking that was never delivered produces no "cancelled" notice
  const never = setup({ notifyChanges: true });
  await never.contact('Dr. Priya Patel', '+919876543210');
  await never.sync();
  await never.sync({ status: 'Cancelled' });
  await never.run();
  assert.equal(never.twilio.calls.length, 0);
});

test('delivery receipts: delivered / undelivered recorded, bad signatures rejected', async () => {
  const t = setup();
  await t.contact('Dr. Priya Patel', '+919876543210');
  await t.sync();
  await t.run();
  const sid = t.byKind('booking')[0].twilio_sid;
  const post = async (params, sign = true) => {
    const signature = sign ? await computeTwilioSignature('tok', CALLBACK, params) : 'bad';
    return handleStatusCallback(
      new Request(CALLBACK, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded', 'x-twilio-signature': signature }, body: new URLSearchParams(params) }),
      { store: t.store, authToken: 'tok', publicUrl: CALLBACK, now: () => t.clock.t },
    );
  };
  assert.equal((await post({ MessageSid: sid, MessageStatus: 'delivered' }, false)).status, 403);
  assert.equal(t.byKind('booking')[0].status, 'sent');
  assert.equal((await post({ MessageSid: sid, MessageStatus: 'sent' })).status, 204);
  assert.equal((await post({ MessageSid: sid, MessageStatus: 'delivered' })).status, 204);
  assert.equal((await post({ MessageSid: sid, MessageStatus: 'sent' })).status, 204); // late, ignored
  let b = t.byKind('booking')[0];
  assert.deepEqual([b.status, b.delivery_status], ['delivered', 'delivered']);
  assert.ok(b.delivered_at);
  assert.equal((await post({ MessageSid: 'SMunknown', MessageStatus: 'delivered' })).status, 202);

  // undelivered reminder
  t.setTime('2026-10-20T02:30:00Z');
  await t.run();
  const rsid = t.byKind('reminder')[0].twilio_sid;
  await post({ MessageSid: rsid, MessageStatus: 'undelivered', ErrorCode: '30003', ErrorMessage: 'Unreachable destination handset' });
  b = t.byKind('reminder')[0];
  assert.deepEqual([b.status, b.error_code], ['failed', '30003']);
});

test('worker endpoint: shared-secret auth and configuration guards', async () => {
  const t = setup();
  const call = (headers, env = t.env, method = 'POST') =>
    handleWorkerRequest(new Request('https://x/functions/v1/process-sms-queue', { method, headers }), { store: t.store, env, fetchImpl: t.twilio.fetch, now: () => t.clock.t });
  assert.equal((await call({})).status, 401);
  assert.equal((await call({ 'x-worker-secret': 'nope' })).status, 401);
  assert.equal((await call({ 'x-worker-secret': 's3cret' }, t.env, 'GET')).status, 405);
  const ok = await call({ 'x-worker-secret': 's3cret' });
  assert.equal(ok.status, 200);
  assert.deepEqual(await ok.json(), { ok: true, claimed: 0, sent: 0, retried: 0, failed: 0, cancelled: 0, skipped: 0 });
  // no secret configured -> closed, not open
  assert.equal((await call({ 'x-worker-secret': '' }, readWorkerEnv(() => undefined))).status, 500);
  // Twilio not configured -> rows stay pending (nothing claimed)
  const noTwilio = setup({ secrets: { SMS_WORKER_SECRET: 's3cret' } });
  await noTwilio.contact('Dr. Priya Patel', '+919876543210');
  await noTwilio.sync();
  const res = await handleWorkerRequest(new Request('https://x/', { method: 'POST', headers: { 'x-worker-secret': 's3cret' } }), { store: noTwilio.store, env: noTwilio.env, now: () => noTwilio.clock.t });
  assert.equal(res.status, 500);
  assert.equal(noTwilio.byKind('booking')[0].status, 'pending');
});

test('input validation and doctor contacts', async () => {
  const t = setup();
  const bad = (fn) => assert.rejects(fn, (e) => e.status === 400);
  await bad(() => t.service.syncAppointment(OWNER, { clientId: 'x', action: 'upsert', appointment: appt() }));
  await bad(() => t.service.syncAppointment(OWNER, { clientId: CLIENT, action: 'nope', appointment: appt() }));
  await bad(() => t.sync({ date: '20-10-2026' }));
  await bad(() => t.sync({ doctorName: '' }));
  await bad(() => t.sync({ slot: '' }));
  await bad(() => t.sync({ tokenId: '' }));
  await bad(() => t.contact('Dr. X', 'not a number'));
  await bad(() => t.contact('', '9876543210'));
  assert.equal(t.db.rows('clinic_appointments').length, 0);

  await t.contact('Dr. Priya Patel', '98765 43210');
  await t.contact('Dr. Priya Patel (Cardiology)', '+91 99999 11111'); // same doctor key -> updated, not duplicated
  assert.deepEqual(t.db.rows('doctor_contacts').map((c) => [c.doctor_key, c.mobile_e164]), [['dr-priya-patel', '+919999911111']]);

  // rename carries the number over; the old name keeps working for old appointments
  await t.service.renameDoctorContact(OWNER, { from: 'Dr. Priya Patel', to: 'Dr. Priya Patil' });
  assert.deepEqual(t.db.rows('doctor_contacts').map((c) => c.doctor_key).sort(), ['dr-priya-patel', 'dr-priya-patil']);
  assert.deepEqual(await t.service.renameDoctorContact(OWNER, { from: 'Unknown Doc', to: 'Someone' }), { saved: false });

  // accounts are isolated: another user's doctor numbers are never used
  await t.sync();
  const other = createNotificationService({ db: t.db.client(), now: () => t.clock.t });
  await other.syncAppointment('user-2', { clientId: CLIENT, action: 'upsert', appointment: appt() });
  assert.equal(t.db.rows('clinic_appointments').length, 2);
  await t.run();
  const calls = t.twilio.calls.map((c) => c.form.To);
  assert.equal(calls.length, 1, "user-2 has no registered doctor number, so nothing was sent for them");
  assert.equal(t.byKind('booking').filter((n) => n.owner_id === 'user-2')[0].error_code, 'NO_DOCTOR_MOBILE');
});

test('database errors surface as 500 so the browser keeps the item and retries', async () => {
  const t = setup();
  t.db.failNext = { method: 'GET', table: 'clinic_appointments', status: 503, times: 10, body: { message: 'upstream down' } }; // postgrest-js retries GETs, so fail persistently
  await assert.rejects(() => t.sync(), (e) => e.status === 500);
});

test('a failed write after the appointment row is saved heals on the next sync (idempotent retry)', async () => {
  const t = setup();
  await t.contact('Dr. Priya Patel', '+919876543210');
  t.db.failNext = { method: 'POST', table: 'sms_notifications', status: 500, times: 1, body: { message: 'boom' } };
  await assert.rejects(() => t.sync(), (e) => e.status === 500); // appointment saved, queueing failed
  assert.equal(t.db.rows('clinic_appointments').length, 1);
  assert.equal(t.notifs().length, 0);
  await t.sync(); // the browser outbox re-sends the same payload
  assert.equal(t.byKind('booking').length, 1);
  assert.equal(t.byKind('reminder').length, 1);
  await t.run();
  assert.equal(t.twilio.calls.length, 1);
});
