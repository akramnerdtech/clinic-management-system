-- =============================================================================
-- CuraClinic · SMS notifications — tables
--
-- The existing Supabase project only held Auth users + the `avatars` bucket;
-- appointments/doctors lived in browser localStorage. These three tables are the
-- server-side mirror needed to schedule SMS reliably:
--
--   doctor_contacts      doctor's registered mobile (E.164), per app account
--   clinic_appointments  minimal copy of each appointment (no clinical notes)
--   sms_notifications    the SMS queue / audit log (one row per SMS)
--
-- Security: RLS is ON with NO policies and anon/authenticated are revoked, so only
-- the service role (Express backend + Edge Functions) can read or write them.
-- Safe to re-run (idempotent).
-- =============================================================================

-- ---------------------------------------------------------------- helpers ----

-- Stable key for a doctor, derived from the roster name. MUST match
-- doctorKeyFromName() in backend/src/utils/notificationPlanner.js:
--   strip "(...)", trim, lowercase, non-alphanumerics -> "-", trim "-".
create or replace function public.doctor_key(p_name text)
returns text
language sql
immutable
set search_path = ''
as $$
  select trim(both '-' from
    regexp_replace(
      lower(trim(regexp_replace(coalesce(p_name, ''), '\s*\([^)]*\)', '', 'g'))),
      '[^a-z0-9]+', '-', 'g'
    )
  );
$$;

create or replace function public.sms_touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ----------------------------------------------------------------- tables ----

create table if not exists public.doctor_contacts (
  owner_id     text        not null,                 -- app account (session token `sub`)
  doctor_key   text        not null,
  doctor_name  text        not null,
  mobile_e164  text        not null,
  sms_enabled  boolean     not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  primary key (owner_id, doctor_key),
  constraint doctor_contacts_mobile_e164_chk check (mobile_e164 ~ '^\+[1-9][0-9]{7,14}$')
);

create table if not exists public.clinic_appointments (
  id               uuid        primary key default gen_random_uuid(),
  owner_id         text        not null,
  client_id        text        not null,             -- random id per browser profile
  token_id         text        not null,             -- e.g. TK-004 (unique per client)
  revision         integer     not null default 1,   -- bumps on reschedule / doctor change / reopen
  patient_name     text        not null,
  doctor_name      text        not null,
  doctor_key       text        not null,
  room             text,
  visit_type       text,
  appointment_date date        not null,             -- clinic-local (IST) calendar date
  slot_label       text        not null,             -- e.g. "03:30 PM - 03:45 PM"
  starts_at        timestamptz,                      -- slot start, interpreted as IST
  status           text        not null default 'Slot Booked',  -- 'Deleted' = removed in the app
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint clinic_appointments_identity_uq unique (owner_id, client_id, token_id)
);

create index if not exists clinic_appointments_date_idx
  on public.clinic_appointments (appointment_date);

create table if not exists public.sms_notifications (
  id              uuid        primary key default gen_random_uuid(),
  appointment_id  uuid        not null references public.clinic_appointments (id) on delete cascade,
  owner_id        text        not null,
  kind            text        not null check (kind in ('booking', 'reminder', 'update', 'cancellation')),
  doctor_key      text        not null,              -- recipient (number looked up fresh at send time)
  revision        integer     not null,
  dedupe_key      text        not null,              -- "<kind>:<appointment id>:r<revision>"
  scheduled_for   timestamptz not null,              -- when it should go out (reminder = 08:00 IST)
  next_attempt_at timestamptz not null,              -- advanced on retry (back-off)
  status          text        not null default 'pending'
                  check (status in ('pending', 'sending', 'sent', 'delivered', 'failed', 'cancelled', 'skipped')),
  attempts        integer     not null default 0,
  max_attempts    integer     not null default 5,
  locked_at       timestamptz,
  payload         jsonb       not null default '{}'::jsonb,
  to_number       text,
  body            text,
  twilio_sid      text,
  delivery_status text,                              -- last status reported by Twilio
  error_code      text,
  last_error      text,
  sent_at         timestamptz,
  delivered_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Duplicate protection: only ONE live notification per dedupe_key. Cancelled and
-- failed rows are excluded so a rescheduled appointment (A -> B -> A) or a retried
-- failure can legitimately create a fresh row.
create unique index if not exists sms_notifications_dedupe_live_uq
  on public.sms_notifications (dedupe_key)
  where status in ('pending', 'sending', 'sent', 'delivered', 'skipped');

create unique index if not exists sms_notifications_twilio_sid_uq
  on public.sms_notifications (twilio_sid)
  where twilio_sid is not null;

create index if not exists sms_notifications_due_idx
  on public.sms_notifications (next_attempt_at) where status = 'pending';

create index if not exists sms_notifications_locked_idx
  on public.sms_notifications (locked_at) where status = 'sending';

create index if not exists sms_notifications_appointment_idx
  on public.sms_notifications (appointment_id);

create index if not exists sms_notifications_owner_created_idx
  on public.sms_notifications (owner_id, created_at);

-- --------------------------------------------------------------- triggers ----

drop trigger if exists doctor_contacts_touch on public.doctor_contacts;
create trigger doctor_contacts_touch before update on public.doctor_contacts
  for each row execute function public.sms_touch_updated_at();

drop trigger if exists clinic_appointments_touch on public.clinic_appointments;
create trigger clinic_appointments_touch before update on public.clinic_appointments
  for each row execute function public.sms_touch_updated_at();

drop trigger if exists sms_notifications_touch on public.sms_notifications;
create trigger sms_notifications_touch before update on public.sms_notifications
  for each row execute function public.sms_touch_updated_at();

-- --------------------------------------------------------------- security ----

alter table public.doctor_contacts     enable row level security;
alter table public.clinic_appointments enable row level security;
alter table public.sms_notifications   enable row level security;
-- (intentionally no policies: nobody but the service role can touch these tables)

revoke all on public.doctor_contacts, public.clinic_appointments, public.sms_notifications
  from anon, authenticated;
grant select, insert, update, delete
  on public.doctor_contacts, public.clinic_appointments, public.sms_notifications
  to service_role;

-- ------------------------------------------- admin convenience (SQL editor) ----

-- Attach / change a doctor's mobile without the app, e.g. for doctors that were
-- registered before this feature existed:
--   select public.upsert_doctor_contact('<your user id>', 'Dr. Priya Patel', '+919876543210');
-- (Find your user id with:  select id, email from auth.users;)
create or replace function public.upsert_doctor_contact(
  p_owner_id text, p_doctor_name text, p_mobile_e164 text
)
returns void
language sql
set search_path = ''
as $$
  insert into public.doctor_contacts (owner_id, doctor_key, doctor_name, mobile_e164, sms_enabled)
  values (p_owner_id, public.doctor_key(p_doctor_name), trim(p_doctor_name), p_mobile_e164, true)
  on conflict (owner_id, doctor_key) do update
    set doctor_name = excluded.doctor_name,
        mobile_e164 = excluded.mobile_e164,
        sms_enabled = true;
$$;

revoke execute on function public.upsert_doctor_contact(text, text, text) from public, anon, authenticated;
revoke execute on function public.doctor_key(text)                        from public, anon, authenticated;
revoke execute on function public.sms_touch_updated_at()                  from public, anon, authenticated;
