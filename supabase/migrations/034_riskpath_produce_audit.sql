-- 034_riskpath_produce_audit.sql
-- PR-A3 §5.2 produce-audit fast-follow.
-- Persists the LA produce audit (RTC form hashes + LAHD acknowledgment timestamp + produce-time gate/verdict
-- provenance) onto the riskpath record, so the CHAT produce path is compliance-equivalent to the WIZARD path
-- (which persists the same `laProduceAudit` blob into flow state). Additive, nullable — no backfill; pre-existing
-- records simply have a null produce_audit until re-produced.
-- Ruling: pr_a3_5_2_core_countersign_and_open_items_broker_ruling_2026-07-01.md §2.
-- Written by POST /api/notices/[riskpathId]/produce-audit (owner-scoped, idempotent overwrite).

alter table public.riskpath_records
  add column if not exists produce_audit jsonb;
