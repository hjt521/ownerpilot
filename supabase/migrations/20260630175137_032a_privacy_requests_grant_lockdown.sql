-- Historical timestamp compatibility representation.
-- Version: 20260630175137
-- Historical name: 032a_privacy_requests_grant_lockdown
-- Exact recovered Production-ledger SQL is archived at:
-- supabase/migration-history/application/recovered-production-ledger/20260630175137_032a_privacy_requests_grant_lockdown.sql
--
-- The recovered historical migration asserts that service_role already retains
-- SELECT/INSERT/UPDATE/DELETE after the public/anon/authenticated revokes. A fresh
-- current Supabase local bootstrap does not supply that prerequisite for these two
-- tables, so a byte-exact replay rolls back at the assertion. This compatibility
-- representation materializes only the required service_role table privileges,
-- then preserves the recovered lockdown semantics. It does not renumber 032a and
-- does not grant PUBLIC, anon, or authenticated access.

GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON TABLE public.privacy_requests, public.analytics_suppression_list
  TO service_role;

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
