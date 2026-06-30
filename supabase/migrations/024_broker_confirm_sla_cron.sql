-- 024_broker_confirm_sla_cron.sql
-- Lane 5 Decision 2 — SLA breach detection + hourly pg_cron sweep. Byte-exact from master prompt §2.2.
-- §10 #8 note: if pg_cron is unavailable in the target project, broker decides edge-function-only sweep.

-- pg_cron extension (skip if already present)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- SLA breach detection
CREATE TABLE broker_confirm_sla_breaches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES broker_confirm_requests(id),
  breached_at timestamptz NOT NULL DEFAULT now(),
  sla_due_at_snapshot timestamptz NOT NULL
);
ALTER TABLE broker_confirm_sla_breaches ENABLE ROW LEVEL SECURITY;
CREATE POLICY sla_breaches_service_role ON broker_confirm_sla_breaches
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Cron function: hourly sweep
CREATE OR REPLACE FUNCTION mark_expired_broker_confirms() RETURNS void AS $$
BEGIN
  WITH expired AS (
    UPDATE broker_confirm_requests
    SET status = 'expired', resolved_at = now()
    WHERE status = 'pending' AND now() > sla_due_at
    RETURNING id, sla_due_at
  )
  INSERT INTO broker_confirm_sla_breaches (request_id, sla_due_at_snapshot)
  SELECT id, sla_due_at FROM expired;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule hourly at minute 0
SELECT cron.schedule(
  'broker-confirm-sla-sweep',
  '0 * * * *',
  $$SELECT mark_expired_broker_confirms()$$
);
