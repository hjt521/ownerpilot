# FF-3 Production-Flip Attestation Packet — §1.6

**Status:** DRAFT — assembling 2026-07-22 · **files on/after 2026-07-27** (FF-3 soak clean-expiry). Three items finalize at filing (flagged ⏳): the closing Sentry-window extract, rollback drill **Run 2**, and the soak-clean confirmation. Everything else is complete now.

**Authority:** `ff3_prod_flip_and_scope_a_closure_omnibus_broker_ruling_2026-07-13.md` §1.6 (conditional pre-authorization). Production `FF3_CAPTURE_ENABLED=true` becomes effective **only** upon engineering filing this packet demonstrating §1.1–§1.5 satisfied + soak clean, and broker countersign.

**Soak clock (decoupled):** 14-day floor from Gate-4 activation (2026-07-13 late PT) → **clears 2026-07-27**, on its own clock, independent of the Gate-3 F2 timer (2026-08-01). Per `ff3_soak_clock_decouple_engineering_input_2026-07-14.md` (broker supersession signed). FF-3 flip target **~2026-07-28**.

**Scope:** LA production only. Does **not** authorize Scope B (multi-city) or Scope C (UD self-filing) — those require their own ruling chains (omnibus §1.6 LA-only carve-out).

---

## Item 1 — §1.1 soak evidence

**(a) Sentry stream — Sev-1/Sev-2 attributable to FF-3.** ⏳ *Closing extract at filing.* As of 2026-07-22: no FF-3-attributable Sev-1 or Sev-2 recorded in the C1 Sentry stream for the soak window (2026-07-13 →). The §1.1 "clean" criteria (1)(2) hold to date. Final window extract (2026-07-13 → 2026-07-27) attached at filing.

**(b) CI-guard green history.** All soak-relevant guards green on `main` for the window. FF-3-scoped and adjacent guards in force:

- `locked-prose-lock` (`ci:verify-locked-prose`) — manifest **floor 130**, green (two-manifest total; the guard is the authority).
- `banned-terms-lock`, `attorney-attribution-lock`, `route-body-parsing-lock`, `analytics-no-pii-lock`, `review-produce-parity-lock`, plus `tsc` typecheck.

No guard regression on `main` during soak (criterion 3). The 050 drift caught in Run 1 was a DB-apply gap, **not** a CI-guard failure — guards stayed green throughout; remediated per standing ruling #5.

**(c) Anomaly-rate readouts (ties to §1.1(4) / monitoring §C).** Preview traffic is E2E-driven pre-launch → the **low-volume regime governs** (absolute thresholds operative: `ff3_resume_scope_mismatch > 5/24h` or `ff3_resume_already_consumed > 2/24h`). No threshold breach to date; the only resume traffic is the drill's expected `409 ff3_resume_not_authorized` baselines (correct behavior, not anomalies). Live DB backlog check 2026-07-22: **awaiting-review open = 0, over-48h = 0, authorized-unconsumed = 0** — zero stuck holds, zero dangling one-shot authorizations. ⏳ Closing rolling-window counts + denominators at filing.

**(d) Manifest history at 130.** Held at 130 across soak; enforced continuously by the green `ci:verify-locked-prose` guard. No FF-3-scoped locked-prose amendment occurred during soak (no §1.1(5) soak-continuation event).

## Item 2 — §1.2 monitoring parity attestation

Filed: **`ff3_prod_monitoring_parity_attestation_2026-07-13.md`**. Three layers: (A) deterministic canary `synthetic:ff3:monitoring` (13 checks green, silent-skip Sev-1 canary included); (B) Sentry alert-rule spec (6 rules — broker to configure on the dashboard); (C) volume-gated dual-method anomaly methodology (N=20 regime split). **Open dependency at filing:** broker adds the §B Sentry alert rules; day-7 baseline counts captured (low-volume regime expected to govern).

## Item 3 — §1.3 rollback drill evidence (both runs)

Runbook + evidence: **`ff3_rollback_drill_runbook_and_evidence_2026-07-13.md`**.

- **Run 1 — COMPLETE + CLEAN (2026-07-18).** Bidirectional rollback proven: flag ON baseline 3-passed → OFF dark at all four layers (produce 200 skip / **zero `compliance_gates` rows** — Sev-1 canary clear / all FF-3 columns NULL / resume `409 ff3_resume_not_authorized`) → back ON parity 3-passed → independent fresh-shell probe 3-passed. Surfaced + remediated the migration-050 schema-before-flag drift mid-drill (standing ruling #5). Merged to `main` (PR #238).
- **Run 2 — ⏳ SCHEDULED ~2026-07-25–27** (within 48h before this filing). Same procedure; the Run-1 3d resume response is **frozen** and Run 2 must match byte-for-byte (any delta = §1.5 Sev-3 anomaly). Run-2 evidence block completes at filing.

## Item 4 — §1.4 data-volume affirmation

Per omnibus §1.4 (approved, no prod-scale replay required): Preview coverage is sufficient. FF-3 gates are deterministic (no LLM in the FF-3 walk); the E2E exercises mismatch → escalate → resolve → resume → produce plus the two negative branches; golden-catalog synthetics cover chain permutations. This item is closed by the ruling; no additional evidence required.

## Item 5 — §1.5 on-call runbook diff

Filed: **`ff3_oncall_runbook_addendum_2026-07-13.md`** — extends `gate3_forkE1_oncall_runbook_2026-07-02.md` with the 7 FF-3 severity classes (incl. the 3 broker-added: Sev-1 silent-skip, Sev-2 `/admin/ff3-review` unreachable, Sev-3 FF-3 locked-prose guard failure), the volume-gated anomaly thresholds (§2), and the FF-3 containment/rollback mechanics (§3, broker-executed).

## Item 6 — Deploy plan

- **What flips:** exactly one env var — `FF3_CAPTURE_ENABLED` → `true`, **Production scope only**, Vercel. No code deploy.
- **Prerequisite (must be true before flip):** Production `ADMIN_EMAILS` provisioned (task #184) so `/admin/ff3-review` is reachable in prod the moment capture goes live — otherwise a reconciliation escalation strands the owner with no broker surface (this is exactly the §1.5 Sev-2 class). Confirm set before flipping.
- **Order:** (1) confirm prod `ADMIN_EMAILS` set; (2) set `FF3_CAPTURE_ENABLED=true` (Production); (3) redeploy Production; (4) wait Ready.
- **Smoke test on the other side (prod, non-destructive):** confirm `/chat` loads and an ordinary produce with a matching amount proceeds normally (no spurious reconciliation card); confirm `/admin/ff3-review` renders the "FF-3 broker review" heading (empty queue = healthy). Do **not** seed synthetic FF-3 sessions in prod (the seed route is Preview-locked by design — S2 prod→404). 
- **Executor:** broker (§4.13). Engineering supplies this block; broker performs the Vercel action.

## Item 7 — Rollback plan

- **Primary containment:** flip `FF3_CAPTURE_ENABLED=false` (Production) → redeploy. The produce-gate chain returns the `skip` disposition and the entire FF-3 surface goes dark with **no owner-facing change** — the exact behavior Run 1 (and Run 2) prove. No code deploy; env change + redeploy, fully reversible.
- **Failure signal:** any FF-3 Sev-1/Sev-2 from the on-call addendum — silent-skip (produce succeeds on a session whose chain should have halted, `compliance_gates` row missing), reconciliation-gate 500 spike, or `/admin/ff3-review` unreachable while holds exist.
- **Detection:** Sentry alert rules (§B) fire on 5xx/silent-skip within ~5 min; the deterministic canary catches invariant breaks every CI commit; DB backlog monitor catches stuck holds.
- **Time to rollback:** minutes — a single Vercel env flip + redeploy (same mechanism timed repeatedly in the drill). Owner data is safe throughout; held state persists across the flag flip.
- **Executor:** broker (§4.13). Held owners are unblocked as soon as capture is restored or `ADMIN_EMAILS`/deploy is corrected.

---

## Pre-flip checklist (must clear before the flip action)

- [ ] **Run 2 rollback drill** (~07-25–27) — 3-passed round-trip + frozen-baseline match (#183)
- [ ] **Prod `ADMIN_EMAILS` provisioned** (Vercel, Production) — #184
- [ ] **Service-role key + seed-secret rotation** (exposed in the drill channel) — #181
- [ ] **Broker: Sentry FF-3 alert rules configured** (§1.2 §B, 6 rules) + Data Scrubber/Scrub IP toggles (§2.2)
- [ ] **Leaked-password protection enabled** (Auth dashboard) — clears the standing Advisors WARN
- [ ] Closing Sentry-window extract + day-7 anomaly baseline attached (Item 1a/1c)

## Supporting evidence (bonus, not a §1.6-required item)

- **`schema_drift_diagnostic_2026-07-22.md`** — systematic merged-vs-live schema check across all 8 object classes; **zero drift** beyond the (now-applied) migration 050. Confirms no other 050-style gap exists ahead of the flip.
- **Supabase Advisors 2026-07-22:** 0 errors; live == ratified baseline; all Fork H-a exceptions intact.

---

## Engineering attestation (to be finalized at filing ~2026-07-27)

Engineering attests that §1.1–§1.5 are satisfied and the FF-3 Preview soak is clean per the omnibus §1.1 criteria, pending the three ⏳ items above which finalize on the filing date. Deploy and rollback plans (items 6–7) are as stated.

— Engineering · FF-3 prod-flip attestation packet · drafted 2026-07-22

## Broker countersignature (§1.6 — required for the flip to become effective)

Upon countersign of the finalized packet, Production `FF3_CAPTURE_ENABLED=true` is authorized to become effective (LA-only). Pre-authorization lapses if the packet is not filed within 45 days of soak clean-expiry.

— Jack Taglyan / California Licensed Real Estate Broker / CalDRE B9445457 / Broker Compliance Review · __________
