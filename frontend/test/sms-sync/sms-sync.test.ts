import './setup.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import { apiClient } from '@/config/api';
import { appointmentsService } from '@/services/appointmentsService';
import { doctorsService } from '@/services/doctorsService';
import { notificationSyncService, flush } from '@/services/notificationSyncService';
import type { AppointmentEntry, Doctor } from '@/types';

const g: any = globalThis;
const calls: any[] = [];
let respond: (cfg: any) => { status: number } = () => ({ status: 200 });
(apiClient.defaults as any).adapter = async (cfg: any) => {
  const r = respond(cfg);
  const res = { data: {}, status: r.status, statusText: '', headers: {}, config: cfg };
  calls.push({ url: cfg.url, auth: cfg.headers?.get?.('Authorization') ?? cfg.headers?.Authorization, body: JSON.parse(cfg.data) });
  if (r.status >= 400) { const e: any = new Error('http ' + r.status); e.response = res; e.config = cfg; throw e; }
  return res;
};
const login = () => g.__store.set('curaclinic.auth.session', JSON.stringify({ token: 'jwt-123', user: { id: 'u1', email: 'a@b.c', fullName: 'A' } }));
const logout = () => g.__store.delete('curaclinic.auth.session');
const outbox = () => JSON.parse(g.__store.get('curaclinic.notifications.outbox') ?? '[]');
const settle = async () => { for (let i = 0; i < 20; i++) await new Promise((r) => setImmediate(r)); };
const reset = () => { calls.length = 0; g.__store.clear(); g.__timers.length = 0; respond = () => ({ status: 200 }); };

const entry = (o: Partial<Record<number, string>> = {}): AppointmentEntry => {
  const e: AppointmentEntry = ['10:00 AM - 10:15 AM', '15 min slot', 'TK-001', 'Rahul Sharma', '32 / M', 'Chest pain (SENSITIVE)', 'private memo', 'Dr. Priya Patel', 'Suite 101', '15 Min Consultation', 'Slot Booked', '2026-10-20'];
  Object.entries(o).forEach(([i, v]) => ((e as any)[Number(i)] = v));
  return e;
};

test('addEntry syncs a booking with the session token and minimal data (no complaint/notes)', async () => {
  reset(); login();
  appointmentsService.addEntry(entry());
  await settle();
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, '/notifications/appointments/sync');
  assert.equal(calls[0].auth, 'Bearer jwt-123');
  assert.equal(calls[0].body.action, 'upsert');
  assert.deepEqual(calls[0].body.appointment, { tokenId: 'TK-001', patientName: 'Rahul Sharma', doctorName: 'Dr. Priya Patel', date: '2026-10-20', slot: '10:00 AM - 10:15 AM', status: 'Slot Booked', room: 'Suite 101', visitType: '15 Min Consultation' });
  assert.ok(!JSON.stringify(calls[0].body).includes('SENSITIVE') && !JSON.stringify(calls[0].body).includes('private memo'));
  assert.match(calls[0].body.clientId, /^[A-Za-z0-9_-]{8,64}$/);
  assert.equal(outbox().length, 0);
  assert.equal(appointmentsService.getEntries().length, 1, 'localStorage behaviour unchanged');
});

test('clientId is stable across calls', async () => {
  reset(); login();
  appointmentsService.addEntry(entry()); appointmentsService.addEntry(entry({ 2: 'TK-002' }));
  await settle();
  assert.equal(calls[0].body.clientId, calls[1].body.clientId);
});

test('edit/reschedule, status change and delete are all synced', async () => {
  reset(); login();
  appointmentsService.addEntry(entry());
  appointmentsService.updateEntry('TK-001', entry({ 0: '11:00 AM - 11:15 AM', 11: '2026-10-21' }));
  appointmentsService.updateStatus('TK-001', 'Cancelled');
  appointmentsService.deleteEntry('TK-001');
  await settle();
  assert.deepEqual(calls.map((c) => [c.body.action, c.body.appointment.status, c.body.appointment.date, c.body.appointment.slot]), [
    ['upsert', 'Slot Booked', '2026-10-20', '10:00 AM - 10:15 AM'],
    ['upsert', 'Slot Booked', '2026-10-21', '11:00 AM - 11:15 AM'],
    ['upsert', 'Cancelled', '2026-10-21', '11:00 AM - 11:15 AM'],
    ['delete', 'Cancelled', '2026-10-21', '11:00 AM - 11:15 AM'],
  ], 'sent in order');
  assert.equal(appointmentsService.getEntries().length, 0);
});

test('entries without a date, and unknown tokens, are ignored safely', async () => {
  reset(); login();
  const legacy = entry(); (legacy as any)[11] = undefined;
  appointmentsService.addEntry(legacy);
  appointmentsService.updateStatus('NOPE', 'Cancelled');
  appointmentsService.deleteEntry('NOPE');
  await settle();
  assert.equal(calls.length, 0);
  assert.equal(outbox().length, 0);
});

test('not signed in: change is kept in the outbox and delivered after login', async () => {
  reset(); logout();
  appointmentsService.addEntry(entry());
  await settle();
  assert.equal(calls.length, 0);
  assert.equal(outbox().length, 1);
  assert.ok(g.__timers.length >= 1, 'a retry is scheduled');
  login();
  await flush();
  assert.equal(calls.length, 1);
  assert.equal(outbox().length, 0);
});

test('backend down: kept and retried in order; rejected data is dropped', async () => {
  reset(); login();
  respond = () => ({ status: 503 });
  appointmentsService.addEntry(entry());
  appointmentsService.addEntry(entry({ 2: 'TK-002' }));
  await settle();
  assert.equal(outbox().length, 2);
  assert.equal(calls.length, 1, 'stops at the first failure so order is preserved');
  respond = () => ({ status: 200 });
  await flush();
  assert.deepEqual(calls.slice(1).map((c) => c.body.appointment.tokenId), ['TK-001', 'TK-002']);
  assert.equal(outbox().length, 0);

  reset(); login();
  respond = () => ({ status: 400 });
  appointmentsService.addEntry(entry());
  await settle();
  assert.equal(outbox().length, 0, 'permanent rejection is not retried forever');
});

test('doctor mobile and rename are synced; blank mobile is not', async () => {
  reset(); login();
  notificationSyncService.syncDoctorContact('Dr. Priya Patel', '98765 43210');
  notificationSyncService.syncDoctorContact('Dr. No Phone', '  ');
  const doc: Doctor = ['Dr. Priya Patil', 'Cardiology', 'S1', 'M T', 'ON DUTY', '0 /16', 'x'];
  g.window.localStorage.setItem('curaclinic.doctors.doctors', JSON.stringify([['Dr. Priya Patel', 'Cardiology', 'S1', 'M T', 'ON DUTY', '0 /16', 'x']]));
  doctorsService.updateDoctor('Dr. Priya Patel', doc);
  doctorsService.updateDoctor('Dr. Priya Patil', doc); // same name: no call
  await settle();
  assert.deepEqual(calls.map((c) => [c.url, c.body]), [
    ['/notifications/doctors', { name: 'Dr. Priya Patel', mobile: '98765 43210' }],
    ['/notifications/doctors/rename', { from: 'Dr. Priya Patel', to: 'Dr. Priya Patil' }],
  ]);
});

test('booking carries the patient mobile (and only booking does); the mobile is optional and never leaks into edits', async () => {
  reset(); login();
  appointmentsService.addEntry(entry(), { patientMobile: ' 98765 43210 ' });
  appointmentsService.addEntry(entry({ 2: 'TK-002' }), { patientMobile: '' }); // patient has no mobile on file: sent as '' so the server can log why
  appointmentsService.addEntry(entry({ 2: 'TK-003' })); // old call style: field omitted entirely
  appointmentsService.updateEntry('TK-001', entry({ 0: '11:00 AM - 11:15 AM' }));
  appointmentsService.updateStatus('TK-001', 'Waiting');
  await settle();
  const [a, b, c, edit, status] = calls.map((x) => x.body.appointment);
  assert.equal(a.patientMobile, '98765 43210', 'trimmed; the server validates and normalises it');
  assert.equal(b.patientMobile, '');
  assert.ok(!('patientMobile' in c));
  assert.ok(!('patientMobile' in edit) && !('patientMobile' in status), 'edits / status changes never re-trigger a confirmation');
  assert.ok(!JSON.stringify(calls).includes('SENSITIVE') && !JSON.stringify(calls).includes('private memo'));
  assert.equal(appointmentsService.getEntries().length, 3, 'localStorage entries are unchanged (no mobile stored in them)');
  assert.equal(appointmentsService.getEntries()[2].length, 12);
});

test('a booking made while offline keeps its patient mobile in the outbox and delivers it later', async () => {
  reset(); logout();
  appointmentsService.addEntry(entry(), { patientMobile: '+919123456780' });
  await settle();
  assert.equal(calls.length, 0);
  assert.equal(outbox()[0].body.appointment.patientMobile, '+919123456780');
  login();
  await flush();
  assert.equal(calls[0].body.appointment.patientMobile, '+919123456780');
  assert.equal(outbox().length, 0);
});
