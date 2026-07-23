-- esl005_phase5a_monte_carlo_persistence.sql
-- ESL-005 · Phase 5A · Monte Carlo Persistence Layer
--
-- Persistence foundation ONLY — no worker code, no orchestration logic, no simulation execution.
-- Schema: constitution (Enterprise Constitutional AI layer). ADDITIVE ONLY. No existing object is modified.
-- DRAFT — hand to broker for review + apply. Do NOT auto-apply (governance: broker executes all DB actions).
--
-- Conventions matched from live introspection (docs/constitution/constitution_schema_reverse_engineering_report_2026-07-22.md):
--   * id uuid default gen_random_uuid(); <noun>_code text UNIQUE
--   * status/mode = text + CHECK(col = ANY(ARRAY[...]))  (schema has NO enum/domain types)
--   * confidence/threshold in [0,1] = numeric(6,5) + CHECK (>=0 AND <=1)
--   * jsonb NOT NULL DEFAULT '{}'::jsonb
--   * FK to strategy_evolution_experiments(id) ON DELETE CASCADE (experiment-child convention)
--   * approver identity stored as text (approved_by text) — NOT uuid (schema convention; see design note 3)
--   * RLS enabled, NO policy = deny-by-default (all 59 constitution tables do this)
--   * updated_at maintained by the existing constitution.set_updated_at() trigger function
--
-- ROLLBACK (reversibility):
--   drop table if exists constitution.monte_carlo_experiments;   -- cascades its own indexes, constraints, and trigger

create table if not exists constitution.monte_carlo_experiments (
  id                        uuid           not null default gen_random_uuid(),
  experiment_code           text           not null,
  strategy_experiment_id    uuid           not null,
  experiment_name           text           not null,
  description               text,
  status                    text           not null default 'pending',
  execution_mode            text           not null default 'serial',
  master_seed               bigint,
  minimum_trials            integer        not null,
  maximum_trials            integer        not null,
  batch_size                integer        not null,
  completed_trials          integer        not null default 0,
  failed_trials             integer        not null default 0,
  confidence_target         numeric(6,5)   not null,
  convergence_threshold     numeric(6,5)   not null,
  adaptive_sampling         boolean        not null default false,
  stop_on_convergence       boolean        not null default true,
  replay_enabled            boolean        not null default true,
  founder_approval_required boolean        not null default true,
  approved_by               text,
  approved_at               timestamptz,
  started_at                timestamptz,
  completed_at              timestamptz,
  metadata                  jsonb          not null default '{}'::jsonb,
  created_at                timestamptz    not null default now(),
  updated_at                timestamptz    not null default now(),

  constraint monte_carlo_experiments_pkey primary key (id),
  constraint monte_carlo_experiments_experiment_code_key unique (experiment_code),
  constraint monte_carlo_experiments_strategy_experiment_id_fkey
    foreign key (strategy_experiment_id)
    references constitution.strategy_evolution_experiments (id) on delete cascade,

  constraint monte_carlo_experiments_status_check
    check (status = any (array['pending','running','paused','completed','failed','cancelled'])),
  constraint monte_carlo_experiments_execution_mode_check
    check (execution_mode = any (array['serial','parallel','adaptive'])),
  constraint monte_carlo_experiments_minimum_trials_check        check (minimum_trials > 0),
  constraint monte_carlo_experiments_maximum_trials_check        check (maximum_trials >= minimum_trials),
  constraint monte_carlo_experiments_batch_size_check            check (batch_size > 0),
  constraint monte_carlo_experiments_completed_trials_check      check (completed_trials >= 0),
  constraint monte_carlo_experiments_failed_trials_check         check (failed_trials >= 0),
  constraint monte_carlo_experiments_confidence_target_check     check (confidence_target >= 0 and confidence_target <= 1),
  constraint monte_carlo_experiments_convergence_threshold_check check (convergence_threshold >= 0 and convergence_threshold <= 1)
);

-- Indexes — btree, abbreviated idx_<shortname>_<purpose> per convention (idx_strategy_eval_experiment, idx_scenario_runs_request).
create index if not exists idx_mc_experiments_status              on constitution.monte_carlo_experiments (status);
create index if not exists idx_mc_experiments_strategy_experiment on constitution.monte_carlo_experiments (strategy_experiment_id);
create index if not exists idx_mc_experiments_created_at          on constitution.monte_carlo_experiments (created_at);
create index if not exists idx_mc_experiments_started_at          on constitution.monte_carlo_experiments (started_at);
create index if not exists idx_mc_experiments_completed_at        on constitution.monte_carlo_experiments (completed_at);

-- updated_at maintenance via the EXISTING standard trigger function. KEPT per ADR-008 (broker ruling 2026-07-22):
-- an updated_at column must carry a maintaining trigger (development standards; const_0001 closed this gap schema-wide).
drop trigger if exists monte_carlo_experiments_set_updated_at on constitution.monte_carlo_experiments;
create trigger monte_carlo_experiments_set_updated_at
  before update on constitution.monte_carlo_experiments
  for each row execute function constitution.set_updated_at();

-- Row Level Security: enable + NO policy = deny-by-default. Access is service-role / owner only (service_role
-- bypasses RLS). No permissive policy is authored (prompt requirement + matches all 59 constitution tables).
alter table constitution.monte_carlo_experiments enable row level security;

-- Comments (prompt-requested; additive — the schema comments sparsely).
comment on table constitution.monte_carlo_experiments is
  'ESL-005 Phase 5A. Monte Carlo experiment configuration + lifecycle registry. Persistence layer only (no worker, no orchestration, no execution). One row per Monte Carlo experiment, attached to an ESL-004 strategy_evolution_experiments row.';
comment on column constitution.monte_carlo_experiments.strategy_experiment_id is
  'FK to constitution.strategy_evolution_experiments(id) (ESL-004). ON DELETE CASCADE: a Monte Carlo experiment belongs to its parent strategy experiment.';
comment on column constitution.monte_carlo_experiments.master_seed is
  'Root RNG seed (bigint) for deterministic replay. Re-running the experiment with the same master_seed and configuration reproduces the identical trial sequence, so results are auditable and reproducible.';
comment on column constitution.monte_carlo_experiments.replay_enabled is
  'When true, the experiment is executed so its trials can be deterministically replayed from master_seed.';
comment on column constitution.monte_carlo_experiments.confidence_target is
  'Target statistical confidence in [0,1] the experiment aims to reach before it is allowed to stop.';
comment on column constitution.monte_carlo_experiments.convergence_threshold is
  'Convergence tolerance in [0,1]. When the running estimate stabilizes within this threshold and stop_on_convergence is true, sampling may halt before maximum_trials.';
