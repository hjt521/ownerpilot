-- Historical migration topology prototype — canonical active representation.
-- Recovered source archive: supabase/migration-history/constitutional/recovered-production-ledger/20260722215547_esl_security_hardening_phase1.sql
-- Recovered source blob: a68bf5aac3d8c6e4ecac4540da171b0b60246fe6
--
-- Recovered historical SQL

REVOKE EXECUTE ON FUNCTION constitution.generate_scenario_set(uuid,bigint) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION constitution.score_strategy_candidate(uuid,uuid,jsonb,jsonb,integer,numeric) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION constitution.select_strategy_champion(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION constitution.build_decision_recommendation(uuid,text,text) FROM anon, authenticated;
ALTER TABLE constitution.scenario_generation_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE constitution.scenario_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE constitution.scenario_generation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE constitution.generated_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE constitution.scenario_variables ENABLE ROW LEVEL SECURITY;
ALTER TABLE constitution.scenario_quality_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE constitution.decision_intelligence_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE constitution.decision_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE constitution.decision_option_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE constitution.decision_explanation_factors ENABLE ROW LEVEL SECURITY;
ALTER TABLE constitution.decision_sensitivity_findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE constitution.decision_explainability_audit ENABLE ROW LEVEL SECURITY;

-- Canonical Production-observed end-state closure
--
-- The trigger source migration and original creation timing are unrecoverable from current evidence.
-- The following closure encodes the observed Production constitutional trigger end-state known to exist
-- by completion of the retained constitutional migration sequence.
-- It is not represented as recovered historical SQL attributable to this timestamp.
--
-- This closure is intentionally limited to the ten Production-observed triggers below.

DROP TRIGGER IF EXISTS trg_twin_discovery_rules_updated_at ON constitution.twin_discovery_rules;
CREATE TRIGGER trg_twin_discovery_rules_updated_at
BEFORE UPDATE ON constitution.twin_discovery_rules
FOR EACH ROW EXECUTE FUNCTION constitution.touch_updated_at();

DROP TRIGGER IF EXISTS intelligence_model_registry_set_updated_at ON constitution.intelligence_model_registry;
CREATE TRIGGER intelligence_model_registry_set_updated_at
BEFORE UPDATE ON constitution.intelligence_model_registry
FOR EACH ROW EXECUTE FUNCTION constitution.set_updated_at();

DROP TRIGGER IF EXISTS behavioral_profiles_set_updated_at ON constitution.behavioral_profiles;
CREATE TRIGGER behavioral_profiles_set_updated_at
BEFORE UPDATE ON constitution.behavioral_profiles
FOR EACH ROW EXECUTE FUNCTION constitution.set_updated_at();

DROP TRIGGER IF EXISTS negotiation_cases_set_updated_at ON constitution.negotiation_cases;
CREATE TRIGGER negotiation_cases_set_updated_at
BEFORE UPDATE ON constitution.negotiation_cases
FOR EACH ROW EXECUTE FUNCTION constitution.set_updated_at();

DROP TRIGGER IF EXISTS intelligence_evaluation_suites_set_updated_at ON constitution.intelligence_evaluation_suites;
CREATE TRIGGER intelligence_evaluation_suites_set_updated_at
BEFORE UPDATE ON constitution.intelligence_evaluation_suites
FOR EACH ROW EXECUTE FUNCTION constitution.set_updated_at();

DROP TRIGGER IF EXISTS scenario_generation_requests_set_updated_at ON constitution.scenario_generation_requests;
CREATE TRIGGER scenario_generation_requests_set_updated_at
BEFORE UPDATE ON constitution.scenario_generation_requests
FOR EACH ROW EXECUTE FUNCTION constitution.set_updated_at();

DROP TRIGGER IF EXISTS scenario_templates_set_updated_at ON constitution.scenario_templates;
CREATE TRIGGER scenario_templates_set_updated_at
BEFORE UPDATE ON constitution.scenario_templates
FOR EACH ROW EXECUTE FUNCTION constitution.set_updated_at();

DROP TRIGGER IF EXISTS simulation_actors_set_updated_at ON constitution.simulation_actors;
CREATE TRIGGER simulation_actors_set_updated_at
BEFORE UPDATE ON constitution.simulation_actors
FOR EACH ROW EXECUTE FUNCTION constitution.set_updated_at();

DROP TRIGGER IF EXISTS strategy_evolution_experiments_set_updated_at ON constitution.strategy_evolution_experiments;
CREATE TRIGGER strategy_evolution_experiments_set_updated_at
BEFORE UPDATE ON constitution.strategy_evolution_experiments
FOR EACH ROW EXECUTE FUNCTION constitution.set_updated_at();

DROP TRIGGER IF EXISTS decision_intelligence_requests_set_updated_at ON constitution.decision_intelligence_requests;
CREATE TRIGGER decision_intelligence_requests_set_updated_at
BEFORE UPDATE ON constitution.decision_intelligence_requests
FOR EACH ROW EXECUTE FUNCTION constitution.set_updated_at();
