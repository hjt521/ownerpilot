-- 044_lahd_confirmation_ref.sql
-- Part B-1 of p1_email_trigger_dependencies_broker_ruling_2026-07-05 (B1). Adds the optional owner-supplied
-- LAHD confirmation reference and a send-idempotency marker to the filing record. Both nullable; a safe
-- additive change with no VALIDATE gate (nullable column addition, per the phase-3 additive-schema discipline
-- established in phase3_closeout_ratification_broker_signoff_2026-06-30). Independent of migration 042.
--
-- ROLLBACK (non-destructive):
--   alter table public.lahd_filing_records drop column if exists confirmation_ref;
--   alter table public.lahd_filing_records drop column if exists confirmation_email_sent_at;

alter table public.lahd_filing_records
  -- Owner-supplied LAHD confirmation number (optional). Free-text; 64 chars is generous headroom over the
  -- 8–12 char refs LAHD currently issues. The filing record NEVER depends on this field.
  add column if not exists confirmation_ref varchar(64),
  -- Set once the LAHD-confirmation email has been sent for this row (B-2 send path). Idempotency marker:
  -- a row with a non-null value here is never re-sent. Stays null in B-1 (no send path yet).
  add column if not exists confirmation_email_sent_at timestamptz;

-- No RLS change: writes flow through the service-role filing-record endpoint (owner-scoped there), and the
-- existing owner-read policy already covers the new columns via `select *`.
