import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { clearAuthSession, loadAuthSession, saveAuthSession } from '@/utils/authStorage';
import type { AuthSession, AuthUser } from '@/utils/authStorage';
import { SESSION_EXPIRED_EVENT } from '@/config/api';
import { useToast } from '@/utils/toast';

interface AuthContextValue {
  isAuthenticated: boolean;
  user: AuthUser | null;
  token: string | null;
  login: (session: AuthSession) => void;
  logout: () => void;
  /** Merge fresh server-confirmed user data into the session (name, avatar, ...). */
  updateUser: (patch: Partial<AuthUser>) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Session state only — signup (OTP + set password) and login calls live in
 * `@/services/authService`. This provider just tracks the resulting token
 * and user, backed by its own isolated localStorage key.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(() => loadAuthSession());
  const toast = useToast();

  const updateUser = useCallback((patch: Partial<AuthUser>) => {
    setSession((prev) => {
      if (!prev) return prev;
      const next = { ...prev, user: { ...prev.user, ...patch } };
      saveAuthSession(next);
      return next;
    });
  }, []);

  // The API client fires this when an authenticated call comes back 401 (expired/invalid session).
  useEffect(() => {
    const onExpired = () => {
      clearAuthSession();
      setSession(null);
      toast.error('Your session has expired. Please log in again.');
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, [toast]);

  const value = useMemo<AuthContextValue>(
    () => ({
      isAuthenticated: !!session,
      user: session?.user ?? null,
      token: session?.token ?? null,
      login: (next) => {
        saveAuthSession(next);
        setSession(next);
      },
      logout: () => {
        clearAuthSession();
        setSession(null);
      },
      updateUser,
    }),
    [session, updateUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}