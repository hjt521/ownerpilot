-- 20260817212200_stamped_service_evidence_v1.sql
-- Shared stamped-photo/GPS substrate for optional 3-Day Notice evidence and future SPARE-ready UD proof.
-- Additive Preview capability slice; no 2027 statutory gate or Production activation is created here.

-- New capture provenance is registered before evidence admission. Existing admitted evidence receives no
-- heuristic backfill: existing-file rows remain supplemental by source, and old camera-intent rows remain legacy.
create table public.service_evidence_capture_provenance (
  id                           uuid primary key default gen_random_uuid(),
  riskpath_record_id           uuid not null,
  created_notice_artifact_id   uuid not null,
  service_event_id             uuid not null,
  evidence_id                  uuid not null,
  capture_classification       text not null check (capture_classification in (
    'CONTEMPORANEOUS_CAMERA_INTENT',
    'SUPPLEMENTAL_EXISTING_FILE'
  )),
  capture_client_at            timestamptz,
  created_by_user_id           uuid not null,
  server_registered_at         timestamptz not null default now(),
  constraint service_evidence_capture_provenance_exact_evidence_fk
    foreign key (evidence_id, riskpath_record_id, created_notice_artifact_id, service_event_id)
    references public.service_evidence_assets (id, riskpath_record_id, created_notice_artifact_id, service_event_id),
  constraint service_evidence_capture_provenance_exact_unique
    unique (evidence_id, riskpath_record_id, created_notice_artifact_id, service_event_id),
  constraint service_evidence_capture_provenance_shape_check
    check (
      (capture_classification = 'CONTEMPORANEOUS_CAMERA_INTENT' and capture_client_at is not null)
      or
      (capture_classification = 'SUPPLEMENTAL_EXISTING_FILE' and capture_client_at is null)
    )
);

create index service_evidence_capture_provenance_record_idx
  on public.service_evidence_capture_provenance (riskpath_record_id, server_registered_at, id);

create or replace function public.enforce_service_evidence_capture_provenance_source()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if not exists (
    select 1
    from public.service_evidence_assets e
    join public.riskpath_records r
      on r.id = e.riskpath_record_id
     and r.created_notice_artifact_id = e.created_notice_artifact_id
    where e.id = new.evidence_id
      and e.riskpath_record_id = new.riskpath_record_id
      and e.created_notice_artifact_id = new.created_notice_artifact_id
      and e.service_event_id = new.service_event_id
      and e.admitted_at is null
      and (
        (
          e.capture_source = 'CAMERA_INTENT'
          and e.declared_mime_type in ('image/jpeg', 'image/png')
          and new.capture_classification = 'CONTEMPORANEOUS_CAMERA_INTENT'
          and new.capture_client_at is not null
        )
        or
        (
          e.capture_source in ('FILE_PICKER', 'DOCUMENT_UPLOAD')
          and new.capture_classification = 'SUPPLEMENTAL_EXISTING_FILE'
          and new.capture_client_at is null
        )
      )
      and r.created_notice_finalized_at is not null
      and r.soft_deleted_at is null
  ) then
    raise exception 'Capture provenance requires exact pending evidence with matching factual capture source';
  end if;
  return new;
end;
$$;

create trigger service_evidence_capture_provenance_require_exact_source
before insert on public.service_evidence_capture_provenance
for each row execute function public.enforce_service_evidence_capture_provenance_source();

create or replace function public.prevent_service_evidence_capture_provenance_mutation()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  raise exception 'Evidence capture provenance is immutable';
end;
$$;

create trigger service_evidence_capture_provenance_append_only
before update or delete on public.service_evidence_capture_provenance
for each row execute function public.prevent_service_evidence_capture_provenance_mutation();

alter table public.service_evidence_capture_provenance enable row level security;
revoke all on public.service_evidence_capture_provenance from anon, authenticated;
grant select, insert on public.service_evidence_capture_provenance to service_role;

-- One immutable stamped derivative per exact admitted contemporaneous camera evidence item.
create table public.service_evidence_derivatives (
  id                           uuid primary key default gen_random_uuid(),
  riskpath_record_id           uuid not null,
  created_notice_artifact_id   uuid not null,
  service_event_id             uuid not null,
  evidence_id                  uuid not null,
  derivative_kind              text not null check (derivative_kind = 'STAMPED_PHOTO_PDF_V1'),
  storage_object_path          text not null unique check (
    storage_object_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}$'
  ),
  verified_mime_type           text not null check (verified_mime_type = 'application/pdf'),
  verified_byte_size           bigint not null check (verified_byte_size between 1 and 6291456),
  server_sha256                text not null check (server_sha256 ~ '^[0-9a-f]{64}$'),
  source_server_sha256         text not null check (source_server_sha256 ~ '^[0-9a-f]{64}$'),
  capture_classification       text not null check (capture_classification = 'CONTEMPORANEOUS_CAMERA_INTENT'),
  capture_client_at            timestamptz not null,
  stamp_schema_version         text not null check (stamp_schema_version = 'STAMP_V1'),
  stamp_payload                jsonb not null,
  server_created_at            timestamptz not null default now(),
  constraint service_evidence_derivatives_exact_evidence_fk
    foreign key (evidence_id, riskpath_record_id, created_notice_artifact_id, service_event_id)
    references public.service_evidence_assets (id, riskpath_record_id, created_notice_artifact_id, service_event_id),
  constraint service_evidence_derivatives_exact_provenance_fk
    foreign key (evidence_id, riskpath_record_id, created_notice_artifact_id, service_event_id)
    references public.service_evidence_capture_provenance (evidence_id, riskpath_record_id, created_notice_artifact_id, service_event_id),
  constraint service_evidence_derivatives_exact_evidence_unique
    unique (evidence_id, riskpath_record_id, created_notice_artifact_id, service_event_id)
);

create index service_evidence_derivatives_exact_evidence_fk_idx
  on public.service_evidence_derivatives (evidence_id, riskpath_record_id, created_notice_artifact_id, service_event_id);
create index service_evidence_derivatives_record_created_idx
  on public.service_evidence_derivatives (riskpath_record_id, server_created_at, id);

create or replace function public.enforce_service_evidence_derivative_source()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if not exists (
    select 1
    from public.service_evidence_assets e
    join public.service_evidence_capture_provenance p
      on p.evidence_id = e.id
     and p.riskpath_record_id = e.riskpath_record_id
     and p.created_notice_artifact_id = e.created_notice_artifact_id
     and p.service_event_id = e.service_event_id
    join public.riskpath_records r
      on r.id = e.riskpath_record_id
     and r.created_notice_artifact_id = e.created_notice_artifact_id
    where e.id = new.evidence_id
      and e.riskpath_record_id = new.riskpath_record_id
      and e.created_notice_artifact_id = new.created_notice_artifact_id
      and e.service_event_id = new.service_event_id
      and e.admitted_at is not null
      and e.server_sha256 = new.source_server_sha256
      and e.verified_mime_type in ('image/jpeg', 'image/png')
      and p.capture_classification = 'CONTEMPORANEOUS_CAMERA_INTENT'
      and p.capture_client_at = new.capture_client_at
      and new.capture_classification = p.capture_classification
      and r.created_notice_finalized_at is not null
      and r.soft_deleted_at is null
  ) then
    raise exception 'Stamped derivative requires exact admitted contemporaneous camera evidence and frozen provenance';
  end if;
  return new;
end;
$$;

create trigger service_evidence_derivatives_require_exact_source
before insert on public.service_evidence_derivatives
for each row execute function public.enforce_service_evidence_derivative_source();

create or replace function public.prevent_service_evidence_derivative_mutation()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  raise exception 'Stamped evidence derivatives are immutable';
end;
$$;

create trigger service_evidence_derivatives_append_only
before update or delete on public.service_evidence_derivatives
for each row execute function public.prevent_service_evidence_derivative_mutation();

alter table public.service_evidence_derivatives enable row level security;
revoke all on public.service_evidence_derivatives from anon, authenticated;
grant select, insert on public.service_evidence_derivatives to service_role;
