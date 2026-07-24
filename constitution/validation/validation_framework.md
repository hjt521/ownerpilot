---
constitutional_id: VAL-001
operational_maturity: implemented
security_classification: internal
capability_class: constitutional
object_type: validation
title: Validation Framework and Runner
status: Implemented
canonical_owner: Governance
governing_authority: PROC-001
ratification_authority: Founder
lifecycle_state: Implemented
created: 2026-07-24
updated: 2026-07-24
depends_on: [BASE-001]
required_by: []
implements: [PROC-001]
governed_by: [PROC-001]
validated_by: [CA-001]
supersedes: []
superseded_by: []
related_artifacts: []
registry_tags: [validation]
program_phase: foundation
repository_path: constitution/validation/validation_framework.md
checksum_scope: file
---

# Phase G — Constitution Validation Framework

Automated checks that make constitutional regressions **detectable before deployment** and drift **detectable continuously**. Design (Phase 0); implementation is a follow-up (each check is a SQL introspection query + a repo comparison, runnable in CI and as a scheduled watch — the same mechanism as the `public`-schema drift diagnostic #179 and the weekly Advisors task, extended to `constitution`).

## Checks

| # | Check | What it catches | Method | Current status (2026-07-22) |
|---|---|---|---|---|
| 1 | **Schema drift** | repo baseline ≠ live schema (a database-first change, an unapplied migration) | diff `constitution_baseline.sql` (repo) vs live introspection | ⚠️ whole schema is currently drift (database-first); goes green once the baseline is exported + adopted |
| 2 | **Trigger coverage** | `updated_at` columns with no maintaining trigger | tables with an `updated_at` column MINUS tables with an `updated_at` trigger | ❌ **10 offenders today**: `behavioral_profiles`, `decision_intelligence_requests`, `intelligence_evaluation_suites`, `intelligence_model_registry`, `negotiation_cases`, `scenario_generation_requests`, `scenario_templates`, `simulation_actors`, `strategy_evolution_experiments`, `twin_discovery_rules` |
| 3 | **RLS coverage** | any table without RLS enabled, or with a permissive `USING/ WITH CHECK (true)` policy | `pg_class.relrowsecurity` + `pg_policies` scan | ✅ all 59 RLS-on, 0 policies (deny-by-default) |
| 4 | **SECURITY DEFINER review** | new/undocumented `SECURITY DEFINER` functions, or any missing a pinned `search_path` | `pg_proc.prosecdef` + `proconfig` check vs the ADR-005 allow-list | ✅ 5 functions, all search-path-pinned + documented |
| 5 | **Missing comments** | tables/columns without `COMMENT ON` (per standards) | `obj_description`/`col_description` null-scan | ⚠️ most tables uncommented (pre-existing); enforce on new work, backfill over time |
| 6 | **Missing / weak indexes** | FK columns without a supporting index; status/sort columns unindexed | FK column set MINUS indexed column set | to baseline once #1 lands |
| 7 | **Broken foreign keys** | FK targets that don't exist / orphaned refs after a change | `pg_constraint` validity + optional referential spot-check | ✅ current FKs valid |
| 8 | **Migration ordering** | out-of-order / duplicate / gap in migration numbering | filename sort vs applied order | n/a until migrations are repo-tracked |
| 9 | **Dependency graph** | a migration referencing an object created later; circular module deps | build object dependency DAG from `pg_depend` + FK graph | design only |
| 10 | **Architecture consistency** | a live object not documented in a module doc, or a doc referencing a non-existent object | cross-check module_architecture table lists vs live table set | to automate after Phase C is adopted |

## Priorities from this pass (feed the roadmap)

1. **Check #2 — trigger coverage (10 offenders).** Concrete, additive-only remediation: attach `set_updated_at()` (or `touch_updated_at()`) to the 10 tables that carry `updated_at` but no trigger. This is behavior-*correcting* (updated_at currently never updates on those tables), so it's a real fix, but per Phase 0 rules it is **documented now and applied later** through the workflow — not during modernization. Track as its own migration `const_0001_updated_at_trigger_coverage.sql`.
2. **Check #1 — establish the baseline** so drift detection can run at all (Phase B).
3. **Checks #4, #3** already pass — wire them as **continuous** guards (extend the weekly Advisors watch to include `constitution`, and add these to CI).

## Implementation shape

Each check is a small idempotent SQL query returning offenders as JSON (exactly like the #179 diagnostic). A `constitution/validation/run_checks.sql` bundle + a scheduled task diffs against `constitution_baseline.sql` and the ADR-005 allow-list, alerting on any delta. No check writes to the database.

## Metadata-drift gate (CBS-001)
`node constitution/tools/cbs.mjs check` is the metadata-integrity CI gate: it fails on duplicate CRIDs, broken CRID references, dependency cycles, missing required metadata, or unknown object types. Wire it into CI and the weekly watch alongside the schema checksum check. The generated `constitution/index/*` must always be reproducible from repository metadata — a diff after `cbs build` means front-matter changed without regenerating the indexes.
