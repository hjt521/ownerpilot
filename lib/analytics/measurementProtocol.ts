// lib/analytics/measurementProtocol.ts
// Lane 6 Analytics §Q — server-side GA4 Measurement Protocol helper. Self-contained (no existing helper in repo).
// Conventionally named per broker note: single sendServerEvent(name, params, context) entry point.
// Re-enforces the PII denylist server-side (defense in depth alongside the route + the client emit boundary).

import { enforceDenylist } from './denylist';

export const MP_ENDPOINT = 'https://www.google-analytics.com/mp/collect';

/** Server-fireable events (must match app/api/analytics/server-event ALLOWED_SERVER_EVENTS + events.ts SERVER_EVENT_NAMES). */
export const ALLOWED_SERVER_EVENTS = new Set([
  'intake_complete', 'notice_pdf_generated', 'chat_api_error',
  'structured_json_parse_fail', 'geocode_fallback_used', 'locked_prose_violation',
  'broker_confirm_request_submitted', 'broker_confirm_resolved',
  'reservation_of_rights_inert_emitted',
]);

export interface ServerEventContext {
  clientId?: string; // GA4 client_id; falls back to 'server' for purely server-originated events
}

export class ServerEventError extends Error {}

/** Pure: build the MP request body. Throws on denied params or disallowed event name. */
export function buildMpPayload(name: string, params: Record<string, unknown>, ctx: ServerEventContext = {}) {
  if (!ALLOWED_SERVER_EVENTS.has(name)) {
    throw new ServerEventError(`not a server-side event: ${name}`);
  }
  enforceDenylist(params); // throws on PII keys / email-shaped values
  return {
    client_id: ctx.clientId ?? 'server',
    events: [{ name, params }],
  };
}

/** Fire a server event via the Measurement Protocol. GA4_API_SECRET is server-only (no NEXT_PUBLIC_). */
export async function sendServerEvent(
  name: string,
  params: Record<string, unknown> = {},
  ctx: ServerEventContext = {},
): Promise<void> {
  const payload = buildMpPayload(name, params, ctx);
  const measurementId = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID;
  const apiSecret = process.env.GA4_API_SECRET;
  if (!measurementId || !apiSecret) {
    console.warn('GA4 MP env not set — skipping server event', name);
    return;
  }
  const url = `${MP_ENDPOINT}?measurement_id=${measurementId}&api_secret=${apiSecret}`;
  await fetch(url, { method: 'POST', body: JSON.stringify(payload) });
}
