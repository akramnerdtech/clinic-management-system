import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { clearAuthSession, loadAuthSession, saveAuthSession } from '@/utils/authStorage';
import type { AuthSession, AuthUser } from '@/utils/authStorage';
import { SESSION_EXPIRED_EVENT } from '@/config/api';
import { accountService } from '@/services/accountService';
import { useToast } from '@/utils/toast';

interface AuthContextValue {
  isAuthenticated: boolean;
  isValidating: boolean;
  user: AuthUser | null;
  token: string | null;
  login: (session: AuthSession) => void;
  logout: () => void;
  /** Merge fresh server-confirmed user data into the session (name, avatar, ...). */
  updateUser: (patch: Partial<AuthUser>) => void;
  /** Actively re-verify user authenticity against Supabase Auth / backend. */
  verifySession: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Session state & User Authenticity Management.
 * Verifies that the logged-in user is original and recognized by Supabase Auth backend.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(() => loadAuthSession());
  const [isValidating, setIsValidating] = useState<boolean>(() => {
    const initial = loadAuthSession();
    return !!initial?.token;
  });
  const toast = useToast();

  const updateUser = useCallback((patch: Partial<AuthUser>) => {
    setSession((prev) => {
      if (!prev) return prev;
      const next = { ...prev, user: { ...prev.user, ...patch } };
      saveAuthSession(next);
      return next;
    });
  }, []);

  const verifySession = useCallback(async (): Promise<boolean> => {
    const current = loadAuthSession();
    if (!current?.token) {
      setSession(null);
      setIsValidating(false);
      return false;
    }

    try {
      setIsValidating(true);
      // Validates token signature, expiration, and user existence in Supabase Auth
      const verifiedUser = await accountService.getMe();
      if (!verifiedUser || !verifiedUser.id) {
        throw new Error('User not found');
      }

      const freshSession: AuthSession = {
        token: current.token,
        user: verifiedUser,
      };
      saveAuthSession(freshSession);
      setSession(freshSession);
      setIsValidating(false);
      return true;
    } catch {
      // Invalidate forged, expired, or deleted user sessions immediately
      clearAuthSession();
      setSession(null);
      setIsValidating(false);
      return false;
    }
  }, []);

  // Actively verify session originality on mount
  useEffect(() => {
    const initial = loadAuthSession();
    if (initial?.token) {
      verifySession();
    } else {
      setIsValidating(false);
    }
  }, [verifySession]);

  // The API client fires this when an authenticated call comes back 401 (expired/invalid session).
  useEffect(() => {
    const onExpired = () => {
      clearAuthSession();
      setSession(null);
      setIsValidating(false);
      toast.error('Your session has expired or is invalid. Please log in again.');
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, [toast]);

  const value = useMemo<AuthContextValue>(
    () => ({
      isAuthenticated: !!session,
      isValidating,
      user: session?.user ?? null,
      token: session?.token ?? null,
      login: (next) => {
        saveAuthSession(next);
        setSession(next);
        setIsValidating(false);
      },
      logout: () => {
        clearAuthSession();
        setSession(null);
        setIsValidating(false);
      },
      updateUser,
      verifySession,
    }),
    [session, isValidating, updateUser, verifySession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}