import * as LucideIcons from 'lucide-react';

/**
 * Data in this app sometimes carries Lucide icon *components* (e.g. `icon: Users`)
 * alongside plain data. Icon components can't survive JSON.stringify/parse as-is,
 * so we swap them for a `{ __icon: 'Users' }` marker on the way into storage and
 * swap them back for the live component on the way out.
 */
const ICON_MARKER = '__icon';

function isIconComponent(value: unknown): value is { displayName: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    '$$typeof' in value &&
    typeof (value as { displayName?: unknown }).displayName === 'string'
  );
}

function iconReplacer(_key: string, value: unknown) {
  return isIconComponent(value) ? { [ICON_MARKER]: value.displayName } : value;
}

function iconReviver(_key: string, value: unknown) {
  if (value && typeof value === 'object' && ICON_MARKER in (value as Record<string, unknown>)) {
    const name = (value as Record<string, unknown>)[ICON_MARKER];
    const icon = typeof name === 'string' ? (LucideIcons as Record<string, unknown>)[name] : undefined;
    return icon ?? value;
  }
  return value;
}

/**
 * Reads `key` from localStorage. On first run (nothing stored yet, or storage is
 * unavailable/corrupt) it seeds localStorage with `seed` and returns `seed`.
 */
export function loadFromStorage<T>(key: string, seed: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (raw !== null) {
      return JSON.parse(raw, iconReviver) as T;
    }
  } catch {
    return seed;
  }
  try {
    window.localStorage.setItem(key, JSON.stringify(seed, iconReplacer));
  } catch {
    // Storage unavailable (private browsing, quota exceeded, etc.) — seed is still returned.
  }
  return seed;
}

/** Persists `value` to localStorage under `key`. */
export function saveToStorage<T>(key: string, value: T): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value, iconReplacer));
  } catch {
    // Fail silently — storage may be unavailable.
  }
}
