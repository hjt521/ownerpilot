-- 032a_privacy_requests_grant_lockdown.sql
-- Phase 3 Batch-4 correction — broker ruling 2026-06-30 (phase3_032a_anon_auth_table_grants_revoke).
-- 032 created privacy_requests + analytics_suppression_list RLS-on with a service-role-only policy, but Supabase's
-- default GRANT left anon/authenticated with table-level SELECT/INSERT/UPDATE/DELETE privileges. Precedent rule:
-- PII-bearing surfaces get RLS + revoked default grants (two locks); ephemeral auth tables (magic_link_tokens) may
-- be RLS-only. privacy_requests (DSAR/opt-out payloads, contact_email) + analytics_suppression_list (suppression
-- identifiers) are CCPA/CPRA PII → revoke the default grants. service_role retains via its explicit Supabase grant
-- (verified in-transaction below; ROLLBACK if not).

REVOKE ALL ON public.privacy_requests FROM PUBLIC;
REVOKE ALL ON public.privacy_requests FROM anon;
REVOKE ALL ON public.privacy_requests FROM authenticated;
REVOKE ALL ON public.analytics_suppression_list FROM PUBLIC;
REVOKE ALL ON public.analytics_suppression_list FROM anon;
REVOKE ALL ON public.analytics_suppression_list FROM authenticated;

DO $$
BEGIN
  IF NOT (
    has_table_privilege('service_role','public.privacy_requests','SELECT') AND
    has_table_privilege('service_role','public.privacy_requests','INSERT') AND
    has_table_privilege('service_role','public.privacy_requests','UPDATE') AND
    has_table_privilege('service_role','public.privacy_requests','DELETE') AND
    has_table_privilege('service_role','public.analytics_suppression_list','SELECT') AND
    has_table_privilege('service_role','public.analytics_suppression_list','INSERT') AND
    has_table_privilege('service_role','public.analytics_suppression_list','UPDATE') AND
    has_table_privilege('service_role','public.analytics_suppression_list','DELETE')
  ) THEN
    RAISE EXCEPTION 'service_role lost a required privilege after REVOKE — rolling back 032a';
  END IF;
END $$;
