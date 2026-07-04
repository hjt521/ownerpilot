# Predicate-6 Attestation Packet — §4 Build Evidence

**For:** drop-in as §4 (Runtime verification evidence) of the predicate-6 attestation packet.
**Author:** Build (engineering record). **Date:** 2026-06-27. Pinned to live state as of 2026-06-27 ~21:01 UTC.
**Supersedes:** the prior §4 DRAFT (sha256 `561bf43cc05a2c4f5cb016dc4c9a5ca88b72c48119b042dd6346a9d9311f35c3`), re-authored against committed reality after the Slice-1 wiring merged. The DRAFT is retained in-workspace as audit history.
**Source readiness file:** `predicate_6_parcel_endpoint_health_check_live_readiness_evidence_2026-06-27.md`.

> **Wire-up topology (corrected):** the dynamic gate-read is delivered across two slices.
> **Slice 1 (PR #95 + PR #96, both MERGED)** built and wired the dynamic gate — behavior-neutral, the flag stays `false`, the gate short-circuits closed before any read.
> **Slice 2 (HELD — the broker-signed flip)** is *only* the flag flip + its test ripple. §4.5 reflects this corrected (smaller) scope.

---

## §4.1 — Probe cron operational status

| Field | Value |
|---|---|
| Cron jobid / name | `2` / `parcel-health-probe` |
| Function / route | `parcel-health` Edge Function, `/functions/v1/parcel-health` |
| Schedule | `*/30 * * * *` (every 30 min, UTC) |
| First run / last run | 2026-06-27 01:50:10 UTC / 2026-06-27 21:00:12 UTC |
| Total probe rows | 72 (≈ 36 cycles × 2 endpoints) |
| Auth | header `x-parcel-health-secret`; value from Vault (`PARCEL_HEALTH_PROBE_SECRET`) under pg_cron's postgres role; Edge secret of the same name. No secret values recorded. |
| Recent cron runs | succeeded (`cron.job_run_details`); no cron-level failures |

## §4.2 — Probe run history (roll-up)

| Endpoint | Healthy | Unhealthy | Streak | Status | consecutive_failures |
|---|---|---|---|---|---|
| county | 36 | 0 | 36 | `live` | 0 |
| zimas | 32 | 4 | 23 | `live` | 0 |

The 4 ZIMAS failures (all `reason = http_status`): three at 01:50–02:00 (~7-min spacing — manual diagnostic probes during the ZIMAS-timeout investigation that raised the timeout 8 s→15 s; pre-fix; pre-5a-columns, hence null fields), one isolated post-fix timeout at 09:30:16 (`http_status=0`, "The signal has been aborted"). **No two failures (either endpoint) have ever been consecutive** → the §4 two-consecutive roll-up never flipped any endpoint to `not_live`; `consecutive_failures` has been 0 throughout. Broker-ruled non-blocking (§8.4, 2026-06-27).

## §4.3 — Health-state surface

| Field | Value |
|---|---|
| Table | `public.parcel_health_status` (migration 018), 2 rows |
| county / zimas | both `current_status='live'`; last_probe_at 2026-06-27 21:00:03 / 21:00:12 UTC |
| RLS (read path) | RLS on; `anon`/`authenticated` revoked. Role `parcel_health_reader` (019) has `SELECT` on `parcel_health_status` only. |
| Freshness window | **75 min** (`PARCEL_HEALTH_FRESHNESS_WINDOW_MS`, `parcelHealthGate.ts`); fresh iff `age ≤ 75 min` (inclusive: 75:00 fresh, 75:00+1ms stale). |

## §4.4 — Dynamic gate-read consumer + wiring (Slice 1, MERGED)

**PR #95 (`52e84b4`) — gate-read consumer:**

| File | sha256 | bytes |
|---|---|---|
| `lib/jurisdiction/parcelHealthGate.ts` | `0d39766b0a57f44e15df43afc8104e30f0f270bc3d0d7ada3f9f89273a71a2b0` | 6225 |
| `lib/jurisdiction/parcelHealthGateReader.ts` | `24e1ae77d2b2f9c88e4b4d7895bc68c347e57aee874632e2331cb4f13352fb18` | 1814 |
| `lib/jurisdiction/parcelHealthGate.test.ts` | `2ce1f5368b4dfac742a3fefae7af05019678aecf173c67573d8d32e0f9100313` | 5386 |

`evaluateParcelHealthGate` (pure) + `isLaProductionLive` (async): per-endpoint `live` AND `last_probe_at` ≤ 75 min; fail-closed on missing/not_live/stale; static short-circuit when the flag is false (no DB read); fail-closed on read error. 18/18 boundary tests (live/fresh, not_live, stale, missing row, null last_probe_at, 75:00 vs 75:00+1s, flag-false short-circuit, read-throws, all-true open).

**PR #96 (`22bf54c`) — behavior-neutral produce-path wiring:**

| File | sha256 | bytes |
|---|---|---|
| `lib/jurisdiction/parcelHealthStatusReader.ts` (NEW) | `aa76fbe7541afea0b45aa33e106579b095a31da9fbb0fd752feeda21c17ecaca` | 4085 |
| `lib/jurisdiction/parcelHealthStatusReader.test.ts` (NEW) | `afa0c9daa93b44551ab2df12048fbd8a2d2550dc3be698c5c9d4e4d58857253d` | 4408 |
| `lib/jurisdiction/geocode/resolveLaAddressV2.ts` (MOD) | `83385c3898f80541380812c31d9c32460983cf839b41dcabdc61b22cf0d84953` | 16417 |
| `lib/jurisdiction/geocode/resolveLaAddressV2.test.ts` (MOD) | `a9bff357b907e69e0d7c6c74c52da1f9db07f37216d49f5d96ed78ac3aa6a734` | 19087 |
| `app/api/notice/geocode/route.ts` (MOD) | `5bab56a25257e87ed3e713590eb9a1855973a5d0f9c2c25c6fd8d4fb231b7c9a` | 19717 |

- `parcelHealthStatusReader.ts`: narrow-read of `parcel_health_status` under the `parcel_health_reader` JWT via raw fetch/PostgREST (no Supabase client; static `Authorization: Bearer`, mirroring `readBlockState` §3.1). Fail-closed on every path. 18/18 reader tests (round-trip, role boundary, fail-closed).
- `resolveLaAddressV2.ts`: gate default is now `isLaProductionLive`; `gateIsOpen` sync override preserved (v6 corpus untouched); `parcelHealthReader` added to deps.
- `route.ts`: `buildResolverDeps` constructs + injects the reader (env `SUPABASE_PARCEL_HEALTH_READER_JWT` / `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`).

**Behavior-neutral proof:** while `parcelEndpointHealthCheckLive === false`, `isLaProductionLive` short-circuits closed BEFORE the reader is called — unit-tested in `resolveLaAddressV2.test.ts` ("behavior-neutral: reader NOT invoked while predicate flag is false"). Production gate-closes exactly as before the wiring.

**Gate-close log shape** (`console.warn` JSON): `{ level:"warn", event:"health_read", closures:[{endpoint,condition}] }`; `{ level:"warn", event:"health_read_error", error }`. `condition ∈ {missing,not_live,stale}`.

**Observed-open confirmation:** 2026-06-27 ~20:32 UTC the gate logic evaluated against live rows returned **gate_open=true** (county/zimas both live, ~2 min fresh). At 21:00 the latest probes keep both endpoints `live` within the 75-min window.

## §4.5 — Predicate-flip diff (HELD — the Slice-2 signing commit)

Scope-corrected: the resolver/route/reader wiring is **already merged (Slice 1)**, so the held flip is *only* the flag transition + its test ripple. Three categories:

1. **`lib/jurisdiction/laRtcRules.ts`** line 170: `parcelEndpointHealthCheckLive: false` → `true` (+ the narrative comments at ~L158–161 / ~L179–181 → "all six satisfied; gate open").
2. **Edge-core mirror** `supabase/functions/rtc-refresh/_core/laRtcRules.ts` — regenerate via `npm run build:edge-core`, then `ci:verify-edge-core-sync`.
3. **Cross-file "gate closed at HEAD" test updates** (flipping makes `isLaProductionUnblocked()` return `true`):
   - `lib/jurisdiction/laOverlay.test.ts`: L26 `=== false`→`=== true`; L31 `length === 1`→`=== 0`; L64 `=== false`→`=== true`; comments/heading.
   - `lib/jurisdiction/rtcFormBaselines.test.ts` L48, `lib/jurisdiction/rtcRefresh/rtcRefreshJob.test.ts` L38, `lib/jurisdiction/geocode/resolveLaAddress.test.ts` L87 — each `isLaProductionUnblocked() === false` → `=== true`.
   - `lib/jurisdiction/geocode/resolveLaAddressV2.test.ts` — the Slice-1 behavior-neutral test ("reader NOT invoked while predicate flag is false") is flag-coupled and must be **re-pointed** post-flip (with the flag true the reader IS read): update it to assert the reader is consulted and the gate evaluates health. The other 51 corpus tests inject `gateIsOpen` and are unaffected.

**Commit-message requirement (broker, carried):** state that the `gateIsOpen` test-override is intentional and preserved by broker ruling, so a future reader of git log understands the v6 corpus passes by design (not because the gate is unwired).

**Go-live prerequisite (env, before/with the flip):** mint a pre-signed `parcel_health_reader`-role JWT and set `SUPABASE_PARCEL_HEALTH_READER_JWT` (analog of `SUPABASE_RTC_READER_JWT`). Without it, the post-flip read fails closed (reader env missing → throw → not-live).

## §4.6 — Pre-commit gate results

**Slice 1 (PR #96):** `tsc --noEmit` PASS · `run_tests.mjs` **62/62 suites, 0 failed** · `ci:verify-locked-prose` PASS · `ci:verify-parcel-health-core-sync` PASS · `ci:typecheck-edge` PASS · `ci:verify-edge-core-sync` PASS. Component suites within: reader 18/18, v6 corpus 52/52, gate-consumer 18/18.

**Slice 2 (the flip):** gates to be run host-side on the signing-commit branch at flip time; expectation all green with the §4.5 test updates applied.

## §4.7 — Open operational items (non-blockers, for audit trail)

- **ZIMAS latency near timeout:** ~9 s typical from Edge; timeout raised 8 s→15 s (2026-06-27). One isolated post-fix abort (09:30) shows ZIMAS can approach the 15 s ceiling. Non-blocking: the two-consecutive roll-up absorbs single slow/failed probes and the 75-min window tolerates one missed cycle. Tracked.
- No other items observed. County: 0 failures across 36 probes.

---

**Standing disciplines:** sha256 + byte count computed at share time; no locked prose paraphrased; attorney-token scan clean (broker-scope only). No new forks surfaced re-authoring §4 — the wire-up scope fork was resolved by the 2026-06-27 Option-B ruling (split into Slice 1 wiring + Slice 2 flip), reflected above.

— Build engineering record · 2026-06-27 · for broker packet assembly (Jack Taglyan / CalDRE B9445457)
