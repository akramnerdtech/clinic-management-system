export type Theme = 'light' | 'dark';

const THEME_STORAGE_KEY = 'curaclinic.theme';

export function getStoredTheme(): Theme {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'dark' || saved === 'light') return saved;
  } catch {
    // ignore storage access errors
  }
  return 'light';
}

export function setStoredTheme(theme: Theme): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // ignore
  }
  applyTheme(theme);
}

export function toggleTheme(): Theme {
  const current = getStoredTheme();
  const next: Theme = current === 'dark' ? 'light' : 'dark';
  setStoredTheme(next);
  return next;
}

export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  const body = document.body;

  root.setAttribute('data-theme', theme);
  body.setAttribute('data-theme', theme);

  if (theme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }

  window.dispatchEvent(new CustomEvent('clinic-theme-changed', { detail: { theme } }));
}

export function initTheme(): Theme {
  const theme = getStoredTheme();
  applyTheme(theme);
  return theme;
}

// Auto-run on import to prevent flashing
if (typeof window !== 'undefined') {
  initTheme();
}
