/**
 * Client-side export helpers. These build a Blob in the browser and trigger a
 * download — no server/API required, so they work today against localStorage
 * data and keep working unchanged once a real backend is wired in.
 */

function triggerDownload(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function escapeCsvCell(value: unknown): string {
  const str = String(value ?? '');
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/** Downloads `rows` (each an array of cell values) as a CSV file with a header row. */
export function downloadCsv(filename: string, headers: string[], rows: unknown[][]): void {
  const lines = [headers, ...rows].map((row) => row.map(escapeCsvCell).join(','));
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  triggerDownload(filename.endsWith('.csv') ? filename : `${filename}.csv`, blob);
}

/** Downloads arbitrary JSON-serializable data as a formatted .json file. */
export function downloadJson(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  triggerDownload(filename.endsWith('.json') ? filename : `${filename}.json`, blob);
}

/** Snapshots every `curaclinic.*` localStorage key — used for the full audit-trail export. */
export function exportAllLocalStorage(filename = 'curaclinic-audit-trail'): void {
  const snapshot: Record<string, unknown> = {};
  for (let i = 0; i < window.localStorage.length; i += 1) {
    const key = window.localStorage.key(i);
    if (!key || !key.startsWith('curaclinic.')) continue;
    try {
      snapshot[key] = JSON.parse(window.localStorage.getItem(key) ?? 'null');
    } catch {
      snapshot[key] = window.localStorage.getItem(key);
    }
  }
  downloadJson(filename, { exportedAt: new Date().toISOString(), data: snapshot });
}
