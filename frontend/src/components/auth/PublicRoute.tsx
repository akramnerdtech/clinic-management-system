import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

export function PublicRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isValidating } = useAuth();

  if (isValidating) {
    return null;
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
