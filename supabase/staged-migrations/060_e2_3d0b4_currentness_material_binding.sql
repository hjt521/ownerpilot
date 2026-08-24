-- 060_e2_3d0b4_currentness_material_binding.sql
-- E2.3D0B4-R1 — trusted currentness-material durable binding.
-- STAGED ONLY. No Production application, migration/backfill, second table, RLS widening, or service-role path.
-- Reuses the accepted append-only state_payload in filing_preparation_current_state_revisions.

-- Reproduce the exact referenced-fact snapshot identity used by the accepted UD-100
-- generation-binding evaluator. The direct dependency set is the immutable v1.2.0
-- UD-100 map/profile dependency set; fact-declared provenance dependencies are then
-- traversed transitively exactly like factSnapshotRecord(...) in TypeScript.
create or replace function public.filing_preparation_current_state_ud100_referenced_fact_snapshot_id(
  p_facts jsonb
)
returns text
language plpgsql
immutable
security invoker
set search_path = pg_catalog, public, extensions
as $$
declare
  queue text[] := array[
    'defendant.names',
    'plaintiff.names',
    'property.city',
    'property.county',
    'property.streetAddress',
    'property.unitRepresentation',
    'property.zip',
    'ud100.control.captionFormValue',
    'ud100.control.captionOptionalFields',
    'ud100.control.captionRoute',
    'ud100.control.civilClassification',
    'ud100.control.jurisdictionSupport',
    'ud100.control.leaseApplicability',
    'ud100.control.localRentEviction',
    'ud100.control.municipalClassification',
    'ud100.control.noticeElectionConsistency',
    'ud100.control.plaintiffStanding',
    'ud100.control.rentalAssistance',
    'ud100.control.serviceElectionConsistency',
    'ud100.control.tpaClassification',
    'ud100.control.udaDisclosure',
    'ud100.election.doeDefendants',
    'ud100.election.fixedTermExpiration',
    'ud100.election.noticeComplaint',
    'ud100.election.otherReliefSelections',
    'ud100.election.pastDueRentRelief',
    'ud100.election.serviceComplaint',
    'ud100.fact.dbaUse',
    'ud100.fact.filerContact',
    'ud100.fact.leaseStatus',
    'ud100.fact.otherNotices',
    'ud100.fact.plaintiffRelationship',
    'ud100.fact.plaintiffType',
    'ud100.fact.premisesAge',
    'ud100.fact.rentDueAtService',
    'ud100.fact.rentalAssistance',
    'ud100.lifecycle.initialComplaint',
    'ud100.lifecycle.serviceFacts',
    'ud100.selectedFilingCourt'
  ];
  seen text[] := array[]::text[];
  current_ref text;
  fact jsonb;
  dependency jsonb;
  snapshot_record jsonb;
  queue_length integer;
begin
  if p_facts is null
    or jsonb_typeof(p_facts) <> 'object'
    or p_facts ->> 'status' <> 'READY'
    or jsonb_typeof(p_facts -> 'facts') <> 'object' then
    return null;
  end if;

  loop
    queue_length := coalesce(array_length(queue, 1), 0);
    exit when queue_length = 0;

    current_ref := queue[1];
    if queue_length = 1 then
      queue := array[]::text[];
    else
      queue := queue[2:queue_length];
    end if;

    if current_ref = any(seen) then
      continue;
    end if;
    seen := array_append(seen, current_ref);

    fact := p_facts -> 'facts' -> current_ref;
    if fact is null then
      -- TypeScript snapshot identity represents a missing transitive fact as null.
      -- Direct facts cannot reach generation readiness when missing, but retaining
      -- null here keeps the digest algorithm byte-for-byte equivalent.
      continue;
    end if;
    if jsonb_typeof(fact) <> 'object'
      or jsonb_typeof(fact -> 'provenance') <> 'object'
      or jsonb_typeof(fact -> 'provenance' -> 'dependencies') <> 'array' then
      return null;
    end if;

    for dependency in
      select value
      from jsonb_array_elements(fact -> 'provenance' -> 'dependencies')
    loop
      if jsonb_typeof(dependency) <> 'string'
        or btrim(dependency #>> '{}') = '' then
        return null;
      end if;
      queue := array_append(queue, dependency #>> '{}');
    end loop;
  end loop;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'ref', ref,
        'fact', coalesce(p_facts -> 'facts' -> ref, 'null'::jsonb)
      )
      order by ref collate "C"
    ),
    '[]'::jsonb
  )
  into snapshot_record
  from unnest(seen) as refs(ref);

  return 'facts:sha256:' || encode(
    extensions.digest(
      convert_to(
        public.filing_preparation_current_state_canonical_jsonb(snapshot_record),
        'UTF8'
      ),
      'sha256'
    ),
    'hex'
  );
exception when others then
  return null;
end;
$$;

revoke execute on function public.filing_preparation_current_state_ud100_referenced_fact_snapshot_id(jsonb)
  from public, anon, authenticated, service_role;
grant execute on function public.filing_preparation_current_state_ud100_referenced_fact_snapshot_id(jsonb)
  to authenticated;

create or replace function public.filing_preparation_current_state_payload_v2_is_valid(
  p_state jsonb,
  p_generated_draft_bytes bytea,
  p_state_id text,
  p_user_id uuid,
  p_riskpath_record_id uuid,
  p_revision bigint
)
returns boolean
language plpgsql
immutable
security invoker
set search_path = pg_catalog, public, extensions
as $$
declare
  binding jsonb;
  facts jsonb;
  preparation_authorization jsonb;
  target jsonb;
  created_notice jsonb;
  prep jsonb;
  generated_binding jsonb;
  legacy_state jsonb;
  legacy_id text;
  expected_id text;
  expected_referenced_fact_snapshot_id text;
  generation_input_identity jsonb;
  binding_keys constant text[] := array[
    'schemaVersion','officialSourceHealth','facts','preparationAuthorization'
  ];
  ready_fact_keys constant text[] := array['status','createdNoticeIdentity','facts'];
  created_notice_keys constant text[] := array['generation','createdAtISO'];
  authorization_keys constant text[] := array[
    'authorizationId','resultId','controlId','controlVersion','status','decision','target','createdNoticeIdentity'
  ];
  target_keys constant text[] := array[
    'artifactId','authorityKey','formId','revisionEffective','sourceSnapshotId'
  ];
  v2_top_keys constant text[] := array[
    'schemaVersion','recordClass','filingPreparationCurrentStateId','authenticatedUserId',
    'riskpathRecordId','revision','preparationSnapshot','generatedDraftBinding','currentnessMaterialBinding',
    'ownerReviewBinding','stageF','packetComposition','signing','filing','courtSubmission','service',
    'legalSufficiency','autonomousExecution'
  ];
begin
  if p_state is null or jsonb_typeof(p_state) <> 'object' then
    return false;
  end if;

  -- Historical v1 rows remain readable/admissible without any backfill.
  if jsonb_typeof(p_state -> 'schemaVersion') = 'number'
    and (p_state ->> 'schemaVersion')::numeric = 1 then
    return public.filing_preparation_current_state_payload_is_valid(
      p_state,
      p_generated_draft_bytes,
      p_state_id,
      p_user_id,
      p_riskpath_record_id,
      p_revision
    );
  end if;

  if jsonb_typeof(p_state -> 'schemaVersion') <> 'number'
    or (p_state ->> 'schemaVersion')::numeric <> 2
    or not (p_state ?& v2_top_keys)
    or p_state - v2_top_keys <> '{}'::jsonb
    or p_state ->> 'recordClass' <> 'FILING_PREPARATION_CURRENT_STATE'
    or p_state ->> 'authenticatedUserId' <> p_user_id::text
    or p_state ->> 'riskpathRecordId' <> p_riskpath_record_id::text
    or jsonb_typeof(p_state -> 'revision') <> 'number'
    or (p_state ->> 'revision')::numeric <> p_revision
    or p_state ->> 'filingPreparationCurrentStateId' <> p_state_id
    or p_state ->> 'stageF' <> 'HELD'
    or p_state ->> 'packetComposition' <> 'NOT_PERFORMED'
    or p_state ->> 'signing' <> 'NOT_PERFORMED'
    or p_state ->> 'filing' <> 'NOT_PERFORMED'
    or p_state ->> 'courtSubmission' <> 'NOT_PERFORMED'
    or p_state ->> 'service' <> 'NOT_PERFORMED'
    or p_state ->> 'legalSufficiency' <> 'NOT_EVALUATED'
    or p_state ->> 'autonomousExecution' <> 'NOT_AUTHORIZED' then
    return false;
  end if;

  expected_id := 'filing-preparation-current-state:sha256:' || encode(extensions.digest(
    convert_to(public.filing_preparation_current_state_canonical_jsonb(
      p_state - 'filingPreparationCurrentStateId'
    ), 'UTF8'),
    'sha256'
  ), 'hex');
  if p_state_id !~ '^filing-preparation-current-state:sha256:[0-9a-f]{64}$'
    or p_state_id <> expected_id then
    return false;
  end if;

  -- Reuse the accepted v1 validator for every pre-R1 field by projecting a canonical
  -- synthetic legacy identity. This does not mutate or rewrite any durable row.
  legacy_state := jsonb_set(
    p_state - 'currentnessMaterialBinding',
    '{schemaVersion}',
    '1'::jsonb,
    false
  );
  legacy_id := 'filing-preparation-current-state:sha256:' || encode(extensions.digest(
    convert_to(public.filing_preparation_current_state_canonical_jsonb(
      legacy_state - 'filingPreparationCurrentStateId'
    ), 'UTF8'),
    'sha256'
  ), 'hex');
  legacy_state := jsonb_set(
    legacy_state,
    '{filingPreparationCurrentStateId}',
    to_jsonb(legacy_id),
    false
  );
  if not public.filing_preparation_current_state_payload_is_valid(
    legacy_state,
    p_generated_draft_bytes,
    legacy_id,
    p_user_id,
    p_riskpath_record_id,
    p_revision
  ) then
    return false;
  end if;

  generated_binding := p_state -> 'generatedDraftBinding';
  binding := p_state -> 'currentnessMaterialBinding';

  if generated_binding = 'null'::jsonb then
    return binding = 'null'::jsonb;
  end if;

  if binding = 'null'::jsonb
    or jsonb_typeof(binding) <> 'object'
    or not (binding ?& binding_keys)
    or binding - binding_keys <> '{}'::jsonb
    or jsonb_typeof(binding -> 'schemaVersion') <> 'number'
    or (binding ->> 'schemaVersion')::numeric <> 1
    or binding ->> 'officialSourceHealth' <> 'CURRENT' then
    return false;
  end if;

  facts := binding -> 'facts';
  if jsonb_typeof(facts) <> 'object'
    or not (facts ?& ready_fact_keys)
    or facts - ready_fact_keys <> '{}'::jsonb
    or facts ->> 'status' <> 'READY'
    or jsonb_typeof(facts -> 'facts') <> 'object' then
    return false;
  end if;
  created_notice := facts -> 'createdNoticeIdentity';
  if jsonb_typeof(created_notice) <> 'object'
    or not (created_notice ?& created_notice_keys)
    or created_notice - created_notice_keys <> '{}'::jsonb
    or jsonb_typeof(created_notice -> 'generation') <> 'string'
    or btrim(created_notice ->> 'generation') = ''
    or jsonb_typeof(created_notice -> 'createdAtISO') <> 'string'
    or not public.filing_preparation_current_state_exact_utc_iso(created_notice ->> 'createdAtISO') then
    return false;
  end if;

  preparation_authorization := binding -> 'preparationAuthorization';
  if jsonb_typeof(preparation_authorization) <> 'object'
    or not (preparation_authorization ?& authorization_keys)
    or preparation_authorization - authorization_keys <> '{}'::jsonb
    or preparation_authorization ->> 'status' <> 'CURRENT'
    or preparation_authorization ->> 'decision' <> 'FORM_RELEVANT_FOR_PREPARATION'
    or preparation_authorization -> 'createdNoticeIdentity' <> created_notice then
    return false;
  end if;
  if jsonb_typeof(preparation_authorization -> 'createdNoticeIdentity') <> 'object'
    or not ((preparation_authorization -> 'createdNoticeIdentity') ?& created_notice_keys)
    or (preparation_authorization -> 'createdNoticeIdentity') - created_notice_keys <> '{}'::jsonb then
    return false;
  end if;
  if exists (
    select 1
    from unnest(array['authorizationId','resultId','controlId','controlVersion']) as required_key
    where jsonb_typeof(preparation_authorization -> required_key) <> 'string'
      or btrim(preparation_authorization ->> required_key) = ''
  ) then
    return false;
  end if;

  target := preparation_authorization -> 'target';
  if jsonb_typeof(target) <> 'object'
    or not (target ?& target_keys)
    or target - target_keys <> '{}'::jsonb then
    return false;
  end if;
  if exists (
    select 1 from unnest(target_keys) as required_key
    where jsonb_typeof(target -> required_key) <> 'string'
      or btrim(target ->> required_key) = ''
  ) then
    return false;
  end if;

  prep := p_state -> 'preparationSnapshot';
  if target ->> 'artifactId' <> prep ->> 'officialSourceArtifactId'
    or target ->> 'sourceSnapshotId' <> prep ->> 'officialSourceSnapshotId' then
    return false;
  end if;

  -- The exact authorization object is itself a governed snapshot identity.
  expected_id := 'preparation-authorization:sha256:' || encode(extensions.digest(
    convert_to(public.filing_preparation_current_state_canonical_jsonb(preparation_authorization), 'UTF8'),
    'sha256'
  ), 'hex');
  if expected_id <> prep ->> 'preparationAuthorizationSnapshotId' then
    return false;
  end if;

  -- Independently bind the raw dynamic facts/provenance to the exact referenced-fact
  -- snapshot committed by preparation/generated-draft evidence. Recomputing the outer
  -- current-state ID cannot repair a semantic mutation under currentness material.
  expected_referenced_fact_snapshot_id :=
    public.filing_preparation_current_state_ud100_referenced_fact_snapshot_id(facts);
  if expected_referenced_fact_snapshot_id is null
    or expected_referenced_fact_snapshot_id !~ '^facts:sha256:[0-9a-f]{64}$'
    or expected_referenced_fact_snapshot_id <> prep ->> 'referencedFactSnapshotId' then
    return false;
  end if;

  -- Reproduce computeGenerationInputId(...) from the already-bound canonical source/map/
  -- fact/contract identities. This makes the durable generation input identity change
  -- whenever the accepted fact snapshot changes; no caller-authored currentness verdict exists.
  generation_input_identity := jsonb_build_object(
    'sourceSnapshotId', prep ->> 'officialSourceSnapshotId',
    'mapSnapshotId', prep ->> 'mapSnapshotId',
    'referencedFactSnapshotId', expected_referenced_fact_snapshot_id,
    'generatorContractVersion', prep ->> 'generatorContractVersion'
  );
  expected_id := 'generation-input:sha256:' || encode(extensions.digest(
    convert_to(
      public.filing_preparation_current_state_canonical_jsonb(generation_input_identity),
      'UTF8'
    ),
    'sha256'
  ), 'hex');
  if expected_id <> prep ->> 'generationInputId' then
    return false;
  end if;

  return true;
exception when others then
  return false;
end;
$$;

revoke execute on function public.filing_preparation_current_state_payload_v2_is_valid(
  jsonb, bytea, text, uuid, uuid, bigint
) from public, anon, authenticated, service_role;
grant execute on function public.filing_preparation_current_state_payload_v2_is_valid(
  jsonb, bytea, text, uuid, uuid, bigint
) to authenticated;

-- Supersede only the payload admission CHECK. No table, row, RLS policy, grant, or data rewrite.
alter table public.filing_preparation_current_state_revisions
  drop constraint filing_preparation_current_state_canonical_v1_check;

alter table public.filing_preparation_current_state_revisions
  add constraint filing_preparation_current_state_canonical_v2_check
  check (public.filing_preparation_current_state_payload_v2_is_valid(
    state_payload,
    generated_draft_bytes,
    filing_preparation_current_state_id,
    user_id,
    riskpath_record_id,
    revision
  ));
