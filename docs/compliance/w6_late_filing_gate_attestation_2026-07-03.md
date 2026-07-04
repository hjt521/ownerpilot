# W6 Late-Filing Produce-Gate Hook — Engineering Attestation

**Date:** 2026-07-03
**By:** Engineering (Claude Code)
**Governing rulings:** `gate3_wave3_wiring_and_ff3_omnibus_broker_ruling_2026-07-03.md` §3.7; `g1_status_rollup_broker_countersign_and_ff4_produce_hook_authorization_2026-07-03.md` §2.5; W6 pre-flight forks ruling 2026-07-03 (Fork 1 ordinance-verbatim, Fork 2 pure-gate).
**Branch:** `feature/w6-late-filing-produce-gate-hook`

---

## §1 — Ratified build steps → as-built

| # | Ratified step | As-built |
|---|---|---|
| 1 | Branch off main | `feature/w6-late-filing-produce-gate-hook` |
| 2 | `LAMC_LATE_FILING_ORDINANCE_VERBATIM` + `source_authority`, sync-sourced to `caJurisdictionMatrix.ts` | `lib/filing/lateFilingGate.ts` — constant owns the verbatim; a test asserts byte-equality with `CA_JURISDICTION_MATRIX['ca-los-angeles-city'].postServiceFiling` + `.authority` (drift guard) |
| 3 | Three-field read + day-count vs `holidays_la_city` (business-day, not judicial) | `evaluateLateFilingGate({notice_type, service_date, today})` reuses `lahdFilingDeadline`/`isLateForFiling` (core uses `getVerifiedCityHolidaySet`) |
| 4 | Fail-closed on null `notice_type` OR `service_date` | → `result: 'prerequisite_incomplete'` (never a silent pass) |
| 5 | Return `{gate, result, context:{evaluated_at, verbatim_hash, …}}`, in-memory, no `compliance_gates` write | exactly this shape; no DB write |
| 6 | Hard-code assertion (parsed window == hard-coded integer) | `parseWindowFromVerbatim(verbatim) === LATE_FILING_WINDOW_BUSINESS_DAYS`; core refactored off the literal `3` to the named constant |
| 7 | Three synthetics | `SC-W6-ORDINANCE-TEXT-VERBATIM-DRIFT-01`, `SC-W6-BOUNDARY-EQUAL-01`, `SC-W6-HOLIDAY-STRADDLE-01` |
| 8 | Boundary determination in attestation | **§2 below** |
| 9 | Wave-4 catalog 11 → 14 | recorded (§3) |
| 10 | Drift-guard on statute-watch cron `2a58382e`, not forms-refresh `0abb46c4` | recorded as a follow-up cron-scope amendment (§4) — not wired in this PR |

## §2 — Boundary determination (§8)

**`<=` (day 3 is inside the window; day 4 is late).** Pulled from the ordinance wording "within **3 business days**": filing ON the 3rd LA-city business day after service is timely; the 4th is late. Implemented as `isLateForFiling = today > deadline` (strictly-after → late), so `today == deadline` → **pass**, `today == deadline + 1` → **block**. Synthetic `SC-W6-BOUNDARY-EQUAL-01` pins both edges. This is the same `<=`-style edge FF-4 used for FMR, but the determination was derived independently from the W6 wording (not assumed from FMR).

## §3 — Fork rulings honored

- **Fork 1 (ordinance-verbatim):** the constant pins the **LAMC ordinance** (`§ 151.09.C.9; § 165.05.B.5; Ordinance 188,681`), not LAHD-portal marketing copy — because if the LAHD portal text changed but the ordinance did not, the rule would not change (the broker's general test). `source_authority` field carries the citation for auditors; the verbatim is what the code checks.
- **Fork 2 (pure gate / `compliance_gates` deferral):** the gate is evaluated in-memory and returns its result; nothing is persisted. The `compliance_gates` table + persistence land with the packet-manifest lane (its first genuine reader). Per the amended output contract, every result carries `evaluated_at` (audit ordering) + `verbatim_hash` (detects evaluation against a since-superseded verbatim) — the new standing rule for any gate with a verbatim constant.

## §4 — Wiring deferral (engineering disposition — flagged for awareness)

**The gate is built and fully tested but is NOT wired into the live produce route in this PR.** Rationale: `notice_type` is an FF-3-captured typed column and is **null for every session until `FF3_CAPTURE_ENABLED` is on**. A live W6 call-site would therefore return `prerequisite_incomplete` (a block) for **every current produce**, breaking the flow. The produce-path call-site must run the gate chain (reconciliation → FF-4 → W6) **behind the FF-3 gate**, and that harness assembles in the migration-042 co-batch where FF-4 + the reconciliation call-site also land. This W6 gate is the ready-to-plug component — same separation pattern as the FF-3 state machine (built) vs its activation wiring (gated). If the broker prefers a W6-only FF-3-gated call-site now, that's a small follow-up; flagged rather than assumed.

## §5 — Follow-ups surfaced (per the ruling, non-blocking)

1. **Cron scope amendment:** statute-watch cron `2a58382e` currently monitors statewide CCP/Civil Code; add LAMC § 151.09, § 165.05, Ordinance 188,681 so the W6 verbatim's drift-guard is live. Follow-up PR.
2. **`verbatim_hash` retrofit for FF-4:** add `evaluated_at` + `verbatim_hash` (over `FMR_PORTAL_TEXT_VERBATIM`) to the FF-4 gate result shape in the 042 co-batch (ratification covers it).
3. **`compliance_gates` schema:** broker-executed migration, authored with the packet-manifest lane.
4. **Produce-path call-site (the gate chain):** assembles in the 042 co-batch (§4).

## §6 — Verification

W6 gate suite 19/19 (incl. the 3 synthetics + holiday-straddle 07-01→07-07 proof) · existing `lateFiling` core test still green after the named-constant refactor · `tsc --noEmit` clean · locked-prose PASS 125 · banned-terms OK. No migration, no manifest change, no locked-prose change (the verbatim is ordinance text, not owner-facing prose).

---

— Engineering (Claude Code) · W6 late-filing gate · 2026-07-03
