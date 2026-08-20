-- 058_e2_3b_filing_preparation_records.sql
-- E2.3B — Preview-only durable FilingPreparationRecord persistence substrate.
-- Append-only customer/runtime authority: authenticated owners may INSERT and SELECT only
-- when the row is bound to a RiskPath they own. No UPDATE/DELETE customer authority.

create table public.filing_preparation_records (
  filing_preparation_record_id text primary key
    check (filing_preparation_record_id ~ '^filing-preparation-record:sha256:[0-9a-f]{64}$'),
  user_id uuid not null references public.users(id) on delete cascade,
  riskpath_record_id uuid not null references public.riskpath_records(id) on delete cascade,
  record_payload jsonb not null,
  created_at timestamptz not null default now(),

  constraint filing_preparation_records_payload_identity_check
    check (
      record_payload ->> 'filingPreparationRecordId' = filing_preparation_record_id
      and record_payload ->> 'recordClass' = 'FILING_PREPARATION_RECORD'
      and record_payload ->> 'persistenceContract' = 'SATISFIED'
      and record_payload ->> 'persistence' = 'NOT_PERFORMED'
      and record_payload ->> 'stageF' = 'HELD'
      and record_payload ->> 'signing' = 'NOT_PERFORMED'
      and record_payload ->> 'filing' = 'NOT_PERFORMED'
      and record_payload ->> 'courtSubmission' = 'NOT_PERFORMED'
      and record_payload ->> 'courtAcceptance' = 'NOT_EVALUATED'
      and record_payload ->> 'service' = 'NOT_PERFORMED'
      and record_payload ->> 'packetComposition' = 'NOT_PERFORMED'
      and record_payload ->> 'legalSufficiency' = 'NOT_EVALUATED'
      and record_payload ->> 'autonomousExecution' = 'NOT_AUTHORIZED'
    )
);

create index filing_preparation_records_user_idx
  on public.filing_preparation_records (user_id);

create index filing_preparation_records_riskpath_idx
  on public.filing_preparation_records (riskpath_record_id);

alter table public.filing_preparation_records enable row level security;
alter table public.filing_preparation_records force row level security;

revoke all on public.filing_preparation_records from anon, authenticated;
grant select, insert on public.filing_preparation_records to authenticated;

create policy filing_preparation_records_owner_select
  on public.filing_preparation_records
  for select
  to authenticated
  using (
    user_id = auth.uid()
    and exists (
      select 1
      from public.riskpath_records rp
      where rp.id = riskpath_record_id
        and rp.user_id = auth.uid()
    )
  );

create policy filing_preparation_records_owner_insert
  on public.filing_preparation_records
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.riskpath_records rp
      where rp.id = riskpath_record_id
        and rp.user_id = auth.uid()
    )
  );
