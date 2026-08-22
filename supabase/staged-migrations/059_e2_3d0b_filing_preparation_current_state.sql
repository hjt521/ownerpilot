-- 059_e2_3d0b_filing_preparation_current_state.sql
-- E2.3D0B1 — Preview/non-Production filing-preparation current-state revision substrate.
-- Current state is the highest authoritative revision for the authenticated owner/RiskPath.
-- Customer/runtime authority is append-only: authenticated owners may INSERT and SELECT only.
-- No Production application is authorized by this staged migration.

create table public.filing_preparation_current_state_revisions (
  filing_preparation_current_state_id text primary key
    check (
      filing_preparation_current_state_id
      ~ '^filing-preparation-current-state:sha256:[0-9a-f]{64}$'
    ),
  user_id uuid not null references public.users(id) on delete cascade,
  riskpath_record_id uuid not null references public.riskpath_records(id) on delete cascade,
  revision bigint not null check (revision > 0),
  state_payload jsonb not null,
  generated_draft_bytes bytea null,
  created_at timestamptz not null default now(),

  constraint filing_preparation_current_state_riskpath_revision_unique
    unique (riskpath_record_id, revision),

  constraint filing_preparation_current_state_payload_identity_check
    check (
      jsonb_typeof(state_payload) = 'object'
      and state_payload ?& array[
        'schemaVersion',
        'recordClass',
        'filingPreparationCurrentStateId',
        'authenticatedUserId',
        'riskpathRecordId',
        'revision',
        'preparationSnapshot',
        'generatedDraftBinding',
        'ownerReviewBinding',
        'stageF',
        'packetComposition',
        'signing',
        'filing',
        'courtSubmission',
        'service',
        'legalSufficiency',
        'autonomousExecution'
      ]
      and state_payload ->> 'filingPreparationCurrentStateId'
        = filing_preparation_current_state_id
      and state_payload ->> 'authenticatedUserId' = user_id::text
      and state_payload ->> 'riskpathRecordId' = riskpath_record_id::text
      and state_payload ->> 'revision' = revision::text
      and state_payload ->> 'schemaVersion' = '1'
      and state_payload ->> 'recordClass' = 'FILING_PREPARATION_CURRENT_STATE'
      and jsonb_typeof(state_payload -> 'preparationSnapshot') = 'object'
      and not (state_payload ? 'generatedDraftCurrentness')
      and state_payload ->> 'stageF' = 'HELD'
      and state_payload ->> 'packetComposition' = 'NOT_PERFORMED'
      and state_payload ->> 'signing' = 'NOT_PERFORMED'
      and state_payload ->> 'filing' = 'NOT_PERFORMED'
      and state_payload ->> 'courtSubmission' = 'NOT_PERFORMED'
      and state_payload ->> 'service' = 'NOT_PERFORMED'
      and state_payload ->> 'legalSufficiency' = 'NOT_EVALUATED'
      and state_payload ->> 'autonomousExecution' = 'NOT_AUTHORIZED'
    ),

  constraint filing_preparation_current_state_generated_binding_check
    check (
      (
        state_payload -> 'generatedDraftBinding' = 'null'::jsonb
        and generated_draft_bytes is null
      )
      or
      (
        jsonb_typeof(state_payload -> 'generatedDraftBinding') = 'object'
        and generated_draft_bytes is not null
        and state_payload #>> '{generatedDraftBinding,revision}' = revision::text
        and jsonb_typeof(state_payload #> '{generatedDraftBinding,generatedDraft}') = 'object'
        and (state_payload #>> '{generatedDraftBinding,generatedDraft,generatedByteLength}')::bigint
          = octet_length(generated_draft_bytes)
      )
    ),

  constraint filing_preparation_current_state_owner_review_binding_check
    check (
      state_payload -> 'ownerReviewBinding' = 'null'::jsonb
      or
      (
        jsonb_typeof(state_payload -> 'ownerReviewBinding') = 'object'
        and jsonb_typeof(state_payload -> 'generatedDraftBinding') = 'object'
        and state_payload #>> '{ownerReviewBinding,revision}' = revision::text
        and jsonb_typeof(state_payload #> '{ownerReviewBinding,ownerReviewEvidence}') = 'object'
        and state_payload #>> '{ownerReviewBinding,ownerReviewEvidence,generatedDraft,generatedDocumentId}'
          = state_payload #>> '{generatedDraftBinding,generatedDraft,generatedDocumentId}'
      )
    )
);

create index filing_preparation_current_state_owner_riskpath_revision_idx
  on public.filing_preparation_current_state_revisions
    (user_id, riskpath_record_id, revision desc);

alter table public.filing_preparation_current_state_revisions enable row level security;
alter table public.filing_preparation_current_state_revisions force row level security;

revoke all on public.filing_preparation_current_state_revisions from anon, authenticated;
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
