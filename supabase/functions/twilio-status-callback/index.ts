// Edge Function: twilio-status-callback
//
// Webhook for Twilio delivery receipts. process-sms-queue passes this function's URL as
// the StatusCallback of every message, so delivered / undelivered / failed outcomes are
// written back to public.sms_notifications. Requests are authenticated by verifying
// Twilio's X-Twilio-Signature with TWILIO_AUTH_TOKEN (JWT verification is off, see config.toml).
import { createClient } from 'npm:@supabase/supabase-js@2';
import { handleStatusCallback } from '../_shared/statusCallback.ts';
import { createSupabaseStore } from '../_shared/store.ts';
import { readWorkerEnv } from '../_shared/worker.ts';

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const store = createSupabaseStore(supabase);

Deno.serve((req) => {
  const env = readWorkerEnv((key) => Deno.env.get(key));
  return handleStatusCallback(req, {
    store,
    authToken: env.twilio?.authToken ?? null,
    publicUrl: env.statusCallbackUrl,
  });
});
