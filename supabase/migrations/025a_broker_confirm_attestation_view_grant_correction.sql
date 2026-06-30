-- 025a_broker_confirm_attestation_view_grant_correction.sql
-- Phase 3 correction — broker ruling 2026-06-30 (attestation view leak).
-- 025 created broker_confirm_attestation_v1 but REVOKEd only FROM PUBLIC + anon, leaving Supabase's default
-- GRANT to `authenticated` in place. Because the view ran as owner (postgres) and was not security_invoker,
-- any authenticated user could SELECT it and read confirmed_la attestation data (normalized addresses +
-- requester token hashes), bypassing broker_confirm_requests' RLS. Two independent layers:
--   (1) who can call  — REVOKE from authenticated/anon/PUBLIC; GRANT SELECT to service_role only.
--   (2) what RLS applies — recreate WITH (security_invoker = true) so base-table RLS is enforced on every call.

CREATE OR REPLACE VIEW broker_confirm_attestation_v1
  WITH (security_invoker = true) AS
SELECT
  address_normalized,
  resolved_at,
  requester_token_hash,
  status AS outcome
FROM broker_confirm_requests
WHERE status = 'confirmed_la' AND soft_deleted_at IS NULL;

ALTER VIEW broker_confirm_attestation_v1 OWNER TO postgres;
REVOKE ALL ON broker_confirm_attestation_v1 FROM PUBLIC, anon, authenticated;
GRANT SELECT ON broker_confirm_attestation_v1 TO service_role;
