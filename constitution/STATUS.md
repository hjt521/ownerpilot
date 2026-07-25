---
constitutional_id: SYS-001
object_type: dashboard
title: Constitutional Operating System STATUS
status: Operational
canonical_owner: Governance
governing_authority: CON-001
ratification_authority: n/a
lifecycle_state: Operational
created: 2026-07-22
updated: 2026-07-25
depends_on: [MAP-001]
required_by: [REC-001]
implements: []
governed_by: [CON-001]
validated_by: [CBS-001]
supersedes: []
superseded_by: []
related_artifacts: [CIX-001]
registry_tags: [status, dashboard]
program_phase: operational
repository_path: constitution/STATUS.md
checksum_scope: file
---

# Constitutional Operating System — STATUS

> Canonical, always-current status of the `constitution` subsystem. Point anyone here (or paste this) instead of re-deriving. Refresh this file on each constitutional release (migration workflow, step 7). **Last updated: 2026-07-25 · Constitution v1.1 · Phase II in progress. BTRM-001 ratified (ADR-013), Stage 0 shipped; RP research-proposal family adopted (ADR-014); DOC-003 AI Operating Charter adopted (PR #277, merged), extended with §15 addendum on assistant implementation-authority posture; RP-005/RPT-012 and RP-006/RPT-013 captured (research, non-constitutional — see below). Phase II is NOT complete.**

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
- **Finding D CLEARED (2026-07-24):** leaked-password protection **ENABLED + VERIFIED** — Founder toggled it ON; post-change advisor scan confirms the `auth_leaked_password_protection` lint is gone (full-diff: no other change, no new finding). D → remediated, evidence supports Compliant (Auditor issues final).
- **Finding A gap CLOSED (2026-07-24):** Founder visually confirmed Data API → Exposed schemas = "2 of 3" (`public`, `graphql_public` only; **`constitution` unchecked/not exposed**). Both P1 `[HUMAN]` actions now complete. A → evidence gap closed (Auditor reserves final).
- **New adjacent observation (public-schema, out of P1 scope):** Data API "Automatically expose new tables" is **ON** — Supabase recommends OFF; does not affect `constitution` (unexposed), but auto-exposes new `public` tables. Logged for the Auditor's public-surface queue; Founder `[HUMAN]` decision to disable.

## Constitutional Intelligence Layer (doctrine ADOPTED 2026-07-24)
- **Directive (Founder):** do not accelerate features; strengthen foundations. Every intelligence model (Behavioral, Trust, Confidence, Negotiation, Decision, future) is a **governed constitutional capability sharing one evidence model, one traceability model, one review model.** No independent scoring systems or isolated frameworks. Recorded in `doctrines/constitutional_intelligence_layer.md`. This is the next strategic objective: build the shared Intelligence Layer so models don't evolve independently into disconnected modules.
- **Now also a first-class EA:** `EA-012` (below) formalizes the layer as ratifiable *architecture*; the doctrine remains the ratified *principle*.

## Separation of powers (stable)
Engineering **implements** · CA-001 **assures** · Founder **ratifies** · Repository is the **canonical source of truth**. This separation prevents governance from collapsing into engineering and is the platform's core architectural guarantee.

## Meta-governance layer (governance of governance)
The platform now governs how its own governance evolves. Components: **Artifact Lifecycle** standard (how artifacts evolve) · **EA-000 Meta-Architecture** (how artifacts relate — Proposed) · **EA-012 Intelligence Layer** (how models are designed — Proposed) · **IMR-001** (how models are registered — Proposed) · **CIX-001 Constitutional Index** (machine-readable ID inventory — Proposed) · **Recovery Kit + Recovery Bundle** (continuity) · **STATUS.md** (operational dashboard tying them together).

## EA-000 — Constitutional Meta-Architecture (Proposed)
- **Status:** **Proposed** — Founder directed introducing the map of the Constitution (artifact taxonomy, creation order, reference rules, normative-vs-descriptive classification, ratification requirements, dependency graph). Scope in `architecture/EA-000_constitutional_meta_architecture.md`. Frames every other artifact; recommended for early ratification, evidence base is P2. **Not designed.**

## CIX-001 — Constitutional Index (Proposed)
- **Status:** **Proposed** — Founder directed a machine-readable inventory keyed on canonical IDs (`constitution/index/*.json`: artifact/capability/ea/adr/doctrine/registry). Generated from artifact front-matter, validation-wired, serializes EA-000's dependency graph. Spec in `roadmap/constitutional_index_proposal.md`. **Not built.**

## CK-001 — Constitutional Query Engine (Proposed, after P5.5)
- **Status:** **Proposed** — Founder's recommended foundational capability to introduce **after P5.5**, ahead of more domain intelligence. Query layer over Library + Graph + Registry + Index ("which ADR governs X", "what depends on EA-012", "what changed v1.1→v1.2"). Read/navigate/explain only — never ratifies or mutates. Spec in `roadmap/CK-001_constitutional_query_engine_proposal.md`. **Not designed.**

## Recovery Bundle (per-release, ADOPTED direction 2026-07-24)
- Every release SHALL emit a self-restoring ZIP (repo subtree + STATUS + inventory + checksums + RECOVERY.md + Emergency Agent Prompt + release notes + version manifest). Recorded in `recovery/RECOVERY.md`; becomes a migration-workflow release step. Automation not yet built.

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

## Constitutional Foundation COMPLETE + closed (Founder, 2026-07-24 · ADR-010, ADR-011)
The Constitutional Operating System is the **permanent governance substrate**. Founder ratifications: **EA-000** (meta-architecture — the governing architecture), **MAP-001** (backbone), **EA-010** (Knowledge Library, generated view). The **Constitutional Foundation set is complete and closed:** **EA-000 · MAP-001 · STD-003 · CBS-001 · EA-010**. Per the **Constitutional Stability Principle** (STD-004), a material change to any Foundation Artifact requires **all** of: a new EA version · an ADR · Founder ratification · constitutional validation (CBS-001 + CA-001) · preserved backward traceability. Routine work **extends**, never redesigns. Emphasis now shifts from inventing constitutional mechanisms to **using the COS** to build OwnerPilot capabilities.

## P5 — Capability Registry (DELIVERED, Architecture Draft, awaiting Founder ratification)
**REG-CAP-001** (`architecture/REG-CAP-001_capability_registry.md`) — the canonical **semantic center** connecting Enterprise Architecture → Knowledge Library → Knowledge Graph → Intelligence Models → AI Organizations → Runtime → OwnerPilot products. Each capability is a governed object (14 fields: permanent capability ID, name, purpose, owner, lifecycle, dependencies, implementing artifacts, governing EA, governing ADRs, validation authority, security classification, operational maturity, related capabilities, runtime bindings). **Extends the live `constitution.capabilities` table** (audit-and-extend, no parallel registry); repository catalog + generated `index/capability_index.json` (CA-001, CK-001 registered) is source-of-truth; DB-row registration is a future reviewed migration (none applied). Honors the model hold (infrastructure, not a new intelligence model). Awaiting Founder ratification.

## Product Build Program — Constitution governs, product delivers (2026-07-24 · ADR-012)
**REG-CAP-001 and EA-100 RATIFIED.** OwnerPilot Product Build Program authorized: turn modeled ECAPs into production capabilities governed by the Constitution. Delivery lifecycle codified in **PROC-100** (10 stages, no skips). **Grounding fact:** Wave-1 capabilities are **already implemented** in the app — ECAP-001 (`app/chat`, `lib/chat`…), ECAP-002 (`app/notice`, `lib/documents`, `lib/produce`…), ECAP-003 (`lib/tracking.ts`, `lib/filing`…), ECAP-010 (`lib/audit`, `lib/monitoring`) — now linked via `implementing_artifacts` metadata. Delivery = governance linkage + real gap-closure, **not** greenfield or doc-generation (RPT-006 Wave-1 tracker). Founder chose **real code on gaps**, ECAP-001 first. Intelligence hold continues (TM-001/CM-001/EA-012/IMR-001/CK-001 deferred).
- **ECAP-001 AI Assistant — DELIVERED through PROC-100 (RPT-007):** runtime monitoring shipped across all 5 chat error exits (PRs #265, #266); Stage-6 security review evidence-based against prod (`chat_sessions` RLS owner-scoped `auth.uid()=user_id`, anon denied, service-role writes — PASS; one deferred least-privilege grant observation); Stages 8/9/10 complete; `delivery_stage: released`. First Wave-1 stream complete.
- **ECAP-010 Evidence Management — DELIVERED through PROC-100 (RPT-008):** 5 append-only walls re-verified live (RLS + INSERT-only, no read/mutate policy or grant — intact); tested; validated; released. **No code change** (already at target). Deferred ops item: confirm audit `AlertSink` delivery reaches monitoring.
- **ECAP-002 Document Generation — DELIVERED through PROC-100 (RPT-009):** IP guards verified GREEN and CI-wired — locked-prose integrity (SHA-256 manifest, drift-failing), broker-only attribution (no attorney/SBN), banned-terms — validated; released. **No code change** (constitutional stakes already enforced by CI). Deferred: produce-path monitoring (post-flip).
- **ECAP-003 Serve & Track — DELIVERED through PROC-100 (RPT-010):** `riskpath_records` + `lahd_filing_records` RLS owner-scoped (`auth.uid()=user_id`, verified live), claimed-only route, tested, released. **No code change.** **Wave 1 COMPLETE:** ECAP-001 ✅ · ECAP-002 ✅ · ECAP-003 ✅ · ECAP-010 ✅. Recurring deferred ops item (3 of 4): least-privilege grant tightening + disable Data API auto-expose (RLS covers).

## Enterprise Build Program — Constitution as platform (2026-07-24)
The pivot is delivered: **the Constitution is now the platform OwnerPilot is built on.** EA-100 OwnerPilot Enterprise Architecture (Architecture Draft) governs **12 modeled capabilities** (ECAP-001…012 — AI Assistant, Document Generation, Serve & Track, RiskPath, Property Intelligence, Pricing Intelligence, Compliance Guidance, Workflow Automation, Communication, Evidence Management, Reporting, Customer Portal) as governed metadata objects — **modeling, not business logic**. **REG-CAP-001** is the semantic backbone: **21 capabilities registered** (8 constitutional + 12 enterprise + CK-001) via metadata, **extending the live `constitution.capabilities` table** (no parallel registry). CBS-001 now generates `capability_index.json` + `foundation_manifest.json`; MAP-001 snapshot doc-refreshed; readiness packages prepared (RPT-002 intelligence substrate — no models; RPT-003 auditor evidence — no disposition); reports RPT-004 (foundation completion) + RPT-005 (enterprise readiness). Holds honored: no new intelligence models, no business-logic/schema/runtime change, no AI self-ratification. **Awaiting Founder ratification:** REG-CAP-001, EA-100 (ECAPs are Concept models).

## Constitutional cadence (post-P5)
After P5, constitutional development **slows to a deliberate cadence** — new constitutional work only when justified by clear architectural need. Remaining sequence is mostly application work on top of the COS: P5.5 Knowledge Graph → EA-012 → IMR-001 → TM-001 → CM-001 → CK-001 → OwnerPilot Intelligence Applications. Primary focus shifts to applying the governance framework to the OwnerPilot platform.

## Metadata foundation — CBS-001 generated (P2.1 → P3 → P4)
The COS is now **metadata-driven**: every durable artifact is self-describing (STD-003 front-matter + permanent CRID), and **CBS-001** (`tools/cbs.mjs`) compiles that metadata into all derived artifacts — no hand-synchronization. `node constitution/tools/cbs.mjs build` regenerates `constitution/index/*` reproducibly; `check` fails CI on metadata drift (dup CRID, broken reference, dependency cycle, missing metadata). Delivered: STD-003 metadata schema · P2.1 front-matter retrofit + CRIDs across ~20 artifacts · **CBS-001** build system · **EA-010** Knowledge Library (generated view) · **CIX-001** generated indexes (13 files, 31 nodes / 76 edges) · implementation report (RPT-001). No production/schema/runtime change; no AI ratification.

<!-- CBS-001 GENERATED STATS (regenerate: node constitution/tools/cbs.mjs status) -->
- **Artifacts (with metadata):** 69 · **ADRs:** 14
- **By lifecycle:** Concept 18 · Implemented 3 · Operational 26 · Proposed 7 · Ratified 15
- **Outstanding Proposed:** CIX-001, CK-001, CKG-001, CM-001, EA-012, IMR-001, TM-001
- **Ratification queue (Proposed/Architecture Draft):** CIX-001, CK-001, CKG-001, CM-001, EA-012, IMR-001, TM-001

## Layer model (Founder-articulated 2026-07-24)
- **L0 Meta-Governance:** EA-000, STD-002 lifecycle, Recovery Kit+Bundle, CIX-001, MAP-001.
- **L1 Governance:** CON-001 Constitution, doctrines, EA-*, ADR-*, standards, migration workflow, CA-001.
- **L2 Infrastructure:** MAP-001, Knowledge Library (EA-010), metadata, Capability Registry, Knowledge Graph (CKG-001).
- **L3 Intelligence:** EA-012, IMR-001, TM-001, CM-001, future models.
- **L4 Runtime:** CK-001, future AI organizations / operational capabilities.

## Phase II P2 — Canonical Architecture Mapping (IN PROGRESS, Architecture Draft)
- **Status:** authorized + built 2026-07-24 (`architecture/canonical_architecture_mapping.md`, CRID **MAP-001**). Elevated from "inventory" to the **canonical map of the COS** and the **evidence base for EA-000**. **Lifecycle: Architecture Draft — awaiting Founder review.** No schema/DB/code change.
- **Delivers:** CRID scheme (§1) + full CRID registry of all current artifacts (§2); canonical ownership matrix + registry ownership (§3); the **Constitutional Dependency Rule** instantiated for every artifact — Depends On / Required By / Supersedes / Superseded By / Implements / Governed By / Validated By (§4); reference, creation-order, duplicate-detection, ratification-path, and cross-reference-validation rules (§5); the foundation hand-off to CIX-001, EA-010/CKL, metadata (P4), CKG-001, IMR-001 (§6).
- **CRID (permanent identifier):** not the filename — files/paths may move, the CRID never changes or is reused. Coined IDs (CA-001, EA-000, TM-001, …) and family-sequential IDs both valid. Drafted here, promoted to normative on **EA-000** ratification.
- **On ratification:** §1 CRID + §4 Dependency Rule fold into EA-000 as normative (already added to EA-000's required scope); the per-artifact front-matter retrofit (CRID + 7 relations on every file) is the mechanical follow-up **P2.1** feeding CIX-001 generation.
- **Sequencing:** Independent Auditor disposition on the 4 P1 findings is **deferred to after P2** (Founder decision, 2026-07-24) — evidence already preserved; the Auditor then evaluates against the complete map. One work item (P2) now feeds EA-000, CIX-001, CKL, metadata, CKG-001, IMR-001 instead of each re-discovering the same relationships.

## Phase II priority order (revised 2026-07-24; prepared, not executed)
CA-001 ✅ · **P1 security evidence ✅ (Founder-approved, merged `339a0f8`)** → **P2 Canonical Architecture Mapping (constitutional inventory)** → **P3 Constitutional Knowledge Library (EA-010)** → **P4 metadata migration** → **P5 Capability Registry** → **P5.5 Constitutional Knowledge Graph** → **P6 TM-001 Trust Model** → *(CM-001 Confidence Model designed after TM-001)* → **P7 EA-011 provider governance** → **P8 CD-001 draft (PROPOSED only)** → **P9 ESL-005 (after FF-3 window + gates).**
- **Change from prior order:** P2 split — Canonical Architecture Mapping is now its own step (the constitutional inventory) ahead of the Knowledge Library (EA-010). Knowledge Graph inserted at P5.5. CM-001 added after TM-001. **Order confirmed by Founder 2026-07-24 — keep it.**
- **Founder hold (2026-07-24):** do **not** add intelligence models beyond TM-001 and CM-001 until P2–P5.5 (Canonical Architecture Mapping, CKL, metadata, Capability Registry, Knowledge Graph) are complete. That shared foundation must exist first so every later model inherits it. EA-012 is elevated during P2–P5.5 and ratified before P6.

## Merged PRs (~9)
reverse-eng + ESL-005 draft (`2150678`) · Phase 0 (`8fa17cb`) · Phases 1–5 (`360d207`) · validation runner (`05baf89`) · Genesis dump + tool (`fa9ae47`) · v1.1 release (`c7d0b6d`) · v1.1 dump (`9d39c8e`) · ADR-008 accepted (`848fcab`).

## BTRM-001 — Behavioral Trust and Resolution Model (RATIFIED 2026-07-25 · ADR-013)
- **Status:** **Ratified.** Authored to Architecture Draft with a Phase-3 self-critique and an independent architecture-review-board challenge (the board recommended a reduced first increment — ENR-001 + minimal BAE-001 + safeguards — rather than all eight components). The Founder considered this and directed the **full eight-component build** instead, given twice ("build all eight components").
- **ADR-013** ratifies BTRM-001 and **lifts the ADR-012 intelligence hold, scoped only to the BTRM-001 component set** (ENR-001, BAE-001, TM-001, CM-001, ICOA-001, RIE-001, OCM-001, CS-001, POL-001). The hold remains in force for everything else (CIX-001, CKG-001, CK-001, IMR-001).
- **TM-001 and CM-001 are reused, not redesigned** — their existing Proposed specs are implemented inside BTRM-001; this does not itself ratify them as standalone artifacts.
- **Stage 0 shipped** (foundation every later stage depends on): `lib/btrm/flag.ts` (default-off kill switch + per-stage flags), `lib/btrm/types.ts` (the full §4 data model), `lib/btrm/envelope.ts` (mandatory explainability envelope — no black-box outputs), `lib/btrm/safeguards/` (no-personality-labeling / no-protected-characteristic / human-review-gate runtime guards — the CI safeguards the review board conditioned approval on), `supabase/migrations/057_btrm_enr_evidence_schema.sql` (3 new owner-scoped-RLS tables, staged not applied). 24 tests passing; full-repo `tsc --noEmit` clean. All additive, dark by default (`BTRM_ENABLED` off everywhere).
- **Build order:** Stage 0 ✅ → ENR-001 → BAE-001 → TM-001/CM-001 wiring → ICOA-001 → RIE-001 → OCM-001/CS-001 → POL-001, each its own reviewable PR. **No runtime path may reach an adverse action (eviction, denial, escalation, financial penalty) without `human_review_required`.**
- Reconciliation memo: **RPT-011** (dedup against TM-001/CM-001, BAE-001 concretizes the reserved `MODEL-BEH` slot). Full spec: `constitution/enterprise/BTRM-001_behavioral_trust_and_resolution_model.md`.

## RP — Research Proposal family (ADOPTED 2026-07-25 · ADR-014)
- **Status:** **Adopted.** A new idea (informally "DCM-001," Decision Calibration) was proposed for direct creation in Google Drive during knowledge-library sync planning. Engineering flagged that this both inverted the GitHub-is-source-of-truth hierarchy and skipped reconciliation against likely-overlapping artifacts (TM-001, CM-001, BTRM-001's own RIE-001/OCM-001). The Founder agreed and directed a standing fix instead of a one-off exception.
- **Decision:** introduced the `RP-` CRID family — **explicitly non-constitutional.** An RP is never `depends_on`-able by a constitutional artifact and never self-advances. It graduates only through the same pipeline BTRM-001 already used: **Research Proposal → Reconciliation memo → Architecture Draft → self-critique → independent review-board challenge → ADR → Founder ratification.**
- **Captured:** **RP-001** Decision Intelligence, **RP-002** Decision Calibration ("DCM," not yet a real CRID), **RP-003** Portfolio Memory, **RP-004** Negotiation Intelligence — all `lifecycle_state: Concept`, each with an explicit overlap-check note that must be resolved before any real CRID is assigned. Files: `constitution/research/RP-001…004_*.md`.
- **Google Drive posture reaffirmed:** Drive is a generated, downstream mirror of this repository. No constitutional artifact — RP or otherwise — originates in Drive.

## RP-005 — OwnerPilot Adaptive Decision Intelligence (CAPTURED 2026-07-25)
- **Status:** `Concept`, non-constitutional, per ADR-014 — same pipeline and same rules as RP-001…004. Larger in scope: a multi-engine "Adaptive Reasoning Engine" plus several named doctrines (Winning Strategy, Strategic Courage, Comfort Gap, Decision Context Model), submitted as a single capture rather than split across several RPs.
- **Architecture Impact Assessment: RPT-012.** Most proposed engines map onto BTRM-001's existing pipeline (Facts Engine ≈ ENR-001, Negotiation Engine ≈ RIE-001 + RP-004, Strategic Communication Engine ≈ CS-001, Owner Context Engine ≈ POL-001 + RP-003). **One direct conflict flagged and unresolved:** the proposed Outcome Projection Engine's numeric probabilities conflict with BTRM-001 §3.7/§15's ratified prohibition on fabricated probabilities (OCM-001 is qualitative-only). Not waived; must be resolved in any future Architecture Draft.
- **Not ratified, not reconciled, no new CRID assigned** to any named sub-engine. The Founder's separate note on long-term product positioning (beyond landlord services) is recorded as a business-vision reflection, distinct from this RP's technical scope — see Master Constitutional Index, Founder's Vision.

## RP-006 — OwnerPilot Executive Decision Intelligence Platform, Founder's Directive (CAPTURED 2026-07-25)
- **Status:** `Concept`, non-constitutional, per ADR-014. Extends RP-005 (same day) rather than replacing it — restates most of RP-005's content and adds new constructs: Recommendation Object schema, Decision Graph, OPOS ("OwnerPilot Operating System"), OPIL ("OwnerPilot Intelligence Layer"), Recommendation Quality Score (RQS), DIRP, EDIC (a proposed corpus of business-decision scenarios), and a Nine Foundational Questions checklist.
- **Architecture Impact Assessment: RPT-013** (addendum to RPT-012, new elements only). Flags: **RQS reproduces RPT-012 §2's unresolved OCM-001 conflict under a new name** (numeric confidence scoring vs. BTRM-001's ratified qualitative-only mandate) — not resolved by restating it; **OPOS/OPIL risk a naming collision with the already-Proposed EA-012** (Constitutional Intelligence Layer) — recommend reconciling to one artifact, not three names for one layer; **EDIC raises an unaddressed data-sourcing/privacy/IP question** if built from real client matters rather than synthetic scenarios — needs an explicit answer before any corpus work.
- **Not ratified, not reconciled, no new CRID assigned.** The Directive's separate framing of the assistant's own role (implementation-authority posture, priority ordering, the "five years from now" test) is recorded as **DOC-003 §15** (Founder-issued addendum, same status pattern as DOC-003 §14) rather than folded into this RP — it is a standing instruction to the assistant, not a product-architecture claim. §15 is explicit that it does not authorize bypassing the RP pipeline or overriding any ratified artifact, and that the Directive's "supersedes previous implementation assumptions" clause is scoped to default engineering posture, not to BTRM-001/OCM-001 or any other ratified constitutional content.

<!-- CBS-001 GENERATED STATS refreshed after BTRM-001/RP/RP-005/RP-006 work — see the block above (~line 164) for the auto-generated count; this section is the hand-authored narrative for 2026-07-25. -->
## Next
BTRM-001 Stage 1 (ENR-001) implementation. Independently, if the Founder wants to pursue RP-002, RP-005, or RP-006, the next step for any of them is a reconciliation memo against the overlapping artifacts identified above — not a new CRID. RP-005/RP-006 additionally need the RQS/Outcome-Projection-Engine probability conflict with OCM-001 (RPT-012 §2, RPT-013 §1) resolved before any Architecture Draft, and RP-006 needs the OPOS/OPIL-vs-EA-012 naming collision and EDIC's data-sourcing question resolved before any Architecture Draft.
