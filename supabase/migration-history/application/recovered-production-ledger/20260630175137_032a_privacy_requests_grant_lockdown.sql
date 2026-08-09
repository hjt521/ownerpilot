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