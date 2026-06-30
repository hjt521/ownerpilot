// lib/compliance/lockedProse.ts
//
// Typed accessor for SHAPE-B locked prose (the "phase2 assembly" runtime-source manifest).
// Per locked_prose_manifest_schema_reconciliation_broker_ruling_2026-06-29.md §2.1, the
// prose for these 54 entries LIVES IN the manifest itself; code imports it at runtime rather
// than re-declaring it as a .ts export. CI Guard A (scripts/ci/verify_locked_prose.ts) hashes
// each entry.value against entry.hash on every run (tamper detection).
//
// Usage:
//   import { lockedProse } from "@/lib/compliance/lockedProse";
//   const body = lockedProse("CLAUSE_PAYMENT_RECEIVED_V1");   // throws if key missing
//
// When you reference a key here, annotate the call site with `// LockedKey: <KEY>` so the
// guard's dangling-reference scanner can confirm the key resolves.
//
// Authority: broker authors all locked prose; engineering only reads it. CalDRE B9445457.

import assembly from "@/docs/compliance/locked_prose_manifest_phase2_assembly.json";

export type LockedTier = "A" | "B";

export interface LockedProseEntry {
  key: string;
  version: string;
  tier: LockedTier;
  value: string;
  hash: string;
  source_ruling: string;
  subject?: string;
  lane?: string;
  supersedes?: string;
  note?: string;
}

interface AssemblyManifest {
  manifest_role: string;
  guard_status: string;
  entries: LockedProseEntry[];
}

const MANIFEST = assembly as unknown as AssemblyManifest;

// Build a key->entry index once at module load. Fail loud if the manifest is the wrong shape
// or carries duplicate keys (which would make resolution ambiguous).
const INDEX: Map<string, LockedProseEntry> = (() => {
  const m = new Map<string, LockedProseEntry>();
  if (!MANIFEST || !Array.isArray(MANIFEST.entries)) {
    throw new Error(
      "locked_prose_manifest_phase2_assembly.json: missing or non-array `entries` (wrong shape)."
    );
  }
  for (const e of MANIFEST.entries) {
    if (!e || typeof e.key !== "string" || typeof e.value !== "string") {
      throw new Error(
        `locked_prose_manifest_phase2_assembly.json: malformed entry ${JSON.stringify(e)?.slice(0, 80)}`
      );
    }
    if (m.has(e.key)) {
      throw new Error(`locked_prose: duplicate key "${e.key}" in assembly manifest.`);
    }
    m.set(e.key, e);
  }
  return m;
})();

/** All locked keys available in the Shape-B assembly manifest. */
export const LOCKED_KEYS: readonly string[] = Array.from(INDEX.keys());

/** Return the full entry for a key, or throw if it does not resolve. */
export function lockedProseEntry(key: string): LockedProseEntry {
  const e = INDEX.get(key);
  if (!e) {
    throw new Error(
      `lockedProse: unknown key "${key}". It must exist in ` +
        `docs/compliance/locked_prose_manifest_phase2_assembly.json. ` +
        `(Did you add a // LockedKey: ${key} reference without adding the entry?)`
    );
  }
  return e;
}

/** Return the locked prose string (value) for a key, or throw if it does not resolve. */
export function lockedProse(key: string): string {
  return lockedProseEntry(key).value;
}

/** True iff the key resolves. Useful for optional/conditional copy. */
export function hasLockedProse(key: string): boolean {
  return INDEX.has(key);
}
