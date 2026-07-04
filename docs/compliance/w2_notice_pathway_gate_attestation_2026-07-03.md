# W2 Notice-Pathway Produce-Gate Hook — Engineering Attestation

**Date:** 2026-07-03
**By:** Engineering (Claude Code)
**Governing rulings:** `gate3_wave3_wiring_and_ff3_omnibus_broker_ruling_2026-07-03.md` §3.2; `g1_status_rollup_broker_countersign_and_ff4_produce_hook_authorization_2026-07-03.md` §2.5 (priority #3).
**Branch:** `feature/w2-notice-pathway-produce-gate-hook`

---

## §1 — What shipped

`lib/intake/noticePathwayGate.ts` — `evaluateNoticePathwayGate({notice_type})` → `{ gate:'w2_notice_pathway', result:'efs'|'declaration_of_intent'|'prerequisite_incomplete', context:{evaluated_at, source_authority, notice_type, pathway} }`. Pure, in-memory, no `compliance_gates` write (Fork-2 discipline). W2 is a classification gate, not a threshold gate — no operative verbatim constant, so the result carries `evaluated_at` but **not** `verbatim_hash` (the standing rule attaches `verbatim_hash` only to gates with a verbatim). Fail-closed: null OR unrecognized `notice_type` → `prerequisite_incomplete`.

## §2 — Root-cause fix (integration drift caught at wiring)

The merged W2 core (`noticePathway.ts`) used a **legacy notice-type vocabulary** (`30_day`/`60_day`/`90_day`) that predates and does not match the FF-3 enum (`sixty_day_termination`, etc.). Verified: before this PR, `classifyNoticePathway('sixty_day_termination') === 'efs'` — i.e. **a 60/90/30-day termination fed from the FF-3 typed column would have misrouted to the EFS portal instead of the Declaration-of-Intent pathway**. Fixed at the root: `noticePathway.ts` now recognizes both vocabularies, and a new strict `recognizedNoticePathway()` returns `null` for unknown types (the gate maps that to `prerequisite_incomplete` rather than the legacy default-to-EFS). Existing core test still green (additive change).

## §3 — As-built vs ruling divergence (surfaced for confirmation)

The countersign §2.1 describes W2 as reading **`just_cause`** and producing a "**which packet artifacts / which jurisdictional overlays**" verdict. The as-built W2 core (omnibus §3.2) reads **`notice_type`** and produces the **EFS-vs-Declaration pathway** split.

**Engineer read:** these are two different concerns. `notice_type → pathway` is W2 (this gate). `just_cause → required-artifacts` + `jurisdiction → overlays` belong to the **packet-manifest lane** (priority #4, which "consumes W3 + compliance_gates" — the natural home for artifact-set selection and the `caJurisdictionMatrix` overlays). Built to the as-built core.

**Broker to confirm or redirect:** if W2 is meant to also own the just_cause/artifact/overlay routing, that is a larger scope that should be its own slice — I did not fold it in speculatively. Flagged, not assumed.

## §4 — Proposed Wave-4 synthetics (pending ratification)

Not assumed into the catalog count — proposing for your ratification (as W6's three were authored):
- `SC-W2-3DAY-ROUTES-EFS-01` — `three_day_pay_or_quit` → `efs`
- `SC-W2-60DAY-ROUTES-DECLARATION-01` — `sixty_day_termination` → `declaration_of_intent` (the case the legacy core misrouted)
- `SC-W2-PREREQ-INCOMPLETE-01` — null `notice_type` → `prerequisite_incomplete`
- `SC-W2-UNKNOWN-TYPE-FAILCLOSED-01` — unrecognized type → `prerequisite_incomplete` (no silent EFS default)

If ratified, Wave-4 catalog 14 → 18.

## §5 — Wiring deferral (same as W6)

Built + tested, **not wired into the live produce route** — `notice_type` is null for every session until FF-3 flag-on, so a live call-site would `prerequisite_incomplete` every current produce. The gate-chain call-site (reconciliation → FF-4 → W6 → W2, behind the FF-3 gate) assembles in the migration-042 co-batch. Ready-to-plug component.

## §6 — Verification

W2 gate suite 13/13 (incl. the 4 proposed synthetics + the drift-fix proofs) · existing `noticePathway` core test green after the additive vocabulary edit · `tsc --noEmit` clean · locked-prose PASS 125 · banned-terms OK. No migration, no manifest change.

---

— Engineering (Claude Code) · W2 notice-pathway gate · 2026-07-03
