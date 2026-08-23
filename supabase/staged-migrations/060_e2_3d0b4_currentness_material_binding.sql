-- 060_e2_3d0b4_currentness_material_binding.sql
-- E2.3D0B4-R1 — trusted currentness-material durable binding.
-- STAGED ONLY. No Production application, migration/backfill, second table, RLS widening, or service-role path.
-- Reuses the accepted append-only state_payload in filing_preparation_current_state_revisions.

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
  authorization jsonb;
  target jsonb;
  created_notice jsonb;
  prep jsonb;
  generated_binding jsonb;
  legacy_state jsonb;
  legacy_id text;
  expected_id text;
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

  authorization := binding -> 'preparationAuthorization';
  if jsonb_typeof(authorization) <> 'object'
    or not (authorization ?& authorization_keys)
    or authorization - authorization_keys <> '{}'::jsonb
    or authorization ->> 'status' <> 'CURRENT'
    or authorization ->> 'decision' <> 'FORM_RELEVANT_FOR_PREPARATION'
    or authorization -> 'createdNoticeIdentity' <> created_notice then
    return false;
  end if;
  if jsonb_typeof(authorization -> 'createdNoticeIdentity') <> 'object'
    or not ((authorization -> 'createdNoticeIdentity') ?& created_notice_keys)
    or (authorization -> 'createdNoticeIdentity') - created_notice_keys <> '{}'::jsonb then
    return false;
  end if;
  if exists (
    select 1
    from unnest(array['authorizationId','resultId','controlId','controlVersion']) as required_key
    where jsonb_typeof(authorization -> required_key) <> 'string'
      or btrim(authorization ->> required_key) = ''
  ) then
    return false;
  end if;

  target := authorization -> 'target';
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
    convert_to(public.filing_preparation_current_state_canonical_jsonb(authorization), 'UTF8'),
    'sha256'
  ), 'hex');
  if expected_id <> prep ->> 'preparationAuthorizationSnapshotId' then
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
