---
constitutional_id: ROAD-001
object_type: roadmap
title: Gap Analysis and Roadmap
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
validated_by: []
supersedes: []
superseded_by: []
related_artifacts: []
registry_tags: [roadmap]
program_phase: foundation
repository_path: constitution/roadmap/gap_analysis_and_roadmap.md
checksum_scope: file
---

# Phase H — Gap Analysis, Roadmap & ESL Readiness

## 1 · Gap analysis (what modernization surfaced)

| Gap | Severity | Detail | Remediation |
|---|---|---|---|
| **Whole schema database-first** | High (governance) | 59 tables invisible to source control, code review, drift checks, Advisors | Phase 0 (this) documents it; Phase B baseline + adoption closes it |
| **`updated_at` without trigger** | Medium (correctness) | **10 tables** carry `updated_at` that never updates (validation check #2) | `const_0001_updated_at_trigger_coverage.sql` — additive, applied via workflow, **after** Phase 0 approval |
| **Sparse comments** | Low | most tables/columns uncommented | enforce on new work (standards); backfill opportunistically |
| **No constitutional validation in CI / watch** | Medium | drift/coverage/SD-review not automated for `constitution` | implement Phase G checks; extend the weekly Advisors watch to `constitution` |
| **Module boundaries unlabeled** | Low | ESL module grouping is inferred, not encoded | confirm groupings with owner; optionally add a `module` tag/table |
| **ESL-005 draft outside `/constitution`** | Low | 5A draft lives in `supabase/migrations/constitution/` | relocate under `constitution/database/migrations/` (follow-up) |

**Not gaps (verified healthy):** RLS coverage (59/59), SECURITY DEFINER hygiene (5/5 search-path-pinned), FK validity, no enums/domains/sequences to reconcile.

## 2 · Prioritized roadmap

**P0 — Foundation adoption (now).** Review + approve this `/constitution` foundation. Broker generates `constitution_baseline.sql` (Phase B). Baseline committed → drift check #1 can run.

**P1 — Validation live.** Implement the Phase G checks as SQL bundles; wire drift + trigger-coverage + SD-review + RLS into CI and extend the weekly watch to `constitution`. This is the guardrail that protects everything after.

**P2 — Correctness remediation.** `const_0001_updated_at_trigger_coverage.sql` (attach `set_updated_at()` to the 10 offender tables) through the full workflow. Comment backfill on the highest-traffic tables.

**P3 — ESL-005 resume.** Only after P0 (and ideally P1). See §4.

**P4 — Future modules** (each: architecture doc → ADR → draft → validate → apply → baseline refresh): Enterprise Knowledge Graph (twin relationship graph → queryable KG), ESL-006 deepening (Decision Intelligence integration surface), then the aspirational layers (Enterprise Consciousness / Evolution Engine) — which need their own architecture docs before any schema.

## 3 · ESL readiness review

| Target | Ready? | Blockers / prerequisites |
|---|---|---|
| **ESL-005 Monte Carlo (5A)** | **Yes, pending gate** | Draft exists + conventions verified; blocked only by the Phase 0 approval gate (§4). FK parent `strategy_evolution_experiments` is healthy. |
| **ESL-006 integration** | Partial | Tables exist + functions present; needs an integration architecture doc (how recommendations consume ESL-005 outputs) before new objects. |
| **Enterprise Knowledge Graph** | Not yet | Needs an architecture doc + ADR; `twin_relationships` is the substrate but no KG query layer/spec exists. |
| **Enterprise Consciousness Layer** | Not yet | Conceptual only; requires an architecture doc before any schema. Do not build speculatively. |
| **Enterprise Evolution Engine** | Not yet | Same — architecture-first. |

## 4 · Recommendation: when to resume ESL-005

**Resume ESL-005 Phase 5A when both hold:**
1. **This Phase 0 foundation is reviewed and approved** (the explicit gate the objective set), and
2. **The Phase B baseline is exported and committed** (so ESL-005 becomes the first change to run the full repository-first workflow end-to-end, with drift detection live to prove baseline==prod before and after).

Recommended sequence: **approve foundation → export baseline → (optionally) stand up validation P1 → apply ESL-005 5A via the workflow → refresh baseline → then 5B.** Applying 5A also cleanly exercises steps 4–8 of the workflow for the first time, which is exactly what you want the *first* post-foundation change to do.

**Timing note (unchanged from the 5A draft):** 5A is additive to `constitution` and has zero impact on `public`/FF-3, but it is still a write to the shared production DB. The FF-3 prod flip is ~2026-07-28; sequencing the ESL-005 apply relative to that window remains the owner's call.

## 5 · Deliverables index (this initiative)

1. Repository restructuring plan → `architecture/repository_structure.md`
2. Constitution baseline → `database/baseline/BASELINE.md` (+ `constitution_baseline.sql` via export)
3. Architecture documentation → `architecture/module_architecture.md`
4. ADRs → `adr/adr_log.md` (ADR-001..008)
5. Development standards → `standards/development_standards.md`
6. Validation framework → `validation/validation_framework.md`
7. Migration workflow → `process/migration_workflow.md`
8. Gap analysis → §1 (this file)
9. Prioritized roadmap → §2 (this file)
10. ESL-005 resume recommendation → §4 (this file)

Entry point tying it together: `../CONSTITUTION.md`.
