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

## ADR-008 — Future Monte Carlo architecture (ESL-005)

**Status:** Proposed (held behind Phase 0). **Context:** strategy evaluation needs large-N stochastic simulation with deterministic replay and convergence control. **Decision (proposed):** a persistence-first build — Phase 5A `monte_carlo_experiments` (config + lifecycle, `master_seed`, trial bounds, convergence/confidence targets, founder approval) attached to `strategy_evolution_experiments`; Phase 5B `monte_carlo_batches` (per-batch seeds derived from `master_seed`, results); worker/orchestration are later phases and out of the persistence scope. No enums (text+CHECK), RLS deny-by-default, matching ESL conventions. **Consequences:** reproducible, auditable simulations that plug into the existing ESL-004 → ESL-006 pipeline. **Revisit before build:** must clear the Phase 0 approval gate first; deviation `approved_by text` (vs the prompt's uuid) is recorded in the 5A draft. **Supersedes:** nothing. **Superseded by:** — .
