import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { createClient } = require('@supabase/supabase-js');

const LIVE = ['pending', 'sending', 'sent', 'delivered', 'skipped'];

/**
 * Minimal in-memory PostgREST. The REAL supabase-js client is pointed at it through an
 * injected fetch, so the exact HTTP requests our code generates are parsed and executed.
 * It enforces the same constraints as the SQL migration (incl. the partial unique index).
 */
export class FakePostgrest {
  constructor(clock = () => new Date()) {
    this.clock = clock;
    this.tables = { doctor_contacts: [], clinic_appointments: [], sms_notifications: [] };
    this.requests = [];
    this.failNext = null; // { method, table, status, body } injected failure
  }

  client() {
    return createClient('http://fake.supabase.test', 'service-role-key', {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: (input, init) => this.handle(input, init) },
    });
  }

  rows(table, where = () => true) {
    return this.tables[table].filter(where);
  }

  violation(table, row, ignoreIndex) {
    const rows = this.tables[table];
    if (table === 'doctor_contacts' && rows.some((r) => r !== ignoreIndex && r.owner_id === row.owner_id && r.doctor_key === row.doctor_key)) return true;
    if (table === 'clinic_appointments' && rows.some((r) => r !== ignoreIndex && r.owner_id === row.owner_id && r.client_id === row.client_id && r.token_id === row.token_id)) return true;
    if (table === 'sms_notifications') {
      if (LIVE.includes(row.status) && rows.some((r) => r !== ignoreIndex && r.dedupe_key === row.dedupe_key && LIVE.includes(r.status))) return true;
      if (row.twilio_sid && rows.some((r) => r !== ignoreIndex && r.twilio_sid === row.twilio_sid)) return true;
    }
    return false;
  }

  defaults(table, row) {
    const ts = this.clock().toISOString();
    const base = { ...row, created_at: ts, updated_at: ts };
    if (table !== 'doctor_contacts') base.id = row.id ?? randomUUID();
    if (table === 'doctor_contacts') return { sms_enabled: true, ...base };
    if (table === 'clinic_appointments') return { revision: 1, room: null, visit_type: null, starts_at: null, status: 'Slot Booked', ...base };
    return { status: 'pending', attempts: 0, max_attempts: 5, locked_at: null, payload: {}, to_number: null, body: null, twilio_sid: null, delivery_status: null, error_code: null, last_error: null, sent_at: null, delivered_at: null, ...base };
  }

  matches(row, filters) {
    return filters.every(({ col, op, val }) => {
      const cell = row[col];
      const cmp = (a, b) => {
        const da = Date.parse(a), db = Date.parse(b);
        if (!Number.isNaN(da) && !Number.isNaN(db) && /\d{4}-\d{2}-\d{2}T/.test(String(b))) return da - db;
        return Number(a) - Number(b);
      };
      switch (op) {
        case 'eq': return String(cell) === val;
        case 'neq': return String(cell) !== val;
        case 'in': return val.slice(1, -1).split(',').map((s) => s.replace(/^"|"$/g, '')).includes(String(cell));
        case 'is': return val === 'null' ? cell === null || cell === undefined : String(cell) === val;
        case 'lt': return cell != null && cmp(cell, val) < 0;
        case 'lte': return cell != null && cmp(cell, val) <= 0;
        case 'gte': return cell != null && cmp(cell, val) >= 0;
        default: throw new Error(`fake PostgREST: unsupported operator ${op}`);
      }
    });
  }

  json(status, body, headers = {}) {
    return new Response(body === undefined ? null : JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } });
  }

  async handle(input, init = {}) {
    const url = new URL(typeof input === 'string' ? input : input.url);
    const method = (init.method || 'GET').toUpperCase();
    const headers = new Headers(init.headers);
    const table = url.pathname.replace('/rest/v1/', '');
    const prefer = headers.get('prefer') || '';
    this.requests.push({ method, table, search: url.search, body: init.body });

    if (this.failNext && this.failNext.method === method && this.failNext.table === table) {
      const { status, body } = this.failNext;
      this.failNext.times = (this.failNext.times ?? 1) - 1;
      if (this.failNext.times <= 0) this.failNext = null;
      return this.json(status, body);
    }
    if (!this.tables[table]) return this.json(404, { code: '42P01', message: `relation ${table} does not exist` });

    const reserved = new Set(['select', 'order', 'limit', 'offset', 'on_conflict', 'columns']);
    const filters = [];
    for (const [col, raw] of url.searchParams) {
      if (reserved.has(col)) continue;
      const dot = raw.indexOf('.');
      filters.push({ col, op: raw.slice(0, dot), val: raw.slice(dot + 1) });
    }
    const all = this.tables[table];
    const selected = () => {
      let out = all.filter((r) => this.matches(r, filters));
      const order = url.searchParams.get('order');
      if (order) {
        const [col, dir] = order.split('.');
        out = [...out].sort((a, b) => (a[col] < b[col] ? -1 : a[col] > b[col] ? 1 : 0) * (dir === 'desc' ? -1 : 1));
      }
      const limit = url.searchParams.get('limit');
      return limit ? out.slice(0, Number(limit)) : out;
    };
    const wantsObject = (headers.get('accept') || '').includes('vnd.pgrst.object');
    const respondRows = (rows, status = 200) => {
      if (wantsObject) {
        return rows.length === 1 ? this.json(status, rows[0]) : this.json(406, { code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned' });
      }
      return this.json(status, rows);
    };

    if (method === 'GET' || method === 'HEAD') {
      const rows = selected();
      if (method === 'HEAD') return new Response(null, { status: 200, headers: { 'content-range': `*/${rows.length}` } });
      return respondRows(rows);
    }

    if (method === 'POST') {
      const payload = JSON.parse(init.body);
      const items = Array.isArray(payload) ? payload : [payload];
      const upsert = prefer.includes('resolution=merge-duplicates');
      const created = [];
      for (const item of items) {
        const row = this.defaults(table, item);
        if (this.violation(table, row)) {
          if (!upsert) return this.json(409, { code: '23505', message: `duplicate key value violates unique constraint on ${table}` });
          const keys = (url.searchParams.get('on_conflict') || '').split(',');
          const existing = all.find((r) => keys.every((k) => r[k] === row[k]));
          Object.assign(existing, item, { updated_at: this.clock().toISOString() });
          created.push(existing);
          continue;
        }
        all.push(row);
        created.push(row);
      }
      return prefer.includes('return=representation') ? respondRows(created, 201) : new Response(null, { status: 201 });
    }

    if (method === 'PATCH') {
      const patch = JSON.parse(init.body);
      const targets = selected();
      const updated = [];
      for (const row of targets) {
        const next = { ...row, ...patch, updated_at: this.clock().toISOString() };
        if (this.violation(table, next, row)) return this.json(409, { code: '23505', message: 'duplicate key value violates unique constraint' });
        Object.assign(row, next);
        updated.push(row);
      }
      return prefer.includes('return=representation') ? respondRows(updated) : new Response(null, { status: 204 });
    }

    return this.json(405, { message: `unsupported method ${method}` });
  }
}

/** Scripted Twilio: records every request, answers from a queue (default: success). */
export class FakeTwilio {
  constructor() {
    this.calls = [];
    this.script = [];
    this.n = 0;
  }
  fetch = async (url, init) => {
    const form = Object.fromEntries(new URLSearchParams(init.body));
    this.calls.push({ url: String(url), headers: init.headers, form });
    const next = this.script.shift();
    if (next === 'network') throw new Error('socket hang up');
    if (next) return new Response(JSON.stringify(next.body), { status: next.status });
    this.n += 1;
    return new Response(JSON.stringify({ sid: `SM${String(this.n).padStart(32, '0')}`, status: 'queued' }), { status: 201 });
  };
}
