-- 041_ff3_add_structured_intake_fields.sql
-- Lane FF-3 (gate3_wave3_wiring_and_ff3_omnibus_broker_ruling_2026-07-03). Adds the five structured intake fields
-- the wave-3 gates read, onto chat_sessions (the case anchor). ADDITIVE-ONLY per Amendment E: columns are
-- nullable; CHECK constraints are added NOT VALID here and VALIDATEd in 042 after the soak window. No
-- ALTER COLUMN SET NOT NULL in this migration (that caused the prior prod-runwindow break).
--
-- NOTE: the broker ruling wrote "037/038" for these migrations, but 037–040 are already applied
-- (waitlist / do_not_serve_holds / broker_compliance_actions / efs_capture). Using the next free numbers 041/042;
-- scope unchanged.
--
-- ROLLBACK (non-destructive): drop the six constraints + five columns (see names below).

alter table public.chat_sessions add column if not exists bedrooms               smallint;
alter table public.chat_sessions add column if not exists amount_of_rent_owed    numeric(10,2);
alter table public.chat_sessions add column if not exists contract_monthly_rent  numeric(10,2);
alter table public.chat_sessions add column if not exists just_cause             text;
alter table public.chat_sessions add column if not exists notice_type            text;

-- Enum + range + non-negative + conditional checks. All NULL-tolerant (pre-FF-3 rows stay NULL) and NOT VALID.
alter table public.chat_sessions
  add constraint ff3_bedrooms_range
  check (bedrooms is null or (bedrooms between 0 and 6)) not valid;

alter table public.chat_sessions
  add constraint ff3_amount_owed_nonneg
  check (amount_of_rent_owed is null or amount_of_rent_owed >= 0) not valid;

alter table public.chat_sessions
  add constraint ff3_contract_rent_nonneg
  check (contract_monthly_rent is null or contract_monthly_rent >= 0) not valid;

alter table public.chat_sessions
  add constraint ff3_just_cause_enum
  check (just_cause is null or just_cause in (
    'nonpayment','breach_of_lease','nuisance','illegal_use','refusal_of_entry','unapproved_subtenant',
    'end_of_term_sro_or_covered','owner_move_in','withdrawal_ellis','demolition','capital_improvement',
    'government_order','other'
  )) not valid;

alter table public.chat_sessions
  add constraint ff3_notice_type_enum
  check (notice_type is null or notice_type in (
    'three_day_pay_or_quit','three_day_cure_or_quit','three_day_unconditional_quit',
    'thirty_day_termination','sixty_day_termination','ninety_day_termination_section8'
  )) not valid;

-- Conditional: a 3-day pay-or-quit MUST carry an amount owed > 0 (Amendment A/B). Vacuously true for other/NULL types.
alter table public.chat_sessions
  add constraint ff3_payquit_requires_amount
  check (notice_type is distinct from 'three_day_pay_or_quit'
         or (amount_of_rent_owed is not null and amount_of_rent_owed > 0)) not valid;
