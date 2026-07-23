# Constitutional Operating System — STATUS

> Canonical, always-current status of the `constitution` subsystem. Point anyone here (or paste this) instead of re-deriving. Refresh this file on each constitutional release (migration workflow, step 7). **Last updated: 2026-07-24 · Constitution v1.1 · Phase II in progress. P1 security evidence Founder-approved; roadmap revised (Knowledge Graph P5.5, CM-001 added); Constitutional Intelligence Layer adopted. Phase II is NOT complete.**

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

## Phase II — CA-001 Constitutional Auditor (in progress)
- **Status:** CA-001 **ratified** — **Founder accepted and merged through commit `456d94e`; CA-001 is ratified and version-controlled on `main`.** Phase II is **not** complete.
- **Canonical mapping decision:** CA-001 is delivered **entirely by extension** of the existing `constitution` governance model — capability → `capabilities`, org (Constitutional Assurance) → `ai_organizations`, binding → `ai_organization_capabilities`, findings → `agent_review_gates.findings`, events → `agent_event_log`, artifact → `artifacts`/`artifact_versions`. **No new tables, no parallel registries.**
- **Independence controls:** the Auditor may inspect/report/recommend/request-remediation/block-where-policy-grants; it may **never** implement, deploy, merge, ratify, modify production, audit its own authored work, or self-grant authority. AI output alone is never ratification. Missing evidence → `Indeterminate`.
- **Files added:** `audit/CA-001_constitutional_auditor.md`, `audit/canonical_architecture_mapping_CA-001.md`, `audit/initial_audit_queue_2026-07-23.md`, `audit/audit_automation_design.md`. **Modified:** `adr/adr_log.md` (ADR-009), `STATUS.md`.
- **Audit automation:** designed, **not deployed** (extends `validation/run_checks.*` + CI; three tiers — deterministic / AI-assisted-advisory / human-only).
- **Initial security audit queue (evidence-backed, none remediated):** A) constitution/schema RLS deny-by-default — *Indeterminate* pending grant evidence; B) `pg_net` in `public` — *Compliant w/ observation* (documented deferral); C) `WITH CHECK(true)` INSERT on 5 public audit tables — *Compliant w/ observation* (ratified Fork H-a walls); D) leaked-password disabled — *Noncompliant/pending*.
- **Database changes applied:** **none.** DB registration of CA-001 capability/org rows is a future reviewed migration (repository-first).
- **CD-001:** remains **PROPOSED** (not ratified). **Next Founder decisions:** whether findings later warrant a dedicated `audit_findings` table; sequencing of the CA-001 registration migration.

## Phase II — P1 Security Findings Evidence (in progress)
- **Status:** evidence phase executed 2026-07-23. **Engineering evidence + remediation design only; no production DB/policy/auth/grant/function/Edge change.** Final dispositions **reserved for the independent Constitutional Auditor.**
- **Files:** `audit/P1_security_evidence_report_2026-07-23.md`, `audit/P1_remediation_roadmap_2026-07-23.md`, `validation/security_posture_checks.sql` (9 deterministic SEC-* checks, all **green** vs prod).
- **Findings (engineering assessment; Auditor reserves final):** A) constitution deny-by-default **provable at the grant layer** (anon/authenticated: 0 schema-USAGE, 0 grants, 0 EXECUTE; no app references) → compliant-with-observation (confirm exposed-schema list); B) `pg_net` in public → justified deferral (3 cron paths depend on `net.http_post`; do not relocate); C) 5 append-only walls **intact** (INSERT-only, no read/mutate policy or grant; operator-only SELECT) → compliant-with-observation; D) leaked-password **disabled** → **Noncompliant/pending** (enable via Auth dashboard; low exposure — password path minimal vs magic-link/SSO).
- **Founder actions:** enable leaked-password protection + confirm; confirm PostgREST exposed-schema list excludes `constitution`.
- **Founder ratifications (2026-07-24, `audit/P1_founder_ratifications_2026-07-24.md`):** P1 **approved architecturally** (constitutional process affirmed). (1) Leaked-password enablement **approved** (D). (2) Exposed-schema confirmation **approved** (closes A gap). (3) `pg_net` deferral **RATIFIED** — do not relocate; revisit only via a future supported path (would need an ADR); `sec9` scope-guard stands. Founder ratification authorizes the `[HUMAN]` actions and settles the pg_net operational decision; it does **not** replace the independent Auditor's final dispositions.

## Constitutional Intelligence Layer (doctrine ADOPTED 2026-07-24)
- **Directive (Founder):** do not accelerate features; strengthen foundations. Every intelligence model (Behavioral, Trust, Confidence, Negotiation, Decision, future) is a **governed constitutional capability sharing one evidence model, one traceability model, one review model.** No independent scoring systems or isolated frameworks. Recorded in `doctrines/constitutional_intelligence_layer.md`. This is the next strategic objective: build the shared Intelligence Layer so models don't evolve independently into disconnected modules.
- **Now also a first-class EA:** `EA-012` (below) formalizes the layer as ratifiable *architecture*; the doctrine remains the ratified *principle*.

## Separation of powers (stable)
Engineering **implements** · CA-001 **assures** · Founder **ratifies** · Repository is the **canonical source of truth**. This separation prevents governance from collapsing into engineering and is the platform's core architectural guarantee.

## Constitutional artifact lifecycle (standard ADOPTED 2026-07-24)
- Every artifact carries exactly one state: **Concept → Proposed → Architecture Draft → Founder Review → Ratified → Implemented → Operational → Superseded → Archived** (`standards/constitutional_artifact_lifecycle.md`). AI never self-advances past *Architecture Draft*; Founder-only transition to *Ratified*. `STATUS.md` is the canonical mirror of each artifact's state.
- **Current states:** CA-001 Operational · Intelligence-Layer doctrine + Lifecycle standard Ratified · **EA-012 Proposed · IMR-001 Proposed · TM-001 Proposed · CM-001 Proposed · CKG-001 (P5.5) Proposed · CD-001 Proposed** · ESL-005 Ratified-design/draft-not-applied.

## EA-012 — Constitutional Intelligence Layer (Proposed)
- **Status:** **Proposed** — Founder directed the layer become a first-class EA. Scope mandate recorded in `architecture/EA-012_constitutional_intelligence_layer.md` (defines: what a model is, registration, evidence consumption, assessment production, evaluation, audit, interoperation, versioning). **Architecture not begun.** Ratify EA-012 before TM-001 (P6) design so TM-001 is the first model to inherit the finished layer.

## IMR-001 — Intelligence Model Registry (Proposed)
- **Status:** **Proposed** — Founder directed introducing a registry of intelligence models (Behavioral, TM-001, CM-001, Negotiation, Decision, Pricing, Compliance, CA-001, future). Entry schema recorded in `roadmap/intelligence_model_registry_proposal.md` (canonical_id, owner, purpose, evidence_inputs, outputs, evaluation_suite, governing_ea, governing_doctrine, constitutional_constraints, maturity, current_version, superseded_by). Governed by EA-012; built alongside the Capability Registry (P5). Prevents informal model proliferation.

## Constitutional Recovery Kit (`constitution/recovery/`, ADOPTED 2026-07-24)
- Canonical kit for rebuilding/re-grounding the platform after tool migration or data loss. `recovery/RECOVERY.md` (runbook + Emergency Agent Prompt + canonical anchors + integrity-verification steps) and `recovery/repository_inventory_2026-07-24.md` (dated file snapshot). Repository stays the source of truth; refresh inventory each release. No secrets stored — references only.

## TM-001 — Enterprise Trust Model (PROPOSED, priority 6)
- **Status:** **PROPOSED** — Founder authorized design + canonical mapping; specification recorded in `roadmap/TM-001_enterprise_trust_model_proposal.md`. **Not designed/ratified;** architecture + mapping + schema are priority-6 work (after the Knowledge Graph). Determines permissible *reliance* (distinct from Behavioral Intelligence's *likely behavior*); multi-dimensional, evidence-classed, no universal score, no automated adverse decisions, no AI ratification. Now has the P5.5 Knowledge Graph as a relationship fabric to reference. First model to be reviewed by CA-001.

## CM-001 — Confidence Model (PROPOSED, after TM-001)
- **Status:** **PROPOSED** — Founder identified during TM-001 review as a missing model; **design to follow TM-001, not precede it.** Spec recorded in `roadmap/CM-001_confidence_model_proposal.md`. Measures **evidence completeness/quality, not the actor** — the third leg of Trust vs Confidence vs Risk. Reusable across tenant cases, AI outputs, OCR, document verification, simulations, legal recommendations, pricing, and TM-001 itself. **Not designed/ratified.**

## P5.5 — Constitutional Knowledge Graph (PROPOSED, priority 5.5)
- **Status:** **PROPOSED** — Founder placed at priority 5.5 (after Capability Registry, before TM-001): "relationships, not just artifacts." Spec in `roadmap/P5_5_constitutional_knowledge_graph_proposal.md`. Connects books, doctrines, ADRs, EA, capabilities, AI organizations, trust/decision/behavioral models, CA-001, Founder decisions. **Governed-relationships-first — no graph DB assumed initially;** begins inside the existing `constitution` structures. **Not designed/ratified.**

## Phase II priority order (revised 2026-07-24; prepared, not executed)
CA-001 ✅ · **P1 security evidence ✅ (Founder-approved, merged `339a0f8`)** → **P2 Canonical Architecture Mapping (constitutional inventory)** → **P3 Constitutional Knowledge Library (EA-010)** → **P4 metadata migration** → **P5 Capability Registry** → **P5.5 Constitutional Knowledge Graph** → **P6 TM-001 Trust Model** → *(CM-001 Confidence Model designed after TM-001)* → **P7 EA-011 provider governance** → **P8 CD-001 draft (PROPOSED only)** → **P9 ESL-005 (after FF-3 window + gates).**
- **Change from prior order:** P2 split — Canonical Architecture Mapping is now its own step (the constitutional inventory) ahead of the Knowledge Library (EA-010). Knowledge Graph inserted at P5.5. CM-001 added after TM-001. **Order confirmed by Founder 2026-07-24 — keep it.**
- **Founder hold (2026-07-24):** do **not** add intelligence models beyond TM-001 and CM-001 until P2–P5.5 (Canonical Architecture Mapping, CKL, metadata, Capability Registry, Knowledge Graph) are complete. That shared foundation must exist first so every later model inherits it. EA-012 is elevated during P2–P5.5 and ratified before P6.

## Merged PRs (~9)
reverse-eng + ESL-005 draft (`2150678`) · Phase 0 (`8fa17cb`) · Phases 1–5 (`360d207`) · validation runner (`05baf89`) · Genesis dump + tool (`fa9ae47`) · v1.1 release (`c7d0b6d`) · v1.1 dump (`9d39c8e`) · ADR-008 accepted (`848fcab`).
