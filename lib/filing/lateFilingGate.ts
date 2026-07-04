// lib/filing/lateFilingGate.ts
// Lane W6 — LAHD late-filing produce-gate hook.
// Source: gate3_wave3_wiring_and_ff3_omnibus_broker_ruling_2026-07-03.md §3.7 (core) +
//   g1_status_rollup_broker_countersign_and_ff4_produce_hook_authorization_2026-07-03.md §2.5 (priority) +
//   W6 pre-flight ruling 2026-07-03 (Fork 1: ordinance-verbatim; Fork 2: pure gate, in-memory, no compliance_gates).
//
// W6 is ORDINANCE-enforced, NOT portal-enforced (Fork-1 ruling): the operative rule is LAMC § 151.09.C.9 /
// § 165.05.B.5 / Ordinance 188,681 — LAHD is the filing recipient/channel, not the rule-maker. So the verbatim
// constant pins the ORDINANCE text (sync-sourced to caJurisdictionMatrix, the canonical in-repo authority), and
// the drift-guard belongs on the CA statute-watch cron (2a58382e), not the LAHD forms-refresh cron.
//
// Output contract (Fork-2 ruling): pure gate, evaluated IN-MEMORY during produce evaluation. No compliance_gates
// row written here — that table + persistence land with the packet-manifest lane (its first genuine reader).
//
// WIRING NOTE: this module is the callable gate. It is NOT yet wired into the live produce route. notice_type is
// an FF-3-captured typed column (null for every session until FF3_CAPTURE_ENABLED is on), so a live W6 call-site
// would fail-closed (prerequisite_incomplete) on every current produce. The produce-path call-site — which runs
// the gate chain (reconciliation → FF-4 → W6) behind the FF-3 gate — assembles in the migration-042 co-batch,
// where FF-4 + the reconciliation call-site also land. This gate is ready to plug into that chain.

import {
  isLateForFiling, lahdFilingDeadline, LATE_FILING_WINDOW_BUSINESS_DAYS,
} from './lateFiling';

/**
 * The operative ordinance text, byte-for-byte from CA_JURISDICTION_MATRIX['ca-los-angeles-city'].postServiceFiling.
 * The gate module owns this as its source of truth; a test asserts it still equals the matrix value (drift guard).
 */
export const LAMC_LATE_FILING_ORDINANCE_VERBATIM =
  'File copy of the 3-day notice with LAHD within **3 business days** of service on tenant. ' +
  'LA city business-day calendar (not judicial-holiday calendar). ' +
  'Three filing channels: online portal, mail, in person';

/** The rule-making authority auditors read; the verbatim above is what the code checks against. */
export const LAMC_LATE_FILING_SOURCE_AUTHORITY =
  'LAMC § 151.09.C.9; LAMC § 165.05.B.5; Ordinance 188,681 (eff. 8/20/2025)';

/** Precomputed SHA-256 of LAMC_LATE_FILING_ORDINANCE_VERBATIM (portable; no runtime crypto). A test re-derives
 *  and asserts equality, so any edit to the verbatim breaks the build until the hash + ratification are refreshed. */
export const LAMC_LATE_FILING_VERBATIM_HASH =
  '80927f063fa15091fa4429a6f34927b87f3a1f7ed5864d17703b4e831ec0d33b';

/**
 * Extract the filing-window integer from the ordinance verbatim ("...within N business days..."). The W6 gate's
 * hard-coded LATE_FILING_WINDOW_BUSINESS_DAYS must equal this — asserted in the test suite (Fork-1 hard-code
 * assertion). If the ordinance number ever changes, the parse diverges from the constant and the build fails.
 */
export function parseWindowFromVerbatim(verbatim: string): number | null {
  const m = verbatim.match(/within\s+\*{0,2}(\d+)\*{0,2}\s+business day/i);
  return m ? Number(m[1]) : null;
}

export type W6Result = 'pass' | 'block' | 'prerequisite_incomplete';

export interface LateFilingGateInput {
  notice_type: string | null | undefined;   // FF-3-captured; required (prerequisite)
  service_date: string | null | undefined;  // intended service date (ISO YYYY-MM-DD)
  today: string;                             // ISO date the filing-lateness is evaluated against
  evaluatedAt?: string;                      // ISO-8601 eval timestamp; defaults to now (injectable for tests)
}

export interface W6GateResult {
  gate: 'w6_late_filing';
  result: W6Result;
  context: {
    evaluated_at: string;                    // when this gate ran
    verbatim_hash: string;                   // hash of the ordinance verbatim it evaluated against
    source_authority: string;                // the ordinance citation
    notice_type: string | null;
    service_date: string | null;
    filing_deadline: string | null;          // 3rd LA business day after service (null if service_date missing)
    today: string;
    boundary: '<=';                          // "within 3 business days" ⇒ day 3 inside window; day 4 late
  };
}

/**
 * Evaluate the W6 late-filing gate. Pure + deterministic. Fail-closed: a missing notice_type OR service_date
 * yields 'prerequisite_incomplete' (a block posture — missing input is never a silent pass, W6 ruling §4).
 * Boundary is '<=': filing ON the 3rd business day passes; the 4th business day (past the deadline) blocks.
 */
export function evaluateLateFilingGate(input: LateFilingGateInput): W6GateResult {
  const evaluated_at = input.evaluatedAt ?? new Date().toISOString();
  const base = {
    evaluated_at,
    verbatim_hash: LAMC_LATE_FILING_VERBATIM_HASH,
    source_authority: LAMC_LATE_FILING_SOURCE_AUTHORITY,
    notice_type: input.notice_type ?? null,
    service_date: input.service_date ?? null,
    today: input.today,
    boundary: '<=' as const,
  };

  if (!input.notice_type || !input.service_date) {
    return { gate: 'w6_late_filing', result: 'prerequisite_incomplete', context: { ...base, filing_deadline: null } };
  }

  const filing_deadline = lahdFilingDeadline(input.service_date);
  const late = isLateForFiling(input.service_date, input.today); // today > deadline
  return {
    gate: 'w6_late_filing',
    result: late ? 'block' : 'pass',
    context: { ...base, filing_deadline },
  };
}

// Re-export for callers/tests that assert the window integer against the parsed verbatim.
export { LATE_FILING_WINDOW_BUSINESS_DAYS };
