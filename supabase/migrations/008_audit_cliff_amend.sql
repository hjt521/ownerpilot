-- 008_audit_cliff_amend.sql
-- Slice 4b of Supabase audit-durability per broker ruling 2026-06-21
--   (slice4_export_cliff_resolver_wiring_broker_ruling_response_2026-06-21.md §2.5–§2.6).
-- Amends audit_cliff to:
--   1. Accept an optional p_table so the live-cliff CLI can scope to ONE table
--      per invocation (ruling §2.5 req 4); p_table = null preserves the
--      all-tables pass the pg_cron dry-run uses (ruling §2.5 req 1).
--   2. Write one cliff_runs row per processed table, for BOTH dry-run and live
--      (ruling §2.6) — the scheduled dry-run has no app code in the loop, so the
--      function itself is the cliff_runs writer.
--   3. Add cliff_runs as the eighth cliffable table (ruling §2.6 req 4).
--   4. Carry triggered_by / reason through for the cliff_runs row.
-- The legal_hold + grace pre-filtering from 002 is preserved (ruling §2.6 req 1).
-- No autonomous deletion is introduced; this only changes WHAT the function
-- records and HOW it can be scoped — the live delete still requires an explicit
-- false dry-run, which only the broker-run CLI ever passes. No gate flip.

create or replace function public.audit_cliff(
  p_dry_run      boolean default true,
  p_table        text    default null,
  p_triggered_by text    default 'pg_cron',
  p_reason       text    default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_all_tables text[] := array[
    'geocode_audit_log', 'manual_review_queue', 'classifier_audit_log',
    'rate_limit_events', 'audit_deletion_incidents', 'audit_access_grants',
    'audit_exports', 'cliff_runs'
  ];
  v_tables        text[];
  v_table         text;
  v_n_hard        bigint;
  v_n_grace       bigint;
  v_n_held        bigint;
  v_deleted       bigint;
  v_would_total   bigint := 0;
  v_deleted_total bigint := 0;
  v_held_total    bigint := 0;
  v_grace_total   bigint := 0;
  v_error_total   bigint := 0;
begin
  if p_table is null then
    v_tables := v_all_tables;
  elsif p_table = any(v_all_tables) then
    v_tables := array[p_table];
  else
    raise exception 'audit_cliff: unknown table %', p_table using errcode = 'check_violation';
  end if;

  foreach v_table in array v_tables loop
    begin
      -- counts computed BEFORE mutation so dry-run and live report consistently.
      execute format(
        'select count(*) from public.%I where soft_deleted_at is not null and soft_deleted_at < now() - interval ''90 days'' and legal_hold = false',
        v_table) into v_n_hard;
      execute format(
        'select count(*) from public.%I where decided_at < now() - interval ''7 years'' and legal_hold = false and (soft_deleted_at is null or soft_deleted_at >= now() - interval ''90 days'')',
        v_table) into v_n_grace;
      execute format(
        'select count(*) from public.%I where decided_at < now() - interval ''7 years'' and legal_hold = true',
        v_table) into v_n_held;

      v_deleted := 0;
      if not p_dry_run then
        -- soft-mark at the 7-year cliff (skip held, skip already-marked).
        execute format(
          'update public.%I set soft_deleted_at = now() where decided_at < now() - interval ''7 years'' and soft_deleted_at is null and legal_hold = false',
          v_table);
        -- hard-delete after the 90-day grace (skip held).
        execute format(
          'delete from public.%I where soft_deleted_at is not null and soft_deleted_at < now() - interval ''90 days'' and legal_hold = false',
          v_table);
        get diagnostics v_deleted = row_count;
        -- meta-audit the held-past-cliff rows the cliff opted not to delete.
        if v_n_held > 0 then
          insert into public.audit_deletion_incidents (incident_type, target_table, detail)
          values ('cliff_held_skip', v_table, jsonb_build_object('held_rows_past_cliff', v_n_held));
        end if;
      end if;

      insert into public.cliff_runs (
        dry_run, table_name, would_delete_count, deleted_count,
        held_skip_count, grace_skip_count, error_count, error_summary,
        triggered_by, cli_reason
      ) values (
        p_dry_run, v_table,
        case when p_dry_run then v_n_hard::int else null end,
        case when not p_dry_run then v_deleted::int else null end,
        v_n_held::int, v_n_grace::int, 0, null,
        p_triggered_by, p_reason
      );

      v_would_total   := v_would_total   + case when p_dry_run then v_n_hard else 0 end;
      v_deleted_total := v_deleted_total + case when not p_dry_run then v_deleted else 0 end;
      v_held_total    := v_held_total    + v_n_held;
      v_grace_total   := v_grace_total   + v_n_grace;
    exception
      when others then
        -- record the failure as its own cliff_runs row and keep going.
        insert into public.cliff_runs (
          dry_run, table_name, would_delete_count, deleted_count,
          held_skip_count, grace_skip_count, error_count, error_summary,
          triggered_by, cli_reason
        ) values (
          p_dry_run, v_table, null, null, null, null, 1, sqlstate,
          p_triggered_by, p_reason
        );
        v_error_total := v_error_total + 1;
    end;
  end loop;

  return jsonb_build_object(
    'dry_run', p_dry_run,
    'tables_processed', array_length(v_tables, 1),
    'would_delete_total', v_would_total,
    'deleted_total', v_deleted_total,
    'held_skip_total', v_held_total,
    'grace_skip_total', v_grace_total,
    'error_total', v_error_total
  );
end;
$$;
