-- 012_rtc_refresh_run_results.sql
-- RTC form-refresh substrate — append-only run-result record (step (e) store, part 1 of 3).
--
-- Authorized by: la_rtc_refresh_runner_architecture broker ruling chain (substrate
-- portion authorized 2026-06-23; runner + the two app-READABLE tables
-- rtc_refresh_state / rtc_refresh_pins deferred to the runner-architecture ruling
-- because their RLS read-posture is entangled with the service_role-in-Vercel
-- standing rail). This migration creates ONLY the append-only run-result table,
-- whose access pattern is unambiguous and mirrors 011 verbatim.
--
-- Implements the typed RefreshStateStore.recordRunResult() persistence target.
-- The runRefresh() core (lib/jurisdiction/rtcRefresh/rtcRefreshJob.ts) writes one
-- row per full nine-language run. This table is the durable record of when the
-- refresh ran and what each language resolved to.
--
-- WRITE PATH: append-only. Written by whichever runner the runner-architecture
-- ruling selects; no read by the serve path (run history is operator/monitor
-- -side, read out-of-band). Because there is NO app-side read requirement, the
-- 011 INSERT-only-no-SELECT wall applies exactly. (Contrast rtc_refresh_state /
-- rtc_refresh_pins, which the serve path MUST read — those are deferred.)
--
-- SCOPE: run-result rows ONLY. Per-language block state and serve-time pins are
-- the two deferred tables; they are NOT created here. Expanding this table to
-- carry mutable state would conflate append-only audit with mutable runtime
-- state — a substrate conflation that must not happen by accretion.
--
-- RETENTION: lean, mirroring 011 — the minimal schema OMITS the audit_record base
-- columns (retention_class / legal_hold / soft_deleted_at), so it is NOT attached
-- to refuse_delete_held or the audit_cliff function. Run-history is small and
-- read only in recent windows; a retention posture is a separate ruling if ever
-- wanted (same deferred gap as 010/011).

create table if not exists public.rtc_refresh_run_results (
  id            uuid        primary key default gen_random_uuid(),
  run_at        timestamptz not null default now(),  -- ISO run timestamp (matches RefreshRunResult.runAt)
  all_failed    boolean     not null,                -- Q2 all-9-failed critical escalation flag
  outcomes      jsonb       not null                 -- LanguageRefreshOutcome[] as written by runRefresh()
);

create index if not exists rtc_refresh_run_results_run_at_idx
  on public.rtc_refresh_run_results (run_at);

-- ---------------------------------------------------------------------------
-- RLS: APP-WRITTEN audit-table posture, mirroring 011 (geocode_dispositions)
-- and 002 (geocode_audit_log / classifier_audit_log) VERBATIM. The runner writes
-- as whatever identity the runner-architecture ruling selects; under the standing
-- rail the app runs as anon in Vercel runtime, so anon may INSERT and may NOT
-- read. No select policy: the writer appends and reads back zero rows; run
-- history is read out-of-band via service_role (RLS bypass, operator-local).
--
-- NOTE: this INSERT-only wall is correct here precisely BECAUSE no serve-path read
-- exists for run-results. The two deferred tables (rtc_refresh_state,
-- rtc_refresh_pins) cannot use this wall — the serve path must read them — which
-- is why their RLS posture is a runner-architecture-ruling decision, not replicated
-- from 011 here.
-- ---------------------------------------------------------------------------
alter table public.rtc_refresh_run_results enable row level security;
revoke all on public.rtc_refresh_run_results from anon, authenticated;
grant insert on public.rtc_refresh_run_results to anon, authenticated;
create policy "app insert only" on public.rtc_refresh_run_results
  for insert to anon, authenticated with check (true);
