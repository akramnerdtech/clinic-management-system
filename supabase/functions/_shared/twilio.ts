import { classifyTwilioFailure } from './rules.ts';

export interface TwilioConfig {
  accountSid: string;
  authToken: string;
  /** Either a Twilio phone number / alphanumeric sender id ... */
  from?: string;
  /** ... or a Messaging Service (recommended for India / multi-sender setups). */
  messagingServiceSid?: string;
}

export type TwilioSendResult =
  | { ok: true; sid: string; status: string }
  | { ok: false; retryable: boolean; httpStatus: number; code: string; message: string };

export interface SendOptions {
  config: TwilioConfig;
  to: string;
  body: string;
  statusCallback?: string | null;
  fetchImpl?: typeof fetch;
}

/**
 * Sends one SMS through Twilio's REST API. Credentials only ever exist inside the
 * Edge Function runtime (Supabase Secrets); they are never returned or logged.
 */
export async function sendTwilioSms(options: SendOptions): Promise<TwilioSendResult> {
  const { config, to, body, statusCallback } = options;
  const doFetch = options.fetchImpl ?? fetch;

  const form = new URLSearchParams({ To: to, Body: body });
  if (config.messagingServiceSid) form.set('MessagingServiceSid', config.messagingServiceSid);
  else if (config.from) form.set('From', config.from);
  if (statusCallback) form.set('StatusCallback', statusCallback);

  let response: Response;
  try {
    response = await doFetch(
      `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(config.accountSid)}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${btoa(`${config.accountSid}:${config.authToken}`)}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: form,
        signal: AbortSignal.timeout(15_000),
      },
    );
  } catch (error) {
    return {
      ok: false,
      retryable: true,
      httpStatus: 0,
      code: 'NETWORK_ERROR',
      message: `Could not reach Twilio: ${error instanceof Error ? error.message : String(error)}`.slice(0, 300),
    };
  }

  const text = await response.text().catch(() => '');
  let json: Record<string, unknown> | null = null;
  try {
    json = text ? (JSON.parse(text) as Record<string, unknown>) : null;
  } catch {
    json = null;
  }

  if (response.ok && typeof json?.sid === 'string') {
    return { ok: true, sid: json.sid, status: typeof json.status === 'string' ? json.status : 'queued' };
  }

  const code = json?.code !== undefined ? String(json.code) : `HTTP_${response.status}`;
  const message = (typeof json?.message === 'string' ? json.message : text || response.statusText).slice(0, 300);
  return {
    ok: false,
    retryable: classifyTwilioFailure(response.status) === 'retryable',
    httpStatus: response.status,
    code,
    message,
  };
}

// ---------------------------------------------------------------------------
// Webhook signature (X-Twilio-Signature)
// ---------------------------------------------------------------------------

const encoder = new TextEncoder();

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

/** Constant-time string comparison (avoids leaking how many leading characters matched). */
export function timingSafeEqualStr(a: string, b: string): boolean {
  const left = encoder.encode(a);
  const right = encoder.encode(b);
  let diff = left.length ^ right.length;
  const length = Math.max(left.length, right.length);
  for (let i = 0; i < length; i++) diff |= (left[i] ?? 0) ^ (right[i] ?? 0);
  return diff === 0;
}

/** base64(HMAC-SHA1(authToken, url + each POST param name+value, sorted by name)). */
export async function computeTwilioSignature(
  authToken: string,
  url: string,
  params: Record<string, string>,
): Promise<string> {
  let data = url;
  for (const key of Object.keys(params).sort()) data += key + params[key];
  const key = await crypto.subtle.importKey('raw', encoder.encode(authToken), { name: 'HMAC', hash: 'SHA-1' }, false, [
    'sign',
  ]);
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  return toBase64(new Uint8Array(signature));
}

export async function validateTwilioSignature(
  authToken: string,
  url: string,
  params: Record<string, string>,
  signature: string,
): Promise<boolean> {
  if (!signature) return false;
  const expected = await computeTwilioSignature(authToken, url, params);
  return timingSafeEqualStr(expected, signature);
}
