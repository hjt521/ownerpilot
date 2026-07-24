---
constitutional_id: CON-001
object_type: constitution
title: Engineering Constitution
status: Operational
canonical_owner: Governance
governing_authority: Founder
ratification_authority: Founder
lifecycle_state: Operational
created: 2026-07-24
updated: 2026-07-24
depends_on: []
required_by: []
implements: []
governed_by: [Founder]
validated_by: [CA-001]
supersedes: []
superseded_by: []
related_artifacts: []
registry_tags: [constitution,root]
program_phase: foundation
repository_path: constitution/CONSTITUTION.md
checksum_scope: file
---

# CONSTITUTION.md — The OwnerPilot Constitutional Operating System

> **Status:** Phase 0 — Repository Foundation (documentation & governance only). No production behavior is changed by anything in this directory. The production database remains the current source of truth until the baseline is exported and adopted.

This directory is the authoritative, version-controlled home of the **`constitution` schema** — the Enterprise Constitutional AI layer that governs the OwnerPilot Intelligence Engine™. It is a *separate subsystem* from the OwnerPilot notice-platform application (the `public` schema, tracked elsewhere in this repo).

If you are new to the constitutional platform, read this file first, then `architecture/repository_structure.md`.

---

## 1 · Why this exists

The `public` schema (the California property-owner notice platform) is **repository-first**: every table and function has a migration in `supabase/migrations/`. The `constitution` schema evolved **database-first** — 59 tables, 7 functions, 8 triggers, 139 indexes built directly in production with no source-control representation. That divergence is a governance risk: it is invisible to code review, to schema-drift checks, and to the weekly Supabase Advisors baseline (both scoped to `public`).

**Phase 0 ends the divergence** by making the constitution a first-class, documented, version-controlled software product — *without* changing a single production object.

## 2 · Governance model

Five non-negotiable principles for Phase 0 (and the posture for all constitutional work afterward):

1. **Production is the current source of truth.** We document what exists; we do not reshape it.
2. **No functional change** to production during modernization. No renames, no redesigns, no "improvements," no new tables, no applied migrations.
3. **Document first, version-control second, extend third.** New functionality (including ESL-005 Monte Carlo) resumes only after this foundation is reviewed and approved.
4. **Broker-executed database actions.** Consistent with the platform's standing governance (§4.13), engineering drafts and hands migrations; the broker/operator applies them to production. Nothing here auto-applies.
5. **Every future object flows through the workflow** in `process/migration_workflow.md`. No constitutional object bypasses architecture → review → migration → validation → apply → doc → baseline-refresh.

## 3 · What the constitution is (one paragraph)

The `constitution` schema is an **Enterprise Simulation & Intelligence platform**: it models the enterprise as a digital twin (`twin_*`), generates and reviews decision scenarios (Enterprise Simulation Laboratory — `scenario_*`, `generated_scenarios`), persists simulated actor behavior (`simulation_actors`, `actor_*`, `behavioral_*`, `negotiation_*`), evolves and scores strategies against those scenarios (ESL-004 — `strategy_*`), and turns the results into governed, auditable recommendations (Decision Intelligence — `decision_*`, `intelligence_*`) under an approval/governance layer (`governance_decisions`, `approvals`, `amendments`, founder-approval flags). ESL-005 (Monte Carlo) is the next module and is **not yet built**.

## 4 · Directory map

```
/constitution
  CONSTITUTION.md                         ← you are here (entry point)
  /architecture
    repository_structure.md               Phase A — layout + rationale
    module_architecture.md                Phase C — per-subsystem docs
  /standards
    development_standards.md              Phase E — conventions for all future work
  /process
    migration_workflow.md                 Phase F — the repeatable dev workflow
  /validation
    validation_framework.md               Phase G — automated regression detection
  /adr
    adr_log.md                            Phase D — ADR-001..008
  /database
    /baseline
      BASELINE.md                         Phase B — inventory + authoritative export method
    /migrations                           future constitutional migrations (repo-first)
  /roadmap
    gap_analysis_and_roadmap.md           Phase H — gaps, roadmap, ESL-005 resume gate
```

Two pre-existing artifacts belong to this subsystem and are referenced here (they will be relocated under `/constitution` in a follow-up to avoid churn during Phase 0):
- `docs/constitution/constitution_schema_reverse_engineering_report_2026-07-22.md` — the raw introspection this foundation is built on.
- `supabase/migrations/constitution/esl005_phase5a_monte_carlo_persistence.sql` — the ESL-005 Phase 5A **draft** (not applied; held pending this foundation's approval).

## 5 · Development workflow (summary — full detail in `process/`)

```
Architecture doc → design review → migration draft (repo) → repository review
   → validation (validation_framework) → broker applies to prod → doc update → baseline refresh
```

Every new Enterprise Architecture document, Constitutional Doctrine, ESL module, AI Organization, and Intelligence-Engine component is developed through this repository-first loop. The database is never edited ahead of the repository again.

## 6 · How the pieces fit

- **Enterprise Architecture documents** live in `architecture/` and define subsystems before any SQL exists.
- **Constitutional Doctrines** (the "why we may/may not" rules — e.g. approval gating, SECURITY DEFINER policy, RLS deny-by-default) are captured as **ADRs** in `adr/` and enforced by `standards/`.
- **ESL modules** each get: an architecture doc (Phase C shape) → ADR(s) for novel decisions → a draft migration under `database/migrations/` → validation → apply → baseline refresh.
- **Standards + validation** are the guardrails that keep 60+ future objects consistent with the 59 that already exist.

## 7 · Current status & the gate

Phase 0 deliverables (this directory) are drafted for review. **ESL-005 Phase 5A does not resume until this foundation is reviewed and approved** (see `roadmap/gap_analysis_and_roadmap.md` §"ESL-005 resume gate"). Until then: no new constitutional tables, no applied migrations, no production modification.

— Chief Enterprise Architect / Constitutional Steward · Phase 0 · 2026-07-22
