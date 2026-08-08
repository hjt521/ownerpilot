# Application timestamp rows with unavailable historical SQL

The Production `supabase_migrations.schema_migrations` ledger retains these authoritative version/name identities but its `statements` column is NULL, so exact historical SQL cannot be recovered from the ledger:

- `20260701130400` — `034_riskpath_produce_audit` — canonical application state: `supabase/migrations/034_riskpath_produce_audit.sql`
- `20260701130401` — `035_staleness_guard` — canonical application state: `supabase/migrations/035_staleness_guard.sql`
- `20260701130402` — `036_lahd_filing_records` — canonical application state: `supabase/migrations/036_lahd_filing_records.sql`

The active timestamp files for these versions are compatibility markers only and intentionally contain no schema-changing SQL. This document records the provenance gap; it does not reconstruct or infer missing historical statements.
