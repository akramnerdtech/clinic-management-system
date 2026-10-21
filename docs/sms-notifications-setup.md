# SMS notifications (Twilio + Supabase)

When an appointment is booked, the assigned doctor gets an SMS immediately. On the appointment day at **08:00 IST**, the same doctor gets an automatic reminder. SMS is doctor-only: patient mobile numbers are never used as SMS recipients. Rescheduling or cancelling updates/cancels the reminder.

```
Browser (appointments still in localStorage)
  └─ appointmentsService ──► backend  POST /api/notifications/...   (existing login token required)
                               └─► Supabase tables: clinic_appointments · sms_notifications · doctor_contacts
Supabase Cron (every minute, only if something is due)
  └─► Edge Function  process-sms-queue ──► Twilio ──► doctor's phone
Twilio ──► Edge Function  twilio-status-callback   (delivered / undelivered, signature-verified)
```

Twilio credentials exist **only** in Supabase Secrets. Nothing Twilio-related is in `frontend/` or `backend/`.

## Things to know first

- **Your Supabase project had no appointment/doctor tables.** Appointments lived only in browser
  localStorage, so three small tables were added (migration 1). Existing data and screens are untouched.
- **The Add Doctor form's "Primary Contact Mobile" was not being saved anywhere.** It is now sent to
  Supabase when you register a doctor. Doctors registered *before* this change (and the built-in sample
  doctors) have no number — add them in step 7.
- **India:** Twilio SMS to Indian numbers requires DLT registration (sender ID + approved templates).
  Trial accounts can only text verified numbers. Sort this out in the Twilio console first, otherwise
  Twilio will reject messages (you'll see the error in `sms_notifications.last_error`).

## Setup (about 15 minutes)

You need the [Supabase CLI](https://supabase.com/docs/guides/cli) and a Twilio account with an SMS-capable
number (or a Messaging Service).

**1. Link the project**
```bash
supabase login
supabase link --project-ref <your-project-ref>
```

**2. Create the tables and the cron job**
```bash
supabase db push
```
(or paste `supabase/migrations/*.sql` into the SQL Editor, in file order). This also enables
`pg_cron`, `pg_net` and Vault.

**3. Set the Twilio secrets**
```bash
cp supabase/functions/.env.example supabase/functions/.env     # then edit it
supabase secrets set --env-file supabase/functions/.env
```
Generate `SMS_WORKER_SECRET` with `openssl rand -hex 32`. Use either `TWILIO_FROM_NUMBER` or
`TWILIO_MESSAGING_SERVICE_SID`.

**4. Deploy the two Edge Functions**
```bash
supabase functions deploy process-sms-queue --no-verify-jwt
supabase functions deploy twilio-status-callback --no-verify-jwt
```

**5. Let Cron call the function** — run once in the SQL Editor (never commit these values):
```sql
select vault.create_secret('https://<your-project-ref>.supabase.co', 'sms_project_url');
select vault.create_secret('<the same SMS_WORKER_SECRET>',            'sms_worker_secret');
```
Check the job exists: `select jobname, schedule, active from cron.job;` → `sms-worker-every-minute`.

**6. Configure the backend** — add to `backend/.env` and restart it:
```
SMS_WORKER_SECRET=<the same SMS_WORKER_SECRET>      # lets the backend trigger sending instantly
# optional:
SMS_DEFAULT_COUNTRY_CODE=91     # for numbers typed without a country code
SMS_NOTIFY_CHANGES=false        # true = also SMS the doctor on reschedule / cancel
SMS_DAILY_LIMIT_PER_ACCOUNT=300 # safety cap on SMS per account per 24 h
```
Without `SMS_WORKER_SECRET` everything still works; booking SMS just waits for the next cron tick (≤ 1 minute).

**7. Give existing doctors a mobile number**

New doctors: just fill in the mobile on *Add Doctor* — it is saved automatically.
Existing doctors, in the SQL Editor:
```sql
select id, email from auth.users;   -- find your user id
select public.upsert_doctor_contact('<your user id>', 'Dr. Priya Patel', '+919876543210');
```
The doctor name must match the name shown in the app. Numbers are stored per app account.

## Try it

1. Book an appointment for a doctor that has a number → SMS arrives within seconds.
2. Check the log:
```sql
select kind, status, scheduled_for, attempts, error_code, last_error, to_number
from sms_notifications order by created_at desc limit 20;
```
3. Test the reminder without waiting for 8 AM:
```sql
update sms_notifications set next_attempt_at = now()
where kind = 'reminder' and status = 'pending' and id = '<id>';   -- Cron sends it within a minute
```
4. Run the worker by hand: `curl -X POST https://<ref>.supabase.co/functions/v1/process-sms-queue -H "x-worker-secret: <secret>"`

## What happens when…

| Event in the app | Result |
|---|---|
| Appointment booked | Booking SMS now; reminder queued for 08:00 IST that day |
| Edited to a new date/time | Pending reminder cancelled, new one queued (no second booking SMS) |
| Doctor changed | New doctor gets the booking SMS + reminder; old doctor's pending SMS are cancelled |
| Cancelled / Completed / No-show / Deleted | All pending SMS cancelled |
| Same token reused after a delete | Treated as a brand-new booking |
| Booked after 08:00 the same day, or slot starts before 08:00 | Reminder skipped (recorded as `skipped` with the reason) |
| Twilio down / rate limited | Retried after 1, 5, 15, 60, 240 min (5 attempts), then `failed` |
| Invalid number / unverified trial number | `failed` immediately, no retry (`error_code` = Twilio code) |
| Doctor has no number | `failed` with `NO_DOCTOR_MOBILE`; reminders still work once a number is added |
| Backend unreachable from the browser | Change is kept in the browser and re-sent later, in order |
| Phone never receives it | Twilio's receipt marks it `failed` (error code stored) |

Duplicates are prevented by a unique key per SMS (`kind:appointment:revision`) plus an atomic claim, so
overlapping cron/trigger runs cannot send twice.

Useful queries:
```sql
select * from sms_notifications where status = 'failed' order by created_at desc;       -- needs attention
select status, count(*) from sms_notifications group by 1;
-- retry a failed one by hand:
update sms_notifications set status='pending', attempts=0, next_attempt_at=now() where id='<id>';
```

## Notes and limits

- Messages contain token, patient name, date/time, room and visit type — **not** the chief complaint
  (SMS is unencrypted). Edit `supabase/functions/_shared/messages.ts` to change the wording.
- Times are treated as IST (UTC+05:30) because slots are clinic-local.
- The backend must be running (as it already must for login) for changes to reach Supabase.
- Appointments created before this feature are only picked up when they are next edited, and then
  count as a new booking (the doctor gets a booking SMS). SMS is sent only to the registered doctor mobile.
- Sign-up is open in this app, so each account is isolated (own doctors/numbers) and rate/volume
  limited. Consider restricting sign-ups before going live — SMS costs money.
- Delivery is "at least once": if a function crashed in the milliseconds between Twilio accepting an
  SMS and the database write, that one SMS could repeat. This is logged.

## Tests

```bash
cd backend  && npm test          # 30 tests: planner, worker, retries, dedupe, webhook (needs Node 22.18+)
cd frontend && npm run test:sms  # 7 tests: appointment hooks + retry outbox
```
