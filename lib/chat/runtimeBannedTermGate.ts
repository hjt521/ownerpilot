// lib/chat/runtimeBannedTermGate.ts
// Lane P4 Q3 — runtime banned-term output gate. Every model response passes through here before it leaves the
// server (wired in app/api/chat). This is the technical wall between "we read your lease" (fine) and "we
// reproduced CAR's copyrighted expression" (lawsuit) — see p4_persona_production_wiring_broker_ruling_2026-07-04.
//
// Actions per entry (from lib/chat/bannedTerms.json — the SINGLE source shared with the CI guard, Q3):
//   block    — discard the response, return a safe fallback, log the event.
//   scrub    — redact the offending substring(s), return the redacted response, log. (CAR identifiers default.)
//   log_only — pass through unchanged, log for calibration.
// FAIL-CLOSED: any error → block + safe fallback. Never return unscrubbed output on failure.

import bannedTerms from './bannedTerms.json';

export type RuntimeAction = 'block' | 'scrub' | 'log_only' | 'none';

interface CompiledTerm { id: string; re: RegExp; action: RuntimeAction; fallbackKey?: string }

const REDACTION = '[redacted]';
export const SAFE_FALLBACK =
  "I can't share that specific language — let me describe the concept instead. Ask me again and I'll explain it in plain terms.";

// Per-phrase safe fallbacks (a block-match may carry `fallbackKey` pointing here; otherwise SAFE_FALLBACK).
// ud_pro_per: verbatim from persona_correction_ud_filing_pro_per_authority_2026-07-05 — replaces a wrong
// mandatory-attorney response with the accurate pro-per answer rather than a generic refusal.
export const FALLBACKS: Record<string, string> = {
  ud_pro_per:
    "I can't answer that in a way I'm confident is accurate. What I can tell you is that California landlords can file unlawful detainer packets in pro per — without an attorney — and OwnerPilot prepares filing-ready packets under a California licensed real estate broker's supervision (CalDRE B9445457, Cal. Bus. & Prof. Code § 10131(b)). If your situation involves contested defenses, bankruptcy, or subsidized housing, an attorney may be worth consulting — but that's a case-by-case decision, not a filing prerequisite.",
};

const COMPILED: CompiledTerm[] = (bannedTerms.terms as Array<{ id: string; pattern: string; flags: string; runtime: string; fallbackKey?: string }>)
  .filter((t) => t.runtime && t.runtime !== 'none')
  .map((t) => ({ id: t.id, re: new RegExp(t.pattern, t.flags.includes('g') ? t.flags : t.flags + 'g'), action: t.runtime as RuntimeAction, fallbackKey: t.fallbackKey }));

export interface GateMatch { id: string; action: RuntimeAction; excerpt: string; }
export interface RuntimeGateResult {
  action: 'pass' | 'block' | 'scrub' | 'log_only';
  output: string;                 // safe to return to the client
  matches: GateMatch[];           // for the audit log (excerpt only — never full response text)
}

/** first 200 chars of the response around/including the match (bounded, no full text). */
function excerptFor(text: string, m: RegExpExecArray): string {
  const start = Math.max(0, m.index - 40);
  return text.slice(start, start + 200);
}

/**
 * Gate a model response. Pure + synchronous. BLOCK short-circuits (any block-match ⇒ safe fallback). Otherwise
 * scrub-matches are redacted and log_only-matches recorded. Fail-closed on any thrown error.
 */
export function runtimeBannedTermGate(responseText: string): RuntimeGateResult {
  try {
    const matches: GateMatch[] = [];
    // Pass 1: any BLOCK match ends it immediately.
    for (const t of COMPILED) {
      if (t.action !== 'block') continue;
      t.re.lastIndex = 0;
      const m = t.re.exec(responseText);
      if (m) {
        return {
          action: 'block',
          output: (t.fallbackKey && FALLBACKS[t.fallbackKey]) || SAFE_FALLBACK,
          matches: [{ id: t.id, action: 'block', excerpt: excerptFor(responseText, m) }],
        };
      }
    }
    // Pass 2: scrub + log_only.
    let out = responseText;
    let didScrub = false;
    let didLogOnly = false;
    for (const t of COMPILED) {
      if (t.action === 'block') continue;
      t.re.lastIndex = 0;
      let m: RegExpExecArray | null;
      let found = false;
      // record first-match excerpt against the ORIGINAL text
      t.re.lastIndex = 0;
      const first = t.re.exec(responseText);
      if (first) { matches.push({ id: t.id, action: t.action, excerpt: excerptFor(responseText, first) }); found = true; }
      if (!found) continue;
      if (t.action === 'scrub') { out = out.replace(new RegExp(t.re.source, t.re.flags), REDACTION); didScrub = true; }
      else if (t.action === 'log_only') didLogOnly = true;
    }
    if (didScrub) return { action: 'scrub', output: out, matches };
    if (didLogOnly) return { action: 'log_only', output: out, matches };
    return { action: 'pass', output: responseText, matches: [] };
  } catch {
    // fail-closed
    return { action: 'block', output: SAFE_FALLBACK, matches: [{ id: 'gate_error', action: 'block', excerpt: '' }] };
  }
}
