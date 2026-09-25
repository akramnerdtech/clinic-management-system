import crypto from 'node:crypto';
import { supabaseAdmin } from '../config/supabaseClient.js';
import { env } from '../config/env.js';

/**
 * Supabase is used ONLY as the account store for authentication:
 *  - createAccount(): called on signup (full name + email)
 *  - findUserByEmail(): called on login, to confirm the account exists
 *    before an OTP is issued
 * Nothing else in the app talks to Supabase.
 */

/** Looks up a Supabase auth user by exact email via the GoTrue admin REST endpoint. */
export async function findUserByEmail(email) {
  const url = new URL('/auth/v1/admin/users', env.supabaseUrl);
  url.searchParams.set('email', email);

  const res = await fetch(url, {
    headers: {
      apikey: env.supabaseServiceRoleKey,
      Authorization: `Bearer ${env.supabaseServiceRoleKey}`,
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Supabase user lookup failed (${res.status}): ${body}`);
  }

  const data = await res.json();
  const users = Array.isArray(data) ? data : data.users || [];
  return users.find((u) => u.email?.toLowerCase() === email.toLowerCase()) || null;
}

/** Creates a Supabase auth account for signup. Login never uses a password — it's OTP-only — so we set a random one the user never sees or needs. */
export async function createAccount({ fullName, email }) {
  const existing = await findUserByEmail(email);
  if (existing) {
    const err = new Error('An account with this email already exists.');
    err.status = 409;
    throw err;
  }

  const randomPassword = crypto.randomBytes(24).toString('hex');

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: randomPassword,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (error) {
    const err = new Error(error.message || 'Failed to create account.');
    err.status = error.status || 400;
    throw err;
  }

  return data.user;
}
