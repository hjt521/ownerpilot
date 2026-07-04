// lib/intake/noticePathwayGate.ts
// Lane W2 — notice-pathway produce-gate hook.
// Source: gate3_wave3_wiring_and_ff3_omnibus_broker_ruling_2026-07-03.md §3.2 (core) +
//   g1_status_rollup_broker_countersign_and_ff4_produce_hook_authorization_2026-07-03.md §2.5 (priority #3).
//
// W2 routes a notice by TYPE to its LAHD filing pathway: the three 3-day notices → 'efs' (the current in-app EFS
// flow); the 30/60/90-day terminations → 'declaration_of_intent' (a separate scaffolding pathway). This gate wraps
// the merged classifier (noticePathway.ts) and classifies from the FF-3 notice_type typed column.
//
// AS-BUILT vs RULING (surfaced): the countersign §2.1 describes W2 as reading `just_cause` and producing a
// "which packet artifacts / which jurisdictional overlays" verdict. The as-built W2 core (omnibus §3.2) reads
// `notice_type` and produces the EFS-vs-Declaration pathway split. Engineer reads these as two different concerns:
// notice_type→pathway is W2 (this gate); just_cause→required-artifacts + jurisdiction→overlays belong to the
// packet-manifest lane (priority #4, "consumes W3 + compliance_gates"). Built to the as-built core; broker to
// confirm or redirect (see attestation §3).
//
// Also fixed here (root cause): the merged core misclassified ALL FF-3 enum values as 'efs' because its label
// vocabulary predated the FF-3 enum. noticePathway.ts now recognizes both vocabularies; this gate uses the strict
// recognizedNoticePathway (fail-closed on unknown, not defaulted to EFS).
//
// Output contract mirrors W6 (Fork-2): pure gate, evaluated in-memory, no compliance_gates write. W2 is a
// classification gate, not a threshold gate — it has no operative verbatim constant, so the result carries
// evaluated_at but NOT verbatim_hash (the standing rule attaches verbatim_hash only to gates with a verbatim).

import { recognizedNoticePathway, type NoticePathway } from './noticePathway';

/** Authority for the pathway split (auditor-facing; W2 has no single threshold verbatim). */
export const W2_PATHWAY_SOURCE_AUTHORITY =
  'LAHD EFS files 3-day/5-day notices; 30/60/90-day terminations file via the Declaration of Intent to Evict pathway (LAMC § 151.09 / § 165.05)';

export type W2Result = NoticePathway | 'prerequisite_incomplete';

export interface NoticePathwayGateInput {
  notice_type: string | null | undefined; // FF-3-captured typed column
  evaluatedAt?: string;                    // ISO-8601 eval timestamp; defaults to now (injectable for tests)
}

export interface W2GateResult {
  gate: 'w2_notice_pathway';
  result: W2Result;
  context: {
    evaluated_at: string;
    source_authority: string;
    notice_type: string | null;
    pathway: NoticePathway | null;         // null when prerequisite_incomplete
  };
}

/**
 * Evaluate the W2 notice-pathway gate. Pure + deterministic. Fail-closed: a null OR unrecognized notice_type
 * yields 'prerequisite_incomplete' (never a silent default to EFS — an unknown type is a capture defect, not a
 * 3-day notice). A recognized type yields its pathway ('efs' | 'declaration_of_intent').
 */
export function evaluateNoticePathwayGate(input: NoticePathwayGateInput): W2GateResult {
  const evaluated_at = input.evaluatedAt ?? new Date().toISOString();
  const base = {
    evaluated_at,
    source_authority: W2_PATHWAY_SOURCE_AUTHORITY,
    notice_type: input.notice_type ?? null,
  };

  const pathway = recognizedNoticePathway(input.notice_type);
  if (!input.notice_type || pathway === null) {
    return { gate: 'w2_notice_pathway', result: 'prerequisite_incomplete', context: { ...base, pathway: null } };
  }
  return { gate: 'w2_notice_pathway', result: pathway, context: { ...base, pathway } };
}
