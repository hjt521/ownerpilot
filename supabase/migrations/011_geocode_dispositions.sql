-- 011_geocode_dispositions.sql
-- Slice 8 deliverable 4b — durable disposition oracle (the §8 monitor's
-- teardown-independent reference record).
--
-- Broker rulings:
--   section8_monitor_log_retention_gap_broker_ruling_response_2026-06-22.md
--   slice8_deliverable4b_implementation_plan_broker_ruling_response_2026-06-22.md (IF-1..IF-6)
--   slice8_deliverable4b_fork_d_disposition_capture_scope_broker_ruling_response_2026-06-22.md (row-writing only)
--   slice8_deliverable4b_fork_g_fork_f_broker_ruling_response_2026-06-22.md (G-b sync write; F-a drop wfu)
--
-- The §8 monitor reconciles DURABLE-vs-DURABLE. This table is the disposition
-- record that replaces the ephemeral `vercel logs` oracle (which retained only
-- ~hours, defeating a daily reconciliation window). The monitor reads it via
-- PostgREST exactly as it already reads geocode_audit_log and section8_runs.
--
-- WRITE PATH (Fork G = G-b): the row is written SYNCHRONOUSLY in
-- app/api/notice/geocode/route.ts at each row-writing return, BEFORE the response
-- goes back to the user (hard ≤250ms timeout, swallow-on-fail). It is written on
-- a DIFFERENT lifecycle than the deferred geocode_audit_log insert (which stays
-- in after()), so it survives the post-response instance teardown that can lose
-- the deferred audit row — making "audit row lost" detectable as
-- freeze_dispositions_orphaned = D - R_h >= 1. (See Fork G §3/§4.)
--
-- SCOPE (Fork D): row-writing dispositions ONLY — this is the verifier of
-- geocode_audit_log presence, NOT a general decision-log substrate. The sync
-- write sits only at the row-writing returns; every row is row-writing by
-- construction. No-row-by-design returns (invalid_json, address_required,
-- geocode_unavailable) are intentionally NOT captured. Expanding this table to
-- cover them is a substrate expansion requiring its own compliance-substrate
-- ruling — it must not happen by accretion. (See Fork D.)
--
-- RETENTION: lean by IF-4 — the 5-column minimal schema deliberately OMITS the
-- audit_record base columns (retention_class / legal_hold / soft_deleted_at) and
-- is therefore NOT attached to the refuse_delete_held trigger or the audit_cliff
-- function (both of which key on legal_hold / soft_deleted_at). Consequence: this
-- companion is NOT aged out, unlike the 7-year-cliffed geocode_audit_log. The
-- monitor only reads recent windows, so this is harmless operationally; a
-- retention posture for the companion (if ever wanted) is a separate ruling,
-- the same gap section8_runs (010) already carries.

create table if not exists public.geocode_dispositions (
  id                   uuid primary key default gen_random_uuid(),
  decided_at           timestamptz not null default now(),  -- insert-time; drives the window + 5m band
  decision_input_hash  text        not null,                -- joins to geocode_audit_log.decision_input_hash
  disposition          text        not null,                -- row-writing by construction; stored for forensics, not classified at read time
  chain_head_sha       text        not null                 -- join symmetry with the audit row (ruling §2.4 hash basis)
);

-- Intentionally NO foreign key to geocode_audit_log: a disposition row may exist
-- without a matching audit row (audit-write-loss case — teardown or partial) and
-- an audit row may exist without a matching disposition row (sync-write-failure
-- case). The §8 monitor detects both asymmetries via hash-join arithmetic on
-- decision_input_hash (freeze_dispositions_orphaned = D - R_h and
-- freeze_audit_orphaned = R_t - R_h). An FK would block the very failure modes
-- the monitor exists to catch. (IF-4.)

create index if not exists geocode_dispositions_decided_at_idx
  on public.geocode_dispositions (decided_at);
create index if not exists geocode_dispositions_decision_input_hash_idx
  on public.geocode_dispositions (decision_input_hash);
-- A composite (decided_at, decision_input_hash) index is intentionally omitted
-- pending an EXPLAIN at PR time (IF-4 clarification 1): the two single-column
-- indexes are expected to serve the banded window + hash-membership query; add
-- the composite only if the planner shows R_h needs it.

-- ---------------------------------------------------------------------------
-- RLS: APP-WRITTEN audit-table posture (Fork H = H-a). The app runs as the anon
-- role in the Vercel runtime (service_role is operator-local ONLY — standing
-- rail), so the synchronous route.ts write needs the same "anon may INSERT, may
-- NOT read" wall the other app-written audit tables use (geocode_audit_log /
-- manual_review_queue / classifier_audit_log / rate_limit_events in 002). NOT the
-- service_role-only posture of section8_runs / audit_exports — those are
-- monitor-output / broker-meta tables the app never writes. Mirrors 002's
-- "app insert only" idiom verbatim; no select policy, so the app appends and
-- reads back zero rows; the monitor reads out-of-band via service_role (RLS
-- bypass, operator-local). (See Fork H.)
-- ---------------------------------------------------------------------------
alter table public.geocode_dispositions enable row level security;
revoke all on public.geocode_dispositions from anon, authenticated;
grant insert on public.geocode_dispositions to anon, authenticated;
create policy "app insert only" on public.geocode_dispositions
  for insert to anon, authenticated with check (true);

-- ===========================================================================
-- section8_runs amendments (deliverable 4b)
-- ===========================================================================

-- New: the second orphan quantity (IF-1 §3.3 / §3.4). freeze_audit_orphaned =
-- R_t - R_h (audit row present, no matching disposition row — the sync-write
-- -failure / substrate-divergence side). The existing freeze_loss_suspected
-- column now carries freeze_dispositions_orphaned = D - R_h (disposition row
-- present, no audit row — the audit-write-loss side, which under Fork G/F-a
-- subsumes the retired wfu signal). freeze_loss_suspected keeps its name for
-- migration compatibility; the semantic rename is docstring/prose-level only
-- (IF-1 §3.4 default — renaming would reopen migration discipline for thin gain).
alter table public.section8_runs
  add column if not exists freeze_audit_orphaned integer not null default 0;

-- Retirement 1 (Fork D §5): dispositions_with_no_row_by_design (N3) is retired as
-- a §8 signal. Confirmed present in merged 010 (integer not null, no default).
-- Never a verdict driver; not a durability signal. Left in place for migration
-- history; new monitor rows stop populating it, so it needs a default to insert
-- cleanly when the monitor omits the field.
alter table public.section8_runs
  alter column dispositions_with_no_row_by_design set default 0;

-- Retirement 2 (Fork F-a, §5.2): write_failures_unrecovered (wfu) is retired. Its
-- only source was the geocode_audit_write_failure LOG events, read via the vercel
-- -logs adapter that IF-6 deletes; under G-b the audit-write-loss case it caught
-- surfaces durably as freeze_dispositions_orphaned instead. Confirmed present in
-- merged 010 (integer not null, no default). Same treatment as N3: left in place,
-- defaulted to 0, no longer populated. The geocode_audit_write_failure console
-- emission stays as an operator-side leading indicator (no longer a monitor
-- input). See Fork F ruling for the F-a + G-b pairing rationale.
alter table public.section8_runs
  alter column write_failures_unrecovered set default 0;
