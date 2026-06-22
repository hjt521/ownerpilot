-- OwnerPilot AI — Classifier audit side constraint
-- Migration: 005_classifier_side_check
--
-- Implements Slice 3b per broker ruling 2026-06-21 §2.2 requirement 5
-- (slice3b_classifier_audit_wiring_broker_ruling_response_2026-06-21.md).
--
-- 002 stored `side` as bare `text not null` with no value constraint, following the
-- table's "enum-ish fields are text, never DB enums, so an insert never fails on a
-- value the DB hadn't learned" principle. That principle protects fields whose value
-- is DATA-derived (model output / external sources) and could legitimately surprise
-- the DB. `side` is NOT such a field: it is a hardcoded literal at the route call
-- site ('input' or 'output'), never anything else. Constraining it cannot fail a
-- write unless there is a code bug — exactly what the constraint is meant to catch —
-- and the sink swallows+alerts on any write failure regardless. So the §2.2-req-5
-- constraint is added here without violating 002's durability principle.
--
-- classifier_audit_log is currently empty (audit dormant), so validation is instant.

alter table public.classifier_audit_log
  add constraint classifier_audit_log_side_check check (side in ('input', 'output'));
