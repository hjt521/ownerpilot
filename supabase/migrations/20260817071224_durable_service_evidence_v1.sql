-- 20260817071224_durable_service_evidence_v1.sql
-- Durable Service Evidence V1 — exact Created Notice identity, append-only service history,
-- private evidence storage, and cross-device evidence provenance. Legacy RiskPath rows are not backfilled.

-- ---------------------------------------------------------------------------
-- Exact Created Notice binding on RiskPath
-- ---------------------------------------------------------------------------
alter table public.riskpath_records
  add column created_notice_artifact_id uuid,
  add column created_notice_service_date date,
  add column created_notice_generation text,
  add column created_notice_semantic_binding_id text,
  add column created_notice_finalized_at timestamptz;

alter table public.riskpath_records
  add constraint riskpath_created_notice_binding_together_check
  check (
    num_nonnulls(
      created_notice_artifact_id,
      created_notice_service_date,
      created_notice_generation,
      created_notice_semantic_binding_id
    ) in (0, 4)
    and (
      created_notice_finalized_at is null
      or num_nonnulls(
        created_notice_artifact_id,
        created_notice_service_date,
        created_notice_generation,
        created_notice_semantic_binding_id
      ) = 4
    )
  );

alter table public.riskpath_records
  add constraint riskpath_created_notice_artifact_id_unique unique (created_notice_artifact_id);

-- Required for exact-pair composite foreign keys. Generation is intentionally NOT unique:
-- equal material Create state on two separate generation events is allowed.
alter table public.riskpath_records
  add constraint riskpath_created_notice_pair_unique unique (id, created_notice_artifact_id);

create or replace function public.enforce_riskpath_created_notice_identity_immutability()
returns trigger
language plpgsql
as $$
begin
  -- Legacy/unbound rows are never upgraded heuristically after insert.
  if old.created_notice_artifact_id is null
     and new.created_notice_artifact_id is not null then
    raise exception 'Created Notice identity must be established at RiskPath insert';
  end if;

  if old.created_notice_artifact_id is not null then
    if new.created_notice_artifact_id is distinct from old.created_notice_artifact_id
       or new.created_notice_service_date is distinct from old.created_notice_service_date
       or new.created_notice_generation is distinct from old.created_notice_generation
       or new.created_notice_semantic_binding_id is distinct from old.created_notice_semantic_binding_id then
      raise exception 'Created Notice identity is immutable';
    end if;
  end if;

  if old.created_notice_finalized_at is not null
     and new.created_notice_finalized_at is distinct from old.created_notice_finalized_at then
    raise exception 'Created Notice finalization is immutable';
  end if;

  return new;
end;
$$;

create trigger riskpath_created_notice_identity_immutability
before update on public.riskpath_records
for each row execute function public.enforce_riskpath_created_notice_identity_immutability();

-- ---------------------------------------------------------------------------
-- Canonical append-only service events
-- ---------------------------------------------------------------------------
create table public.service_events (
  id                           uuid primary key default gen_random_uuid(),
  riskpath_record_id           uuid not null,
  created_notice_artifact_id   uuid not null,
  attempt_date                 date not null,
  method                       text not null check (method in ('personal', 'substituted', 'post_and_mail')),
  outcome                      text not null check (outcome in ('SUCCESS', 'FAILED')),
  mailing_date                 date,
  notes                        text check (notes is null or char_length(notes) <= 4000),
  server_name                  text not null check (char_length(server_name) between 1 and 200),
  server_address               text not null check (char_length(server_address) between 1 and 500),
  server_age18_plus            boolean not null,
  server_party_to_notice       boolean not null,
  client_recorded_at           timestamptz not null,
  timezone_offset_minutes      integer not null check (timezone_offset_minutes between -840 and 840),
  correction_of_service_event_id uuid,
  created_by_user_id           uuid not null,
  server_received_at           timestamptz not null default now(),
  created_at                   timestamptz not null default now(),
  constraint service_events_exact_notice_fk
    foreign key (riskpath_record_id, created_notice_artifact_id)
    references public.riskpath_records (id, created_notice_artifact_id)
    on delete cascade,
  constraint service_events_exact_identity_unique
    unique (id, riskpath_record_id, created_notice_artifact_id),
  constraint service_events_correction_same_notice_fk
    foreign key (correction_of_service_event_id, riskpath_record_id, created_notice_artifact_id)
    references public.service_events (id, riskpath_record_id, created_notice_artifact_id)
);

create index service_events_riskpath_created_idx
  on public.service_events (riskpath_record_id, created_at, id);

create or replace function public.enforce_service_event_finalized_notice()
returns trigger
language plpgsql
as $$
begin
  if not exists (
    select 1
    from public.riskpath_records r
    where r.id = new.riskpath_record_id
      and r.created_notice_artifact_id = new.created_notice_artifact_id
      and r.created_notice_finalized_at is not null
      and r.soft_deleted_at is null
  ) then
    raise exception 'Service event requires a finalized exact Created Notice binding';
  end if;
  return new;
end;
$$;

create trigger service_events_require_finalized_notice
before insert on public.service_events
for each row execute function public.enforce_service_event_finalized_notice();

create or replace function public.prevent_service_event_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'Service events are append-only; record a correction event instead';
end;
$$;

create trigger service_events_append_only
before update or delete on public.service_events
for each row execute function public.prevent_service_event_mutation();

alter table public.service_events enable row level security;
revoke all on public.service_events from anon, authenticated;
grant select, insert on public.service_events to service_role;

-- ---------------------------------------------------------------------------
-- Evidence assets: pending upload intent -> server-verified immutable admission
-- ---------------------------------------------------------------------------
create table public.service_evidence_assets (
  id                           uuid primary key default gen_random_uuid(),
  riskpath_record_id           uuid not null,
  created_notice_artifact_id   uuid not null,
  service_event_id             uuid not null,
  evidence_kind                text not null check (evidence_kind in (
    'POSTING_PHOTO',
    'MAILING_ENVELOPE_PHOTO',
    'PROOF_OF_MAILING',
    'SERVICE_PHOTO',
    'OTHER_SERVICE_DOCUMENT'
  )),
  storage_object_path          text not null unique check (
    storage_object_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}$'
  ),
  original_filename            text not null check (char_length(original_filename) between 1 and 255),
  declared_mime_type           text not null check (declared_mime_type in ('image/jpeg', 'image/png', 'application/pdf')),
  declared_byte_size           bigint not null check (declared_byte_size between 1 and 6291456),
  verified_mime_type           text check (verified_mime_type is null or verified_mime_type in ('image/jpeg', 'image/png', 'application/pdf')),
  verified_byte_size           bigint check (verified_byte_size is null or verified_byte_size between 1 and 6291456),
  server_sha256                text check (server_sha256 is null or server_sha256 ~ '^[0-9a-f]{64}$'),
  capture_source               text not null check (capture_source in ('CAMERA_INTENT', 'FILE_PICKER', 'DOCUMENT_UPLOAD')),
  geo_status                   text not null check (geo_status in ('CAPTURED', 'PERMISSION_DENIED', 'UNAVAILABLE', 'OPTED_OUT', 'NOT_REQUESTED')),
  geo_source                   text check (geo_source is null or geo_source in ('DEVICE_BROWSER_GEOLOCATION', 'FILE_EMBEDDED_EXIF')),
  latitude                     double precision check (latitude is null or latitude between -90 and 90),
  longitude                    double precision check (longitude is null or longitude between -180 and 180),
  accuracy_meters              double precision check (accuracy_meters is null or accuracy_meters >= 0),
  geo_client_captured_at       timestamptz,
  device_class                 text not null check (device_class in ('MOBILE', 'TABLET', 'DESKTOP', 'UNKNOWN')),
  platform_family              text not null check (char_length(platform_family) between 1 and 80),
  browser_family               text not null check (char_length(browser_family) between 1 and 80),
  client_recorded_at           timestamptz not null,
  timezone_offset_minutes      integer not null check (timezone_offset_minutes between -840 and 840),
  correction_of_evidence_id    uuid,
  created_by_user_id           uuid not null,
  server_received_at           timestamptz not null default now(),
  admitted_at                  timestamptz,
  created_at                   timestamptz not null default now(),
  constraint service_evidence_geo_shape_check check (
    (
      geo_status = 'CAPTURED'
      and geo_source is not null
      and latitude is not null
      and longitude is not null
      and accuracy_meters is not null
      and geo_client_captured_at is not null
    )
    or
    (
      geo_status <> 'CAPTURED'
      and geo_source is null
      and latitude is null
      and longitude is null
      and accuracy_meters is null
      and geo_client_captured_at is null
    )
  ),
  constraint service_evidence_admission_shape_check check (
    (
      admitted_at is null
      and verified_mime_type is null
      and verified_byte_size is null
      and server_sha256 is null
    )
    or
    (
      admitted_at is not null
      and verified_mime_type is not null
      and verified_byte_size is not null
      and server_sha256 is not null
    )
  ),
  constraint service_evidence_exact_event_fk
    foreign key (service_event_id, riskpath_record_id, created_notice_artifact_id)
    references public.service_events (id, riskpath_record_id, created_notice_artifact_id),
  constraint service_evidence_exact_identity_unique
    unique (id, riskpath_record_id, created_notice_artifact_id, service_event_id),
  constraint service_evidence_correction_same_event_fk
    foreign key (correction_of_evidence_id, riskpath_record_id, created_notice_artifact_id, service_event_id)
    references public.service_evidence_assets (id, riskpath_record_id, created_notice_artifact_id, service_event_id)
);

create index service_evidence_assets_event_created_idx
  on public.service_evidence_assets (service_event_id, created_at, id);

create or replace function public.enforce_service_evidence_identity_and_admission()
returns trigger
language plpgsql
as $$
begin
  if not exists (
    select 1
    from public.riskpath_records r
    where r.id = new.riskpath_record_id
      and r.created_notice_artifact_id = new.created_notice_artifact_id
      and r.created_notice_finalized_at is not null
      and r.soft_deleted_at is null
  ) then
    raise exception 'Evidence requires a finalized exact Created Notice binding';
  end if;

  if tg_op = 'UPDATE' then
    if new.id is distinct from old.id
       or new.riskpath_record_id is distinct from old.riskpath_record_id
       or new.created_notice_artifact_id is distinct from old.created_notice_artifact_id
       or new.service_event_id is distinct from old.service_event_id
       or new.evidence_kind is distinct from old.evidence_kind
       or new.storage_object_path is distinct from old.storage_object_path
       or new.original_filename is distinct from old.original_filename
       or new.declared_mime_type is distinct from old.declared_mime_type
       or new.declared_byte_size is distinct from old.declared_byte_size
       or new.capture_source is distinct from old.capture_source
       or new.geo_status is distinct from old.geo_status
       or new.geo_source is distinct from old.geo_source
       or new.latitude is distinct from old.latitude
       or new.longitude is distinct from old.longitude
       or new.accuracy_meters is distinct from old.accuracy_meters
       or new.geo_client_captured_at is distinct from old.geo_client_captured_at
       or new.device_class is distinct from old.device_class
       or new.platform_family is distinct from old.platform_family
       or new.browser_family is distinct from old.browser_family
       or new.client_recorded_at is distinct from old.client_recorded_at
       or new.timezone_offset_minutes is distinct from old.timezone_offset_minutes
       or new.correction_of_evidence_id is distinct from old.correction_of_evidence_id
       or new.created_by_user_id is distinct from old.created_by_user_id
       or new.server_received_at is distinct from old.server_received_at
       or new.created_at is distinct from old.created_at then
      raise exception 'Evidence identity and capture provenance are immutable';
    end if;

    if old.admitted_at is not null then
      if new.admitted_at is distinct from old.admitted_at
         or new.verified_mime_type is distinct from old.verified_mime_type
         or new.verified_byte_size is distinct from old.verified_byte_size
         or new.server_sha256 is distinct from old.server_sha256 then
        raise exception 'Admitted evidence is immutable';
      end if;
    elsif new.admitted_at is not null then
      if new.verified_mime_type is null
         or new.verified_byte_size is null
         or new.server_sha256 is null then
        raise exception 'Evidence admission requires server verification fields';
      end if;
    elsif new.verified_mime_type is not null
       or new.verified_byte_size is not null
       or new.server_sha256 is not null then
      raise exception 'Evidence verification fields require admission';
    end if;
  end if;

  return new;
end;
$$;

create trigger service_evidence_identity_and_admission
before insert or update on public.service_evidence_assets
for each row execute function public.enforce_service_evidence_identity_and_admission();

create or replace function public.prevent_service_evidence_delete()
returns trigger
language plpgsql
as $$
begin
  raise exception 'Evidence history is append-preserving';
end;
$$;

create trigger service_evidence_no_delete
before delete on public.service_evidence_assets
for each row execute function public.prevent_service_evidence_delete();

alter table public.service_evidence_assets enable row level security;
revoke all on public.service_evidence_assets from anon, authenticated;
grant select, insert, update on public.service_evidence_assets to service_role;

-- Private Storage bucket. Object keys are generated server-side from opaque UUIDs only;
-- no property, tenant, owner, filename, or other PII appears in the durable object path.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'ownerpilot-service-evidence-v1',
  'ownerpilot-service-evidence-v1',
  false,
  6291456,
  array['image/jpeg', 'image/png', 'application/pdf']::text[]
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;
