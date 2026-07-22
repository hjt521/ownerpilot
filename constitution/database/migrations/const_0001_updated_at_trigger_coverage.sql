-- const_0001_updated_at_trigger_coverage.sql
-- The FIRST official constitutional migration after Genesis (v1.0). Proves the repository-first workflow.
-- Purpose: 10 tables carry an `updated_at` column but no trigger, so `updated_at` never updates (validation
--   check #2 / gap-analysis P2). This attaches the EXISTING standard trigger function to each — additive, no new
--   objects, no data change, no behavior change to any reader (updated_at simply becomes truthful on UPDATE).
-- Convention: non-twin tables use constitution.set_updated_at() via `<table>_set_updated_at`; the twin-family table
--   uses constitution.touch_updated_at() via `trg_<table>_updated_at` (matches the existing twin_* triggers).
-- Type: PATCH (correctness-only, structural-none). Backward compatible. Reversible.
-- Authorizing: Phase 0 approval + governance handbook §7; record: const_0001_updated_at_trigger_coverage_record.md.
-- DRAFT — broker applies (governance §4.13). PG14+ `create or replace trigger` (prod is PG17).
--
-- ROLLBACK:
--   drop trigger if exists behavioral_profiles_set_updated_at            on constitution.behavioral_profiles;
--   drop trigger if exists decision_intelligence_requests_set_updated_at on constitution.decision_intelligence_requests;
--   drop trigger if exists intelligence_evaluation_suites_set_updated_at on constitution.intelligence_evaluation_suites;
--   drop trigger if exists intelligence_model_registry_set_updated_at    on constitution.intelligence_model_registry;
--   drop trigger if exists negotiation_cases_set_updated_at              on constitution.negotiation_cases;
--   drop trigger if exists scenario_generation_requests_set_updated_at   on constitution.scenario_generation_requests;
--   drop trigger if exists scenario_templates_set_updated_at             on constitution.scenario_templates;
--   drop trigger if exists simulation_actors_set_updated_at              on constitution.simulation_actors;
--   drop trigger if exists strategy_evolution_experiments_set_updated_at on constitution.strategy_evolution_experiments;
--   drop trigger if exists trg_twin_discovery_rules_updated_at           on constitution.twin_discovery_rules;

-- Non-twin family (9) — constitution.set_updated_at():
create or replace trigger behavioral_profiles_set_updated_at
  before update on constitution.behavioral_profiles            for each row execute function constitution.set_updated_at();
create or replace trigger decision_intelligence_requests_set_updated_at
  before update on constitution.decision_intelligence_requests for each row execute function constitution.set_updated_at();
create or replace trigger intelligence_evaluation_suites_set_updated_at
  before update on constitution.intelligence_evaluation_suites  for each row execute function constitution.set_updated_at();
create or replace trigger intelligence_model_registry_set_updated_at
  before update on constitution.intelligence_model_registry     for each row execute function constitution.set_updated_at();
create or replace trigger negotiation_cases_set_updated_at
  before update on constitution.negotiation_cases               for each row execute function constitution.set_updated_at();
create or replace trigger scenario_generation_requests_set_updated_at
  before update on constitution.scenario_generation_requests    for each row execute function constitution.set_updated_at();
create or replace trigger scenario_templates_set_updated_at
  before update on constitution.scenario_templates              for each row execute function constitution.set_updated_at();
create or replace trigger simulation_actors_set_updated_at
  before update on constitution.simulation_actors               for each row execute function constitution.set_updated_at();
create or replace trigger strategy_evolution_experiments_set_updated_at
  before update on constitution.strategy_evolution_experiments  for each row execute function constitution.set_updated_at();

-- Twin family (1) — constitution.touch_updated_at() + trg_ naming (matches existing twin_* triggers):
create or replace trigger trg_twin_discovery_rules_updated_at
  before update on constitution.twin_discovery_rules            for each row execute function constitution.touch_updated_at();
