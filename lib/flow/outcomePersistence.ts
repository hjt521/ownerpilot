import type { StorageLike } from './persistence';
import {
  bindingsEqual,
  type ResolveHistoryRecord,
  type ResolveRecordBinding,
  validateResolveOutcomeHistory,
} from './outcomeEvents';

export const OUTCOME_KEY = 'op.resolveRecord.v1';
export const OUTCOME_VERSION = 1;

export interface ResolveOutcomeEnvelope {
  v: typeof OUTCOME_VERSION;
  savedAt: string;
  binding: ResolveRecordBinding;
  events: ResolveHistoryRecord[];
}

export type RestoredResolveOutcome =
  | { status: 'absent' }
  | { status: 'ready'; envelope: ResolveOutcomeEnvelope }
  | { status: 'blocked'; reason: 'invalid' | 'binding_mismatch' };

function resolveStorage(storage?: StorageLike | null): StorageLike | null {
  if (storage !== undefined) return storage;
  try {
    if (typeof window === 'undefined') return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

function validBinding(value: unknown): value is ResolveRecordBinding {
  if (!value || typeof value !== 'object') return false;
  const binding = value as Partial<ResolveRecordBinding>;
  return (
    typeof binding.noticeGeneration === 'string' && binding.noticeGeneration.length > 0 &&
    typeof binding.successfulServiceAttemptId === 'string' && binding.successfulServiceAttemptId.length > 0 &&
    typeof binding.serviceGeneration === 'string' && binding.serviceGeneration.startsWith('service-v1:')
  );
}

function validRecordShape(value: unknown): value is ResolveHistoryRecord {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  if (typeof record.id !== 'string' || typeof record.recordedAtISO !== 'string') return false;
  if (record.recordKind === 'RECORDED_IN_ERROR') {
    return typeof record.targetEventId === 'string' && !!record.confirmation && typeof record.confirmation === 'object';
  }
  if (record.recordKind === 'OUTCOME') {
    return (
      typeof record.type === 'string' &&
      !!record.payload && typeof record.payload === 'object' &&
      !!record.confirmation && typeof record.confirmation === 'object' &&
      (record.correctionOfEventId === undefined || typeof record.correctionOfEventId === 'string')
    );
  }
  return false;
}

function cloneRecord(record: ResolveHistoryRecord): ResolveHistoryRecord {
  return JSON.parse(JSON.stringify(record)) as ResolveHistoryRecord;
}

function parseEnvelope(raw: string, exactDemand: number): ResolveOutcomeEnvelope | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object') return null;
  const envelope = parsed as Partial<ResolveOutcomeEnvelope>;
  if (envelope.v !== OUTCOME_VERSION) return null;
  if (typeof envelope.savedAt !== 'string' || !Number.isFinite(Date.parse(envelope.savedAt))) return null;
  if (!validBinding(envelope.binding)) return null;
  if (!Array.isArray(envelope.events) || !envelope.events.every(validRecordShape)) return null;
  try {
    validateResolveOutcomeHistory(envelope.events, envelope.binding, exactDemand);
  } catch {
    return null;
  }
  return {
    v: OUTCOME_VERSION,
    savedAt: envelope.savedAt,
    binding: { ...envelope.binding },
    events: envelope.events.map(cloneRecord),
  };
}

export function restoreOutcomeHistory(
  expectedBinding: ResolveRecordBinding,
  exactDemand: number,
  storage?: StorageLike | null,
): RestoredResolveOutcome {
  const target = resolveStorage(storage);
  if (!target) return { status: 'absent' };

  let raw: string | null;
  try {
    raw = target.getItem(OUTCOME_KEY);
  } catch {
    return { status: 'blocked', reason: 'invalid' };
  }
  if (!raw) return { status: 'absent' };

  const envelope = parseEnvelope(raw, exactDemand);
  if (!envelope) return { status: 'blocked', reason: 'invalid' };
  if (!bindingsEqual(envelope.binding, expectedBinding)) {
    return { status: 'blocked', reason: 'binding_mismatch' };
  }
  return { status: 'ready', envelope };
}

export function saveOutcomeHistory(
  binding: ResolveRecordBinding,
  events: readonly ResolveHistoryRecord[],
  exactDemand: number,
  storage?: StorageLike | null,
): boolean {
  if (!validBinding(binding)) return false;
  try {
    validateResolveOutcomeHistory(events, binding, exactDemand);
  } catch {
    return false;
  }

  const target = resolveStorage(storage);
  if (!target) return false;
  const envelope: ResolveOutcomeEnvelope = {
    v: OUTCOME_VERSION,
    savedAt: new Date().toISOString(),
    binding: { ...binding },
    events: events.map(cloneRecord),
  };
  try {
    target.setItem(OUTCOME_KEY, JSON.stringify(envelope));
    return true;
  } catch {
    return false;
  }
}
