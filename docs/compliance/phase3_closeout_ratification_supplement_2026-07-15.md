# Phase 3 Closeout Ratification — Supplement · 2026-07-15

Supplement to `phase3_closeout_ratification_broker_signoff_2026-06-30.md`, occasioned by the 2026-07-15 Supabase Advisors triage (25 findings). Records which findings were Phase-3 misses vs. post-Phase-3 landings, the correction record, and the engineering-process improvement.

---

## §1 · Finding provenance (Phase-3 in-scope vs. post-Phase-3)

| Finding | Phase-3 in-scope? | Disposition |
|---|---|---|
| `compliance_gates` RLS disabled (ERROR) | **No** — migration 046, applied ~2026-07-10, after Phase-3 closeout (2026-06-30) | **Post-Phase-3 landing that missed the hardening discipline.** Every other public table had RLS enabled; 046 created this one and never enabled RLS or revoked Supabase's default open anon grants. Remediated (Category A, PR 235). |
| `audit_cliff` anon/auth EXECUTE (WARN×4) | **Yes** — created 002/008 (Phase-3-era) | **Phase-3 hardening gap.** Shipped `SECURITY DEFINER` with default PUBLIC EXECUTE before the "SECURITY DEFINER → service-role only" discipline (later standing ruling #2) was codified. Remediated (Category A). |
| Category B `rls_policy_always_true` ×5 | **Yes** — geocode/audit lane (002–012, June) | **Not a defect — ratified linter exception.** The `WITH CHECK (true)` anon-INSERT is load-bearing per the 2026-06-20 audit-durability ruling / Fork H-a ("app can append, cannot read"). Retained by design; see the remediation attestation §B. |
| Category C `function_search_path_mutable` ×2 | **Yes** — same era | search_path discipline not applied at function creation. Remediated (054). |
| Category D `rls_enabled_no_policy` ×12 | mixed | Correct fail-closed lockdowns. `magic_link_tokens` tidy applied (055); cross-check confirmed (below). |
| Category E (`pg_net`, leaked-password) | config | Supabase defaults / dashboard toggle. Not code defects. |

## §2 · `manual_review_queue` no-regression determination

The broker's 2026-06-30 anon-leak ruling (`manual_review_queue_aging_view_anon_leak_broker_ruling_2026-06-30`) targeted the **read leak** on the `manual_review_queue_aging` VIEW. **That fix is intact** — migration `025b_manual_review_queue_aging_view_grant_correction.sql`: view recreated `security_invoker = true`, `REVOKE ALL FROM PUBLIC, anon, authenticated`, `GRANT SELECT TO service_role`. The base table's `WITH CHECK (true)` INSERT policy is a **separate, intentional** trigger write-path (anon can INSERT but not SELECT the base table). **No regression:** the anon-leak fix was applied to the view; the base table was left INSERT-only by design and is now a ratified Category-B exception.

## §3 · `magic_link_tokens` lane-2 cross-check + citation correction

- **Cross-check result:** current state (RLS on, no policy, service-role only via server-side redeem) **matches** the ratified intent. No divergence.
- **Authorities:** `deploy_readiness_capstone_acceptance_and_external_inputs_broker_ruling_2026-06-29.md` §155/§179 ("no public policy on magic_link_tokens"; public RLS policies explicitly not authorized) + `gate2_preview_runbook_evidence_packet_2026-07-01.md` ("service-role-only… Intentional").
- **Citation correction (recorded plainly):** the triage brief and earlier discussion cited `schema_and_persistence_lane2_broker_ratification_2026-06-29` as the authority. **No file exists under that name.** The two documents above are the actual chain of authority. The mis-citation is corrected here so a future audit reads the real record.

## §4 · Standing rulings established/refined during this triage

- **#1 (refined):** permissive RLS policies prohibited by default; permitted only with a prior ruling establishing them as load-bearing, recorded as a ratified exception (cite ruling, name property, name symptom, record in the Advisors triage). Model exception: the five Category-B audit tables.
- **#2:** `SECURITY DEFINER` = service-role only (revoke public/authenticated EXECUTE, explicit service_role grant). Applied to `audit_cliff`.
- **#3:** deploy-before-revoke — the code change removing a grant dependency deploys before the revoke migration; verified via a preview environment (Supabase branch preferred). Attestation records the code deploy SHA + migration SHA as a matched pair.
- **#4 (new):** prior-ruling conflict surfacing — engineering reads the write/read path as pre-apply diligence and halts + surfaces if a migration as-ruled would violate a prior design ruling. Codified from the Category-B catch.

## §5 · Migration-history drift + branching infrastructure (follow-up)

**Finding:** the Supabase migration-history table tracks only through `036`, while the repo/live DB is at `052+` — migrations 037–052 were applied as raw SQL in the Studio editor, not through the migration system. Surfaced concretely on 2026-07-16: a Supabase preview branch (created without a connected GitHub repo) came up **near-empty** (3 tables), because dashboard branches replay tracked migrations rather than cloning the live schema, and there were no tracked migrations after 036 to replay.

**Implication:** branch-based pre-flight verification (the rationale for the Pro upgrade + standing ruling #3) is **currently non-functional** until either (a) the GitHub repo is connected to Supabase so branches replay the repo's `supabase/migrations` (001→055, all present as files), or (b) the migration history is reconciled to track 037–055. The Category-B pre-flight worked around this by hand-reconstructing the slice on the branch.

**Follow-up (broker to rule):** connect the GitHub repo to Supabase branching, or reconcile the migration history. Until resolved, treat branch pre-flights as requiring manual slice reconstruction. Not a blocker for this triage; recorded for the next grant-removing migration.

## §6 · Engineering-process improvement

The `compliance_gates` Error was found by an Advisors email ~18h after the fact, not by CI. Improvements:
1. **Pre-merge:** add "run Supabase Advisors and paste the full findings" to the checklist for any PR touching Supabase schema (tables, functions, RLS, grants).
2. **Weekly:** a standing Supabase Advisors review on the same operational cadence as the LAHD forms refresh. (Broker to rule separately whether this is a scheduled task or a manual rhythm — inclination noted toward a scheduled task in the weekly cron rhythm.)

— Engineering · Phase-3 supplement · 2026-07-15

Broker countersignature: ____________________________  Date: __________
