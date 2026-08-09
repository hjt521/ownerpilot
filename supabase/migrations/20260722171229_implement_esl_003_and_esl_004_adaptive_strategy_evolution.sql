create extension if not exists pgcrypto;

-- Register ESL-003/004 capabilities.
insert into constitution.capabilities (
  capability_code,name,description,risk_tier,execution_mode,required_approval_stage,input_schema,output_schema,metadata
) values
('CAP-ESL-003','Cognitive Actor State and Response Engine','Maintains evidence-grounded probabilistic actor state and generates governed response distributions for enterprise simulations.','high','supervised','constitutional_review','{}'::jsonb,'{}'::jsonb,jsonb_build_object('module','ESL-003','prohibitions',jsonb_build_array('protected_attribute_inference','mental_health_diagnosis','fabricated_intent','manipulative_targeting'))),
('CAP-ESL-004','Adaptive Strategy Evolution','Generates, evaluates, compares, selects, and recalibrates strategies using simulated and observed outcomes under constitutional governance.','critical','approval_required','founder_approval','{}'::jsonb,'{}'::jsonb,jsonb_build_object('module','ESL-004','selection_policy','multi_objective','external_action','prohibited_without_human_approval'))
on conflict (capability_code) do update set
  name=excluded.name, description=excluded.description, risk_tier=excluded.risk_tier,
  execution_mode=excluded.execution_mode, required_approval_stage=excluded.required_approval_stage,
  metadata=excluded.metadata, updated_at=now();

-- ESL-003 prerequisite foundation (the earlier conceptual step had not created persistence tables).
create table if not exists constitution.simulation_actors (
  id uuid primary key default gen_random_uuid(),
  actor_code text not null unique,
  actor_type text not null,
  display_name text not null,
  source_reference text,
  goals jsonb not null default '[]',
  constraints jsonb not null default '[]',
  knowledge_state jsonb not null default '{}',
  belief_state jsonb not null default '{}',
  behavioral_parameters jsonb not null default '{}',
  negotiation_parameters jsonb not null default '{}',
  communication_parameters jsonb not null default '{}',
  uncertainty jsonb not null default '{}',
  prohibited_inferences text[] not null default array['protected_characteristics','medical_diagnosis','mental_health_diagnosis','political_affiliation','religious_belief'],
  status text not null default 'active' check (status in ('draft','active','suspended','retired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists constitution.actor_scenario_states (
  id uuid primary key default gen_random_uuid(),
  scenario_id uuid not null references constitution.generated_scenarios(id) on delete cascade,
  actor_id uuid not null references constitution.simulation_actors(id) on delete cascade,
  turn_number integer not null default 0 check (turn_number >= 0),
  goals_state jsonb not null default '{}',
  constraints_state jsonb not null default '{}',
  knowledge_state jsonb not null default '{}',
  belief_state jsonb not null default '{}',
  trust_state jsonb not null default '{}',
  regulation_state jsonb not null default '{}',
  utility_state jsonb not null default '{}',
  confidence numeric(6,5) not null default 0.5 check (confidence between 0 and 1),
  evidence_refs jsonb not null default '[]',
  created_at timestamptz not null default now(),
  unique(scenario_id,actor_id,turn_number)
);

create table if not exists constitution.actor_response_distributions (
  id uuid primary key default gen_random_uuid(),
  scenario_id uuid not null references constitution.generated_scenarios(id) on delete cascade,
  actor_state_id uuid not null references constitution.actor_scenario_states(id) on delete cascade,
  stimulus jsonb not null,
  candidate_responses jsonb not null,
  selected_response jsonb,
  selection_method text not null default 'probabilistic' check (selection_method in ('probabilistic','deterministic','human_selected','model_ensemble')),
  policy_version text not null default '1.0.0',
  constitutional_status text not null default 'pending' check (constitutional_status in ('pending','approved','rejected','escalated')),
  model_runs jsonb not null default '[]',
  created_at timestamptz not null default now()
);

-- ESL-004 strategy evolution persistence.
create table if not exists constitution.strategy_evolution_experiments (
  id uuid primary key default gen_random_uuid(),
  experiment_code text not null unique,
  title text not null,
  scenario_id uuid references constitution.generated_scenarios(id) on delete set null,
  source_case_type text,
  source_case_id uuid,
  objective_weights jsonb not null,
  hard_constraints jsonb not null default '[]',
  evaluation_policy jsonb not null default '{}',
  status text not null default 'draft' check (status in ('draft','ready','running','awaiting_approval','approved','completed','cancelled','failed')),
  founder_approval_required boolean not null default true,
  requested_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists constitution.strategy_candidates (
  id uuid primary key default gen_random_uuid(),
  experiment_id uuid not null references constitution.strategy_evolution_experiments(id) on delete cascade,
  candidate_code text not null,
  name text not null,
  strategy_type text not null,
  strategy_definition jsonb not null,
  assumptions jsonb not null default '[]',
  authority_requirements jsonb not null default '{}',
  constitutional_review jsonb not null default '{}',
  generation_provenance jsonb not null default '{}',
  status text not null default 'candidate' check (status in ('candidate','eligible','ineligible','champion','challenger','retired')),
  created_at timestamptz not null default now(),
  unique(experiment_id,candidate_code)
);

create table if not exists constitution.strategy_simulation_evaluations (
  id uuid primary key default gen_random_uuid(),
  experiment_id uuid not null references constitution.strategy_evolution_experiments(id) on delete cascade,
  candidate_id uuid not null references constitution.strategy_candidates(id) on delete cascade,
  scenario_id uuid references constitution.generated_scenarios(id) on delete set null,
  trial_count integer not null default 0 check (trial_count >= 0),
  metric_results jsonb not null,
  constraint_results jsonb not null default '{}',
  robustness_results jsonb not null default '{}',
  fairness_results jsonb not null default '{}',
  compliance_results jsonb not null default '{}',
  expected_value numeric(14,6),
  risk_adjusted_score numeric(14,6),
  confidence numeric(6,5) not null default 0 check (confidence between 0 and 1),
  evaluator_version text not null default '1.0.0',
  evidence_refs jsonb not null default '[]',
  created_at timestamptz not null default now(),
  unique(experiment_id,candidate_id,scenario_id)
);

create table if not exists constitution.strategy_selection_decisions (
  id uuid primary key default gen_random_uuid(),
  experiment_id uuid not null references constitution.strategy_evolution_experiments(id) on delete cascade,
  selected_candidate_id uuid not null references constitution.strategy_candidates(id),
  ranking jsonb not null,
  selection_rationale text not null,
  dissenting_findings jsonb not null default '[]',
  approval_status text not null default 'pending' check (approval_status in ('pending','approved','rejected','superseded')),
  approved_by text,
  approved_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists constitution.strategy_outcome_observations (
  id uuid primary key default gen_random_uuid(),
  experiment_id uuid not null references constitution.strategy_evolution_experiments(id) on delete cascade,
  candidate_id uuid not null references constitution.strategy_candidates(id),
  observation_type text not null check (observation_type in ('simulated','shadow','real_world')),
  predicted_metrics jsonb not null,
  observed_metrics jsonb not null,
  prediction_error jsonb not null default '{}',
  context_snapshot jsonb not null default '{}',
  verified_by text,
  observed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists constitution.strategy_policy_versions (
  id uuid primary key default gen_random_uuid(),
  policy_code text not null,
  version integer not null,
  policy_definition jsonb not null,
  calibration_summary jsonb not null default '{}',
  source_experiments jsonb not null default '[]',
  lifecycle_state text not null default 'draft' check (lifecycle_state in ('draft','review','approved','released','retired')),
  approved_by text,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  unique(policy_code,version)
);

create index if not exists idx_actor_states_scenario on constitution.actor_scenario_states(scenario_id,turn_number);
create index if not exists idx_response_dist_scenario on constitution.actor_response_distributions(scenario_id);
create index if not exists idx_strategy_candidates_experiment on constitution.strategy_candidates(experiment_id,status);
create index if not exists idx_strategy_eval_experiment on constitution.strategy_simulation_evaluations(experiment_id,risk_adjusted_score desc);
create index if not exists idx_strategy_observations_candidate on constitution.strategy_outcome_observations(candidate_id,observed_at desc);

-- Deterministic, auditable weighted scorer. Metric values are expected in [0,1].
create or replace function constitution.score_strategy_candidate(
  p_experiment_id uuid,
  p_candidate_id uuid,
  p_metric_results jsonb,
  p_constraint_results jsonb default '{}'::jsonb,
  p_trial_count integer default 1000,
  p_confidence numeric default 0.75
) returns uuid
language plpgsql
security definer
set search_path = constitution, public
as $$
declare
  v_weights jsonb;
  v_key text;
  v_weight numeric;
  v_metric numeric;
  v_weight_total numeric := 0;
  v_score numeric := 0;
  v_penalty numeric := 0;
  v_eval_id uuid;
  v_scenario_id uuid;
begin
  select objective_weights, scenario_id into v_weights, v_scenario_id
  from constitution.strategy_evolution_experiments where id=p_experiment_id;
  if v_weights is null then raise exception 'Experiment not found'; end if;
  if not exists(select 1 from constitution.strategy_candidates where id=p_candidate_id and experiment_id=p_experiment_id) then
    raise exception 'Candidate does not belong to experiment';
  end if;

  for v_key,v_weight in select key, value::numeric from jsonb_each_text(v_weights) loop
    v_metric := coalesce((p_metric_results->>v_key)::numeric,0);
    v_metric := greatest(0,least(1,v_metric));
    v_weight_total := v_weight_total + abs(v_weight);
    v_score := v_score + (v_metric * v_weight);
  end loop;
  if v_weight_total > 0 then v_score := v_score / v_weight_total; end if;

  -- A failed hard constraint creates a severe but transparent penalty.
  select coalesce(sum(case when value::boolean=false then 0.25 else 0 end),0)
  into v_penalty from jsonb_each_text(p_constraint_results);

  insert into constitution.strategy_simulation_evaluations(
    experiment_id,candidate_id,scenario_id,trial_count,metric_results,constraint_results,
    expected_value,risk_adjusted_score,confidence
  ) values (
    p_experiment_id,p_candidate_id,v_scenario_id,greatest(p_trial_count,0),p_metric_results,p_constraint_results,
    round(v_score,6),round(greatest(-1,least(1,v_score-v_penalty)),6),greatest(0,least(1,p_confidence))
  )
  on conflict (experiment_id,candidate_id,scenario_id) do update set
    trial_count=excluded.trial_count, metric_results=excluded.metric_results,
    constraint_results=excluded.constraint_results, expected_value=excluded.expected_value,
    risk_adjusted_score=excluded.risk_adjusted_score, confidence=excluded.confidence,
    created_at=now()
  returning id into v_eval_id;
  return v_eval_id;
end $$;

create or replace function constitution.select_strategy_champion(p_experiment_id uuid)
returns uuid
language plpgsql
security definer
set search_path = constitution, public
as $$
declare
  v_candidate uuid;
  v_decision uuid;
  v_ranking jsonb;
  v_failed_constraints int;
begin
  select count(*) into v_failed_constraints
  from constitution.strategy_simulation_evaluations e,
       lateral jsonb_each_text(e.constraint_results) x
  where e.experiment_id=p_experiment_id and x.value::boolean=false;

  select e.candidate_id into v_candidate
  from constitution.strategy_simulation_evaluations e
  where e.experiment_id=p_experiment_id
    and not exists (select 1 from jsonb_each_text(e.constraint_results) x where x.value::boolean=false)
  order by e.risk_adjusted_score desc, e.confidence desc, e.created_at desc
  limit 1;
  if v_candidate is null then raise exception 'No eligible candidate with all hard constraints satisfied'; end if;

  select jsonb_agg(jsonb_build_object(
    'candidate_id',e.candidate_id,'candidate_code',c.candidate_code,
    'risk_adjusted_score',e.risk_adjusted_score,'expected_value',e.expected_value,'confidence',e.confidence
  ) order by e.risk_adjusted_score desc)
  into v_ranking
  from constitution.strategy_simulation_evaluations e
  join constitution.strategy_candidates c on c.id=e.candidate_id
  where e.experiment_id=p_experiment_id;

  update constitution.strategy_candidates set status='challenger'
  where experiment_id=p_experiment_id and status in ('candidate','eligible','champion','challenger');
  update constitution.strategy_candidates set status='champion' where id=v_candidate;

  insert into constitution.strategy_selection_decisions(
    experiment_id,selected_candidate_id,ranking,selection_rationale,approval_status
  ) values (
    p_experiment_id,v_candidate,coalesce(v_ranking,'[]'::jsonb),
    'Selected highest risk-adjusted candidate satisfying every recorded hard constraint. Human approval remains required.',
    'pending'
  ) returning id into v_decision;

  update constitution.strategy_evolution_experiments
  set status='awaiting_approval',updated_at=now() where id=p_experiment_id;
  return v_decision;
end $$;

alter table constitution.simulation_actors enable row level security;
alter table constitution.actor_scenario_states enable row level security;
alter table constitution.actor_response_distributions enable row level security;
alter table constitution.strategy_evolution_experiments enable row level security;
alter table constitution.strategy_candidates enable row level security;
alter table constitution.strategy_simulation_evaluations enable row level security;
alter table constitution.strategy_selection_decisions enable row level security;
alter table constitution.strategy_outcome_observations enable row level security;
alter table constitution.strategy_policy_versions enable row level security;

-- Register work item.
insert into constitution.agent_work_items(
  work_item_code,title,description,work_type,status,priority,requested_by,founder_approval_required,source_context,acceptance_criteria,result_summary,result_artifacts,completed_at
) values (
  'WORK-ESL-004','Implement Adaptive Strategy Evolution','Implement governed multi-objective strategy generation, evaluation, selection, outcome observation, and calibration infrastructure, including ESL-003 persistence prerequisites.','schema_change','completed','urgent','Founder',true,
  jsonb_build_object('modules',jsonb_build_array('ESL-003','ESL-004')),
  jsonb_build_object('requires',jsonb_build_array('auditable scoring','hard-constraint enforcement','human approval','real-outcome calibration')),
  'ESL-003 persistence foundation and ESL-004 Adaptive Strategy Evolution implemented.',
  jsonb_build_object('tables',jsonb_build_array('simulation_actors','actor_scenario_states','actor_response_distributions','strategy_evolution_experiments','strategy_candidates','strategy_simulation_evaluations','strategy_selection_decisions','strategy_outcome_observations','strategy_policy_versions'),'functions',jsonb_build_array('score_strategy_candidate','select_strategy_champion')),
  now()
) on conflict (work_item_code) do update set status='completed',result_summary=excluded.result_summary,result_artifacts=excluded.result_artifacts,completed_at=now(),updated_at=now();