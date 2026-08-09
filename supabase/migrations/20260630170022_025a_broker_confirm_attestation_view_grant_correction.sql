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