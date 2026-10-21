// Edge Function: process-sms-queue
//
// Sends every due SMS in public.sms_notifications through Twilio.
// Called by Supabase Cron (every minute, only when something is due) and nudged by the
// backend right after a booking so the doctor is texted immediately.
//
// Auth: callers must send the shared secret in the `x-worker-secret` header
// (Supabase Secret SMS_WORKER_SECRET). JWT verification is off (see config.toml)
// because the caller is not a Supabase user.
//
// Secrets used (never sent to the browser): TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN,
// TWILIO_FROM_NUMBER or TWILIO_MESSAGING_SERVICE_SID, SMS_WORKER_SECRET, CLINIC_NAME (optional).
import { createClient } from 'npm:@supabase/supabase-js@2';
import { createSupabaseStore } from '../_shared/store.ts';
import { handleWorkerRequest, readWorkerEnv } from '../_shared/worker.ts';

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const store = createSupabaseStore(supabase);

Deno.serve((req) =>
  handleWorkerRequest(req, {
    store,
    env: readWorkerEnv((key) => Deno.env.get(key)),
    fetchImpl: fetch,
  }),
);
