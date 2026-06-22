-- 006_audit_exports_fields.sql
-- Slice 4a of Supabase audit-durability per broker ruling 2026-06-21
--   (slice4_export_cliff_resolver_wiring_broker_ruling_response_2026-06-21.md §2.4).
-- Reconciles the 002 audit_exports table to the ruling's eleven-field export-log
-- schema and adds the failure-path columns. Purely additive plus a nullability
-- relax and a constraint swap. The table is empty in production (no export has
-- ever run), so this is non-destructive. No gate flip.

-- New columns required by the ruling's field table (§2.4). id / exported_at /
-- included_held / row_count already exist from 002.
alter table public.audit_exports add column if not exists operator         text not null default 'jack_taglyan_caldre_b9445457';
alter table public.audit_exports add column if not exists tables           text[];
alter table public.audit_exports add column if not exists date_range_start timestamptz;
alter table public.audit_exports add column if not exists date_range_end   timestamptz;
alter table public.audit_exports add column if not exists reason           text;
alter table public.audit_exports add column if not exists cli_version      text;
alter table public.audit_exports add column if not exists host_fingerprint text;

-- Failure-path columns (§2.4 requirement 2): populated only if the export query
-- fails AFTER the row was inserted. The row stays as the canonical record of
-- intent; the file is the artifact. They can diverge on the failure path, and
-- that divergence is itself auditable.
alter table public.audit_exports add column if not exists failed_at        timestamptz;
alter table public.audit_exports add column if not exists failure_reason   text;

-- 002 defined exported_by / export_scope as NOT NULL with no default. The
-- ruling's field set uses operator / tables / reason instead, and the CLI does
-- not populate the legacy columns. Relax their NOT NULL so they do not block the
-- CLI's inserts. Columns are kept, not dropped (ruling §4: "existing ... may
-- stay or map").
alter table public.audit_exports alter column exported_by  drop not null;
alter table public.audit_exports alter column export_scope drop not null;

-- The 002 held-row CHECK keyed off justification; the ruling's required field is
-- reason. Swap the constraint so held-row exports are gated on reason instead.
-- reason is required for EVERY export at the CLI (min 12 chars); this DB-level
-- check is the belt-and-suspenders for the held-row case.
alter table public.audit_exports drop constraint if exists audit_exports_held_requires_justification;
alter table public.audit_exports add  constraint audit_exports_held_requires_reason
  check (included_held = false or reason is not null);

-- Note: the date-range export query filters each TARGET table's decided_at, and
-- those tables already carry a decided_at index from 002. The audit_exports
-- decided_at index from 002 is unchanged. No new index is required here.
