import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { normalizeMobile } from '../src/utils/phone.js';
import {
  doctorKeyFromName, normalizeDateKey, parseSlotStartMinutes, slotStartInstant, reminderInstant,
  isActiveStatus as backendActive,
} from '../src/utils/notificationPlanner.js';
import { isActiveStatus as edgeActive, backoffMinutes, classifyTwilioFailure, deliveryPatch, isE164 } from '../../supabase/functions/_shared/rules.ts';
import { buildMessage, smsSafe, formatClinicDate } from '../../supabase/functions/_shared/messages.ts';
import { computeTwilioSignature, validateTwilioSignature, sendTwilioSms, timingSafeEqualStr } from '../../supabase/functions/_shared/twilio.ts';

test('normalizeMobile handles the formats people type', () => {
  assert.equal(normalizeMobile('+1 (555) 349-8821'), '+15553498821'); // placeholder shown in the form
  assert.equal(normalizeMobile('98765 43210'), '+919876543210');
  assert.equal(normalizeMobile('098765 43210'), '+919876543210');
  assert.equal(normalizeMobile('+91 98765-43210'), '+919876543210');
  assert.equal(normalizeMobile('919876543210'), '+919876543210');
  assert.equal(normalizeMobile('0044 7700 900123'), '+447700900123');
  assert.equal(normalizeMobile('98765 43210', '1'), '+19876543210');
  for (const bad of ['', '   ', 'abc', '12345', '+0123456789', '+1234', '123456789012345678', null, undefined]) {
    assert.equal(normalizeMobile(bad), null, `should reject ${bad}`);
  }
});

test('doctorKeyFromName matches the SQL doctor_key() contract', () => {
  assert.equal(doctorKeyFromName('Dr. Priya Patel'), 'dr-priya-patel');
  assert.equal(doctorKeyFromName('  Dr. Eleanor Vance (Neurology) '), 'dr-eleanor-vance');
  assert.equal(doctorKeyFromName('Dr. Ahmed   Rahman!!'), 'dr-ahmed-rahman');
  assert.equal(doctorKeyFromName('---'), '');
  assert.equal(doctorKeyFromName(undefined), '');
});

test('slot parsing + IST conversion', () => {
  assert.equal(parseSlotStartMinutes('03:30 PM - 03:45 PM'), 15 * 60 + 30);
  assert.equal(parseSlotStartMinutes('12:00 AM'), 0);
  assert.equal(parseSlotStartMinutes('12:15 PM - 12:30 PM'), 12 * 60 + 15);
  assert.equal(parseSlotStartMinutes('15:30'), 15 * 60 + 30);
  assert.equal(parseSlotStartMinutes('13:00 PM'), null);
  assert.equal(parseSlotStartMinutes('soon'), null);
  assert.equal(slotStartInstant('2026-10-20', '10:00 AM - 10:15 AM').toISOString(), '2026-10-20T04:30:00.000Z');
  assert.equal(reminderInstant('2026-10-20').toISOString(), '2026-10-20T02:30:00.000Z'); // 08:00 IST
  assert.equal(slotStartInstant('2026-10-20', '12:10 AM').toISOString(), '2026-10-19T18:40:00.000Z'); // crosses UTC midnight
  assert.equal(normalizeDateKey('2026-02-30'), '');
  assert.equal(normalizeDateKey('2026-10-20'), '2026-10-20');
});

test('backend and edge agree on which statuses are active', () => {
  for (const s of ['Slot Booked', 'Waiting', 'In Consultation', 'Confirmed', 'Cancelled', 'cancelled', 'CANCELLED', 'Completed', 'No Show', 'no_show', 'No-Show', 'Deleted', '', undefined]) {
    assert.equal(edgeActive(s), backendActive(s), `status ${JSON.stringify(s)}`);
  }
  assert.equal(backendActive('Slot Booked'), true);
  assert.equal(backendActive('Cancelled'), false);
});

test('retry rules', () => {
  assert.deepEqual([1, 2, 3, 4, 5, 9].map(backoffMinutes), [1, 5, 15, 60, 240, 240]);
  assert.equal(classifyTwilioFailure(0), 'retryable');
  assert.equal(classifyTwilioFailure(429), 'retryable');
  assert.equal(classifyTwilioFailure(503), 'retryable');
  assert.equal(classifyTwilioFailure(401), 'retryable');
  assert.equal(classifyTwilioFailure(400), 'permanent');
  assert.equal(classifyTwilioFailure(404), 'permanent');
  assert.equal(isE164('+919876543210'), true);
  assert.equal(isE164('9876543210'), false);
});

test('delivery receipts never move backwards and map to statuses', () => {
  const now = '2026-10-19T10:00:00.000Z';
  const row = (delivery_status, status = 'sent') => ({ status, delivery_status });
  assert.deepEqual(deliveryPatch(row('queued'), 'sent', null, null, now), { delivery_status: 'sent' });
  assert.deepEqual(deliveryPatch(row('sent'), 'delivered', null, null, now), { delivery_status: 'delivered', status: 'delivered', delivered_at: now });
  assert.equal(deliveryPatch(row('delivered', 'delivered'), 'sent', null, null, now), null); // late/out-of-order
  assert.equal(deliveryPatch(row('delivered', 'delivered'), 'delivered', null, null, now), null); // duplicate
  assert.equal(deliveryPatch(row('sent'), 'bogus', null, null, now), null);
  const failed = deliveryPatch(row('sent'), 'undelivered', '30003', 'Unreachable', now);
  assert.equal(failed.status, 'failed');
  assert.equal(failed.error_code, '30003');
  assert.match(failed.last_error, /undelivered.*Unreachable/);
});

test('messages: content, GSM-safe text, no clinical notes', () => {
  const appt = { token_id: 'TK-012', patient_name: 'Rahul “Sharma” ₹', room: 'Suite 101 – North', visit_type: '15 Min Consultation', appointment_date: '2026-10-19', slot_label: '10:00 AM - 10:15 AM' };
  const booking = buildMessage({ kind: 'booking', payload: {} }, appt, 'CuraClinic');
  assert.equal(booking, 'CuraClinic | NEW APPOINTMENT\nAppointment ID: TK-012\nPatient: Rahul "Sharma" Rs.\nDate: Mon 19 Oct 2026\nTime: 10:00 AM - 10:15 AM IST\nRoom: Suite 101 - North\nVisit type: 15 Min Consultation');
  assert.match(buildMessage({ kind: 'reminder', payload: {} }, appt, 'CuraClinic'), /APPOINTMENT REMINDER\nReminder: appointment scheduled for today\nAppointment ID: TK-012[\s\S]*10:00 AM - 10:15 AM IST/);
  const upd = buildMessage({ kind: 'update', payload: { previous: { date: '2026-10-18', slot: '09:00 AM' } } }, appt, 'CuraClinic');
  assert.match(upd, /APPOINTMENT UPDATED\nAppointment ID: TK-012[\s\S]*New date: Mon 19 Oct 2026, 10:00 AM - 10:15 AM IST\. Previously Sun 18 Oct 2026, 09:00 AM IST/);
  const cancel = buildMessage({ kind: 'cancellation', payload: { snapshot: { token_id: 'TK-001', patient_name: 'Old', appointment_date: '2026-10-17', slot_label: '08:00 AM' } } }, appt, 'CuraClinic');
  assert.match(cancel, /APPOINTMENT CANCELLED\nAppointment ID: TK-001\nPatient: Old\nDate: Sat 17 Oct 2026\nTime: 08:00 AM IST/);
  for (const text of [booking, upd, cancel]) assert.ok(!/[^\x20-\x7E\n]/.test(text), 'GSM-safe ASCII text with line breaks');
  assert.equal(smsSafe('a'.repeat(100), 10).length, 10);
  assert.equal(formatClinicDate('2026-01-01'), 'Thu 1 Jan 2026');
});

test('Twilio signature matches the documented example and rejects tampering', async () => {
  // Example from Twilio's "Validating Requests" docs.
  const params = { CallSid: 'CA1234567890ABCDE', Caller: '+12349013030', Digits: '1234', From: '+12349013030', To: '+18005551212' };
  const url = 'https://mycompany.com/myapp.php?foo=1&bar=2';
  const sig = await computeTwilioSignature('12345', url, params);
  assert.equal(sig, '0/KCTR6DLpKmkAf8muzZqo1nDgQ=');
  // independent HMAC implementation
  const data = url + Object.keys(params).sort().map((k) => k + params[k]).join('');
  assert.equal(sig, createHmac('sha1', '12345').update(data).digest('base64'));
  assert.equal(await validateTwilioSignature('12345', url, params, sig), true);
  assert.equal(await validateTwilioSignature('12345', url, { ...params, Digits: '9999' }, sig), false);
  assert.equal(await validateTwilioSignature('wrong', url, params, sig), false);
  assert.equal(await validateTwilioSignature('12345', url, params, ''), false);
  assert.equal(timingSafeEqualStr('abc', 'abc'), true);
  assert.equal(timingSafeEqualStr('abc', 'abd'), false);
  assert.equal(timingSafeEqualStr('abc', 'abcd'), false);
});

test('sendTwilioSms builds the REST call and classifies errors', async () => {
  let seen;
  const ok = await sendTwilioSms({
    config: { accountSid: 'AC1', authToken: 'tok', messagingServiceSid: 'MG1' }, to: '+919876543210', body: 'hi', statusCallback: 'https://x/cb',
    fetchImpl: async (url, init) => { seen = { url, init }; return new Response(JSON.stringify({ sid: 'SM1', status: 'queued' }), { status: 201 }); },
  });
  assert.deepEqual(ok, { ok: true, sid: 'SM1', status: 'queued' });
  assert.equal(seen.url, 'https://api.twilio.com/2010-04-01/Accounts/AC1/Messages.json');
  assert.equal(seen.init.headers.Authorization, `Basic ${Buffer.from('AC1:tok').toString('base64')}`);
  const form = Object.fromEntries(new URLSearchParams(seen.init.body));
  assert.deepEqual(form, { To: '+919876543210', Body: 'hi', MessagingServiceSid: 'MG1', StatusCallback: 'https://x/cb' });

  const bad = await sendTwilioSms({ config: { accountSid: 'AC1', authToken: 't', from: '+1555' }, to: '+1', body: 'x', fetchImpl: async () => new Response(JSON.stringify({ code: 21211, message: "Invalid 'To' Phone Number" }), { status: 400 }) });
  assert.deepEqual([bad.ok, bad.retryable, bad.code], [false, false, '21211']);
  const down = await sendTwilioSms({ config: { accountSid: 'AC1', authToken: 't', from: '+1555' }, to: '+1', body: 'x', fetchImpl: async () => { throw new Error('boom'); } });
  assert.deepEqual([down.ok, down.retryable, down.code], [false, true, 'NETWORK_ERROR']);
  const html502 = await sendTwilioSms({ config: { accountSid: 'AC1', authToken: 't', from: '+1555' }, to: '+1', body: 'x', fetchImpl: async () => new Response('<html>Bad gateway</html>', { status: 502 }) });
  assert.deepEqual([html502.ok, html502.retryable, html502.code], [false, true, 'HTTP_502']);
});
