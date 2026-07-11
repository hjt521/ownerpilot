# FF-3 Preview Activation — Gate-4 Attestation TEMPLATE — 2026-07-11

**Status:** TEMPLATE — not yet executed. Fill and re-file as the Gate-4 evidence packet **when** Preview flag-on is
separately authorized. Authority for the surface: `ff3_awaiting_broker_review_resolution_surface_broker_ruling_2026-07-11`.
**This template does NOT authorize the Preview flag flip** (Gate 4 remains), the prod flip, auto-notify, edit-after-resolve, bulk actions, or ADMIN_EMAILS expansion.

## Preconditions (confirm before flipping FF3_CAPTURE_ENABLED)
- [ ] Block A merged (produce-gate seam, dark) — #214.
- [ ] Block B merged (this PR): `/admin/ff3-review` surface + resolve endpoint + migration 048 + entry-13 interpolation.
- [ ] Migration **048** applied in Studio (broker-executed): `broker_resolution_note`, `broker_resolution_resolved_at`,
      `broker_resolution_reviewer_email` + partial index `chat_sessions_awaiting_broker_review_idx`.
- [ ] `FF3_CAPTURE_ENABLED` set in Vercel **Preview scope ONLY** (never Production).

## Evidence to capture (ruling §5)
1. **Migration 048 columns** — SQL evidence the three columns exist + the partial index:
   ```sql
   select column_name from information_schema.columns
   where table_schema='public' and table_name='chat_sessions' and column_name like 'broker_resolution_%';
   select indexname from pg_indexes where indexname='chat_sessions_awaiting_broker_review_idx';
   ```
   Paste result. Expect 3 columns + 1 index.
2. **Admin list, awaiting E2E session** — screenshot of `/admin/ff3-review` showing the seeded E2E escalated
   session (session id, reconciliation gap, escalated timestamp). No owner PII on the list.
3. **Post-resolve entry-13** — screenshot of the resume card the owner would see after resolve, showing the
   `{broker_resolution_note}` slot filled verbatim with the note the admin typed. Confirm success string read
   "Note saved. It will surface when the owner next opens their session." (no "owner has been notified").
4. **Migration-048 columns populated** — SQL evidence a resolved row carries note + resolved_at + reviewer_email:
   ```sql
   select id, broker_resolution_reviewer_email, broker_resolution_resolved_at, broker_resolution_note is not null as has_note
   from public.chat_sessions where broker_resolution_note is not null limit 5;
   ```
5. **Wave-4 golden catalog + Playwright** — run against the assembled chain with FF3_CAPTURE_ENABLED on in Preview:
   - `produceGateChain` + `wave4GoldenCatalog` + `ff3ProduceGate` + `ff3ResumeCard` suites green.
   - Playwright FF-3 flows green (5 flows + the escalate→resolve→resume path).
   Paste run summary.

## Disposition (on completion)
FF-3 Preview activation Gate-4 satisfied; FF-3 capture + produce-gate chain live in **Preview only**. Prod flip
remains a separate future ruling.

— Prepared for Broker Compliance Review · Jack Taglyan / California Licensed Real Estate Broker / CalDRE B9445457
· 2026-07-11
