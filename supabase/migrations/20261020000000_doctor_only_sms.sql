-- CuraClinic: SMS notifications are doctor-only.
-- Cancel any unsent patient confirmations left by an earlier deployment and prevent
-- the queue from accepting new patient_confirmation rows.

update public.sms_notifications
set status = 'cancelled',
    locked_at = null,
    last_error = 'Patient SMS disabled; notifications are doctor-only',
    updated_at = now()
where kind = 'patient_confirmation'
  and status in ('pending', 'sending');

do $$
declare
  c record;
begin
  for c in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public'
      and rel.relname = 'sms_notifications'
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%kind%'
      and pg_get_constraintdef(con.oid) ilike '%patient_confirmation%'
  loop
    execute format('alter table public.sms_notifications drop constraint %I', c.conname);
  end loop;

  alter table public.sms_notifications
    add constraint sms_notifications_kind_chk
    check (kind in ('booking', 'reminder', 'update', 'cancellation'));
end
$$;
