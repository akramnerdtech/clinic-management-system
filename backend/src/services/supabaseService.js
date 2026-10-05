import { supabaseAdmin } from '../config/supabaseClient.js';
import { env } from '../config/env.js';

/**
 * Supabase Auth is the account store and the password authority:
 *  - createAccount():     called at the end of signup (after email OTP + set password).
 *                         Supabase hashes the password (bcrypt); this backend never stores it.
 *  - findUserByEmail():   used to block signup for an email that is already registered.
 *  - signInWithPassword(): verifies Email + Password at login.
 * Nothing else in the app talks to Supabase.
 */

function adminHeaders() {
  return {
    apikey: env.supabaseServiceRoleKey,
    Authorization: `Bearer ${env.supabaseServiceRoleKey}`,
  };
}

/** Looks up a Supabase auth user by exact email via the GoTrue admin REST endpoint. */
export async function findUserByEmail(email) {
  const url = new URL('/auth/v1/admin/users', env.supabaseUrl);
  url.searchParams.set('email', email);

  const res = await fetch(url, { headers: adminHeaders() });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Supabase user lookup failed (${res.status}): ${body}`);
  }

  const data = await res.json();
  const users = Array.isArray(data) ? data : data.users || [];
  return users.find((u) => u.email?.toLowerCase() === email.toLowerCase()) || null;
}

/**
 * Creates the Supabase auth account with the password the user chose.
 * The email has already been verified via OTP, so it is marked confirmed.
 */
export async function createAccount({ fullName, email, password }) {
  const existing = await findUserByEmail(email);
  if (existing) {
    const err = new Error('An account with this email already exists.');
    err.status = 409;
    throw err;
  }

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (error) {
    const alreadyExists = error.code === 'email_exists' || /already (been )?registered|already exists/i.test(error.message || '');
    const err = new Error(alreadyExists ? 'An account with this email already exists.' : error.message || 'Failed to create account.');
    err.status = alreadyExists ? 409 : error.status || 400;
    throw err;
  }

  return data.user;
}

/**
 * Verifies Email + Password against Supabase Auth (password grant) and returns the user.
 * Done with a direct REST call so the shared admin client's state is never touched.
 * Throws a 401 with a deliberately generic message for any bad-credentials outcome.
 */
export async function signInWithPassword(email, password) {
  const url = new URL('/auth/v1/token', env.supabaseUrl);
  url.searchParams.set('grant_type', 'password');

  const res = await fetch(url, {
    method: 'POST',
    headers: { ...adminHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (res.ok) {
    const data = await res.json();
    return data.user;
  }

  if (res.status === 429) {
    const err = new Error('Too many login attempts. Please wait a moment and try again.');
    err.status = 429;
    throw err;
  }

  if (res.status >= 400 && res.status < 500) {
    const err = new Error('Invalid email or password.');
    err.status = 401;
    throw err;
  }

  const body = await res.text().catch(() => '');
  throw new Error(`Supabase sign-in failed (${res.status}): ${body}`);
}