create table if not exists constitution.scenario_generation_requests (
  id uuid primary key default gen_random_uuid(),
  request_code text not null unique,
  title text not null,
  domain text not null check (domain in ('tenant_resolution','property_operations','pricing','compliance','general')),
  objective text not null,
  requested_by text,
  source_case_type text,
  source_case_id uuid,
  baseline_facts jsonb not null default '{}'::jsonb,
  decision_options jsonb not null default '[]'::jsonb,
  known_constraints jsonb not null default '[]'::jsonb,
  outcome_dimensions jsonb not null default '[]'::jsonb,
  uncertainty_budget numeric not null default 0.25 check (uncertainty_budget between 0 and 1),
  requested_scenario_count integer not null default 12 check (requested_scenario_count between 3 and 250),
  status text not null default 'queued' check (status in ('queued','generating','generated','failed','cancelled')),
  founder_approval_required boolean not null default false,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp()
);

create table if not exists constitution.scenario_templates (
  id uuid primary key default gen_random_uuid(),
  template_code text not null unique,
  name text not null,
  domain text not null check (domain in ('tenant_resolution','property_operations','pricing','compliance','general')),
  scenario_class text not null check (scenario_class in ('baseline','optimistic','adverse','stress','edge','counterfactual')),
  description text not null,
  required_inputs jsonb not null default '[]'::jsonb,
  variable_schema jsonb not null default '{}'::jsonb,
  generation_rules jsonb not null default '{}'::jsonb,
  weight numeric not null default 1 check (weight > 0),
  active boolean not null default true,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp()
);

create table if not exists constitution.scenario_generation_runs (
  id uuid primary key default gen_random_uuid(),
  run_code text not null unique,
  request_id uuid not null references constitution.scenario_generation_requests(id) on delete cascade,
  generator_version text not null,
  generation_mode text not null default 'rules_plus_model' check (generation_mode in ('rules_only','model_only','rules_plus_model','ensemble')),
  model_manifest jsonb not null default '[]'::jsonb,
  seed bigint,
  status text not null default 'running' check (status in ('running','completed','failed','cancelled')),
  input_snapshot jsonb not null default '{}'::jsonb,
  generation_metrics jsonb not null default '{}'::jsonb,
  error_detail text,
  started_at timestamptz not null default clock_timestamp(),
  completed_at timestamptz
);

create table if not exists constitution.generated_scenarios (
  id uuid primary key default gen_random_uuid(),
  scenario_code text not null unique,
  request_id uuid not null references constitution.scenario_generation_requests(id) on delete cascade,
  run_id uuid not null references constitution.scenario_generation_runs(id) on delete cascade,
  template_id uuid references constitution.scenario_templates(id) on delete set null,
  scenario_class text not null check (scenario_class in ('baseline','optimistic','adverse','stress','edge','counterfactual')),
  title text not null,
  narrative text not null,
  initial_state jsonb not null default '{}'::jsonb,
  participant_state jsonb not null default '{}'::jsonb,
  environment_state jsonb not null default '{}'::jsonb,
  decision_path jsonb not null default '[]'::jsonb,
  assumptions jsonb not null default '[]'::jsonb,
  evidence_refs jsonb not null default '[]'::jsonb,
  uncertainty_factors jsonb not null default '[]'::jsonb,
  probability_prior numeric check (probability_prior between 0 and 1),
  severity_score numeric not null default 0 check (severity_score between 0 and 1),
  novelty_score numeric not null default 0 check (novelty_score between 0 and 1),
  plausibility_score numeric not null default 0 check (plausibility_score between 0 and 1),
  constitutional_status text not null default 'pending' check (constitutional_status in ('pending','permitted','review_required','prohibited')),
  quality_status text not null default 'pending' check (quality_status in ('pending','accepted','rejected','needs_revision')),
  created_at timestamptz not null default clock_timestamp()
);

create table if not exists constitution.scenario_variables (
  id uuid primary key default gen_random_uuid(),
  scenario_id uuid not null references constitution.generated_scenarios(id) on delete cascade,
  variable_key text not null,
  variable_type text not null check (variable_type in ('fixed','distribution','categorical','derived','unknown')),
  value jsonb not null,
  source_type text not null check (source_type in ('fact','evidence','assumption','historical','model','policy')),
  confidence numeric not null default 0.5 check (confidence between 0 and 1),
  sensitivity numeric not null default 0 check (sensitivity between 0 and 1),
  created_at timestamptz not null default clock_timestamp(),
  unique (scenario_id, variable_key)
);

create table if not exists constitution.scenario_quality_reviews (
  id uuid primary key default gen_random_uuid(),
  scenario_id uuid not null references constitution.generated_scenarios(id) on delete cascade,
  reviewer_type text not null check (reviewer_type in ('rule_engine','frontier_model','human','constitutional')),
  reviewer_reference text,
  factual_grounding numeric not null check (factual_grounding between 0 and 1),
  internal_consistency numeric not null check (internal_consistency between 0 and 1),
  diversity_contribution numeric not null check (diversity_contribution between 0 and 1),
  non_manipulation numeric not null check (non_manipulation between 0 and 1),
  constitutional_compliance numeric not null check (constitutional_compliance between 0 and 1),
  findings jsonb not null default '[]'::jsonb,
  disposition text not null check (disposition in ('accept','reject','revise','escalate')),
  created_at timestamptz not null default clock_timestamp()
);

create index if not exists idx_scenario_requests_status on constitution.scenario_generation_requests(status, created_at);
create index if not exists idx_scenario_runs_request on constitution.scenario_generation_runs(request_id, started_at desc);
create index if not exists idx_generated_scenarios_request on constitution.generated_scenarios(request_id, scenario_class);
create index if not exists idx_scenario_variables_sensitivity on constitution.scenario_variables(scenario_id, sensitivity desc);
create index if not exists idx_scenario_reviews_scenario on constitution.scenario_quality_reviews(scenario_id, created_at desc);

insert into constitution.ai_organizations (
  organization_code, name, mission, status, authority_level, founder_approval_required,
  escalation_policy, operating_policy, metrics_policy, metadata
) values (
  'AIO-005',
  'Enterprise Simulation Laboratory',
  'Generate, test, and evaluate evidence-grounded future scenarios before significant enterprise or customer recommendations are made.',
  'active',
  'approval_required',
  true,
  '{"escalate_when":["constitutional_conflict","insufficient_evidence","high_stakes_external_action","material_legal_uncertainty"]}'::jsonb,
  '{"principles":["facts_before_assumptions","multiple_plausible_futures","explicit_uncertainty","no_deception","human_approval_for_external_action"],"external_execution_prohibited":true}'::jsonb,
  '{"primary":["scenario_plausibility","scenario_diversity","calibration","decision_regret","constitutional_compliance"],"minimum_quality_score":0.9}'::jsonb,
  '{"constitutional_designation":"ESL-001","current_module":"ESL-002"}'::jsonb
) on conflict (organization_code) do update set
  name=excluded.name,
  mission=excluded.mission,
  status=excluded.status,
  authority_level=excluded.authority_level,
  founder_approval_required=excluded.founder_approval_required,
  escalation_policy=excluded.escalation_policy,
  operating_policy=excluded.operating_policy,
  metrics_policy=excluded.metrics_policy,
  metadata=excluded.metadata,
  updated_at=clock_timestamp();

insert into constitution.capabilities (
  capability_code, name, description, risk_tier, execution_mode, required_approval_stage,
  input_schema, output_schema, metadata
) values (
  'CAP-ESL-002',
  'Scenario Generation Engine',
  'Produces diverse, plausible, evidence-grounded scenarios spanning baseline, optimistic, adverse, stress, edge, and counterfactual futures.',
  'high',
  'supervised',
  'constitutional_review',
  '{"required":["objective","baseline_facts","decision_options"],"optional":["constraints","outcome_dimensions","behavioral_profiles","negotiation_case"]}'::jsonb,
  '{"produces":["scenario_set","assumptions","evidence_references","uncertainty_factors","quality_scores"]}'::jsonb,
  '{"organization_code":"AIO-005","constitutional_designation":"ESL-002","external_action":false}'::jsonb
) on conflict (capability_code) do update set
  name=excluded.name,
  description=excluded.description,
  risk_tier=excluded.risk_tier,
  execution_mode=excluded.execution_mode,
  required_approval_stage=excluded.required_approval_stage,
  input_schema=excluded.input_schema,
  output_schema=excluded.output_schema,
  metadata=excluded.metadata,
  updated_at=clock_timestamp();

insert into constitution.scenario_templates
(template_code,name,domain,scenario_class,description,required_inputs,variable_schema,generation_rules,weight)
values
('ESL-TPL-BASE-001','Evidence Baseline','general','baseline','Most likely continuation of the current evidence-backed state.','["baseline_facts","decision_options"]','{"uncertainty":"bounded"}','{"preserve_facts":true,"introduce_assumptions":"minimal"}',3),
('ESL-TPL-OPT-001','Constructive Resolution','general','optimistic','Plausible high-cooperation outcome without assuming perfect behavior.','["baseline_facts","decision_options"]','{"cooperation":"upper_plausible_bound"}','{"require_causal_path":true,"no_unearned_positive_outcome":true}',1),
('ESL-TPL-ADV-001','Adverse Response','general','adverse','Plausible resistance, delay, disagreement, or nonperformance.','["baseline_facts","decision_options"]','{"resistance":"elevated"}','{"avoid_catastrophizing":true,"require_evidence_or_explicit_assumption":true}',1),
('ESL-TPL-STRESS-001','Compound Stress','general','stress','Multiple plausible adverse variables interact at once.','["baseline_facts","decision_options","known_constraints"]','{"stressors":"compound"}','{"max_concurrent_stressors":3,"preserve_internal_consistency":true}',0.75),
('ESL-TPL-EDGE-001','Low-Probability Edge','general','edge','Low-probability but decision-relevant outcome.','["baseline_facts"]','{"probability":"low","impact":"material"}','{"must_be_actionable":true,"must_not_be_fantastical":true}',0.5),
('ESL-TPL-CF-001','Decision Counterfactual','general','counterfactual','Alternative future produced by selecting a different decision option.','["decision_options"]','{"decision":"alternative"}','{"compare_to_baseline":true,"hold_unrelated_variables_constant":true}',1)
on conflict (template_code) do update set
 name=excluded.name, domain=excluded.domain, scenario_class=excluded.scenario_class,
 description=excluded.description, required_inputs=excluded.required_inputs,
 variable_schema=excluded.variable_schema, generation_rules=excluded.generation_rules,
 weight=excluded.weight, active=true, updated_at=clock_timestamp();

create or replace function constitution.generate_scenario_set(p_request_id uuid, p_seed bigint default null)
returns uuid
language plpgsql
security definer
set search_path = constitution, public
as $$
declare
  v_request constitution.scenario_generation_requests%rowtype;
  v_run_id uuid := gen_random_uuid();
  v_run_code text;
  v_template record;
  v_i integer := 0;
  v_target integer;
  v_scenario_id uuid;
  v_class_count integer;
  v_probability numeric;
  v_severity numeric;
  v_novelty numeric;
  v_plausibility numeric;
begin
  select * into v_request from constitution.scenario_generation_requests where id=p_request_id for update;
  if not found then raise exception 'Scenario generation request not found'; end if;
  if jsonb_typeof(v_request.baseline_facts) <> 'object' then raise exception 'baseline_facts must be a JSON object'; end if;
  if jsonb_typeof(v_request.decision_options) <> 'array' or jsonb_array_length(v_request.decision_options)=0 then raise exception 'At least one decision option is required'; end if;

  v_target := v_request.requested_scenario_count;
  v_run_code := 'ESL-RUN-' || to_char(clock_timestamp(),'YYYYMMDDHH24MISSMS') || '-' || substr(v_run_id::text,1,8);

  update constitution.scenario_generation_requests set status='generating', updated_at=clock_timestamp() where id=p_request_id;
  insert into constitution.scenario_generation_runs(id,run_code,request_id,generator_version,generation_mode,seed,input_snapshot)
  values(v_run_id,v_run_code,p_request_id,'ESL-002.1','rules_plus_model',p_seed,
    jsonb_build_object('objective',v_request.objective,'facts',v_request.baseline_facts,'options',v_request.decision_options,'constraints',v_request.known_constraints));

  for v_template in
    select * from constitution.scenario_templates
    where active and (domain=v_request.domain or domain='general')
    order by case scenario_class when 'baseline' then 1 when 'counterfactual' then 2 when 'optimistic' then 3 when 'adverse' then 4 when 'stress' then 5 else 6 end
  loop
    v_class_count := case v_template.scenario_class
      when 'baseline' then greatest(1,ceil(v_target*0.20)::int)
      when 'counterfactual' then greatest(1,ceil(v_target*0.20)::int)
      when 'optimistic' then greatest(1,ceil(v_target*0.15)::int)
      when 'adverse' then greatest(1,ceil(v_target*0.20)::int)
      when 'stress' then greatest(1,ceil(v_target*0.15)::int)
      else greatest(1,v_target - v_i)
    end;
    for j in 1..v_class_count loop
      exit when v_i >= v_target;
      v_i := v_i + 1;
      v_scenario_id := gen_random_uuid();
      v_probability := case v_template.scenario_class when 'baseline' then 0.45 when 'optimistic' then 0.18 when 'adverse' then 0.20 when 'stress' then 0.09 when 'edge' then 0.03 else 0.05 end;
      v_severity := case v_template.scenario_class when 'optimistic' then 0.20 when 'baseline' then 0.35 when 'counterfactual' then 0.45 when 'adverse' then 0.65 when 'stress' then 0.85 else 0.90 end;
      v_novelty := least(1,0.15 + (v_i::numeric / greatest(v_target,1)) * 0.65);
      v_plausibility := case v_template.scenario_class when 'baseline' then 0.92 when 'optimistic' then 0.78 when 'adverse' then 0.82 when 'stress' then 0.68 when 'edge' then 0.55 else 0.80 end;

      insert into constitution.generated_scenarios(
        id,scenario_code,request_id,run_id,template_id,scenario_class,title,narrative,
        initial_state,participant_state,environment_state,decision_path,assumptions,evidence_refs,
        uncertainty_factors,probability_prior,severity_score,novelty_score,plausibility_score,
        constitutional_status,quality_status)
      values(
        v_scenario_id,
        'ESL-SCN-'||to_char(clock_timestamp(),'YYYYMMDDHH24MISSMS')||'-'||lpad(v_i::text,3,'0')||'-'||substr(v_scenario_id::text,1,6),
        p_request_id,v_run_id,v_template.id,v_template.scenario_class,
        v_template.name||' '||v_i,
        v_template.description||' Objective: '||v_request.objective,
        v_request.baseline_facts,
        jsonb_build_object('behavioral_profiles','[]'::jsonb,'counterparty_state','unknown','confidence',1-v_request.uncertainty_budget),
        jsonb_build_object('constraints',v_request.known_constraints,'uncertainty_budget',v_request.uncertainty_budget),
        jsonb_build_array(jsonb_build_object('step',1,'decision_option_index',((v_i-1) % jsonb_array_length(v_request.decision_options)),'option',v_request.decision_options->((v_i-1) % jsonb_array_length(v_request.decision_options)))),
        jsonb_build_array(jsonb_build_object('type','scenario_class_assumption','value',v_template.scenario_class,'explicit',true)),
        jsonb_build_array(jsonb_build_object('source','scenario_generation_request','request_id',p_request_id)),
        jsonb_build_array(jsonb_build_object('factor','human_response','range','bounded'),jsonb_build_object('factor','external_environment','range','bounded')),
        v_probability,v_severity,v_novelty,v_plausibility,
        'review_required','pending');

      insert into constitution.scenario_variables(scenario_id,variable_key,variable_type,value,source_type,confidence,sensitivity)
      values
      (v_scenario_id,'uncertainty_budget','fixed',to_jsonb(v_request.uncertainty_budget),'fact',1,0.8),
      (v_scenario_id,'scenario_class','categorical',to_jsonb(v_template.scenario_class),'policy',1,0.4),
      (v_scenario_id,'selected_decision_option','categorical',v_request.decision_options->((v_i-1) % jsonb_array_length(v_request.decision_options)),'fact',1,0.9);
    end loop;
  end loop;

  insert into constitution.scenario_quality_reviews(
    scenario_id,reviewer_type,reviewer_reference,factual_grounding,internal_consistency,
    diversity_contribution,non_manipulation,constitutional_compliance,findings,disposition)
  select id,'rule_engine','ESL-002.1',
    case when initial_state='{}'::jsonb then 0.5 else 0.9 end,
    0.9, greatest(0.5,novelty_score),1.0,0.9,
    case when initial_state='{}'::jsonb then '[{"severity":"warning","issue":"baseline facts are empty"}]'::jsonb else '[]'::jsonb end,
    case when plausibility_score>=0.6 then 'accept' else 'revise' end
  from constitution.generated_scenarios where run_id=v_run_id;

  update constitution.generated_scenarios s set
    quality_status = case when q.disposition='accept' then 'accepted' else 'needs_revision' end,
    constitutional_status = case when q.constitutional_compliance>=0.9 then 'permitted' else 'review_required' end
  from constitution.scenario_quality_reviews q
  where q.scenario_id=s.id and s.run_id=v_run_id and q.reviewer_type='rule_engine';

  update constitution.scenario_generation_runs set
    status='completed', completed_at=clock_timestamp(),
    generation_metrics=jsonb_build_object(
      'scenarios_generated',(select count(*) from constitution.generated_scenarios where run_id=v_run_id),
      'classes_covered',(select count(distinct scenario_class) from constitution.generated_scenarios where run_id=v_run_id),
      'accepted',(select count(*) from constitution.generated_scenarios where run_id=v_run_id and quality_status='accepted'),
      'average_plausibility',(select round(avg(plausibility_score),4) from constitution.generated_scenarios where run_id=v_run_id)
    ) where id=v_run_id;
  update constitution.scenario_generation_requests set status='generated',updated_at=clock_timestamp() where id=p_request_id;
  return v_run_id;
exception when others then
  update constitution.scenario_generation_runs set status='failed',error_detail=sqlerrm,completed_at=clock_timestamp() where id=v_run_id;
  update constitution.scenario_generation_requests set status='failed',updated_at=clock_timestamp() where id=p_request_id;
  raise;
end;
$$;

insert into constitution.agent_work_items(
  work_item_code,title,description,work_type,status,priority,assigned_ai_organization_id,
  requested_by,founder_approval_required,source_context,acceptance_criteria,result_summary,result_artifacts
)
select
  'WORK-ESL-002','Implement ESL-002 Scenario Generation Engine',
  'Build the governed scenario request, template, generation, variable, and quality-review pipeline for the Enterprise Simulation Laboratory.',
  'schema_change','completed','urgent',o.id,'Founder',false,
  '{"constitutional_designation":"ESL-002"}'::jsonb,
  '{"requirements":["diverse scenario classes","explicit assumptions","evidence references","uncertainty tracking","quality review","constitutional status"]}'::jsonb,
  'ESL-002 schema, templates, governed generation function, quality controls, and indexes implemented.',
  '{"tables":["scenario_generation_requests","scenario_templates","scenario_generation_runs","generated_scenarios","scenario_variables","scenario_quality_reviews"],"function":"constitution.generate_scenario_set"}'::jsonb
from constitution.ai_organizations o where o.organization_code='AIO-005'
on conflict (work_item_code) do update set
 status='completed',priority='urgent',assigned_ai_organization_id=excluded.assigned_ai_organization_id,
 result_summary=excluded.result_summary,result_artifacts=excluded.result_artifacts,
 completed_at=clock_timestamp(),updated_at=clock_timestamp();