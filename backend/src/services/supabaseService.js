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

/* ------------------------------------------------------------------ *
 * Account settings (profile / avatar / password) — all keyed by the   *
 * authenticated user's id taken from the verified session token.      *
 * Profile details live in Supabase Auth `user_metadata`; passwords    *
 * stay with Supabase Auth (bcrypt) and are never stored by this app.  *
 * ------------------------------------------------------------------ */

export const AVATAR_BUCKET = 'avatars';
let avatarBucketReady = false;

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

/** Fetches a Supabase auth user by id; 401 if the account no longer exists. */
export async function getUserById(userId) {
  const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);
  if (error || !data?.user) {
    if (error && (error.status === 404 || error.code === 'user_not_found')) {
      throw httpError(401, 'Your account could not be found. Please log in again.');
    }
    if (error) throw error;
    throw httpError(401, 'Your account could not be found. Please log in again.');
  }
  return data.user;
}

/** Merges `patch` into the user's existing user_metadata (keys set to null are removed). */
export async function updateUserMetadata(userId, patch) {
  const current = await getUserById(userId);
  const merged = { ...(current.user_metadata || {}), ...patch };
  for (const key of Object.keys(merged)) {
    if (merged[key] === null || merged[key] === undefined) delete merged[key];
  }
  const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, { user_metadata: merged });
  if (error) throw error;
  return data.user;
}

/** Sets a new password; Supabase Auth hashes it. */
export async function updateUserPassword(userId, newPassword) {
  const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, { password: newPassword });
  if (error) {
    if (/same|different from the old/i.test(error.message || '')) {
      throw httpError(400, 'New password must be different from your current password.');
    }
    throw error;
  }
}

async function ensureAvatarBucket() {
  if (avatarBucketReady) return;
  const { data } = await supabaseAdmin.storage.getBucket(AVATAR_BUCKET);
  if (!data) {
    const { error } = await supabaseAdmin.storage.createBucket(AVATAR_BUCKET, {
      public: true,
      fileSizeLimit: 2 * 1024 * 1024,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    });
    if (error && !/already exists/i.test(error.message || '')) throw error;
  }
  avatarBucketReady = true;
}

/** Uploads an avatar under `<userId>/<random>.<ext>` and returns { path, url }. */
export async function uploadAvatarFile(userId, buffer, { contentType, ext }) {
  await ensureAvatarBucket();
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
  const { error } = await supabaseAdmin.storage.from(AVATAR_BUCKET).upload(path, buffer, {
    contentType,
    upsert: false,
    cacheControl: '3600',
  });
  if (error) throw error;
  const { data } = supabaseAdmin.storage.from(AVATAR_BUCKET).getPublicUrl(path);
  return { path, url: data.publicUrl };
}

/** Best-effort delete — never throws (used for cleanup of temp/replaced files). */
export async function removeAvatarFile(path) {
  if (!path) return;
  try {
    await supabaseAdmin.storage.from(AVATAR_BUCKET).remove([path]);
  } catch (err) {
    console.error('Avatar cleanup failed:', err?.message || err);
  }
}