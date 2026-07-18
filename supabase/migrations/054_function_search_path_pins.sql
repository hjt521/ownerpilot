-- 054_function_search_path_pins.sql
-- Security remediation — Supabase Advisors WARN `function_search_path_mutable` on refuse_delete_held +
-- enqueue_manual_review (2026-07-15). Both are SECURITY INVOKER trigger functions; pinning search_path is the
-- standard defense against search_path-based function hijacking. Authorized by broker ruling 2026-07-15
-- (Category C batch ratification). No behavior change — the functions only reference public objects.

alter function public.refuse_delete_held() set search_path = public, pg_temp;
alter function public.enqueue_manual_review() set search_path = public, pg_temp;
