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