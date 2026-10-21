import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isValidating } = useAuth();
  const location = useLocation();

  if (isValidating) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-main, #0f172a)',
          color: 'var(--text-main, #f8fafc)',
          gap: '16px',
          fontFamily: 'inherit',
          padding: '24px',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            position: 'relative',
            width: '56px',
            height: '56px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              border: '3px solid rgba(45, 212, 191, 0.2)',
              borderTopColor: '#2dd4bf',
              borderRadius: '50%',
              animation: 'spin 0.9s linear infinite',
            }}
          />
          <ShieldCheck size={24} color="#2dd4bf" />
        </div>
        <div style={{ fontSize: '15px', fontWeight: 600, letterSpacing: '0.01em' }}>
          Verifying Security &amp; User Authenticity...
        </div>
        <div style={{ fontSize: '13px', color: '#94a3b8', maxWidth: '320px', lineHeight: 1.5 }}>
          Validating session credentials with CuraClinic Security Service
        </div>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <>{children}</>;
}
