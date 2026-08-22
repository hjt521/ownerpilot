-- 059_e2_3d0b_filing_preparation_current_state.sql
-- E2.3D0B1 / B1 — server-authoritative filing-preparation current-state revision substrate.
-- Current state is the highest canonical authoritative revision for the authenticated owner/RiskPath.
-- Customer/runtime authority is append-only: authenticated owners may INSERT and SELECT only.
-- Pure SECURITY INVOKER helpers enforce the same v1 serialized identity invariants at durable admission.
-- No Production application is authorized by this staged migration.

create or replace function public.filing_preparation_current_state_canonical_jsonb(value jsonb)
returns text
language plpgsql
immutable
security invoker
set search_path = pg_catalog, public
as $$
declare
  kind text;
  body text;
begin
  kind := jsonb_typeof(value);
  if kind is null then
    raise exception 'unsupported null SQL jsonb value';
  end if;
  case kind
    when 'null' then
      return 'null';
    when 'string' then
      return to_jsonb(value #>> '{}')::text;
    when 'number' then
      return value::text;
    when 'boolean' then
      return value::text;
    when 'array' then
      select coalesce(string_agg(
        public.filing_preparation_current_state_canonical_jsonb(item),
        ',' order by ordinality
      ), '')
      into body
      from jsonb_array_elements(value) with ordinality as e(item, ordinality);
      return '[' || body || ']';
    when 'object' then
      select coalesce(string_agg(
        to_jsonb(key)::text || ':' || public.filing_preparation_current_state_canonical_jsonb(item),
        ',' order by key collate "C"
      ), '')
      into body
      from jsonb_each(value) as e(key, item);
      return '{' || body || '}';
    else
      raise exception 'unsupported jsonb kind %', kind;
  end case;
end;
$$;

create or replace function public.filing_preparation_current_state_exact_utc_iso(value text)
returns boolean
language plpgsql
immutable
strict
security invoker
set search_path = pg_catalog
as $$
begin
  if value !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z$' then
    return false;
  end if;
  begin
    return to_char(value::timestamptz at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') = value;
  exception when others then
    return false;
  end;
end;
$$;

create or replace function public.filing_preparation_current_state_payload_is_valid(
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
  prep jsonb;
  gb jsonb;
  gd jsonb;
  orb jsonb;
  ore jsonb;
  ack jsonb;
  key text;
  numeric_value numeric;
  expected_id text;
  top_keys constant text[] := array[
    'schemaVersion','recordClass','filingPreparationCurrentStateId','authenticatedUserId',
    'riskpathRecordId','revision','preparationSnapshot','generatedDraftBinding','ownerReviewBinding',
    'stageF','packetComposition','signing','filing','courtSubmission','service','legalSufficiency',
    'autonomousExecution'
  ];
  prep_keys constant text[] := array[
    'officialSourceArtifactId','officialSourceSnapshotId','officialSourceSha256','sourceAdmissionPolicyId',
    'sourceAdmissionStatus','qpdfAssetIdentityDigest','sourcePassACommandDigest',
    'sourcePassAWarningInventoryDigest','sourcePassBCommandDigest','sourcePassBWarningInventoryDigest',
    'sourceWarningInventoryDigest','qpdfIntermediateSha256','xfaPolicyId','xfaDigest','preparationManifestId',
    'preparationSourceId','preparationDerivativeSha256','preparationFieldEquivalenceDigest',
    'preparationSemanticDeltaDigest','preparationAuthorizationSnapshotId','mapSnapshotId',
    'referencedFactSnapshotId','generationInputId','generatorContractVersion','generatorImplementationId',
    'generatorImplementationVersion','fieldWritePlanDigest'
  ];
  generated_keys constant text[] := array[
    'schemaVersion','artifactClass','artifactRole','officialSourceArtifactId','officialSourceSnapshotId',
    'officialSourceSha256','sourceAdmissionPolicyId','sourceAdmissionStatus','qpdfAssetIdentityDigest',
    'sourcePassACommandDigest','sourcePassAWarningInventoryDigest','sourcePassBCommandDigest',
    'sourcePassBWarningInventoryDigest','sourceWarningInventoryDigest','qpdfIntermediateSha256','xfaPolicyId',
    'xfaDigest','preparationManifestId','preparationSourceId','preparationDerivativeSha256',
    'preparationFieldEquivalenceDigest','preparationSemanticDeltaDigest','preparationAuthorizationSnapshotId',
    'mapSnapshotId','referencedFactSnapshotId','generationInputId','generatorContractVersion',
    'generatorImplementationId','generatorImplementationVersion','fieldWritePlanDigest','preparedAtISO',
    'generatedPdfSha256','generatedByteLength','generatedDocumentId'
  ];
  owner_review_keys constant text[] := array[
    'schemaVersion','artifactClass','artifactRole','generatedDraft','renderedAcknowledgment',
    'ownerConfirmedExactRenderedDocument','reviewStatementId','reviewStatementVersion','reviewedAtISO',
    'ownerReviewRecordId'
  ];
  ack_keys constant text[] := array[
    'renderedGeneratedDocumentId','renderedPdfSha256','renderedByteLength','renderedAtISO'
  ];
begin
  if p_state is null
    or p_state_id is null
    or p_user_id is null
    or p_riskpath_record_id is null
    or p_revision is null
    or jsonb_typeof(p_state) <> 'object'
    or not (p_state ?& top_keys)
    or p_state - top_keys <> '{}'::jsonb then
    return false;
  end if;

  if p_revision < 1 or p_revision > 9007199254740991 then
    return false;
  end if;
  if jsonb_typeof(p_state -> 'schemaVersion') <> 'number'
    or (p_state ->> 'schemaVersion')::numeric <> 1
    or p_state ->> 'recordClass' <> 'FILING_PREPARATION_CURRENT_STATE'
    or jsonb_typeof(p_state -> 'authenticatedUserId') <> 'string'
    or p_state ->> 'authenticatedUserId' <> p_user_id::text
    or jsonb_typeof(p_state -> 'riskpathRecordId') <> 'string'
    or p_state ->> 'riskpathRecordId' <> p_riskpath_record_id::text
    or jsonb_typeof(p_state -> 'revision') <> 'number'
    or (p_state ->> 'revision')::numeric <> p_revision
    or jsonb_typeof(p_state -> 'filingPreparationCurrentStateId') <> 'string'
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

  expected_id := 'filing-preparation-current-state:sha256:' ||
    encode(extensions.digest(
      convert_to(public.filing_preparation_current_state_canonical_jsonb(
        p_state - 'filingPreparationCurrentStateId'
      ), 'UTF8'),
      'sha256'
    ), 'hex');
  if p_state_id !~ '^filing-preparation-current-state:sha256:[0-9a-f]{64}$'
    or p_state_id <> expected_id then
    return false;
  end if;

  prep := p_state -> 'preparationSnapshot';
  if jsonb_typeof(prep) <> 'object'
    or not (prep ?& prep_keys)
    or prep - prep_keys <> '{}'::jsonb then
    return false;
  end if;
  foreach key in array prep_keys loop
    if jsonb_typeof(prep -> key) <> 'string'
      or btrim(prep ->> key) = '' then
      return false;
    end if;
  end loop;
  if prep ->> 'officialSourceSha256' !~ '^[0-9a-f]{64}$'
    or prep ->> 'qpdfIntermediateSha256' !~ '^[0-9a-f]{64}$'
    or prep ->> 'preparationDerivativeSha256' !~ '^[0-9a-f]{64}$'
    or prep ->> 'sourceAdmissionStatus' not in (
      'SOURCE_ADMITTED_CLEAN',
      'SOURCE_ADMITTED_WITH_ISOLATED_LINEARIZATION_WARNINGS'
    ) then
    return false;
  end if;

  gb := p_state -> 'generatedDraftBinding';
  if gb = 'null'::jsonb then
    if p_generated_draft_bytes is not null then
      return false;
    end if;
  else
    if jsonb_typeof(gb) <> 'object'
      or not (gb ?& array['revision','generatedDraft'])
      or gb - array['revision','generatedDraft'] <> '{}'::jsonb
      or jsonb_typeof(gb -> 'revision') <> 'number'
      or (gb ->> 'revision')::numeric <> p_revision then
      return false;
    end if;

    gd := gb -> 'generatedDraft';
    if jsonb_typeof(gd) <> 'object'
      or not (gd ?& generated_keys)
      or gd - generated_keys <> '{}'::jsonb then
      return false;
    end if;
    foreach key in array generated_keys loop
      if key not in ('schemaVersion','generatedByteLength') then
        if jsonb_typeof(gd -> key) <> 'string'
          or btrim(gd ->> key) = '' then
          return false;
        end if;
      end if;
    end loop;
    if jsonb_typeof(gd -> 'schemaVersion') <> 'number'
      or (gd ->> 'schemaVersion')::numeric <> 1
      or gd ->> 'artifactClass' <> 'GENERATED_DRAFT'
      or gd ->> 'artifactRole' <> 'OWNER_GENERATED_PREPARATION'
      or gd ->> 'officialSourceSha256' !~ '^[0-9a-f]{64}$'
      or gd ->> 'qpdfIntermediateSha256' !~ '^[0-9a-f]{64}$'
      or gd ->> 'preparationDerivativeSha256' !~ '^[0-9a-f]{64}$'
      or gd ->> 'generatedPdfSha256' !~ '^[0-9a-f]{64}$'
      or gd ->> 'generatedDocumentId' !~ '^generated-document:sha256:[0-9a-f]{64}$'
      or not public.filing_preparation_current_state_exact_utc_iso(gd ->> 'preparedAtISO')
      or jsonb_typeof(gd -> 'generatedByteLength') <> 'number' then
      return false;
    end if;

    numeric_value := (gd ->> 'generatedByteLength')::numeric;
    if numeric_value <= 0
      or trunc(numeric_value) <> numeric_value
      or p_generated_draft_bytes is null
      or numeric_value <> octet_length(p_generated_draft_bytes)
      or gd ->> 'generatedPdfSha256' <> encode(extensions.digest(p_generated_draft_bytes, 'sha256'), 'hex') then
      return false;
    end if;

    expected_id := 'generated-document:sha256:' ||
      encode(extensions.digest(
        convert_to(public.filing_preparation_current_state_canonical_jsonb(
          gd - 'generatedDocumentId'
        ), 'UTF8'),
        'sha256'
      ), 'hex');
    if gd ->> 'generatedDocumentId' <> expected_id then
      return false;
    end if;

    if gd - array[
      'schemaVersion','artifactClass','artifactRole','preparedAtISO',
      'generatedPdfSha256','generatedByteLength','generatedDocumentId'
    ] <> prep then
      return false;
    end if;
  end if;

  orb := p_state -> 'ownerReviewBinding';
  if orb = 'null'::jsonb then
    return true;
  end if;
  if gb = 'null'::jsonb
    or jsonb_typeof(orb) <> 'object'
    or not (orb ?& array['revision','ownerReviewEvidence'])
    or orb - array['revision','ownerReviewEvidence'] <> '{}'::jsonb
    or jsonb_typeof(orb -> 'revision') <> 'number'
    or (orb ->> 'revision')::numeric <> p_revision then
    return false;
  end if;

  ore := orb -> 'ownerReviewEvidence';
  if jsonb_typeof(ore) <> 'object'
    or not (ore ?& owner_review_keys)
    or ore - owner_review_keys <> '{}'::jsonb
    or jsonb_typeof(ore -> 'schemaVersion') <> 'number'
    or (ore ->> 'schemaVersion')::numeric <> 1
    or ore ->> 'artifactClass' <> 'OWNER_REVIEWED_DOCUMENT'
    or ore ->> 'artifactRole' <> 'OWNER_GENERATED_PREPARATION'
    or jsonb_typeof(ore -> 'ownerConfirmedExactRenderedDocument') <> 'boolean'
    or (ore ->> 'ownerConfirmedExactRenderedDocument')::boolean is not true
    or ore ->> 'reviewStatementId' <> 'owner-exact-rendered-document-review-v1'
    or ore ->> 'reviewStatementVersion' <> '1.0.0'
    or jsonb_typeof(ore -> 'reviewedAtISO') <> 'string'
    or not public.filing_preparation_current_state_exact_utc_iso(ore ->> 'reviewedAtISO')
    or jsonb_typeof(ore -> 'ownerReviewRecordId') <> 'string'
    or ore ->> 'ownerReviewRecordId' !~ '^owner-review:sha256:[0-9a-f]{64}$'
    or ore -> 'generatedDraft' <> gd then
    return false;
  end if;

  ack := ore -> 'renderedAcknowledgment';
  if jsonb_typeof(ack) <> 'object'
    or not (ack ?& ack_keys)
    or ack - ack_keys <> '{}'::jsonb
    or jsonb_typeof(ack -> 'renderedGeneratedDocumentId') <> 'string'
    or ack ->> 'renderedGeneratedDocumentId' <> gd ->> 'generatedDocumentId'
    or jsonb_typeof(ack -> 'renderedPdfSha256') <> 'string'
    or ack ->> 'renderedPdfSha256' <> gd ->> 'generatedPdfSha256'
    or jsonb_typeof(ack -> 'renderedByteLength') <> 'number'
    or jsonb_typeof(ack -> 'renderedAtISO') <> 'string'
    or not public.filing_preparation_current_state_exact_utc_iso(ack ->> 'renderedAtISO') then
    return false;
  end if;
  numeric_value := (ack ->> 'renderedByteLength')::numeric;
  if numeric_value < 1
    or numeric_value > 9007199254740991
    or trunc(numeric_value) <> numeric_value
    or numeric_value <> (gd ->> 'generatedByteLength')::numeric
    or ore ->> 'reviewedAtISO' < ack ->> 'renderedAtISO' then
    return false;
  end if;

  expected_id := 'owner-review:sha256:' ||
    encode(extensions.digest(
      convert_to(public.filing_preparation_current_state_canonical_jsonb(
        ore - 'ownerReviewRecordId'
      ), 'UTF8'),
      'sha256'
    ), 'hex');
  if ore ->> 'ownerReviewRecordId' <> expected_id then
    return false;
  end if;

  return true;
exception when others then
  return false;
end;
$$;

-- Functions are pure admission helpers. Remove default Data API execution, then grant only the
-- authenticated role required to evaluate the CHECK during owner INSERT. No service-role path.
revoke execute on function public.filing_preparation_current_state_canonical_jsonb(jsonb)
  from public, anon, authenticated, service_role;
revoke execute on function public.filing_preparation_current_state_exact_utc_iso(text)
  from public, anon, authenticated, service_role;
revoke execute on function public.filing_preparation_current_state_payload_is_valid(jsonb, bytea, text, uuid, uuid, bigint)
  from public, anon, authenticated, service_role;
grant execute on function public.filing_preparation_current_state_canonical_jsonb(jsonb) to authenticated;
grant execute on function public.filing_preparation_current_state_exact_utc_iso(text) to authenticated;
grant execute on function public.filing_preparation_current_state_payload_is_valid(jsonb, bytea, text, uuid, uuid, bigint) to authenticated;

create table public.filing_preparation_current_state_revisions (
  filing_preparation_current_state_id text primary key
    check (
      filing_preparation_current_state_id
      ~ '^filing-preparation-current-state:sha256:[0-9a-f]{64}$'
    ),
  user_id uuid not null references public.users(id) on delete cascade,
  riskpath_record_id uuid not null references public.riskpath_records(id) on delete cascade,
  revision bigint not null
    check (revision >= 1 and revision <= 9007199254740991),
  state_payload jsonb not null,
  generated_draft_bytes bytea null,
  created_at timestamptz not null default now(),

  constraint filing_preparation_current_state_riskpath_revision_unique
    unique (riskpath_record_id, revision),

  constraint filing_preparation_current_state_canonical_v1_check
    check (public.filing_preparation_current_state_payload_is_valid(
      state_payload,
      generated_draft_bytes,
      filing_preparation_current_state_id,
      user_id,
      riskpath_record_id,
      revision
    ))
);

create index filing_preparation_current_state_owner_riskpath_revision_idx
  on public.filing_preparation_current_state_revisions
    (user_id, riskpath_record_id, revision desc);

alter table public.filing_preparation_current_state_revisions enable row level security;
alter table public.filing_preparation_current_state_revisions force row level security;

revoke all on public.filing_preparation_current_state_revisions from anon, authenticated, service_role;
grant select, insert on public.filing_preparation_current_state_revisions to authenticated;

create policy filing_preparation_current_state_owner_select
  on public.filing_preparation_current_state_revisions
  for select
  to authenticated
  using (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.riskpath_records rp
      where rp.id = riskpath_record_id
        and rp.user_id = (select auth.uid())
    )
  );

create policy filing_preparation_current_state_owner_insert
  on public.filing_preparation_current_state_revisions
  for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.riskpath_records rp
      where rp.id = riskpath_record_id
        and rp.user_id = (select auth.uid())
    )
  );
