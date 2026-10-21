import { validateTwilioSignature } from './twilio.ts';
import type { QueueStore } from './types.ts';

export interface StatusCallbackDeps {
  store: QueueStore;
  authToken: string | null;
  /** The exact public URL Twilio was told to call (the signature is computed over it). */
  publicUrl: string | null;
  now?: () => Date;
}

/**
 * Receives Twilio's delivery receipts (queued -> sent -> delivered / undelivered / failed)
 * and records them on the matching notification. Unsigned or badly signed requests are rejected.
 */
export async function handleStatusCallback(req: Request, deps: StatusCallbackDeps): Promise<Response> {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });
  if (!deps.authToken || !deps.publicUrl) return new Response('Not configured', { status: 500 });

  const params: Record<string, string> = Object.fromEntries(new URLSearchParams(await req.text()));
  const signature = req.headers.get('x-twilio-signature') ?? '';

  if (!(await validateTwilioSignature(deps.authToken, deps.publicUrl, params, signature))) {
    return new Response('Invalid signature', { status: 403 });
  }

  const sid = params.MessageSid ?? params.SmsSid;
  const status = params.MessageStatus ?? params.SmsStatus;
  if (!sid || !status) return new Response('Bad request', { status: 400 });

  try {
    const now = (deps.now ?? (() => new Date()))().toISOString();
    const result = await deps.store.applyDeliveryStatus(
      { sid, status, errorCode: params.ErrorCode || null, errorMessage: params.ErrorMessage || null },
      now,
    );
    // `not_found` can only happen in the millisecond between Twilio accepting the SMS and us recording its SID.
    return new Response(null, { status: result === 'not_found' ? 202 : 204 });
  } catch (error) {
    console.error('twilio-status-callback failed:', error instanceof Error ? error.message : error);
    return new Response('Server error', { status: 500 }); // Twilio will report the failed webhook
  }
}
