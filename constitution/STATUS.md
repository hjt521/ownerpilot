# Constitutional Operating System — STATUS

> Canonical, always-current status of the `constitution` subsystem. Point anyone here (or paste this) instead of re-deriving. Refresh this file on each constitutional release (migration workflow, step 7). **Last updated: 2026-07-22 · Constitution v1.1.**

## Headline
The `constitution` schema (Enterprise Constitutional AI layer) transitioned from an undocumented, database-first subsystem into a governed, repository-first software product at **version v1.1**. The repository is the authoritative source of truth. No unplanned production change was made.

## Production database (`constitution` schema · Supabase `txpetdrfsmqnyooydmas` · PostgreSQL 17.6)
- **59 tables · 7 functions · 18 triggers · 139 indexes · 0 RLS policies** (deny-by-default) · 0 enums/domains/sequences/views.
- **Only one DDL change applied to production** in this initiative: `const_0001` (10 `updated_at` triggers, 8 → 18). Everything else is documentation, tooling, or read-only introspection.

## Versions & checksums (sha256 over canonical DDL)
| Release | Overall checksum | Note |
|---|---|---|
| v1.0 "Genesis" | `8830f6b18d3f466b9876a136283592df9041fe2caee0a97d038e836429b71e36` | frozen, immutable |
| **v1.1** (current) | `60ea83bc0916ce31ed1410f724770d4c0dd655a47d914a260bea7376a9275740` | after `const_0001` |

## Repository artifacts (25 files in `/constitution` + 2 related)
- Entry point: `CONSTITUTION.md`
- Architecture (2): `repository_structure.md`, `module_architecture.md`
- Standards (1): `development_standards.md` (incl. Governance-Identities standard)
- Process (2): `migration_workflow.md`, `governance_automation.md`
- Doctrines (1): `governance_handbook.md`
- ADRs (1): `adr/adr_log.md` — ADR-001…008 (008 Accepted)
- Validation (5): `validation_framework.md`, `ci_cd_design.md`, `checks.sql`, `run_checks.sql`, `run_checks.ts`
- Baseline/Genesis (7): `BASELINE.md`, `CONSTITUTION_BASELINE_v1.md`, `constitution_v1.0_manifest.json`, `constitution_v1.1_manifest.json`, `constitution_checksum.sha256`, `constitution_v1.0.sql` (1,736 ln), `constitution_v1.1.sql` (1,746 ln)
- Migrations (2): `const_0001_updated_at_trigger_coverage.sql` + governance record
- Roadmap (2): `gap_analysis_and_roadmap.md`, `cos_roadmap_and_esl005_gate.md`
- Tools (1): `dump_constitution.mjs` (portable pure-JS schema dumper)
- Related, outside `/constitution` (2): the reverse-engineering report (`docs/constitution/…`), and the ESL-005 5A draft (`supabase/migrations/constitution/esl005_phase5a_monte_carlo_persistence.sql`)

## Migrations
- **Applied: 1** — `const_0001_updated_at_trigger_coverage` (additive/reversible → v1.1). First official release; exercised the full workflow end-to-end.
- **Drafted, not applied: 1** — `esl005_phase5a_monte_carlo_persistence` (held behind the ESL-005 resume gate).

## Implemented (working code)
- Validation runner: `run_checks.sql` + `run_checks.ts` (CI health monitor; verified against prod).
- Portable schema dumper: `dump_constitution.mjs` (no pg_dump/Docker/brew; reusable per baseline refresh).
- Executable check bundle: `checks.sql`.

## Last validation result (production)
Overall checksum **matches committed baseline** (no drift). Trigger coverage **0 offenders**. RLS ✓ (59/59). SECURITY DEFINER ✓ (5 fns, all search-path-pinned). FKs ✓. 55 tables uncommented (warn, pre-existing).

## Governance model (ratified)
Architecture-first · repository-first · additive-by-default · semantic versioning · RLS deny-by-default · SECURITY DEFINER allow-list (ADR-005) · **governance identities are logical, not database, identities** (`approved_by` is `text`; format `Founder`/`human:`/`user:`/`ai:`/`service:`/`committee:`/`organization:`) · mandatory migration workflow (architecture → ADR → review → validation → apply → baseline refresh → doc refresh → release) · every change moves version + baseline + checksum + docs together.

## Phase status
Phase 0 ✅ · Phase 1 Genesis ✅ · Phase 2 validation ✅ · Phase 3 governance automation ✅ · Phase 4 handbook ✅ · Phase 5 `const_0001` → v1.1 ✅ · P3 runner ✅ · P4 ADR-008 Accepted ✅.

## Next
**ESL-005 (Monte Carlo) — unblocked, not yet resumed.** Architecture accepted, both design decisions resolved, 5A draft aligned. Resume 5A through the COS workflow (→ v1.2), sequenced after the unrelated FF-3 production-flip window (~2026-07-28). Future modules require EA doc → ADR → module doc → security model → validation strategy before any schema.

## Merged PRs (~8)
reverse-eng + ESL-005 draft (`2150678`) · Phase 0 (`8fa17cb`) · Phases 1–5 (`360d207`) · validation runner (`05baf89`) · Genesis dump + tool (`fa9ae47`) · v1.1 release (`c7d0b6d`) · v1.1 dump (`9d39c8e`) · ADR-008 accepted (`848fcab`).
