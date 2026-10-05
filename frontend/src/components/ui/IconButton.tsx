import type { ReactNode } from 'react';

export function IconButton({ children, className = '', onClick, disabled = false }: { children: ReactNode; className?: string; onClick?: () => void; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={`inline-flex items-center justify-center rounded px-3 py-2 text-xs font-semibold transition hover:brightness-95 ${className}`}>
      {children}
    </button>
  );
}