REVOKE EXECUTE ON FUNCTION public.mark_expired_broker_confirms() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sweep_broker_confirm_contacts() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.mark_expired_broker_confirms() TO service_role;
GRANT EXECUTE ON FUNCTION public.sweep_broker_confirm_contacts() TO service_role;

ALTER FUNCTION public.mark_expired_broker_confirms() SET search_path = pg_catalog, public;
ALTER FUNCTION public.sweep_broker_confirm_contacts() SET search_path = pg_catalog, public;