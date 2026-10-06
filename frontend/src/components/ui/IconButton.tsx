import type { CSSProperties, ReactNode } from 'react';

export function IconButton({ children, className = '', onClick, disabled = false, style }: { children: ReactNode; className?: string; onClick?: () => void; disabled?: boolean; style?: CSSProperties }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} style={style} className={`inline-flex items-center justify-center rounded px-3 py-2 text-xs font-semibold transition hover:brightness-95 ${className}`}>
      {children}
    </button>
  );
}