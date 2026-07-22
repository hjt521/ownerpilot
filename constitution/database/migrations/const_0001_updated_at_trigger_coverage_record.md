# Migration Governance Record — const_0001_updated_at_trigger_coverage

- **Constitution version:** v1.0 → **v1.1** (first official release after Genesis) · **Type:** additive · **Reversible:** yes
- **Status:** DRAFT (broker applies) · **Authorizing:** Phase 0 approval + governance handbook §7 · **Author/date:** engineering, 2026-07-22

## 1 · Summary
Attaches the existing `updated_at` trigger function to the **10 tables** that carry an `updated_at` column but had no maintaining trigger (validation check #2). Correctness-only: no new objects, no schema-shape change, no data change. After apply, `updated_at` becomes truthful on `UPDATE` for these tables.

## 2 · Architecture impact
- **Subsystems:** ESL-002 (`scenario_generation_requests`, `scenario_templates`), ESL-003 (`simulation_actors`, `behavioral_profiles`, `negotiation_cases`), ESL-004 (`strategy_evolution_experiments`), ESL-006 (`decision_intelligence_requests`, `intelligence_evaluation_suites`, `intelligence_model_registry`), Digital Twin (`twin_discovery_rules`).
- **Objects touched:** 10 new triggers. **No tables/columns/functions created or altered.**

## 3 · Affected EA documents
`architecture/module_architecture.md` — the `[u-notrig]` markers on these 10 tables become `[trig]`. Edit made in this PR.

## 4 · Affected ADRs
None new. Executes the audit convention in ADR-005-adjacent standards (`standards/development_standards.md` §timestamps). No ADR superseded.

## 5 · Affected Constitutional Doctrines
Governance handbook §7 (backward compatibility) — this is the reference example of an additive, non-breaking correctness fix.

## 6 · Affected ESL modules
None functionally. ESL-005 (unbuilt) is unaffected; its parent `strategy_evolution_experiments` gains truthful `updated_at`, which is strictly beneficial.

## 7 · Dependency graph delta
No FK, function-signature, or module-edge change. Adds 10 trigger→function edges: 9 → `set_updated_at()`, 1 (`twin_discovery_rules`) → `touch_updated_at()`.

## 8 · Validation result (post-apply expectation)
- Check #2 (trigger coverage): **10 offenders → 0.**
- Checks #3/#4/#5/#7 (RLS, SECURITY DEFINER, search_path, FK): unchanged, green.
- Check #0/#12 (genesis checksum): **triggers_sha256 changes** (10 new triggers) → overall checksum changes → baseline refresh required (output 9).

## 9 · Baseline refresh
- **Before (v1.0):** `triggers_sha256 = bdff625f…f19dc51c`, `overall = 8830f6b1…b71e36`.
- **After (v1.1):** recompute via `validation/checks.sql` check 0 immediately after apply; commit `constitution_v1.1_manifest.json` + updated `constitution_checksum.sha256`. Trigger count 8 → 18.

## 10 · Version increment recommendation
**PATCH-class change; tagged as the first post-Genesis release → v1.1** (correctness-only, backward compatible). No MAJOR/MINOR structural change. Recommendation: apply via the workflow, refresh baseline to v1.1, update `module_architecture.md` markers, done.

## Workflow position
Steps 1–3 complete (architecture/standards exist; this is the migration draft + record). Awaiting: step 4 review → step 5 validation → step 6 broker apply → steps 7–8 doc + baseline refresh. **This migration is the proof that the repository-first Constitutional Operating System workflow functions end-to-end.**
