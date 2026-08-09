-- 025b_manual_review_queue_aging_view_grant_correction.sql
-- Phase 3 view-sweep finding — broker ruling 2026-06-30. PRE-EXISTING leak (not lane work): the Phase-2D
-- view manual_review_queue_aging was grantable to anon (public API key) and not security_invoker, so it ran
-- as owner and bypassed manual_review_queue's RLS — exposing input_address (property addresses) + review_reason
-- to the public for any pending item older than 7 days (0 rows matched at fix time; latent exposure).
-- Lockdown ONLY — SELECT body is byte-exact from pg_get_viewdef() captured during the sweep; no projection/filter change.
-- Two layers (same as 025a): (1) REVOKE anon/authenticated/PUBLIC + GRANT service_role only; (2) security_invoker.

DROP VIEW IF EXISTS public.manual_review_queue_aging;
CREATE VIEW public.manual_review_queue_aging
  WITH (security_invoker = true) AS
 SELECT id,
    geocode_audit_id,
    input_address,
    review_reason,
    enqueued_at,
    now() - enqueued_at AS age
   FROM manual_review_queue
  WHERE status = 'pending'::text AND soft_deleted_at IS NULL AND enqueued_at < (now() - '7 days'::interval);

ALTER VIEW public.manual_review_queue_aging OWNER TO postgres;
REVOKE ALL ON public.manual_review_queue_aging FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.manual_review_queue_aging TO service_role;
