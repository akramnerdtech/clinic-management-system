-- =============================================================================
-- CuraClinic · Patient booking-confirmation SMS
--
-- The SMS queue (public.sms_notifications) only knew four doctor-facing kinds, enforced by a
-- CHECK constraint on `kind`. Patient confirmations are a fifth kind: 'patient_confirmation'.
--
-- That is the ONLY schema change. The patient's number is stored in the existing `to_number`
-- column; duplicate protection uses the existing unique index on `dedupe_key`
-- ("patient_confirmation:<appointment id>:r<revision>"). No data is modified.
--
-- Safe to re-run (idempotent).
-- =============================================================================

do $$
declare
  c record;
begin
  -- Drop whichever CHECK constraint currently restricts "kind" (its auto-generated name can differ
  -- between projects), then add the widened one under a fixed name.
  for c in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public'
      and rel.relname = 'sms_notifications'
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%kind%'
      and pg_get_constraintdef(con.oid) ilike '%booking%'
  loop
    execute format('alter table public.sms_notifications drop constraint %I', c.conname);
  end loop;

  alter table public.sms_notifications
    add constraint sms_notifications_kind_chk
    check (kind in ('booking', 'reminder', 'update', 'cancellation', 'patient_confirmation'));
end
$$;
