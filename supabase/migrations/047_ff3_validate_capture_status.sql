-- 047_ff3_validate_capture_status.sql
-- FF-3 hardening completion — VALIDATE the ff3_capture_status_enum CHECK constraint that migration 043 added
-- NOT VALID. Companion to 042: 042 was authored 2026-07-03 21:52, BEFORE 043 (23:56), so it validated only the six
-- 041 constraints and could not include this one. This closes that gap so the full FF-3 constraint set is validated,
-- matching the intent recorded in g1_status_rollup_broker_countersign_2026-07-03 ("constraints added NOT VALID in
-- 041/043, VALIDATE in 042") and ratified in ff3_migration_042_cobatch_build_countersign_2026-07-10 (ruling (a)).
--
-- Soak: 043 applied <= 2026-07-03 per the g1 rollup; the >=7-day floor cleared 2026-07-10. Same safety profile as
-- 042 — VALIDATE CONSTRAINT takes only a SHARE UPDATE EXCLUSIVE lock (non-blocking to reads/writes), the constraint
-- is NULL-tolerant so NULL rows pass, and there are 0 populated FF-3 rows to scan.
--
-- Broker-executed in Supabase Studio, immediately AFTER 042 (and only once Supabase is out of its incident window).
-- ROLLBACK: none needed — VALIDATE only flips the constraint's validated flag; it does not change data.

alter table public.chat_sessions validate constraint ff3_capture_status_enum;
