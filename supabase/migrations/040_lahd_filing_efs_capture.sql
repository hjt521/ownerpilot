-- 040_lahd_filing_efs_capture.sql
-- Lane W4 (omnibus §3.5) — post-filing EFS capture. Adds the LAHD EFS record number and a bilingual-receipt
-- pointer to the existing filing record (no `cases` table exists; the case-anchor is lahd_filing_records, which
-- already FKs riskpath_records + chat_sessions). Additive + idempotent.
--
-- ROLLBACK (non-destructive):
--   alter table public.lahd_filing_records drop column if exists efs_record_number;
--   alter table public.lahd_filing_records drop column if exists bilingual_receipt_ref;

alter table public.lahd_filing_records
  add column if not exists efs_record_number text;      -- 'EFS#######' from the LAHD confirmation email / portal
alter table public.lahd_filing_records
  add column if not exists bilingual_receipt_ref text;  -- pointer/URL to the stored EN+ES confirmation receipt

-- Fast lookup by EFS record number (nullable; only set post-capture).
create index if not exists lahd_filing_records_efs_idx
  on public.lahd_filing_records (efs_record_number) where efs_record_number is not null;
