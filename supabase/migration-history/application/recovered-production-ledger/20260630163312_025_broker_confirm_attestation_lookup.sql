CREATE INDEX idx_broker_confirm_attestation ON broker_confirm_requests(address_normalized, status)
  WHERE status = 'confirmed_la';

CREATE OR REPLACE VIEW broker_confirm_attestation_v1 AS
SELECT
  address_normalized,
  resolved_at,
  requester_token_hash,
  status AS outcome
FROM broker_confirm_requests
WHERE status = 'confirmed_la' AND soft_deleted_at IS NULL;

ALTER VIEW broker_confirm_attestation_v1 OWNER TO postgres;
REVOKE ALL ON broker_confirm_attestation_v1 FROM PUBLIC, anon;
GRANT SELECT ON broker_confirm_attestation_v1 TO service_role;

CREATE OR REPLACE FUNCTION sweep_broker_confirm_contacts() RETURNS void AS $$
BEGIN
  WITH swept AS (
    UPDATE broker_confirm_requests
    SET requester_contact = NULL, contact_purged_at = now()
    WHERE contact_purge_at < now()
      AND requester_contact IS NOT NULL
    RETURNING id
  )
  INSERT INTO broker_confirm_purge_audit (request_id, purge_reason)
  SELECT id, 'cron_sweep' FROM swept;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT cron.schedule(
  'broker-confirm-contact-purge',
  '0 11 * * *',
  $$SELECT sweep_broker_confirm_contacts()$$
);