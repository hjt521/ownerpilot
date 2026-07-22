# Phase C — Constitution Module Architecture

Documents each constitutional subsystem. Module boundaries are **inferred from naming and function dependencies** (the database does not label them); groupings are engineering's best reconstruction and should be confirmed by the platform owner. 59 tables total. All tables: RLS enabled, deny-by-default (0 policies), `id uuid default gen_random_uuid()`, `created_at timestamptz default now()`.

Legend: **[SD]** = a SECURITY DEFINER function participates. **[trig]** = has an `updated_at` trigger. **[u-notrig]** = has an `updated_at` column but **no** trigger (a coverage gap — see validation framework).

---

## 1 · Enterprise Digital Twin

**Purpose.** Canonical model of the OwnerPilot enterprise as a graph of entities + relationships, kept fresh by automated discovery, with health tracking and pre-change impact analysis.

- **Tables (17):** `twin_entities` [trig] ("Canonical registry of all modeled OwnerPilot enterprise objects"), `twin_relationships` [trig] ("Evidence-backed relationship graph between enterprise objects"), `twin_source_systems` [trig], `twin_discovery_rules` [u-notrig], `twin_discovery_findings`, `twin_discovery_snapshots`, `twin_health_metrics` [trig], `twin_health_snapshots`, `twin_impact_analyses` ("Pre-change enterprise impact analysis registry"), `twin_impact_findings`, `twin_simulations` ("Scenario simulation registry for strategic and operational change"), `twin_simulation_results`.
- **Functions:** `run_supabase_discovery(text)` **[SD]** — introspects source systems, upserts entities, computes relationship graph, uses `pg_try_advisory_xact_lock` for single-flight idempotency.
- **Lifecycle:** source registered → discovery run → entities/relationships upserted + snapshot → health metrics → impact analysis on proposed change.
- **Dependencies:** foundational — other modules reference twin entities as the "objects" reasoned about. **Security:** discovery is operator-run SECURITY DEFINER; all reads deny-by-default.
- **Roadmap:** Enterprise Knowledge Graph is the natural extension (relationship graph → queryable KG).

## 2 · Enterprise Simulation Laboratory — Scenario Generation (ESL-002)

**Purpose.** Generate, template, and quality-review decision scenarios that strategies are evaluated against.

- **Tables (6):** `scenario_generation_requests` [u-notrig], `scenario_generation_runs`, `generated_scenarios`, `scenario_templates` [u-notrig], `scenario_variables`, `scenario_quality_reviews`.
- **Functions:** `generate_scenario_set(request_id uuid, seed bigint)` **[SD]** — deterministic (seeded) scenario materialization from templates; validates `baseline_facts` shape; row-locks the request.
- **Lifecycle:** request → run (`status`: running/completed/failed/cancelled, seeded) → generated_scenarios → quality review. **Determinism:** `seed bigint` enables reproducible scenario sets (the same pattern ESL-005 `master_seed` extends).
- **Dependencies:** consumed by ESL-003 (actors act within scenarios) and ESL-004 (strategies evaluated against scenarios).

## 3 · ESL — Actor State & Behavioral / Negotiation Intelligence (ESL-003)

**Purpose.** Persist simulated actors, their behavioral profiles, and negotiation dynamics within scenarios.

- **Tables (9):** `simulation_actors` [u-notrig], `actor_scenario_states`, `actor_response_distributions`, `behavioral_profiles` [u-notrig], `behavioral_assessments`, `negotiation_cases` [u-notrig], `negotiation_turns`, `negotiation_outcomes`, `negotiation_strategy_versions`.
- **Lifecycle:** actor defined → behavioral profile/assessment → placed in scenario state → negotiation case → turns → outcome. **Dependencies:** actors live inside ESL-002 scenarios; outcomes feed ESL-004 evaluation + ESL-006 intelligence.

## 4 · ESL — Strategy Evolution (ESL-004)

**Purpose.** Define strategy experiments, generate candidate strategies, evaluate them against scenarios, and select a champion under hard constraints.

- **Tables (6):** `strategy_evolution_experiments` [u-notrig] (`objective_weights`, `hard_constraints`, `founder_approval_required`, status draft→…→completed), `strategy_candidates` (status candidate/eligible/champion/challenger/retired), `strategy_simulation_evaluations` (metric/constraint/robustness/fairness/compliance results, `risk_adjusted_score`, `confidence`), `strategy_outcome_observations`, `strategy_policy_versions`, `strategy_selection_decisions`.
- **Functions:** `score_strategy_candidate(...)` **[SD]** (weighted scoring w/ constraint penalties), `select_strategy_champion(experiment_id)` **[SD]** (picks best constraint-passing candidate by `risk_adjusted_score, confidence`).
- **Lifecycle:** experiment → candidates → per-scenario evaluations → champion selection → outcome observations. **This is the parent of ESL-005:** Monte Carlo experiments attach to `strategy_evolution_experiments(id)`.

## 5 · Decision Intelligence (ESL-006)

**Purpose.** Turn strategy evaluations into governed, explainable, approvable recommendations, with model-evaluation infrastructure.

- **Tables (9):** `decision_intelligence_requests` [u-notrig], `decision_recommendations` (`recommendation_status`, `approval_status`, `confidence`, `confidence_band`, `approved_by`, `approved_at`), `decision_option_assessments`, `decision_sensitivity_findings`, `decision_explanation_factors`, `decision_explainability_audit`, `intelligence_evaluation_runs`, `intelligence_evaluation_suites` [u-notrig], `intelligence_model_registry` [u-notrig].
- **Functions:** `build_decision_recommendation(experiment_id, question, requested_by)` **[SD]** — assembles the recommendation from the latest eligible candidate + evaluation.
- **Lifecycle:** request → option assessments + sensitivity + explainability → recommendation (draft→ready) → approval (pending→approved/rejected). **Dependencies:** consumes ESL-004; enforces the approval/governance layer (§6).

## 6 · Governance, Approval, Agent-Build & AI-Organization

**Purpose.** The control plane — who/what is authorized, what was approved, how amendments propagate, and how autonomous agents build artifacts under review gates.

- **Governance/approval:** `governance_decisions`, `approvals`, `amendments`, `amendment_impacts`, `cross_references`, `capabilities` [trig].
- **Agent-build / release:** `agent_build_runs`, `agent_work_items` [trig], `agent_event_log`, `agent_review_gates`, `artifacts` [trig], `artifact_versions`, `releases`, `release_artifacts`, `sync_jobs`.
- **AI organization:** `ai_organizations` [trig], `ai_organization_capabilities`.
- **Cross-cutting convention:** `founder_approval_required boolean default true` on experiment-class tables + `approved_by text` / `approved_at` — a **founder-in-the-loop** gate is a first-class part of the data model. **Security:** all deny-by-default; agent review gates are explicit rows, not implicit.

---

## Cross-module dependency summary

```
twin_* (digital twin, foundation)
      │
scenario_* (ESL-002) ──► actor_/behavioral_/negotiation_ (ESL-003)
      │                          │
      └──────────► strategy_* (ESL-004) ──► decision_/intelligence_ (ESL-006)
                          │                         │
                          └── governance/approval/agent-build (control plane) ──┘
      (ESL-005 Monte Carlo attaches here → strategy_evolution_experiments)
```

Each module's future roadmap and the platform-wide roadmap are in `roadmap/gap_analysis_and_roadmap.md`.
