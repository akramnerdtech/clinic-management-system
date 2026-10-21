// Test-only resolver: lets Node run the real app source (TypeScript, "@/" alias, extension-less imports)
// without a bundler. Needs Node 22.18+.   Run:  npm run test:sms
import { readFileSync, statSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const SRC = fileURLToPath(new URL('../../src', import.meta.url));
const exts = ['', '.ts', '.tsx', '/index.ts', '/index.tsx'];
const isFile = (p) => { try { return statSync(p).isFile(); } catch { return false; } };
const find = (base) => exts.map((e) => base + e).find(isFile) ?? null;

export async function resolve(specifier, context, next) {
  let found = null;
  if (specifier.startsWith('@/')) found = find(path.join(SRC, specifier.slice(2)));
  else if (/^\.\.?\//.test(specifier) && context.parentURL?.startsWith(pathToFileURL(SRC).href)) {
    found = find(path.resolve(path.dirname(fileURLToPath(context.parentURL)), specifier));
  }
  return found ? { url: pathToFileURL(found).href, shortCircuit: true } : next(specifier, context);
}

export async function load(url, context, next) {
  if (url.startsWith(pathToFileURL(SRC).href) && /\.tsx?$/.test(url)) {
    // Vite's import.meta.env does not exist in plain Node.
    const source = readFileSync(fileURLToPath(url), 'utf8').replace(/import\.meta\.env/g, '({})');
    return { format: 'module-typescript', source, shortCircuit: true };
  }
  return next(url, context);
}
