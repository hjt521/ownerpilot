---
constitutional_id: ADR-LOG
object_type: adr_log
title: Architecture Decision Records
status: Operational
canonical_owner: Governance
governing_authority: CON-001
ratification_authority: Founder
lifecycle_state: Operational
created: 2026-07-24
updated: 2026-07-24
depends_on: [CON-001, PROC-001]
required_by: []
implements: [CON-001]
governed_by: [CON-001]
validated_by: [CA-001]
supersedes: []
superseded_by: []
related_artifacts: []
registry_tags: [adr]
program_phase: foundation
repository_path: constitution/adr/adr_log.md
checksum_scope: file
---

# Constitution — Architecture Decision Records

Append-only log. Each ADR: **Context** (why the decision exists), **Decision**, **Consequences**, **Revisit trigger** (what would justify changing it). Superseded ADRs are marked, never deleted.

---

## ADR-001 — A dedicated `constitution` schema

**Status:** Accepted (retroactively documented). **Context:** The Enterprise Constitutional AI layer is a distinct product from the OwnerPilot notice platform (`public`), with its own lifecycle, security posture, and 59-table surface. **Decision:** Keep it in a separate Postgres schema (`constitution`) in the same Supabase project, isolated from `public`. **Consequences:** clean namespace + independent RLS posture; but it shares the production instance (blast-radius awareness needed) and needs its own drift/validation tooling (the `public` tooling is schema-scoped). **Revisit if:** the layer needs independent scaling/failure isolation → promote to its own database/project.

## ADR-002 — Database-first origins → repository-first going forward

**Status:** Accepted. **Context:** `constitution` evolved directly in production with no source control; `public` is fully repo-driven. Database-first is invisible to review, drift checks, and Advisors. **Decision:** Freeze the database-first era with a documented baseline (Phase B) and require every future change to flow through the repository-first workflow (Phase F). Production remains source of truth *only until* the baseline is exported and adopted. **Consequences:** one-time reverse-engineering + baseline cost; afterward, full reviewability. **Revisit if:** never — repository-first is the target end state.

## ADR-003 — Security model: deny-by-default, operator-plane access

**Status:** Accepted. **Context:** constitutional data (strategy, decisions, governance) is sensitive and not owner-facing. **Decision:** RLS enabled on all tables, **no permissive policies** (deny-by-default); access is `service_role`/owner only; the schema is not PostgREST-exposed. **Consequences:** anon/authenticated cannot reach it even if the schema were exposed; all access flows through server/operator context. **Revisit if:** a genuine end-user read surface is introduced → add *scoped* policies via ADR, never `USING (true)`.

## ADR-004 — RLS strategy: enable + no policy (not permissive policies)

**Status:** Accepted. **Context:** two ways to lock a table — RLS-with-restrictive-policies or RLS-enabled-with-no-policy. **Decision:** RLS enabled, **zero policies** = implicit deny-all, matching all 59 tables (and the same fail-closed posture the `public` audit/cron tables use). **Consequences:** simplest correct lockdown; Supabase Advisors reports these as `rls_enabled_no_policy` INFO (expected, not a defect). **Revisit if:** a table needs row-scoped access → add a specific policy, documented, never a blanket true.

## ADR-005 — SECURITY DEFINER functions with pinned search_path

**Status:** Accepted. **Context:** business logic (scenario generation, scoring, champion selection, recommendation build, discovery) must run with elevated, deterministic privileges regardless of caller. **Decision:** those functions are `SECURITY DEFINER`, `plpgsql`, **always** `SET search_path TO 'constitution','public'` (+`pg_catalog` where needed), with row locks / advisory locks for concurrency. Current allow-list: `build_decision_recommendation`, `generate_scenario_set`, `run_supabase_discovery`, `score_strategy_candidate`, `select_strategy_champion`. **Consequences:** safe elevation without search-path hijack; every new SECURITY DEFINER function must be added to this allow-list + reviewed (validation check #4). **Revisit if:** a function no longer needs elevation → downgrade to INVOKER.

## ADR-006 — Enterprise Simulation architecture (ESL-002/003/004)

**Status:** Accepted. **Context:** strategy decisions must be evidence-backed against generated scenarios and simulated actors. **Decision:** a pipeline — scenario generation (seeded, deterministic) → actor/behavioral/negotiation state → strategy candidates evaluated per-scenario with metric/constraint/robustness/fairness/compliance results → champion selection under hard constraints. Seeds (`seed bigint`) make runs reproducible. **Consequences:** reproducible, auditable strategy evaluation; ESL-005 Monte Carlo extends the seed concept to `master_seed` for trial-level replay. **Revisit if:** evaluation moves to an external engine → persistence layer stays, execution moves out.

## ADR-007 — Decision Intelligence pipeline with founder-in-the-loop approval

**Status:** Accepted. **Context:** simulation output must become a governed, explainable, approvable recommendation — not an autonomous action. **Decision:** requests → option/sensitivity/explainability findings → `decision_recommendations` (`recommendation_status` draft→ready, `confidence`+`confidence_band`) → approval (`approval_status` pending→approved/rejected, `approved_by`, `approved_at`), with `founder_approval_required` as a first-class column on experiment-class tables. **Consequences:** no recommendation self-executes; the human gate is in the data model, not just the app. **Revisit if:** a class of low-risk decisions is authorized for auto-approval → encode as an explicit policy/ADR, keep the audit trail.

## ADR-008 — Monte Carlo architecture (ESL-005)

**Status:** **Accepted** (2026-07-22, broker ruling; promoted from Proposed after Phase 0 approval). **Context:** strategy evaluation needs large-N stochastic simulation with deterministic replay and convergence control. **Decision:** a persistence-first build — Phase 5A `monte_carlo_experiments` (config + lifecycle, `master_seed`, trial bounds, convergence/confidence targets, founder approval) attached to `strategy_evolution_experiments`; Phase 5B `monte_carlo_batches` (per-batch seeds derived from `master_seed`, results); worker/orchestration are later phases, out of the persistence scope. No enums (text+CHECK), RLS deny-by-default, matching ESL conventions.

**Two design decisions resolved (broker ruling 2026-07-22):**
1. **`approved_by` is `text`, not `uuid`.** Governance records identify *constitutional actors* (Founder, Steward, Executive Council, an AI organization/employee, a review board, a broker, a future external governance system), not necessarily a row in one table. A `uuid` FK would force every approval authority into a single identity table and couple the constitution to it. `text` keeps governance identities *logical*, loosely coupled, and future-proof. Formalized as a standard — see `standards/development_standards.md` §Governance identities (canonical format: `Founder`, `Broker`, `human:<name>`, `user:<uuid>`, `ai:<agent>`, `service:<svc>`, `committee:<name>`, `organization:<name>`). Principle: **governance identities are logical identities, not database identities; identity resolution belongs in the application layer, not the constitutional schema.**
2. **`updated_at` trigger — kept.** `monte_carlo_experiments` attaches `set_updated_at()`, consistent with the development standard (an `updated_at` column must have a maintaining trigger) and with `const_0001`, which closed that exact gap across the schema.

**Consequences:** reproducible, auditable simulations that plug into the existing ESL-004 → ESL-006 pipeline; ESL-005 introduces no new convention. **Revisit before build:** none outstanding — cleared the Phase 0 gate; both open decisions resolved above. ESL-005 5A resumes via the COS workflow (roadmap resume gate). **Supersedes:** nothing. **Superseded by:** — .

## ADR-009 — CA-001 Constitutional Auditor (independent assurance)

**Status:** **Accepted** (2026-07-23, Founder authorization via the Constitutional Recovery Package, Appendix A/D). **Context:** the platform needs an assurance function that evaluates repository changes, migrations, architecture, AI actions, releases, and runtime evidence for constitutional compliance — **independent of the Engineering organization that produces the work**. Without it, the implementer effectively self-approves. **Decision:** create **CA-001 Constitutional Auditor**, a ratified `constitutional_capability` owned by a new **Constitutional Assurance** organization, delivered **entirely by extending the existing `constitution` governance model** (see `audit/canonical_architecture_mapping_CA-001.md`): capability → `constitution.capabilities`, org → `constitution.ai_organizations`, binding → `ai_organization_capabilities`, findings → `agent_review_gates.findings`, events → `agent_event_log`, artifact registration → `artifacts`/`artifact_versions`. **No new tables, no parallel registries.** The Auditor may inspect, report, recommend, request remediation, and block only where an approved policy grants it; it may **never** implement, deploy, merge, ratify, modify production, audit its own authored work, or grant itself authority. **Consequences:** enforces separation of duties (implementer ≠ auditor) and the rule that **AI output alone is never ratification** — only human governance actors ratify. Evidence-vs-inference discipline is mandatory; missing evidence yields `Indeterminate`, never `Compliant`. **DB registration of the capability/org rows is a future reviewed migration — none applied by the CA-001 task (repository-first).** **Revisit if:** audit volume outgrows `agent_review_gates.findings` jsonb → consider a dedicated `constitution.audit_findings` table via a new ADR + migration. **Supersedes:** nothing. **Superseded by:** — .

## ADR-010 — Constitutional Stability Principle + ratification of MAP-001 and EA-010

**Status:** **Accepted** (2026-07-24, Founder ruling). **Context:** the Constitutional Operating System has shifted from document-centric to metadata-centric and reached architectural maturity; MAP-001 (canonical mapping) and EA-010 (generated Knowledge Library) are functioning as the backbone and must stop being moving targets so the enterprise can be built on top of them. **Decision:** (1) **Ratify MAP-001** (Architecture Draft → Ratified) — the constitutional backbone everything references. (2) **Ratify EA-010** (Architecture Draft → Ratified) — the Knowledge Library as a *generated* view, avoiding a second source of truth. (3) Adopt the **Constitutional Stability Principle** (`standards/constitutional_stability_principle.md`, STD-004): a ratified foundational artifact (Meta-Architecture, Mapping, Metadata Schema, Build System, Knowledge Library) shall not be materially redesigned except through a new EA version + corresponding ADR; subsequent work extends, not replaces. (4) Declare the foundation set **closed**: MAP-001, EA-010, STD-003, CBS-001 (EA-000 upon its own ratification). **Consequences:** the COS becomes the permanent governance substrate; new capabilities plug in via the Capability Registry rather than modifying the foundation; CA-001 treats material redesign of a closed foundation without a new EA version + ADR as a finding. Emphasis shifts from inventing constitutional mechanisms to using the COS to build OwnerPilot capabilities. **Note:** EA-000 remains *Proposed* (scope mandate; its CRID + Dependency rules are already normative via MAP-001) — Founder to decide whether to ratify EA-000 as the design frame or leave it open. **Revisit if:** a foundational redesign is genuinely required → new EA version + ADR (the principle's own escape hatch). **Supersedes:** nothing. **Superseded by:** — .

## ADR-011 — Ratify EA-000 and close the Constitutional Foundation set

**Status:** **Accepted** (2026-07-24, Founder ruling). **Context:** EA-000 progressed beyond a proposal in practice — MAP-001, STD-003, CBS-001, EA-010, and the Constitutional Index demonstrate the platform already operates according to the proposed meta-architecture. Ratifying EA-000 recognizes the architecture that already exists. **Decision:** (1) **Ratify EA-000** (Proposed → Ratified) as the governing architecture for: constitutional artifact taxonomy, CRIDs, the Constitutional Dependency Rule, artifact lifecycle governance, constitutional metadata architecture, the generated-artifact model, Constitutional Build System governance, Knowledge Library architecture, Constitutional Index architecture, constitutional layering, and repository-first governance. Future artifacts extend EA-000, not redefine it. (2) Declare the **Constitutional Foundation set** complete and closed: **EA-000, MAP-001, STD-003, CBS-001, EA-010** — the permanent architectural substrate. (3) A **material change to any Foundation Artifact** requires: a new Enterprise Architecture version; an ADR documenting rationale; Founder ratification; constitutional validation (CBS-001 + CA-001); and preservation of backward traceability. Routine work extends, not redesigns (STD-004 updated accordingly). **Consequences:** the COS is now the permanent governance substrate; constitutional development slows to a deliberate cadence after P5; emphasis shifts to building OwnerPilot capabilities on top of the COS. **Supersedes:** nothing (extends ADR-010). **Superseded by:** — .
