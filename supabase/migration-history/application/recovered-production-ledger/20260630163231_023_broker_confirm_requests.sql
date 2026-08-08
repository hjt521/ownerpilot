CREATE TABLE broker_confirm_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_token_hash text NOT NULL UNIQUE,
  requester_contact text NULL,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  address_normalized text NOT NULL,
  address_raw text NOT NULL,
  prior_resolver_verdict text NOT NULL CHECK (prior_resolver_verdict = 'manual_review'),
  prior_review_reason text NULL CHECK (prior_review_reason IN ('parcel_lookup_inconclusive', 'county_situs_gap', 'county_ambiguous')),
  prior_failure_mode text NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed_la', 'not_la', 'inconclusive', 'cancelled', 'expired')),
  sla_due_at timestamptz NOT NULL,
  resolved_at timestamptz NULL,
  resolved_outcome text NULL,
  resolved_by_broker_id text NULL,
  cancelled_at timestamptz NULL,
  soft_deleted_at timestamptz NULL,
  prior_denial_count int NOT NULL DEFAULT 0,
  contact_purge_at timestamptz NOT NULL,
  contact_purged_at timestamptz NULL
);

CREATE INDEX idx_broker_confirm_requests_status ON broker_confirm_requests(status);
CREATE INDEX idx_broker_confirm_requests_sla_due ON broker_confirm_requests(sla_due_at) WHERE status = 'pending';
CREATE INDEX idx_broker_confirm_requests_purge ON broker_confirm_requests(contact_purge_at) WHERE requester_contact IS NOT NULL;

ALTER TABLE broker_confirm_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY broker_confirm_service_role_all ON broker_confirm_requests
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY broker_confirm_owner_select ON broker_confirm_requests
  FOR SELECT TO anon
  USING (requester_token_hash = current_setting('request.jwt.claim.token_hash', true));

CREATE TABLE broker_confirm_purge_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES broker_confirm_requests(id),
  purged_at timestamptz NOT NULL DEFAULT now(),
  purge_reason text NOT NULL CHECK (purge_reason IN ('inline_terminal', 'cron_sweep'))
);
ALTER TABLE broker_confirm_purge_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY purge_audit_service_role ON broker_confirm_purge_audit
  FOR ALL TO service_role USING (true) WITH CHECK (true);