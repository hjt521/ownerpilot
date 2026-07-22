# Phase E — Constitution Development Standards

Binding conventions for **all future constitutional development**. Every one is derived from the 59 tables / 7 functions already in production (see the reverse-engineering report) — these are not new preferences, they are the codified existing house style. New objects that deviate must justify it in an ADR.

## Naming

- **snake_case** everywhere (tables, columns, functions, indexes, constraints).
- **Tables:** plural or domain-noun, module-prefixed where it aids grouping (`twin_*`, `scenario_*`, `strategy_*`, `decision_*`, `intelligence_*`, `negotiation_*`, `agent_*`, `ai_*`).
- **Human code column:** every entity table carries `<noun>_code text NOT NULL` with a `UNIQUE` (or composite-unique) constraint (`experiment_code`, `candidate_code`, `run_code`, `recommendation_code`). New tables follow suit.
- **PK:** `id`. **FK columns:** `<referenced_noun>_id` (e.g. `experiment_id`); disambiguate when the table is itself that noun (ESL-005 uses `strategy_experiment_id`, not `experiment_id`).

## Primary keys & IDs

- `id uuid NOT NULL DEFAULT gen_random_uuid()` (pgcrypto). **Do not** use `uuid_generate_v4()` even though `uuid-ossp` is installed — `gen_random_uuid()` is the established generator.
- PK constraint named `<table>_pkey`.

## Timestamps & audit

- `created_at timestamptz NOT NULL DEFAULT now()` on every table. Run-style tables may use `started_at timestamptz NOT NULL DEFAULT clock_timestamp()` + nullable `completed_at`.
- **`updated_at`:** if a table can be updated in place, add `updated_at timestamptz NOT NULL DEFAULT now()` **and** attach the trigger. **Standard:** `constitution.set_updated_at()` via trigger `<table>_set_updated_at BEFORE UPDATE FOR EACH ROW`. (`touch_updated_at()` is the newer twin-family variant; prefer `set_updated_at()` for new non-twin tables unless the module standardizes otherwise.)
- **Rule (enforced by validation):** an `updated_at` column **must** have a maintaining trigger. Columns without a trigger are a defect (10 such tables exist today — remediate, do not replicate).
- **No mutable audit rewriting.** `created_at` is never updated; approvals are recorded as `approved_by`/`approved_at`, not by mutating history.

## Status & mode fields

- Represented as **`text NOT NULL DEFAULT '<initial>'`** + a `CHECK (col = ANY (ARRAY[...]))`. **No enum types, no domains** — the schema has zero of either; do not introduce them (it would fork the convention).
- Enumerate allowed values in the CHECK; adding a value is an additive migration + an ADR if the state machine changes.

## JSONB

- Structured payloads use purpose-named `jsonb NOT NULL DEFAULT '{}'::jsonb` (objects) or `'[]'::jsonb` (arrays). Avoid a generic `metadata` column unless the payload is genuinely open-ended (ESL-005 uses one deliberately; the ESL-004 family does not).

## Numeric conventions

- Probability / confidence / threshold in **[0,1]**: `numeric(6,5)` + `CHECK (col >= 0 AND col <= 1)`.
- Value / score (can be negative, higher precision): `numeric(12,6)` or `numeric(14,6)`, nullable.
- Counts: `integer` + `CHECK (col >= 0)` (or `> 0` where zero is invalid).

## Foreign keys

- Child → owning parent (experiment/request): `ON DELETE CASCADE`.
- Optional/soft reference (e.g. `scenario_id`, `selected_candidate_id`): `ON DELETE SET NULL` (column nullable).
- **`RESTRICT` is not used; no `ON UPDATE` clauses** (default `NO ACTION`). Match this unless an ADR justifies otherwise.
- Name FK constraints `<table>_<column>_fkey`.

## CHECK constraint philosophy

- Encode **invariants that must always hold** (ranges, ordering like `maximum_trials >= minimum_trials`, non-negativity, allowed state sets). Keep them in the table so they cannot be bypassed by any writer. Name them explicitly (`<table>_<column>_check`) for reversibility and clear failures.

## Indexing

- **BTREE only** (no GIN/partial/expression indexes exist today; introduce them only with an ADR + a stated query need).
- Auto: PK + unique-code. Manual: `idx_<shortname>_<purpose>`, frequently **composite with a status or a sorted metric** (`(experiment_id, status)`, `(request_id, started_at DESC)`, `(experiment_id, risk_adjusted_score DESC)`). Index the FK columns and the columns you filter/sort on.

## Functions

- Business logic: `LANGUAGE plpgsql`, **`SECURITY DEFINER`**, **always** `SET search_path TO 'constitution', 'public'` (add `pg_catalog` only if catalog access is needed). Use `for update` row locks for read-modify-write and `pg_try_advisory_xact_lock(...)` for single-flight jobs. Return `uuid`/`jsonb`.
- Trigger functions: `LANGUAGE plpgsql` with a pinned `SET search_path`, minimal body.
- **SECURITY DEFINER is reviewed per ADR-005** — every new one must be justified and search-path-pinned.

## RLS & security

- **Every table:** `ENABLE ROW LEVEL SECURITY` with **no permissive policy** = deny-by-default. Access is `service_role`/owner only (service_role bypasses RLS). The `constitution` schema is not PostgREST-exposed. Do not author `USING (true)` / `WITH CHECK (true)` policies.

## Comments

- The existing schema comments sparsely; **new work does better**: `COMMENT ON TABLE` (purpose, module, cardinality) is **required**; `COMMENT ON COLUMN` for any column whose meaning isn't obvious (seeds, thresholds, FKs, status semantics).

## Versioning, deprecation, backward compatibility

- **Additive-only by default.** New columns are nullable or defaulted; new tables are independent. Never rename or drop in place without a deprecation ADR.
- **Deprecation:** mark deprecated objects in a comment + an ADR, keep them for at least one release, remove in a dedicated migration.
- **Backward compatibility:** existing readers must keep working across a migration. Breaking changes require an ADR, a migration, and a validation update.
- **Migration numbering:** module migrations `esl<NNN>_phase<X>_<slug>.sql`; cross-cutting `const_<NNNN>_<slug>.sql` (zero-padded, monotonic). One change per file; reversible (`-- ROLLBACK:` block).
