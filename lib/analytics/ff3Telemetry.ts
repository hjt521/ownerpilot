// lib/analytics/ff3Telemetry.ts
// Omnibus §3 row 2 (+ §4.1 retrospective adjacency) — FF-3 telemetry seam, pre-staged behind FF3_TELEMETRY_ENABLED.
//
// Emits one structured event per FF-3 seam. THREE hard gates, in order:
//   (1) flag OFF (default) → no emission;
//   (2) consent NOT granted → dropped at emission (same consent surface as the GA4 mount — Cookiebot statistics);
//   (3) PII denylist enforced on every payload (the a15 / lib/safety denylist) — a denied key/value drops the event.
// The emitter NEVER throws into the caller: telemetry can never affect the produce/chat/resume flow (soak-safe).
//
// SINK: structured console line ({ evt: 'ff3.telemetry', ... }) — the same structured-log shape already used by the
// chat output-gate. NO third-party analytics is wired here. The final sink destination + the exact consent-cookie
// contract are reserved for a broker ruling before this flag ships.
//
// SCHEMA NOTE: FF-3 state lives on chat_sessions (there is no separate ff3_session row), so ff3_session_id mirrors
// chat_session_id in this architecture. Kept as a distinct field for forward-compatibility with the ruling's schema.

import { enforceDenylist } from '@/lib/safety/denylist';
import { ff3TelemetryEnabled } from '@/lib/chat/ff3TelemetryFlag';

export type Ff3TelemetryEventName =
  | 'capture-start'
  | 'reconciliation-fired'
  | 'escalation-created'
  | 'resolution-recorded'
  | 'resume-authorized'
  | 'resume-consumed'
  | 'produce-gate-cleared'
  | 'produce-gate-skipped';

export type Ff3ActorType = 'owner' | 'broker' | 'system';

/** The full emitted payload (post-envelope). No PII: only ids, an enum, a route string, and an ISO timestamp. */
export interface Ff3TelemetryPayload {
  event: Ff3TelemetryEventName;
  ff3_session_id: string;
  chat_session_id: string;
  timestamp: string;
  /** Opaque, non-PII disposition reference (e.g. a gate result label or resolution enum). Null when N/A. */
  disposition_ref: string | null;
  actor_type: Ff3ActorType;
  source_route: string;
  correlation_id: string;
}

/** Caller-supplied fields (timestamp + correlation_id are filled if omitted). */
export interface Ff3TelemetryInput {
  event: Ff3TelemetryEventName;
  chatSessionId: string;
  ff3SessionId?: string;
  actorType: Ff3ActorType;
  sourceRoute: string;
  dispositionRef?: string | null;
  correlationId?: string;
  timestamp?: string;
}

export interface Ff3EmitContext {
  /** Same consent surface as the GA4 mount. When false, the event is dropped at emission. */
  consentGranted: boolean;
}

/**
 * Assert an FF-3 telemetry payload carries no denied PII (keys or email-shaped values), reusing the canonical
 * a15 / lib/safety denylist. Exported so the enforcement is unit-testable directly. Throws on a violation.
 */
export function assertFf3PayloadClean(payload: Ff3TelemetryPayload): void {
  enforceDenylist(payload as unknown as Record<string, unknown>);
}

function buildPayload(input: Ff3TelemetryInput): Ff3TelemetryPayload {
  return {
    event: input.event,
    ff3_session_id: input.ff3SessionId ?? input.chatSessionId,
    chat_session_id: input.chatSessionId,
    timestamp: input.timestamp ?? new Date().toISOString(),
    disposition_ref: input.dispositionRef ?? null,
    actor_type: input.actorType,
    source_route: input.sourceRoute,
    correlation_id: input.correlationId ?? crypto.randomUUID(),
  };
}

/**
 * Emit one FF-3 telemetry event. Returns true iff an event was actually emitted (useful for tests/assertions).
 * Gates: flag off → false; consent not granted → false; denylist violation → dropped (false). Never throws.
 */
export function emitFf3Event(input: Ff3TelemetryInput, ctx: Ff3EmitContext): boolean {
  if (!ff3TelemetryEnabled()) return false;
  if (!ctx.consentGranted) return false;
  try {
    const payload = buildPayload(input);
    assertFf3PayloadClean(payload);
    // Structured sink (interim). Broker ruling finalizes the destination before the flag ships.
    console.log(JSON.stringify({ evt: 'ff3.telemetry', ...payload }));
    return true;
  } catch {
    // Fail-safe: a denylist violation or serialization error drops the event silently — it must never break the
    // FF-3 flow. (A denied payload is a build-time bug caught by assertFf3PayloadClean's unit test.)
    return false;
  }
}

/**
 * Read the FF-3 telemetry consent from the request, using the same surface as the GA4 mount (Cookiebot statistics
 * consent). Fail-closed: absent/unparseable cookie → false. The exact cookie contract is provisional pending the
 * broker's sink/consent ruling.
 */
export function ff3TelemetryConsentFromCookie(cookieValue: string | null | undefined): boolean {
  if (!cookieValue) return false;
  try {
    return /statistics\s*:\s*true/i.test(decodeURIComponent(cookieValue));
  } catch {
    return /statistics\s*:\s*true/i.test(cookieValue);
  }
}
