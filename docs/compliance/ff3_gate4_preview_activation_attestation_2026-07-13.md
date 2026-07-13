# FF-3 Preview Activation — Gate-4 Attestation Packet — 2026-07-13

**Status:** ARCHIVED-COMPLETE. All twelve §7 criteria verified. **Broker-countersigned 2026-07-13**
(`ff3_gate4_preview_activation_broker_countersign_2026-07-13.md`) — `FF3_CAPTURE_ENABLED=true` in **Preview scope
only** is ratified and live. Production flip remains a separate future ruling.

**Evidence path:** `ff3_preview_activation_gate4_evidence_path_broker_ruling_2026-07-11` (Option 3) — one session id
threading owner reconciliation-mismatch → held → admin-authed resolve → owner resume → produce, plus the negative
scope-mismatch case and the selection-(2) pause branch.

**Preview run:** deployed branch Preview with `FF3_CAPTURE_ENABLED=true` (Preview scope only) + migrations 041–049
applied + Preview env provisioned (`E2E_RUN_ACTIVE`, `TEST_SEED_SECRET`, `E2E_TEST_USER_ID`, `E2E_ADMIN_EMAIL`,
`E2E_ADMIN_PASSWORD`, `FF3_RESUME_SECRET`, `ADMIN_EMAILS` += test admin). Spec: `e2e/ff3-reconciliation-resume.spec.ts`.

---

## §7 Twelve-criteria checklist

| # | Criterion | Status | Evidence |
|---|---|---|---|
| 1 | Migration 048 columns present + populated on the E2E-resolved row | ✅ | SQL below returned 3/3 columns; population per criterion 8 DB assertions (green) |
| 2 | Migration 049 columns present + populated (authz non-null after resolve; consumed non-null after Continue) | ✅ | SQL below returned 2/2 columns + 2/2 indexes; population per criterion 8 |
| 3 | `/admin/ff3-review` awaiting-row screenshot (no owner PII on list) | ✅ | `gate4-evidence/admin-awaiting-review.png` |
| 4 | Entry-13 `…ContinueOnly` owner-view, note interpolated verbatim | ✅ | `gate4-evidence/entry13-resume-card.png` |
| 5 | Entry-14 owner-view, three ordinal buttons verbatim from manifest | ✅ | `gate4-evidence/entry14-reconciliation-card.png` |
| 6 | `chatFf3AwaitingBrokerReviewHeld` owner-view (held) | ✅ | `gate4-evidence/held-state.png` |
| 7 | `chatFf3NoticeWrongPause` owner-view (selection-(2) pause) | ✅ | `gate4-evidence/pause-notice-wrong.png` |
| 8 | Full Playwright green log incl. the negative scope-mismatch case | ✅ | **3 passed (45.0s)** — run log below |
| 9 | Locked-prose guard passing at floor **130** | ✅ | `ci:verify-locked-prose: PASS — 130 locked entries` |
| 10 | `verify_e2e_seed_guard` passing (incl. admin-session §4 checks) | ✅ | `all four locks present on 4 test-seed route(s) ✓` |
| 11 | All required GitHub checks green on the merge commits | ✅ | PRs #216/#217/#218/#219/#220 — 22–23 checks each; final merge `4ad899e` |
| 12 | Attestation signed with git SHAs | ✅ | SHAs below + signature |

---

## Criteria 1–2 — column-presence SQL (broker-executed in Studio)

Note on "populated correctly": the E2E teardown deletes its tagged rows, so the resolved row is gone by run-end.
Column **presence** is proven by the query below; **correct population** is proven by the in-test DB assertions in
criterion 8 (the spec asserts `broker_resolution_note` / `reviewer_email` / `resolved_at`, `broker_resume_authorization`
non-null after resolve, and `broker_resume_consumed_at` transitioning null → non-null across resume — all green).

```sql
-- 048 columns (expect 3 rows)
select column_name from information_schema.columns
where table_schema='public' and table_name='chat_sessions'
  and column_name in ('broker_resolution_note','broker_resolution_resolved_at','broker_resolution_reviewer_email');

-- 049 columns (expect 2 rows)
select column_name from information_schema.columns
where table_schema='public' and table_name='chat_sessions'
  and column_name in ('broker_resume_authorization','broker_resume_consumed_at');

-- 048 + 049 partial indexes (expect 2 rows)
select indexname from pg_indexes
where indexname in ('chat_sessions_awaiting_broker_review_idx','ff3_authorized_unconsumed_idx');
```

**Results (broker-executed in Studio, 2026-07-13):**
- Query A (048 columns) → **3 rows**: `broker_resolution_note`, `broker_resolution_resolved_at`, `broker_resolution_reviewer_email`.
- Query B (049 columns) → **2 rows**: `broker_resume_authorization`, `broker_resume_consumed_at`.
- Query C (partial indexes) → **2 rows**: `chat_sessions_awaiting_broker_review_idx`, `ff3_authorized_unconsumed_idx`.

Presence confirmed 3 + 2 columns + 2 indexes. Correct population proven by criterion 8 in-test DB assertions (green).
Closes the outstanding item in the 2026-07-13 broker countersign §4 → **packet ARCHIVED-COMPLETE.**

---

## Criterion 8 — Playwright run log (deploy-run against Preview)

```
Running 3 tests using 1 worker
  ✓  1 escalate → broker resolve → owner resume → produce (one session) (19.0s)
  ✓  2 negative: amount mutated between resolve and Continue → scope mismatch, authorization unconsumed (14.1s)
  ✓  3 reconciliation selection (2) notice-wrong → pause screen (criterion 7) (9.2s)
[e2e-teardown] cleanup verified: zero tagged rows remain.
  3 passed (45.0s)
```

In-test DB assertions proven green (criteria 1–2 population): 048 note/reviewer/resolved-at set; 049
`broker_resume_authorization` non-null after admin resolve; `broker_resume_consumed_at` null after resolve →
non-null after owner Continue (produce-consume); negative case → `ff3_resume_scope_mismatch` (409) with the
authorization left **unconsumed**.

---

## Criterion 12 — merged git SHAs (broker-executed merges)

| Slice | PR | Merge SHA |
|---|---|---|
| PR A — reconciliation gate reads `rent_periods` from `intake_state` (gate fires) | #216 | `f86bcd8` |
| PR B-server-resume — migration 049 + scoped one-shot authorization + resume endpoint + gate consumption | #217 | `b4c088d` |
| PR C-client — owner reconciliation / held / pause / resume surfaces (manifest 130) | #218 | `bcdd8e9` |
| PR B-Playwright — Gate-4 evidence spec + admin-session minter | #219 | `a0c9b73` |
| Fix (E2E enablement) — seed VERCEL_ENV gating, chat burst-limiter E2E bypass, admin-resolve confirmation, finalized spec | #220 | `4ad899e` |
| Migrations 048 + 049 | — | applied in Supabase Studio (broker-executed) |

---

## Disposition

All twelve satisfied → FF-3 capture + produce-gate chain + reconciliation escalate/resolve/resume live in
**Preview only**. Production `FF3_CAPTURE_ENABLED` flip remains a separate future ruling. Deferred (unchanged):
reply-to-broker seam, telemetry (§3.4 fast-follow), review@ digest alias.

— Prepared for Broker Compliance Review · Jack Taglyan / California Licensed Real Estate Broker / CalDRE B9445457
· 2026-07-13
