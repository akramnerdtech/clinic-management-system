-- =============================================================================
-- CuraClinic · SMS notifications — Supabase Cron
--
-- Every minute, if anything is due, call the `process-sms-queue` Edge Function.
-- That one worker handles BOTH:
--   * immediate booking SMS (also nudged directly by the backend), and
--   * the 08:00 IST appointment-day reminders (rows are created with
--     scheduled_for = 08:00 IST = 02:30 UTC and picked up here when due), plus retries.
--
-- Secrets are NOT in this file. Create them once in the SQL editor (see
-- docs/sms-notifications-setup.md, step 4):
--   select vault.create_secret('https://<project-ref>.supabase.co', 'sms_project_url');
--   select vault.create_secret('<same value as SMS_WORKER_SECRET>', 'sms_worker_secret');
-- =============================================================================

create extension if not exists pg_cron        with schema pg_catalog;
create extension if not exists pg_net         with schema extensions;
create extension if not exists supabase_vault with schema vault;

create or replace function public.invoke_sms_worker()
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url        text;
  v_secret     text;
  v_request_id bigint;
begin
  -- Do nothing (no HTTP call, no function invocation) unless work is actually due.
  if not exists (
    select 1
    from public.sms_notifications
    where (status = 'pending' and next_attempt_at <= now())
       or (status = 'sending' and locked_at < now() - interval '10 minutes')
  ) then
    return null;
  end if;

  select decrypted_secret into v_url
    from vault.decrypted_secrets where name = 'sms_project_url';
  select decrypted_secret into v_secret
    from vault.decrypted_secrets where name = 'sms_worker_secret';

  if v_url is null or v_secret is null then
    raise warning 'invoke_sms_worker: vault secrets "sms_project_url" and/or "sms_worker_secret" are missing';
    return null;
  end if;

  select net.http_post(
    url     := rtrim(v_url, '/') || '/functions/v1/process-sms-queue',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-worker-secret', v_secret),
    body    := '{}'::jsonb,
    timeout_milliseconds := 25000
  ) into v_request_id;

  return v_request_id;
end;
$$;

revoke execute on function public.invoke_sms_worker() from public, anon, authenticated;

-- Re-running replaces the job with the same name.
select cron.schedule(
  'sms-worker-every-minute',
  '* * * * *',
  $cron$select public.invoke_sms_worker();$cron$
);
