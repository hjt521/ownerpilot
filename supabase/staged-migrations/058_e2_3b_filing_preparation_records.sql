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
      jsonb_typeof(record_payload) = 'object'
      and record_payload ? 'filingPreparationRecordId'
      and record_payload ->> 'filingPreparationRecordId' = filing_preparation_record_id
      and record_payload @> '{
        "schemaVersion": 1,
        "recordClass": "FILING_PREPARATION_RECORD",
        "persistenceContract": "SATISFIED",
        "persistence": "NOT_PERFORMED",
        "stageF": "HELD",
        "signing": "NOT_PERFORMED",
        "filing": "NOT_PERFORMED",
        "courtSubmission": "NOT_PERFORMED",
        "courtAcceptance": "NOT_EVALUATED",
        "service": "NOT_PERFORMED",
        "packetComposition": "NOT_PERFORMED",
        "legalSufficiency": "NOT_EVALUATED",
        "autonomousExecution": "NOT_AUTHORIZED"
      }'::jsonb
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
