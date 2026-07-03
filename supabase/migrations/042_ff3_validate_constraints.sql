-- 042_ff3_validate_constraints.sql
-- Lane FF-3 (Amendment E) — VALIDATE the FF-3 CHECK constraints added NOT VALID in 041, after the soak window.
-- Run this only once 041 has soaked (≥7 days) and any pre-FF-3 rows either recaptured (Amendment D) or confirmed
-- NULL-and-inert. VALIDATE scans existing rows; because every FF-3 check is NULL-tolerant, NULL rows pass and only
-- populated rows are enforced. Safe + non-locking (VALIDATE CONSTRAINT takes only a SHARE UPDATE EXCLUSIVE lock).
--
-- ROLLBACK: none needed — VALIDATE only flips the constraint's validated flag; it does not change data.

alter table public.chat_sessions validate constraint ff3_bedrooms_range;
alter table public.chat_sessions validate constraint ff3_amount_owed_nonneg;
alter table public.chat_sessions validate constraint ff3_contract_rent_nonneg;
alter table public.chat_sessions validate constraint ff3_just_cause_enum;
alter table public.chat_sessions validate constraint ff3_notice_type_enum;
alter table public.chat_sessions validate constraint ff3_payquit_requires_amount;
