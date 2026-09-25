import { createContext, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { clearAuthSession, loadAuthSession, saveAuthSession } from '@/utils/authStorage';
import type { AuthSession, AuthUser } from '@/utils/authStorage';

interface AuthContextValue {
  isAuthenticated: boolean;
  user: AuthUser | null;
  token: string | null;
  login: (session: AuthSession) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Session state only — signup / OTP request / OTP verify calls live in
 * `@/services/authService`. This provider just tracks the resulting token
 * and user, backed by its own isolated localStorage key.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(() => loadAuthSession());

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
    }),
    [session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
