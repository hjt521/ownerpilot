# G15+ — Gate-3 Entry Signoff (PREDRAFT)

**Re:** `gate3_forks_C_D_B_E_F_G_omnibus_broker_ruling_2026-07-02.md` (G15+ predraft authorized in-band).
**Status:** PREDRAFT — broker promotes to the signed `gate3_entry_signoff_<date>.md` when §1 predicates are green and the §2 enablement steps are sequenced.
**By:** Claude Code (engineering), 2026-07-02.

---

## §1 — Entry predicate roll-up

| # | Predicate | Status | Evidence artifact |
|---|---|---|---|
| P-1 | Gate 2 **CLOSED** (enforcement posture proved + signed) | ✅ | `gate2_closure_artifact_2026-07-01.md` |
| P-2 | Branch protection = **11/11** (helper == GitHub, §4.12 closed) | ✅ | ruleset screenshot + `verify-branch-protection` |
| P-3 | Migrations 034/035/036 applied + **ledger reconciled** | ✅ | `gate2_migration_ledger_repair_2026-07-01.md` |
| P-4 | Fork **A1** (LA-only) ruled | ✅ | `gate3_fork_a_jurisdictional_breadth_broker_ruling_2026-07-02.md` |
| P-5 | **Six E2E seams** closed (Slices 1–3) | ✅ | slice attestations 1/2/3 + broker countersigns |
| P-6 | Fork **C1** monitoring built (off until `SENTRY_DSN`) | ✅ | `gate3_forkC1_monitoring_attestation_2026-07-02.md` |
| P-7 | Fork **D1** privacy 45-day SLA built | ✅ | `gate3_forkD1_privacy_sla_attestation_2026-07-02.md` |
| P-8 | Fork **B2** closed-beta + waitlist built | ✅ (enablement pending) | `gate3_forkB2_closed_beta_attestation_2026-07-02.md` |
| P-9 | Fork **E1** on-call runbook | ✅ | `gate3_forkE1_oncall_runbook_2026-07-02.md` |
| P-10 | Fork **F2** soft-launch duration ruled | ✅ | omnibus ruling (F2) |
| P-11 | Fork **G** closure criterion defined | ✅ | `gate3_forkG_closure_criterion_2026-07-02.md` |
| P-12 | Prod **run-window** authorized + engineering-countersigned + predicates delivered | ⏳ broker-executes T-0 ≤ 2026-07-15 | `gate2_prod_runwindow_runbook_2026-07-02_amended.md` + countersign + residue-sweep SQL + executor-path (Path 1) |

**P-1…P-11 green.** P-12 is the one broker-executed gate remaining before the soft-launch clock (Fork G §2) can start.

## §2 — Enablement steps owed before soft-launch is fully live (broker / ops, §4.13)
1. **Run-window T-0** (≤ 2026-07-15) — starts the Fork-G Sev-streak + F2 clocks. Pre-sequence is broker-local (executor Path 1 confirmed).
2. **Monitoring on:** add `@sentry/node`, stand up self-hosted Sentry + Relay, set `SENTRY_DSN` — so Sev-1/2 incidents are *observed* (Fork G §4).
3. **Closed beta live:** apply migration **037** (waitlist table) + set `BETA_ALLOWLIST` on prod (B2 merge-ordering).
4. **Privacy:** confirm `privacy@` mailbox live/monitored (D1 §4).

## §3 — Standing patterns codified this cycle (inherit forward)
- **Guard iteration over `app/api/test/*/route.ts`** — new test-seed routes guarded automatically.
- **Opt-in flag for seed extensions** — default-off preserves prior slices' baseline; opt-in produces enriched state.
- **Owner-scope violations return 404** (not 403) across Gate-3 surfaces.
- **Both-sided anti-defaulting assertion** (`cs-blank` present AND `cs-val` absent) — the standing shape for anti-defaulting invariants.
- **API-first deterministic assertion before DOM** in seam specs.
- **Feature-off-until-configured** for new prod capabilities (SENTRY_DSN, BETA_ALLOWLIST) — no behavior change on merge except where deliberately sequenced (B2).
- **Spec-only slices** (only `e2e/*.spec.ts`, no new prod imports) may skip main-repo `tsc` in the attestation.
- **Closure-Bar Re-Scoping Doctrine** — amendments predating a codified standing rule are re-scoped, not gridlocked.

## §4 — What promoting G15+ opens
Signing G15+ seats Gate 3 into the **soft-launch → closure phase** governed by Fork G. From there: run the F2 window, track the Fork-G criterion (this is the live scoreboard), and on all-met + F2 exit condition → `gate3_closure_artifact` → **GA transition** (auto-fires E1 on-call revisit, B2 `BETA_OPEN=true`, F-tracker close).

## §5 — Predraft → signoff
Broker promotes by: confirming P-12 executed (run-window evidence packet + countersign), attaching the §2 enablement confirmations, and signing at the bottom. That signature is the formal Gate-3 entry. **This omnibus (Forks A–G + G15+) completes engineering's Gate-3-entry build scope.**

---

— Engineering (Claude Code) · G15+ Gate-3 entry predraft (capstone) · 2026-07-02
