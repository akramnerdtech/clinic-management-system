export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
}

export interface AuthSession {
  token: string;
  user: AuthUser;
}

/**
 * Deliberately separate from `@/utils/storage.ts` (which powers the Main
 * Project's existing clinic data). Auth has its own single key and its own
 * plain JSON read/write — it never touches the app's data storage system.
 */
const AUTH_KEY = 'curaclinic.auth.session';

export function loadAuthSession(): AuthSession | null {
  try {
    const raw = window.localStorage.getItem(AUTH_KEY);
    return raw ? (JSON.parse(raw) as AuthSession) : null;
  } catch {
    return null;
  }
}

export function saveAuthSession(session: AuthSession): void {
  try {
    window.localStorage.setItem(AUTH_KEY, JSON.stringify(session));
  } catch {
    // Storage unavailable — session just won't persist across reloads.
  }
}

export function clearAuthSession(): void {
  try {
    window.localStorage.removeItem(AUTH_KEY);
  } catch {
    // no-op
  }
}
