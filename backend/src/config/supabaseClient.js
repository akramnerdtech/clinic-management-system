import { createClient } from '@supabase/supabase-js';
import { env } from './env.js';

/**
 * Admin client, authenticated with the service role key.
 *
 * Scope: authentication ONLY. This backend does not read or write any other
 * Supabase table — it exists solely to create accounts on signup and look
 * accounts up by email on login, via the Supabase Auth Admin API.
 */
export const supabaseAdmin = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
