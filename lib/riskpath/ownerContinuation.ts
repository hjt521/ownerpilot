// lib/riskpath/ownerContinuation.ts
// Owner Continuation QR V1 — purpose-specific opaque locator, authorization helpers,
// bounded current-task presentation, canonical origin validation, and telemetry filtering.
// This module does not import or infer from the RiskPath transition graph.

import { createHash, randomBytes } from 'node:crypto';

export const OWNER_CONTINUATION_PURPOSE = 'owner_record_continuation' as const;
export const OWNER_CONTINUATION_VERSION = 'v1' as const;
export const OWNER_CONTINUATION_LOCATOR_BYTES = 32;
export const OWNER_CONTINUATION_PUBLIC_PATH = '/owner-continuation' as const;
export const NOTICE_CREATED_DISPLAY_STATE = 'Notice created' as const;
export const NOTICE_CREATED_TASK_LABEL = 'Record service' as const;
export const NOTICE_CREATED_TASK_GUIDANCE = 'Record an actual service attempt only after it happens.' as const;

const LOCATOR_RE = /^[0-9a-f]{64}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function generateOwnerContinuationLocator(): string {
  return randomBytes(OWNER_CONTINUATION_LOCATOR_BYTES).toString('hex');
}

export function isOwnerContinuationLocator(raw: string): boolean {
  return LOCATOR_RE.test(raw);
}

export function hashOwnerContinuationLocator(raw: string): string {
  return createHash('sha256').update(raw, 'utf8').digest('hex');
}

export interface OwnerContinuationAssociation {
  id: string;
  locator_digest: string;
  riskpath_record_id: string;
  purpose: string;
  version: string;
  revoked_at: string | null;
}

export type ContinuationAdmissionReason =
  | 'malformed_locator'
  | 'not_found'
  | 'wrong_purpose'
  | 'wrong_version'
  | 'digest_mismatch'
  | 'revoked';

export function evaluateOwnerContinuationAssociation(
  rawLocator: string,
  association: OwnerContinuationAssociation | null,
): { ok: true; association: OwnerContinuationAssociation } | { ok: false; reason: ContinuationAdmissionReason } {
  if (!isOwnerContinuationLocator(rawLocator)) return { ok: false, reason: 'malformed_locator' };
  if (!association) return { ok: false, reason: 'not_found' };
  if (association.purpose !== OWNER_CONTINUATION_PURPOSE) return { ok: false, reason: 'wrong_purpose' };
  if (association.version !== OWNER_CONTINUATION_VERSION) return { ok: false, reason: 'wrong_version' };
  if (association.locator_digest !== hashOwnerContinuationLocator(rawLocator)) {
    return { ok: false, reason: 'digest_mismatch' };
  }
  if (association.revoked_at) return { ok: false, reason: 'revoked' };
  return { ok: true, association };
}

export interface OwnerRiskPathAuthorizationRecord {
  id: string;
  user_id: string;
  soft_deleted_at: string | null;
}

export type OwnerRiskPathAuthorizationReason = 'not_found' | 'wrong_user' | 'soft_deleted';

/** Possession never authorizes. The current authenticated user must own the exact, live record. */
export function authorizeOwnerRiskPathRecord(
  record: OwnerRiskPathAuthorizationRecord | null,
  currentUserId: string | null | undefined,
): { ok: true; recordId: string } | { ok: false; reason: OwnerRiskPathAuthorizationReason } {
  if (!record || !currentUserId) return { ok: false, reason: 'not_found' };
  if (record.soft_deleted_at) return { ok: false, reason: 'soft_deleted' };
  if (record.user_id !== currentUserId) return { ok: false, reason: 'wrong_user' };
  return { ok: true, recordId: record.id };
}

export function isOwnerContinuationMagicBinding(
  purpose: string,
  ownerContinuationId: string | null | undefined,
): boolean {
  return purpose === OWNER_CONTINUATION_PURPOSE && typeof ownerContinuationId === 'string' && ownerContinuationId.length > 0;
}

export function exactRiskPathDestination(recordId: string): string {
  if (!UUID_RE.test(recordId)) throw new Error('invalid riskpath record id');
  return `/riskpath/${recordId}`;
}

export interface OwnerContinuationOriginEnv {
  appUrl?: string;
  vercelEnv?: string;
  nodeEnv?: string;
}

function isLocalHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return h === 'localhost' || h === '127.0.0.1' || h === '::1' || h.endsWith('.localhost');
}

/**
 * Printed origin is selected only from configured NEXT_PUBLIC_APP_URL. Request Host is intentionally absent.
 * Production refuses localhost, Vercel preview/branch hosts, credentials, non-HTTPS, and path/query/fragment data.
 */
export function canonicalOwnerPilotOrigin(env: OwnerContinuationOriginEnv = {
  appUrl: process.env.NEXT_PUBLIC_APP_URL,
  vercelEnv: process.env.VERCEL_ENV,
  nodeEnv: process.env.NODE_ENV,
}): string {
  const configured = env.appUrl?.trim();
  if (!configured) throw new Error('canonical OwnerPilot origin is not configured');

  let url: URL;
  try {
    url = new URL(configured);
  } catch {
    throw new Error('canonical OwnerPilot origin is invalid');
  }
  if (url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    throw new Error('canonical OwnerPilot origin must be an origin only');
  }

  const production = env.vercelEnv === 'production' || (!env.vercelEnv && env.nodeEnv === 'production');
  if (production) {
    const host = url.hostname.toLowerCase();
    if (url.protocol !== 'https:') throw new Error('production OwnerPilot origin must use https');
    if (isLocalHost(host)) throw new Error('localhost cannot be a production OwnerPilot origin');
    if (host.endsWith('.vercel.app')) throw new Error('preview or branch origin cannot be printed in production');
  }
  return url.origin;
}

export function buildOwnerContinuationPublicUrl(rawLocator: string, origin = canonicalOwnerPilotOrigin()): string {
  if (!isOwnerContinuationLocator(rawLocator)) throw new Error('invalid owner continuation locator');
  return `${origin}${OWNER_CONTINUATION_PUBLIC_PATH}#${rawLocator}`;
}

export type OwnerContinuationTask =
  | { kind: 'existing_staleness_action'; label: 'Review & produce a new notice'; href: '/chat/review'; readOnly: false }
  | { kind: 'record_service'; label: 'Record service'; guidance: typeof NOTICE_CREATED_TASK_GUIDANCE; href: null; readOnly: true }
  | { kind: 'existing_lahd_action'; label: 'Record LAHD filing'; href: null; readOnly: false }
  | { kind: 'review_record'; label: 'Review this record'; href: null; readOnly: true };

/** Presentation-only resolver. It deliberately does not consult the RiskPath transition graph. */
export function resolveOwnerContinuationTask(input: {
  currentState: string;
  stale: boolean;
  lahdEligible: boolean;
  lahdFiled: boolean;
}): OwnerContinuationTask {
  if (input.stale) {
    return { kind: 'existing_staleness_action', label: 'Review & produce a new notice', href: '/chat/review', readOnly: false };
  }
  if (input.currentState === 'notice_created') {
    return {
      kind: 'record_service',
      label: NOTICE_CREATED_TASK_LABEL,
      guidance: NOTICE_CREATED_TASK_GUIDANCE,
      href: null,
      readOnly: true,
    };
  }
  if (input.lahdEligible && !input.lahdFiled) {
    return { kind: 'existing_lahd_action', label: 'Record LAHD filing', href: null, readOnly: false };
  }
  return { kind: 'review_record', label: 'Review this record', href: null, readOnly: true };
}

/** Generic /riskpath remains allowed; only the public scan and exact-record paths are suppressed. */
export function isSensitiveOwnerContinuationTelemetryUrl(rawUrl: string): boolean {
  let pathname: string;
  try {
    pathname = new URL(rawUrl, 'https://ownerpilot.invalid').pathname;
  } catch {
    return true; // malformed telemetry URLs fail closed
  }
  if (pathname === '/owner-continuation' || pathname === '/owner-continuation/') return true;
  return /^\/riskpath\/[^/]+\/?$/.test(pathname);
}
