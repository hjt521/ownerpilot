# Predicate-6 Attestation Packet — §4 Build Evidence (DRAFT)

**For:** drop-in as §4 (Runtime verification evidence) of the predicate-6 attestation packet.
**Author:** Build (engineering record). **Date:** 2026-06-27. Pinned to live state as of 2026-06-27 ~20:32 UTC.
**Source readiness file:** `predicate_6_parcel_endpoint_health_check_live_readiness_evidence_2026-06-27.md` (sha256 `6ba56ff7404c78dffc3e9da8f8247ea9bcb28d25f11f3be6be7741ab6ac48e14`).

---

## §4.1 — Probe cron operational status

| Field | Value |
|---|---|
| Cron jobid | `2` |
| Job name | `parcel-health-probe` |
| Function / route | `parcel-health` Edge Function, `/functions/v1/parcel-health` |
| Schedule | `*/30 * * * *` (every 30 min, UTC) — cron-slice ruling 2026-06-27 |
| First run | 2026-06-27 01:50:10 UTC |
| Last run | 2026-06-27 20:30:12 UTC |
| Total probe rows | 70 (≈ 35 cycles × 2 endpoints) |
| Auth | header `x-parcel-health-secret`; value read at run time from Vault `vault.decrypted_secrets` (name `PARCEL_HEALTH_PROBE_SECRET`) under pg_cron's postgres role; mirrored as the Edge secret of the same name. No secret values recorded. |
| Recent run health | last 8 scheduled runs all `succeeded` (`cron.job_run_details`) |

## §4.2 — Probe run history (roll-up)

| Endpoint | Healthy | Unhealthy | Consecutive-pass streak | Status | consecutive_failures |
|---|---|---|---|---|---|
| county | 35 | 0 | 35 | `live` | 0 |
| zimas | 31 | 4 | 22 | `live` | 0 |

The 4 ZIMAS failures (all `reason = http_status`):

| # | probed_at (UTC) | http_status | error_detail | disposition |
|---|---|---|---|---|
| 1 | 2026-06-27 01:50:18 | null | null | diagnostic-cluster (see below) |
| 2 | 2026-06-27 01:57:44 | null | null | diagnostic-cluster |
| 3 | 2026-06-27 02:00:53 | null | null | diagnostic-cluster |
| 4 | 2026-06-27 09:30:16 | 0 | `The signal has been aborted` | isolated ZIMAS timeout |

Disposition (broker-ruled §8.4, 2026-06-27): failures #1–#3 cluster at 01:50–02:00 at ~7-minute spacing — not the `*/30` cron cadence; they are manual probe invocations from the deploy/diagnostic session (the ZIMAS-timeout investigation that raised the timeout 8 s→15 s), pre-fix and predating the 5a forensic columns (hence null fields). Failure #4 is a single isolated post-fix ZIMAS timeout. **No two ZIMAS (or county) failures have ever been consecutive**, so the §4 two-consecutive roll-up never flipped any endpoint to `not_live`; `consecutive_failures` has been 0 throughout. Non-blocking per §8.4.

## §4.3 — Health-state surface

| Field | Value |
|---|---|
| Table | `public.parcel_health_status` (migration 018) |
| Row count | 2 (one per endpoint) |
| county row | `current_status='live'`, `last_probe_at=2026-06-27 20:30:02 UTC` |
| zimas row | `current_status='live'`, `last_probe_at=2026-06-27 20:30:12 UTC` |
| RLS (read path) | RLS enabled; `anon`/`authenticated` revoked. Role `parcel_health_reader` (migration 019) has `SELECT` on `parcel_health_status` **only** (probe-history 017 not exposed). |
| Freshness window | **75 minutes** (`PARCEL_HEALTH_FRESHNESS_WINDOW_MS`, §8.3 ruling) |
| Freshness code location | `lib/jurisdiction/parcelHealthGate.ts` |
| Comparison | `age = now − last_probe_at`; fresh iff `age ≤ 75 min` (inclusive). 75:00 → fresh (open); 75:00 + 1 ms → stale (closed). |

## §4.4 — Dynamic gate-read consumer (resolves §8.1)

| Field | Value |
|---|---|
| PR | #95, branch commit `52e84b4`, merged to `main` |
| Files | `lib/jurisdiction/parcelHealthGate.ts` · `lib/jurisdiction/parcelHealthGateReader.ts` · `lib/jurisdiction/parcelHealthGate.test.ts` |

File pins:

| File | sha256 | bytes |
|---|---|---|
| `parcelHealthGate.ts` | `0d39766b0a57f44e15df43afc8104e30f0f270bc3d0d7ada3f9f89273a71a2b0` | 6225 |
| `parcelHealthGateReader.ts` | `24e1ae77d2b2f9c88e4b4d7895bc68c347e57aee874632e2331cb4f13352fb18` | 1814 |
| `parcelHealthGate.test.ts` | `2ce1f5368b4dfac742a3fefae7af05019678aecf173c67573d8d32e0f9100313` | 5386 |

Boundary test suite (`parcelHealthGate.test.ts`, **18/18 pass**) — classes:
- live + fresh → OPEN
- one `not_live` (both fresh) → CLOSED (reason `not_live`)
- one stale (> 75 min) → CLOSED (reason `stale`)
- one row missing entirely → CLOSED (reason `missing`)
- row present, `last_probe_at` null → CLOSED (reason `missing`)
- freshness boundary: 75:00 → OPEN; 75:00 + 1 s → CLOSED
- `parcelEndpointHealthCheckLive === false` → static short-circuit, reader NOT called
- read throws (DB unreachable) → fail CLOSED
- all-true + both live/fresh → OPEN

Gate-close log shape (structured JSON, `console.warn`): keys `{ level:"warn", event, closures:[{endpoint,condition}] }` for `event="health_read"`; `{ level:"warn", event:"health_read_error", error }` on read failure. `condition ∈ {missing, not_live, stale}`.

Observed-open confirmation: 2026-06-27 ~20:32 UTC, the gate logic evaluated against the live `parcel_health_status` rows returned **gate_open = true** — rows read: county (`live`, age 2.2 min), zimas (`live`, age 2.1 min), both within the 75-min window.

## §4.5 — Predicate-flip diff (held — for the signing commit)

**`lib/jurisdiction/laRtcRules.ts`** line 170:
```
-  parcelEndpointHealthCheckLive: false,
+  parcelEndpointHealthCheckLive: true,
```
Plus the narrative comments at ~L158–161 / ~L179–181 ("one production-traffic flag remains false … parcelEndpointHealthCheckLive" / "blocked on … parcelEndpointHealthCheckLive") → "all six satisfied; gate open." `isLaProductionUnblocked()` already requires this flag `=== true`; no logic change there.

**Edge-core mirror:** `supabase/functions/rtc-refresh/_core/laRtcRules.ts` — regenerate via `npm run build:edge-core` (do not hand-edit), then `ci:verify-edge-core-sync`.

**Wire-up — `lib/jurisdiction/geocode/resolveLaAddressV2.ts`** (makes the gate dynamic):
- L27 import adds `isLaProductionLive` (from `../parcelHealthGate`).
- L230 `gateIsOpen?: () => boolean` (sync test override) is retained.
- L243–245 before:
  ```
  const gateOpen = deps.gateIsOpen ?? isLaProductionUnblocked;
  if (!gateOpen()) {
    throw new Error('la-prod-gate-closed: ...');
  ```
  after (intent — exact mechanics are the signing commit's): default gate becomes the async dynamic gate `isLaProductionLive({ reader: <parcel_health_reader-scoped client> })`; the check becomes `await`; the injected sync `deps.gateIsOpen` override is preserved so the v6 corpus (which injects `gateIsOpen: () => true`) is unaffected.

**Test expectation updates (cross-file "gate closed at HEAD" → open):**
- `lib/jurisdiction/laOverlay.test.ts`: L26 `isLaProductionUnblocked() === false` → `=== true`; L31 `laProductionMissingDependencies().length === 1` → `=== 0`; L64 `parcelEndpointHealthCheckLive === false` → `=== true`; comment/heading updates.
- `lib/jurisdiction/rtcFormBaselines.test.ts` L48, `lib/jurisdiction/rtcRefresh/rtcRefreshJob.test.ts` L38, `lib/jurisdiction/geocode/resolveLaAddress.test.ts` L87 — each `isLaProductionUnblocked() === false` → `=== true`.
- `lib/jurisdiction/geocode/resolveLaAddressV2.test.ts` — unchanged (injects `gateIsOpen: () => true`; unaffected by the default-gate change).

## §4.6 — Pre-commit gate results (from the dynamic-gate-read slice, PR #95)

| Gate | Result |
|---|---|
| `tsc --noEmit` | PASS (clean) |
| `node scripts/run_tests.mjs` | **61 / 61 suites pass, 0 failed** |
| gate-read suite (`parcelHealthGate.test.ts`) within the run | 18 / 18 pass |
| `ci:verify-locked-prose` | PASS |
| `ci:verify-parcel-health-core-sync` | PASS (no diff) |
| `ci:typecheck-edge` | PASS |
| `ci:verify-edge-core-sync` | PASS (no diff) |
| `supabase/functions` subtree | unchanged by this lib-only slice (last verified 6 / 6 suites pass) |

## §4.7 — Open operational items (non-blockers, for audit trail)

- **ZIMAS latency near timeout:** ZIMAS measures ~9 s from Supabase Edge under healthy conditions; the timeout was raised 8 s→15 s (2026-06-27). One isolated post-fix abort (failure #4, 09:30) indicates ZIMAS can occasionally approach the 15 s ceiling. Non-blocking: the §4 two-consecutive roll-up absorbs single slow/failed probes, and the 75-min freshness window tolerates one missed cycle. Tracked; no action required for the flip.
- No other operational items observed during the slice build. (County: zero failures across 35 probes.)

---

**Standing disciplines:** sha256 + byte count computed at share time; no locked prose paraphrased; attorney-token scan clean (broker-scope only). No new forks surfaced while assembling §4 — §8.1 / §8.3 were resolved by broker ruling 2026-06-27 and are reflected above.

— Build engineering record · 2026-06-27 · for broker packet assembly (Jack Taglyan / CalDRE B9445457)
