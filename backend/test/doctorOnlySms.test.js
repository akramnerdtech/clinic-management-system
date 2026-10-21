import test from 'node:test';
import assert from 'node:assert/strict';
import { FakePostgrest, FakeTwilio } from './helpers/fakePostgrest.js';
import { createNotificationService } from '../src/services/notificationService.js';
import { createSupabaseStore } from '../../supabase/functions/_shared/store.ts';
import { processQueue, readWorkerEnv } from '../../supabase/functions/_shared/worker.ts';

const OWNER = 'user-1';
const CLIENT = 'client-abcdef12';
const DOCTOR = '+919876543210';
const SECRETS = { TWILIO_ACCOUNT_SID: 'AC123', TWILIO_AUTH_TOKEN: 'tok', TWILIO_FROM_NUMBER: '+15550001111', SMS_WORKER_SECRET: 's3cret', SUPABASE_URL: 'https://abc.supabase.co' };

test('booking with a patient mobile sends only to the doctor and queues 08:00 IST reminder', async () => {
  const clock = { t: new Date('2026-10-19T03:00:00Z') };
  const now = () => new Date(clock.t);
  const db = new FakePostgrest(now);
  const client = db.client();
  const twilio = new FakeTwilio();
  let triggers = 0;
  const service = createNotificationService({ db: client, now, triggerWorker: async () => { triggers++; } });
  await service.saveDoctorContact(OWNER, { name: 'Dr. Priya Patel', mobile: DOCTOR });
  const store = createSupabaseStore(client);
  const env = readWorkerEnv((k) => SECRETS[k]);

  const result = await service.syncAppointment(OWNER, {
    clientId: CLIENT,
    action: 'upsert',
    appointment: {
      tokenId: 'TK-001', patientName: 'Rahul Sharma', patientMobile: '+919123456780',
      doctorName: 'Dr. Priya Patel', date: '2026-10-20', slot: '10:00 AM - 10:15 AM',
      status: 'Slot Booked', room: 'Suite 101',
    },
  });

  assert.deepEqual(result, { result: 'created', queued: 2 });
  assert.equal(triggers, 1, 'instant booking SMS triggers the worker immediately');
  const summary = await processQueue({ store, env, fetchImpl: twilio.fetch, now });
  assert.equal(summary.sent, 1);
  assert.equal(twilio.calls.length, 1);
  assert.equal(twilio.calls[0].form.To, DOCTOR);
  assert.match(twilio.calls[0].form.Body, /NEW APPOINTMENT\nAppointment ID: TK-001/);
  assert.equal(db.rows('sms_notifications').some((n) => n.kind === 'patient_confirmation'), false);
  const reminder = db.rows('sms_notifications').find((n) => n.kind === 'reminder');
  assert.equal(reminder.status, 'pending');
  assert.equal(reminder.scheduled_for, '2026-10-20T02:30:00.000Z'); // 08:00 IST
});
