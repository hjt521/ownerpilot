# Phase A — Constitution Repository Structure

The `constitution` subsystem is organized as a modular, scalable, repository-first tree. Rationale: the schema is a *product* (59 tables and growing across many modules), so it needs the same separation of concerns a product codebase has — architecture separate from standards separate from the executable database artifacts separate from decision records.

## Layout

```
/constitution
  CONSTITUTION.md              Authoritative entry point / onboarding.
  /architecture               WHAT the system is.
    repository_structure.md    This file.
    module_architecture.md     Per-subsystem: purpose, tables, functions, deps, lifecycle, security, roadmap.
    /enterprise_architecture   (future) cross-module EA docs (data-flow, capability maps).
  /doctrines                  (future) Constitutional Doctrines — the governing "rules of the platform"
                              beyond ADRs (approval authority, founder gates, evidence standards).
  /standards                  HOW we build. The conventions every future object must follow.
    development_standards.md
  /process                    HOW we ship.
    migration_workflow.md      The mandatory repository-first workflow.
  /validation                 HOW we stay correct.
    validation_framework.md    Automated drift / coverage / consistency checks.
  /adr                        WHY decisions were made.
    adr_log.md                 ADR-001..008 (+ future).
  /database                   The executable database artifacts (repo-first going forward).
    /baseline
      BASELINE.md              Object inventory + authoritative export method (Phase B).
      constitution_baseline.sql  (to be generated via pg_dump — see BASELINE.md)
    /migrations                Future constitutional migrations, one file per change.
    /functions                 (future) function source, extracted from the baseline for reviewability.
    /security                  (future) RLS/grant policy docs + per-table posture matrix.
  /reference                  (future) relocated introspection report + external references.
  /roadmap
    gap_analysis_and_roadmap.md  Gaps, prioritized roadmap, ESL resume gate (Phase H).
```

## Placement rules

- **One concern per directory.** Architecture never contains SQL; `database/` never contains prose rationale (that goes to `adr/` or `architecture/`).
- **One migration per change**, named `esl<NNN>_phase<X>_<slug>.sql` (module-scoped) or `const_<NNNN>_<slug>.sql` (cross-cutting), living in `database/migrations/`. See `standards/development_standards.md` §migration-conventions.
- **The baseline is regenerated, never hand-edited.** `database/baseline/constitution_baseline.sql` is a `pg_dump` artifact; every applied migration is followed by a baseline refresh (workflow step 8).
- **ADRs are append-only.** Superseding a decision adds a new ADR that references the old one; the old one is marked "Superseded by ADR-NNN," never deleted (same discipline as the platform's ruling-supersession pattern).

## Relationship to the existing repo

- The `public` schema keeps its current home (`supabase/migrations/NNN_*.sql`). Nothing about it changes.
- The two already-merged constitution artifacts (the reverse-engineering report under `docs/constitution/`, and the ESL-005 draft under `supabase/migrations/constitution/`) are referenced from `CONSTITUTION.md`. Proposed follow-up (not done in Phase 0 to avoid churn): relocate the report to `constitution/reference/` and the ESL-005 draft to `constitution/database/migrations/`. Confirm before moving.
