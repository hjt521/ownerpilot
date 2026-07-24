---
constitutional_id: BASE-002
object_type: baseline
title: Baseline Notes
status: Operational
canonical_owner: Governance
governing_authority: CON-001
ratification_authority: Founder
lifecycle_state: Operational
created: 2026-07-24
updated: 2026-07-24
depends_on: []
required_by: []
implements: []
governed_by: [CON-001]
validated_by: [VAL-001]
supersedes: []
superseded_by: []
related_artifacts: []
registry_tags: [baseline]
program_phase: foundation
repository_path: constitution/database/baseline/BASELINE.md
checksum_scope: file
---

# Phase B — Constitution Schema Baseline

The baseline is the repository's canonical snapshot of the **entire `constitution` schema as it exists in production** — the artifact drift detection compares against. **Documentation only; no object is modified.**

## Object inventory (introspected 2026-07-22)

| Object class | Count | Notes |
|---|---|---|
| Tables | **59** | all RLS-enabled, deny-by-default; `id uuid gen_random_uuid()`; `created_at` on all |
| Views / materialized views | 0 / 0 | none |
| Functions | **7** | 5 SECURITY DEFINER business fns + 2 trigger fns (`set_updated_at`, `touch_updated_at`) |
| Triggers | **8** | all `BEFORE UPDATE` `updated_at` maintainers |
| Indexes | **139** | btree only |
| RLS policies | **0** | deny-by-default (intentional) |
| Enums / domains | 0 / 0 | status/mode are `text + CHECK` |
| Sequences | 0 | uuid PKs, no serials |
| Custom/composite types | 0 | — |
| Extensions (project) | 4 | `pgcrypto`, `uuid-ossp`, `pg_net`, `pg_stat_statements` |

**Tables by module** (full list in `../../architecture/module_architecture.md`): Digital Twin (17: `twin_*`), Scenario Gen/ESL-002 (6: `scenario_*`, `generated_scenarios`), Actor/Behavioral/Negotiation/ESL-003 (9: `simulation_actors`, `actor_*`, `behavioral_*`, `negotiation_*`), Strategy Evolution/ESL-004 (6: `strategy_*`), Decision Intelligence/ESL-006 (9: `decision_*`, `intelligence_*`), Governance/Approval/Agent-build/AI-org (12: `governance_decisions`, `approvals`, `amendments`, `amendment_impacts`, `cross_references`, `capabilities`, `agent_*`, `artifacts`, `artifact_versions`, `releases`, `release_artifacts`, `sync_jobs`, `ai_organizations`, `ai_organization_capabilities`).

## Authoritative full-DDL export (produces `constitution_baseline.sql`)

The executable baseline must be a faithful, complete export — that means **`pg_dump`, not hand-reconstruction** (hand-rebuilding 59 tables risks subtle type/default drift). It requires the database connection string (which lives on the broker/operator side, not with engineering — same boundary as the service-role rail), so this is a **broker-executed** step:

```bash
# Preferred — Supabase CLI (schema-only, constitution only):
supabase db dump --schema constitution --file constitution/database/baseline/constitution_baseline.sql

# Or direct pg_dump against the pooler/direct connection:
pg_dump "$SUPABASE_DB_URL" \
  --schema=constitution --schema-only --no-owner --no-privileges \
  --file=constitution/database/baseline/constitution_baseline.sql
```

Commit the resulting `constitution_baseline.sql` to this directory. That file becomes the drift-check reference (validation check #1) and is refreshed after every applied migration (workflow step 8).

## If a DB-credential export isn't available

Engineering can hand-assemble a reconstructed baseline from `pg_catalog` introspection (tables → columns/defaults/constraints/indexes/comments via `pg_get_constraintdef` / `pg_get_indexdef`, functions via `pg_get_functiondef`, triggers via `pg_get_triggerdef`). It is faithful but larger to produce and review, and should be spot-checked against a `pg_dump` when one becomes available. Say the word and I'll generate it in module-sized chunks.

## Rules

- The baseline is **generated, never hand-edited.**
- Baseline == production is an **invariant** enforced by drift check #1. Any delta means either an unapplied migration or a database-first change that must be retro-documented.
- No credentials are stored in the repo; the export command reads `$SUPABASE_DB_URL` from the operator's environment.
