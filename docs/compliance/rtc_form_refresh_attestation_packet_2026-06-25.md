# RTC Form-Refresh Attestation Packet — Evidence Index

> **Authoring boundary.** Build authored this structure and the evidence-index
> (technical pointers: commits, shas, file paths, test counts, run timestamps).
> **The broker authors every verdict cell and §6 in full.**
> No attestation/verdict prose is build-authored.

**Subject:** The eight-predicate attestation that authorizes flipping
`rtcFormRefreshJobBuilt` (one of the six conditions in `isLaProductionUnblocked()`).
Flipping that flag is a **separate gate-flip PR**, gated on broker sign-off (§6).
The LA production gate stays closed regardless until all six conditions hold
(`cityOfLaZipsAuthoritative` and `parcelEndpointHealthCheckLive` remain false — §5.1).

**Posture:** OwnerPilot AI operates under California Real Estate Broker scope per Bus. & Prof. Code § 10131(b). Jack Taglyan, CalDRE B9445457, is sole compliance authority on this packet. This is a broker compliance review of the eight-predicate attestation evidence index for `rtcFormRefreshJobBuilt`. No attorney attribution attaches.

---

## §1 Predicate evidence index

| # | Predicate (established working definition) | Evidence artifact(s) | Location | Technical verifier | Broker verdict |
|---|---|---|---|---|---|
| 1 | Migration 012 applied | `supabase/migrations/012_rtc_refresh_run_results.sql` + SQL Editor "Success. No rows returned" | in-repo (file) + external (screenshot) | committed `1d519cb`; applied by hand | PASS — Migration 012 (rtc_refresh_run_results) applied; evidence committed at 1d519cb and confirmed by SQL Editor success. |
| 2 | Migration 013 applied | `supabase/migrations/013_rtc_refresh_state.sql` (`rtc_refresh_state` + `rtc_refresh_pins`, RLS on, revoke anon/authenticated) + SQL Editor success | in-repo + external | committed `1d519cb` | PASS — Migration 013 (rtc_refresh_state + rtc_refresh_pins, RLS on, anon/authenticated revoked) applied; evidence committed at 1d519cb and confirmed by SQL Editor success. |
| 3 | Migration 014 applied | `supabase/migrations/014_rtc_block_state_reader_role.sql` (`rtc_block_state_reader` role) + SQL Editor success | in-repo + external | committed `1d519cb` | PASS — Migration 014 (rtc_block_state_reader role) applied; evidence committed at 1d519cb and confirmed by SQL Editor success. |
| 4 | Migration 015 applied | `supabase/migrations/015_rtc_refresh_run_results_rls_tighten.sql` (run-results RLS tighten) + SQL Editor success | in-repo + external | committed `887498c` | PASS — Migration 015 (run-results RLS tighten) applied; evidence committed at 887498c and confirmed by SQL Editor success. |
| 5 | Edge Function built + deployed + smoke-tested | Function tree `supabase/functions/rtc-refresh/{index,handler,store,fetcher,alerts}.ts` + `_core/` + `*.test.ts`; deploy output; smoke test → `200 {skipped:'la-gate-closed'}` | in-repo (code) + external (deploy + smoke terminal/screenshot) | build merged cases 71–76; deploy 2026-06-25 (session 08-21-04, deploy CLI did not emit wall-clock timestamp); npx supabase functions deploy rtc-refresh succeeded, 9 assets uploaded (index, handler, store, fetcher, alerts + 4 _core/); deploy-leg smoke POST → {"skipped":"la-gate-closed"} HTTP 200 with live secret, → {"error":"unauthorized"} HTTP 401 with wrong-secret leg; suites green | PASS — Edge Function deployed, 9 assets uploaded, deploy-leg smoke returns la-gate-closed HTTP 200 with live secret and unauthorized HTTP 401 with wrong-secret leg. Auth check verified functional in both legs. Deploy-CLI did not emit wall-clock timestamp; session 08-21-04 anchor is the operative trace. |
| 6 | Serve-path 14-day freshness-fail-closed guard wired + tested | `lib/jurisdiction/rtcRefresh/languageFreshness.ts` + `.test.ts`; async `laLanguageGate.ts`; authority: `predicate_6_freshness_guard_broker_determination_2026-06-25.md` **and** `predicate_6_boundary_reconciliation_broker_determination_2026-06-25.md` (boundary `age ≥ 14d`, supersession of §2.5 `> 14d`) | in-repo | case 80, commit `67c032e` (merge `d468681`); 15 freshness assertions; 53 suites/0 failed | PASS — Serve-path freshness guard exists, tested at the age ≥ 14d boundary (15 freshness assertions), wired into laLanguageGate.ts (async). Boundary ≥ 14d stands as deliberate supersession of runner ruling §2.5's > 14d per the boundary-reconciliation determination. Guard-exists scope; production caller deferred until LA unblocks, per predicate-6 determination §2.5 E. |
| 7 | 9-URL parity check passes | `docs/compliance/rtc_parity_report_2026-06-24.txt` (9/9 MATCH) **and** `docs/compliance/rtc_parity_report_2026-06-24_stability.txt` (independent re-run, non-flaky) | in-repo (both) | original: case 78, commit `5cf56e8`, run 2026-06-24T22:23:35Z, 9/9 MATCH; stability: this PR. Scope: M1 fetcher-parity — see §5.2 | PASS — 9/9 fetcher-parity MATCH under broker-run Node/tsx against live LAHD URLs (case 78 commit 5cf56e8, plus independent stability re-run this PR). M1 path authorized; M2 deployed-runtime parity correctly deferred to first cron-leg post-go-live as operational evidence, not attestation evidence. Predicate 7's attestation is fetcher-code parity, not deployed-runtime parity, and the packet §5.3 / consolidation §2 carry that scope explicitly. |
| 8 | Read route deployed + serve path reads through it | `lib/jurisdiction/rtcRefresh/readBlockState.ts` + `.test.ts`; `app/api/internal/rtc-block-state/route.ts`; `supabase/migrations/016_rtc_block_state_reader_select_policy.sql` (RLS SELECT policy); reader-curl response bodies; authority: `la_rtc_block_state_reader_auth_mechanism_broker_ruling_response_2026-06-23.md` (M-1(ii)) + `rtc_block_state_reader_rls_policy_broker_determination_2026-06-25.md` | in-repo (code) + external (reader-curl evidence) | case 79, commit `3037887` (merge `245c51b`); migration 016 in `3037887`; 32 read-route assertions; reader-JWT curl through rtc_block_state_reader: pre-migration-016 leg returns [] HTTP 200 (attests ES256→JWKS→role-switch auth chain end-to-end); post-migration-016 leg returns synthetic RLS-probe row HTTP 200 (attests RLS SELECT policy completion). Session 08-38-59. Rows returned are RLS-probe test data, not production state — production rows pending first cron-leg run post-go-live | PASS — Read route deployed at /api/internal/rtc-block-state/route.ts (per-language scoped, validate-before-call, in-process readBlockState consumption); caller-auth gated by RTC_BLOCK_STATE_ROUTE_SECRET / x-rtc-block-state-secret with ordered failure modes (env→500, missing/wrong→401); 32 read-route assertions pass; migration 016 SELECT policy applied at 3037887; reader-JWT curl chain attests auth (pre-016 [] HTTP 200) and policy completion (post-016 synthetic-probe row HTTP 200). Rows returned are RLS-probe test data; production-data-flowing-through evidence is operational, deferred to first cron-leg post-go-live, symmetric with predicate 7's M1 split. |

---

## §2 In-repo evidence inventory (committed)

| Artifact | Path | Lands in |
|---|---|---|
| Migrations 012–014 | `supabase/migrations/012_*.sql` … `014_*.sql` | `1d519cb` |
| Migration 015 (run-results RLS tighten) | `supabase/migrations/015_rtc_refresh_run_results_rls_tighten.sql` | `887498c` |
| Migration 016 (RLS SELECT policy) | `supabase/migrations/016_rtc_block_state_reader_select_policy.sql` | case 79 (`3037887`) |
| Edge Function + `_core/` + tests | `supabase/functions/rtc-refresh/**` | cases 71–76 |
| Parity-check script | `scripts/rtc_parity_check.ts` | case 76 |
| Parity evidence (9/9) | `docs/compliance/rtc_parity_report_2026-06-24.txt` | case 78 |
| Parity evidence (stability re-run) | `docs/compliance/rtc_parity_report_2026-06-24_stability.txt` | this packet PR |
| Read route core + route + tests | `lib/jurisdiction/rtcRefresh/readBlockState.ts`, `.test.ts`, `app/api/internal/rtc-block-state/route.ts` | case 79 |
| Freshness guard core + tests | `lib/jurisdiction/rtcRefresh/languageFreshness.ts`, `.test.ts` | case 80 |
| Per-language gate (async) | `lib/jurisdiction/laLanguageGate.ts` | case 80 |
| Predicate-6 determination | `docs/compliance/predicate_6_freshness_guard_broker_determination_2026-06-25.md` | case 80 |
| Predicate-6 boundary reconciliation | `docs/compliance/predicate_6_boundary_reconciliation_broker_determination_2026-06-25.md` | this packet PR |
| Runner-architecture ruling (revised provenance note) | `docs/compliance/la_rtc_refresh_runner_architecture_broker_ruling_response_2026-06-23.md` | this packet PR |
| Reader-auth ruling (M-1(ii)) | `docs/compliance/la_rtc_block_state_reader_auth_mechanism_broker_ruling_response_2026-06-23.md` | this packet PR |
| RLS-policy determination (migration 016) | `docs/compliance/rtc_block_state_reader_rls_policy_broker_determination_2026-06-25.md` | this packet PR |
| Inline-rulings consolidation (predicates 5/7/8) | `docs/compliance/rtc_predicates_5_7_8_inline_rulings_consolidated_2026-06-25.md` | this packet PR |
| Pre-commit disposition ruling (§0 revised) | `docs/compliance/attestation_packet_pre_commit_disposition_broker_ruling_2026-06-25.md` | this packet PR |

## §3 External evidence inventory (screenshots / terminal — broker-held; reference by link or attach)

| Artifact | Shows | Predicate |
|---|---|---|
| SQL Editor screenshots ×4 (012–015) | "Success. No rows returned" per migration apply | 1–4 |
| RLS probe screenshots (016) | reader role sees rows after policy | 8 (RLS) |
| Deploy terminal output | `supabase functions deploy rtc-refresh` success | 5 |
| Smoke-test output | invoked deployed fn → `200 {skipped:'la-gate-closed'}` | 5 |
| Reader-curl response bodies | live PostgREST read through `rtc_block_state_reader` returns rows | 8 |
| JWKS / signing-key screenshots | ES256 standby key imported (kid `f61e3c29-…`) | 8 (reader auth) |

## §4 Authority documents — all committed in `docs/compliance/` (authority chain fully repo-readable)

After this packet PR, every authority the attestation cites is in `docs/compliance/`; none is broker-held-by-reference.

- `predicate_6_freshness_guard_broker_determination_2026-06-25.md` — predicate 6 operative (committed case 80)
- `predicate_6_boundary_reconciliation_broker_determination_2026-06-25.md` — predicate 6 boundary supersession record (this PR)
- `la_rtc_refresh_runner_architecture_broker_ruling_response_2026-06-23.md` — runner architecture; §2.5 present-and-superseded per the prepended provenance note (this PR)
- `la_rtc_block_state_reader_auth_mechanism_broker_ruling_response_2026-06-23.md` — M-1(ii) reader auth (this PR)
- `rtc_block_state_reader_rls_policy_broker_determination_2026-06-25.md` — migration 016 SELECT policy (this PR)
- `rtc_predicates_5_7_8_inline_rulings_consolidated_2026-06-25.md` — the read-route interface + caller-auth, parity-M1, and UA-fix inline rulings, consolidated and committed (this PR)
- `attestation_packet_pre_commit_disposition_broker_ruling_2026-06-25.md` — packet pre-commit disposition (this PR)
- `rtc_refresh_job_step_e_compliance_questions_broker_ruling_response_2026-06-20.md` — step-(e) compliance Q&A (already committed)
- `rtc_parity_report_2026-06-24.txt`, `rtc_parity_report_2026-06-24_stability.txt` — predicate 7 evidence

## §5 Scope notes (carry into the packet so the attestation doesn't overclaim)

1. **This packet attests one flag.** Satisfying all 8 predicates authorizes flipping `rtcFormRefreshJobBuilt` only. `isLaProductionUnblocked()` requires SIX conditions; after this flip, LA stays blocked on `cityOfLaZipsAuthoritative` (false) and `parcelEndpointHealthCheckLive` (false). `geocodeConfirmationBuilt`, `cityBusinessDayCalendarBuilt`, `geocodeAuditDurabilityWired` already true.

2. **Predicate 7 = fetcher-parity, not deployed-runtime parity.** See the locked M1 clarification immediately below.

### Predicate 7 parity scope (M1 ruling, 2026-06-24)

> **Predicate 7 parity scope (M1 ruling, 2026-06-24).** The 9/9 parity result attests that the fetcher code (the module that constructs requests, parses responses, and produces the canonical form output) behaves identically across all 9 LAHD URLs when run broker-side under Node/tsx. This was an explicit ruling — the M1 path — chosen over M2 (a gate-bypass leg that would have run the parity check through the deployed Deno-runtime Edge Function). M2 was rejected on gate-semantics-change grounds: routing parity through a gate-bypass would alter the gate's meaning to satisfy an attestation evidence step, which inverts the relationship between gate and evidence. M1 is the authorized parity-evidence path; deployed-Deno-runtime parity is verified separately at first cron-leg run post-go-live, which is operational evidence (not attestation evidence) and is captured in the post-flip monitoring window, not this packet. Predicate 7's attestation is therefore: **fetcher code parity, confirmed via broker-run Node/tsx against live LAHD URLs**, with deployed-runtime confirmation deferred to first production run per M1.

3. **Predicate 6 = guard exists + tested; no produce-path wiring** (predicate-6 determination §2.5 E). `isLaLanguageUnblocked` has no production caller yet; consumption is deferred until LA unblocks. Boundary is `age ≥ 14d → block`, a deliberate supersession of the runner ruling §2.5's `> 14d` per `predicate_6_boundary_reconciliation_broker_determination_2026-06-25.md`.

4. **Stability parity re-run folded in.** `docs/compliance/rtc_parity_report_2026-06-24_stability.txt` commits with this packet PR as a second, independent predicate-7 observation (non-flaky confirmation). Resolved — no longer working-tree-only.

## §6 Broker attestation & sign-off

### Overall attestation

All eight predicates carry PASS verdicts above. The attestation evidence index for `rtcFormRefreshJobBuilt` is complete. I attest, on broker compliance authority under California Real Estate Broker scope (Bus. & Prof. Code § 10131(b), CalDRE B9445457), that the eight predicates constituting the form-refresh-job-built condition of `isLaProductionUnblocked()` are satisfied as of the date below, on the evidence committed in this PR and the external evidence referenced in §3.

**Scope of this attestation.** This attestation authorizes flipping `rtcFormRefreshJobBuilt` in the production gate code. The LA production gate (`isLaProductionUnblocked()`) requires SIX conditions in total; after this flip, the gate remains closed on `cityOfLaZipsAuthoritative` (false) and `parcelEndpointHealthCheckLive` (false). The three already-true conditions (`geocodeConfirmationBuilt`, `cityBusinessDayCalendarBuilt`, `geocodeAuditDurabilityWired`) plus this flip plus the two still-false conditions equal the six-condition closure. Flipping `rtcFormRefreshJobBuilt` does not open the gate. The gate-flip PR for this flag is separate from the packet PR and proceeds only after this packet commits.

**Scope of what this attestation does not cover.** Deployed-runtime parity (M1/M2 distinction, predicates 7 and 8) is operational evidence captured at first cron-leg run post-go-live. Production-data RLS read-through (predicate 8) is operational evidence captured the same way. Either divergence from M1 baseline triggers operational rollback procedures, separately ruled, and does not retroactively invalidate this attestation.

**Self-corrections of record.** Three system-working catches during this work stream are noted for the audit trail: (a) the gitignore-vs-guard precedent from earlier in the session; (b) the §2.5 supersession framing — runner ruling §2.5 was initially mischaracterized as unrecoverable and is in fact present at lines 121–137 stating `> 14 days`; the predicate-6 boundary `≥ 14d` stands as deliberate supersession per `predicate_6_boundary_reconciliation_broker_determination_2026-06-25.md`, not gap-fill; (c) the §0 footer parenthetical of `attestation_packet_pre_commit_disposition_broker_ruling_2026-06-25.md` carrying the superseded "unrecoverable" phrase independently of §2.1, reconciled via inline option-(c) ruling appended to the boundary-reconciliation determination. The build authoring discipline (diagnose-and-surface, refuse-to-extract on unattributed sources) operated correctly on each.

— Jack Taglyan / California Licensed Real Estate Broker / CalDRE B9445457 / Broker Compliance Review · 2026-06-25
