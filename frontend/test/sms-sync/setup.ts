// Runs first: fake browser globals before any app module evaluates.
const store = new Map<string, string>();
const win: any = new EventTarget();
win.localStorage = { getItem: (k: string) => (store.has(k) ? store.get(k)! : null), setItem: (k: string, v: string) => void store.set(k, String(v)), removeItem: (k: string) => void store.delete(k) };
win.setTimeout = (fn: () => void, ms: number) => { (globalThis as any).__timers.push({ fn, ms }); return (globalThis as any).__timers.length; };
(globalThis as any).__timers = [];
(globalThis as any).window = win;
(globalThis as any).__store = store;
export {};
