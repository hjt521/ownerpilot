# Constitution Schema — Reverse-Engineering Report · 2026-07-22

**Purpose.** The `constitution` schema (the Enterprise Constitutional AI layer for OwnerPilot) is **database-first** — it exists in production (`txpetdrfsmqnyooydmas`) but is **not represented in the `hjt521/ownerpilot` Git repository** (repo migrations `001–055` are all `public`-schema, the CA notice platform). This report documents the live schema so it can become version-controlled and so new ESL migrations (starting with ESL-005 Phase 5A) match existing conventions exactly. **Introspection only — no DB objects were created, altered, or dropped.**

Source of truth for this report: live introspection via `pg_catalog` / `information_schema` on 2026-07-22.

---

## 1 · Schemas present

`auth`, `constitution`, `cron`, `extensions`, `graphql`/`graphql_public`, `net`, `public`, `realtime`, `storage`, `supabase_migrations`, `vault` (+ Supabase-managed temp schemas). The two application schemas are **`public`** (the notice platform, repo-tracked) and **`constitution`** (the ESL layer, database-first).

## 2 · Extensions

`pgcrypto` (→ `gen_random_uuid()`, the id default in use), `uuid-ossp` (present but **not** the id generator in the ESL tables), `pg_net`, `pg_stat_statements`.

## 3 · Inventory (constitution)

- **Tables:** 59 · **Views:** 0 · **Functions:** 7 · **Triggers:** 8 · **RLS policies:** 0 · **Enums:** 0 · **Domains:** 0 · **Indexes:** 139
- **RLS:** enabled on **all 59** tables, **zero policies** → deny-by-default / service-role-and-owner only (the same fail-closed posture as the `public` audit/cron tables).

### 3.1 Tables by inferred ESL module (module boundaries are not labeled in the DB — grouping inferred from names)

- **Platform / digital-twin / agent-build (ESL-001-ish):** `agent_build_runs`, `agent_event_log`, `agent_review_gates`, `agent_work_items`, `ai_organizations`, `ai_organization_capabilities`, `amendments`, `amendment_impacts`, `approvals`, `artifacts`, `artifact_versions`, `capabilities`, `cross_references`, `governance_decisions`, `releases`, `release_artifacts`, `sync_jobs`, `twin_entities`, `twin_relationships`, `twin_source_systems`, `twin_discovery_rules`, `twin_discovery_findings`, `twin_discovery_snapshots`, `twin_health_metrics`, `twin_health_snapshots`, `twin_impact_analyses`, `twin_impact_findings`, `twin_simulations`, `twin_simulation_results`
- **ESL-002 Scenario Generation:** `scenario_generation_requests`, `scenario_generation_runs`, `generated_scenarios`, `scenario_templates`, `scenario_variables`, `scenario_quality_reviews`
- **ESL-003 Actor State Persistence:** `simulation_actors`, `actor_scenario_states`, `actor_response_distributions`, `behavioral_profiles`, `behavioral_assessments`, `negotiation_cases`, `negotiation_turns`, `negotiation_outcomes`, `negotiation_strategy_versions`
- **ESL-004 Strategy Evolution:** `strategy_evolution_experiments`, `strategy_candidates`, `strategy_simulation_evaluations`, `strategy_outcome_observations`, `strategy_policy_versions`, `strategy_selection_decisions`
- **ESL-006 Decision Intelligence:** `decision_intelligence_requests`, `decision_recommendations`, `decision_option_assessments`, `decision_sensitivity_findings`, `decision_explanation_factors`, `decision_explainability_audit`, `intelligence_evaluation_runs`, `intelligence_evaluation_suites`, `intelligence_model_registry`

## 4 · Functions (7)

All business-logic functions are **`SECURITY DEFINER`, `plpgsql`, with a pinned `SET search_path`** (`'constitution', 'public'` — one also adds `pg_catalog`), returning `uuid`/`jsonb`. They use `gen_random_uuid()`, `for update` row locks, and `pg_try_advisory_xact_lock(...)` for idempotency (discovery).

| Function | Returns | Security | search_path |
|---|---|---|---|
| `build_decision_recommendation(uuid, text, text)` | uuid | DEFINER | constitution, public |
| `generate_scenario_set(uuid, bigint)` | uuid | DEFINER | constitution, public |
| `run_supabase_discovery(text)` | jsonb | DEFINER | constitution, public, pg_catalog |
| `score_strategy_candidate(uuid, uuid, jsonb, jsonb, int, numeric)` | uuid | DEFINER | constitution, public |
| `select_strategy_champion(uuid)` | uuid | DEFINER | constitution, public |
| `set_updated_at()` | trigger | INVOKER | constitution, pg_temp |
| `touch_updated_at()` | trigger | INVOKER | pg_catalog, constitution |

## 5 · Audit / `updated_at` convention (the key decision point)

Two trigger functions, both `new.updated_at = now(); return new;` with a pinned search_path:

- **`set_updated_at()`** — attached via trigger named **`<table>_set_updated_at`**, `BEFORE UPDATE ... FOR EACH ROW`. Used by: `agent_work_items`, `ai_organizations`, `artifacts`, `capabilities`.
- **`touch_updated_at()`** (newer, comment: "Maintains updated_at timestamps with a fixed security search path") — attached via **`trg_<table>_updated_at`**. Used by: `twin_entities`, `twin_health_metrics`, `twin_relationships`, `twin_source_systems`.

**Important:** the **ESL strategy/scenario/decision family does NOT attach an `updated_at` trigger** — even `strategy_evolution_experiments`, which has an `updated_at timestamptz NOT NULL DEFAULT now()` column, has **no** trigger maintaining it. Most ESL tables have only `created_at` (no `updated_at` at all). So there are effectively two audit postures in the schema, and the ESL family is the no-trigger one. → See §9 for how ESL-005 handles this.

## 6 · Naming, type & default conventions (from the 5 ESL FK tables)

- **PK:** `id uuid NOT NULL DEFAULT gen_random_uuid()`, constraint `<table>_pkey`.
- **Human code:** `<noun>_code text NOT NULL` + `UNIQUE` (e.g. `experiment_code`, `candidate_code`, `run_code`, `recommendation_code`). Sometimes composite unique (`(experiment_id, candidate_code)`).
- **Status/mode:** `text NOT NULL DEFAULT '<v>'::text` + `CHECK (col = ANY (ARRAY[...]))`. **No enum types anywhere.**
- **Timestamps:** `created_at timestamptz NOT NULL DEFAULT now()`; run-style tables use `started_at timestamptz NOT NULL DEFAULT clock_timestamp()` + nullable `completed_at`; `updated_at timestamptz NOT NULL DEFAULT now()` where present.
- **jsonb:** `NOT NULL DEFAULT '{}'::jsonb` (objects) or `'[]'::jsonb` (arrays). No generic `metadata` column in the ESL tables — they use purpose-named jsonb columns.
- **Probability/confidence:** `numeric(6,5) NOT NULL DEFAULT 0` + `CHECK (col >= 0 AND col <= 1)`.
- **Value/score:** `numeric(12,6)` / `numeric(14,6)`, nullable.
- **Actor/approver identity:** **`text`, not uuid** — `approved_by text`, `requested_by text` (values like `'Founder'`). This is a hard convention.
- **Approval:** `founder_approval_required boolean NOT NULL DEFAULT true`; `decision_recommendations` adds `approval_status text ... CHECK(pending/approved/rejected/not_required)` + `approved_by text` + `approved_at timestamptz`.

## 7 · Foreign-key strategy

- Child → parent **experiment** reference: `experiment_id uuid NOT NULL REFERENCES constitution.strategy_evolution_experiments(id) ON DELETE CASCADE` (strategy_candidates, strategy_simulation_evaluations, decision_recommendations).
- Child → **request** reference: `... REFERENCES ..._requests(id) ON DELETE CASCADE`.
- **Optional** reference (`scenario_id`, `selected_candidate_id`): `ON DELETE SET NULL`, or CASCADE-parent + nullable.
- No `ON UPDATE` clauses (default `NO ACTION`). `RESTRICT` is not used.

## 8 · Indexing convention

- BTREE only (no GIN/partial/expression indexes observed in the ESL tables).
- Auto: `<table>_pkey` on `id`; `<table>_<code>_key` on the unique code.
- Manual: **abbreviated `idx_<shortname>_<purpose>`**, frequently **composite with a status or a sorted metric**: `idx_strategy_candidates_experiment (experiment_id, status)`, `idx_scenario_runs_request (request_id, started_at DESC)`, `idx_strategy_eval_experiment (experiment_id, risk_adjusted_score DESC)`, `idx_decision_recommendations_experiment (experiment_id)`.

## 9 · How ESL-005 Phase 5A applies these conventions

- id / code / status(+CHECK) / jsonb-default / numeric(6,5)-with-0-1-CHECK / created_at → **matched exactly**.
- FK `strategy_experiment_id → strategy_evolution_experiments(id) ON DELETE CASCADE` — matches the experiment-child CASCADE convention. (Named `strategy_experiment_id` rather than the bare `experiment_id` to disambiguate — this table is *itself* an experiment.)
- `approved_by` rendered as **`text`** (schema convention), **not** the `uuid` the prompt requested — flagged.
- **`updated_at` + trigger:** the migration includes an `updated_at` column (like `strategy_evolution_experiments`) and attaches the existing **`set_updated_at()`** trigger with the **`monte_carlo_experiments_set_updated_at`** naming (the more common of the two, 4 tables). This honors the prompt's "attach the standard updated_at trigger" instruction and reuses the existing function — but note it makes ESL-005 slightly *more* maintained than its ESL-004 siblings (which omit the trigger). **Decision for the reviewer:** keep the trigger (recommended — the column should be truthful) or drop it for strict ESL-family parity. One-line change either way.
- RLS enabled, **no policy** (deny-by-default) — matches all 59 tables and the prompt.
- Comments: the existing schema comments tables sparsely (only a few twin_* tables), but the prompt explicitly requests table + key-column comments; ESL-005 adds them (additive, requested).

---

*Recommendation:* export the whole `constitution` schema into repo-tracked migrations (a `pg_dump --schema=constitution --schema-only` baseline) so it stops being database-first. That baseline + this report make future ESL modules reviewable in-repo. Tracked separately from the ESL-005 draft; not required to proceed with ESL-005 Phase 5A.

— Engineering · constitution reverse-engineering · 2026-07-22 · introspection-only
