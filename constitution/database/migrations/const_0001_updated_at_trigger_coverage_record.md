# Migration Governance Record — const_0001_updated_at_trigger_coverage

- **Constitution version:** v1.0 → **v1.1** (first official release after Genesis) · **Type:** additive · **Reversible:** yes
- **Status:** ✅ **APPLIED 2026-07-22 → Constitution v1.0 → v1.1** · applied via the connected Supabase MCP on explicit broker instruction · **Authorizing:** Phase 0 approval + governance handbook §7

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

## 8 · Validation result (post-apply — confirmed)
- Check #2 (trigger coverage): **10 offenders → 0** ✅ (trigger count 8 → 18).
- Checks #3/#4/#5/#7 (RLS, SECURITY DEFINER, search_path, FK): unchanged, green.
- Check #0/#12 (checksum): `triggers_sha256` + `overall` changed (10 new triggers) → baseline refreshed (output 9).

## 9 · Baseline refresh (done)
- **Before (v1.0):** `triggers_sha256 = bdff625f…f19dc51c`, `overall = 8830f6b1…b71e36`.
- **After (v1.1):** `triggers_sha256 = f51f3036…8edff382`, `overall = 60ea83bc…a9275740`. Committed: `constitution_v1.1_manifest.json` + refreshed `constitution_checksum.sha256`. (`constitution_v1.1.sql` dump: regenerate via the dumper — pending.)

## 10 · Version increment recommendation
**PATCH-class change; tagged as the first post-Genesis release → v1.1** (correctness-only, backward compatible). No MAJOR/MINOR structural change. Recommendation: apply via the workflow, refresh baseline to v1.1, update `module_architecture.md` markers, done.

## Workflow position — COMPLETE
All steps executed 2026-07-22: architecture/standards (1–2) → draft + record (3) → repository review (4) → validation (5, check #2 10→0) → apply (6, via MCP on broker instruction) → doc refresh (7, `module_architecture.md` markers) → baseline refresh (8, v1.1 manifest + checksum). **This migration proved the repository-first Constitutional Operating System workflow end-to-end — the first release after Genesis.** Remaining follow-up: regenerate `constitution_v1.1.sql` via the dumper.
