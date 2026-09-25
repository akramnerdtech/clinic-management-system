import type { ReactNode } from 'react';

export function IconButton({ children, className = '', onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  return (
    <button onClick={onClick} className={`inline-flex items-center justify-center rounded px-3 py-2 text-xs font-semibold transition hover:brightness-95 ${className}`}>
      {children}
    </button>
  );
}
