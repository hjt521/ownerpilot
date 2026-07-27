# Predicate-6 Readiness Evidence — `parcelEndpointHealthCheckLive`

**Author:** Build (engineering record). **NOT a ruling.** For broker review prior to the predicate-6 attestation packet.
**Date:** 2026-06-27
**Governing determination:** `parcel_endpoint_health_check_live_determination_broker_2026-06-25.md` + parcel-health cron-slice ruling (2026-06-27).
**Purpose:** Pull the build-side / operational inputs the broker needs for the predicate-6 attestation, surface gate-readiness criteria for ruling (§6), and flag forks with compliance consequence (§8).

> **HEADLINE FORK — RESOLVED 2026-06-27 (PR #95, commit `52e84b4`).** Recon originally found the freshness-gated gate-READ path (determination §3/§4/§6, acceptance criterion §"110".5) was not built — predicate 6 was not a clean boolean flip. The broker ruled "build the read path first"; it is now built, boundary-tested (18/18), and observed open against live data. See §8.1 (resolution) and §5 (now implemented). The remaining work is the produce-path wiring + flag flip, which is the §8.2 go-live signing commit.

---

## §1 — Predicate identity

| Field | Value |
|---|---|
| Flag name | `parcelEndpointHealthCheckLive` |
| Current value | `false` |
| Target value | `true` |
| Position | Predicate 6 of 6 on the LA go-live gate (the last one) |

**Mirror locations where the flip must land:**
- `lib/jurisdiction/laRtcRules.ts` (the `LA_PRODUCTION_DEPENDENCIES` const; consumed by `isLaProductionUnblocked()`)
- `supabase/functions/rtc-refresh/_core/laRtcRules.ts` (generated edge mirror — regenerate via `npm run build:edge-core`)
- Test expectations: `lib/jurisdiction/laOverlay.test.ts` (+ see §7 for the cross-file ripple)

**Material note:** flipping this flip makes `isLaProductionUnblocked()` return **true** (all six predicates satisfied). That is the actual LA-production go-live event — it lets the resolver/produce path run on real traffic — not merely a checkbox. See §7 and §8.2.

---

## §2 — Probe cron identity

| Field | Value |
|---|---|
| Cron jobid | `2` |
| Job name | `parcel-health-probe` |
| Function | `parcel-health` Edge Function (route `/functions/v1/parcel-health`) |
| Schedule | `*/30 * * * *` (every 30 minutes, UTC) — cron-slice ruling 2026-06-27 (supersedes the §8 twice-daily baseline) |
| Active | `true` |
| Auth | custom header `x-parcel-health-secret`, value read at run time from Vault (`vault.decrypted_secrets`, name `PARCEL_HEALTH_PROBE_SECRET`) under pg_cron's postgres role; mirrored as the Edge Function secret of the same name. **Secret value not included.** |

---

## §3 — Endpoints under probe

Two endpoints; each probe is a production-twin (same encoder/classifier the resolver uses) plus a probe `User-Agent: ownerpilot-parcel-health/1.0`. Single attempt, no internal retry (the §4 two-consecutive roll-up is the retry layer). Healthy iff (in order) HTTP 200 → response-shape valid → latency ≤ `LATENCY_CEILING_MS` (18 000 ms).

**County** (`lib/jurisdiction/parcelHealth/endpoints/county.ts`)
- Target: LA County parcel API, query built by `buildCountyParcelQueryUrl(parseAddressForCounty('500 W Temple St, Los Angeles, CA 90012'))` (Hall of Administration).
- Method: GET.
- Success signature: HTTP 200, JSON `error == null`, `features[0].attributes.TaxRateCity` normalizes to `"los angeles"`.
- Timeout: `COUNTY_PROBE_TIMEOUT_MS = 8 000`.
- Retry: none (single attempt).

**ZIMAS** (`lib/jurisdiction/parcelHealth/endpoints/zimas.ts`)
- Target: ZIMAS ArcGIS spatial query at a fixed WGS84 point — LA Central Library `{lng:-118.2428, lat:34.0537}` — via `buildZimasParcelQueryUrl`.
- Method: GET.
- Success signature: HTTP 200, JSON `error == null`, `classifyZimasParcel(parseZimasFeatures(json)).verdict === 'zimas_confirms_la'` (exactly one parcel AND `CNCL_DIST ∈ [1..15]` AND `TRACT` non-blank).
- Timeout: `ZIMAS_PROBE_TIMEOUT_MS = 15 000` (raised 8 000→15 000 per the ZIMAS-from-Edge diagnostic 2026-06-27; ZIMAS measured ~9 s from Edge).
- Retry: none (single attempt).

Shared evaluator `evaluateProbe.ts`: `LATENCY_CEILING_MS = 18 000` (sits above the slowest endpoint timeout so a within-timeout fetch is never a latency failure).

---

## §4 — Probe run history (as of 2026-06-27 20:00 UTC)

Source: `parcel_health_probe_results` (one row per endpoint per cycle).

| Metric | County | ZIMAS |
|---|---|---|
| Healthy | 35 | 31 |
| Unhealthy | 0 | **4** |
| Consecutive-pass streak (most recent) | **35** | **22** |
| Current rolled-up status | `live` | `live` |
| Current consecutive_failures | 0 | 0 |
| Last probe | 2026-06-27 20:30:02 UTC | 2026-06-27 20:30:12 UTC |

- **Total rows:** 70. First probe 2026-06-27 01:50:10 UTC; last 2026-06-27 20:30:12 UTC (~18.7 h of history). No new failures since the recon snapshot; the 4 ZIMAS failures below are unchanged.
- **Cron run health:** the last 8 scheduled runs all `succeeded` (`cron.job_run_details`); no cron-level failures.

**The 4 ZIMAS failures (all `reason = http_status`):**

| # | probed_at (UTC) | http_status | error_detail |
|---|---|---|---|
| 1 | 2026-06-27 01:50:18 | null | null |
| 2 | 2026-06-27 01:57:44 | null | null |
| 3 | 2026-06-27 02:00:53 | null | null |
| 4 | 2026-06-27 09:30:16 | 0 | `The signal has been aborted` (timeout/abort) |

Build's read (for broker judgment, not a ruling): failures #1–#3 cluster at 01:50–02:00 at ~7-minute spacing — i.e. **not** the `*/30` cron cadence; they are manual probe invocations from the deploy/diagnostic session (the ZIMAS-timeout investigation that raised the timeout 8 s→15 s), before the fix landed, and predate the 5a forensic columns being populated (hence null http_status/error). Failure #4 is a single isolated ZIMAS timeout. **None of the four were two consecutive cron probes**, so the §4 roll-up never flipped ZIMAS to `not_live`; `consecutive_failures` is 0 and ZIMAS has been healthy for 21 straight probes (~10.5 h since 09:30). County: zero failures, 34/34.

**Alert sink wiring:** failures route via `EmailAlertDestination` (Resend) on a status *transition* only (`to_not_live` / `to_live`, per `rollUpStatus.ts`), to `PARCEL_HEALTH_ALERT_EMAIL`. Probe history is also durably recorded in `parcel_health_probe_results` (017) for forensics. Because no two-consecutive failure occurred, no `to_not_live` transition fired → no alert was sent for the 4 isolated failures (correct per §4: single failures filter, no re-alert).

---

## §5 — Health-state surface

**Table the gate-read is *designed* to consult:** `public.parcel_health_status` (migration 018) — exactly one row per endpoint.

| Column | Type | Notes |
|---|---|---|
| `endpoint` | text PK | `'county'` / `'zimas'` |
| `current_status` | text | `'live'` / `'not_live'` (default `not_live` — fail-closed seed) |
| `consecutive_failures` | integer | ≥ 0 |
| `last_success_at` | timestamptz | null until first healthy probe |
| `last_probe_at` | timestamptz | |
| `updated_at` | timestamptz | |

**Current rows:** county `live` (cf 0, last_success 20:00:04); zimas `live` (cf 0, last_success 20:00:12).

**RLS posture (read path):** RLS enabled; `anon`/`authenticated` revoked. A dedicated read-only role `parcel_health_reader` (migration 019) has `SELECT` on `parcel_health_status` **only** (probe-history 017 intentionally not exposed). Per the 019 header, the serve-path reader credential (ES256 JWT carrying `role=parcel_health_reader`) is "minted + wired in a later slice."

**Freshness guard — IMPLEMENTED 2026-06-27 (PR #95, `52e84b4`).** `lib/jurisdiction/parcelHealthGate.ts`: per-endpoint `current_status === 'live'` AND `last_probe_at` within a **75-minute** window (§8.3 ruling); fail-closed on `missing` / `not_live` / `stale`; fail-closed on read error (uniform stale-not-live per determination §3); `isLaProductionLive` short-circuits on the static gate (no DB read) when `parcelEndpointHealthCheckLive === false`. 18/18 boundary tests (`parcelHealthGate.test.ts`) including the 75:00-open / 75:00+1s-closed edge. The role-scoped reader client (`parcel_health_reader`, 019) is constructed at the produce-path wiring (the §8.2 signing commit). Note the window was widened from the determination's original 30-min to 75-min per §8.3 — see that section.

---

## §6 — Gate-readiness criteria (proposed — for broker ruling)

Broker-ruled 2026-06-27 (predicate-6 ruling §6 / §8.4). Status of each:

1. **Minimum probe-run count:** no fixed floor ruled; the documented history (county 35, zimas 31 healthy over ~18.7 h) plus the now-built dynamic gate is sufficient. **Met.**
2. **Minimum consecutive-pass streak:** broker ruled the ≥24 proposal **not required** — "21 with a clean explanation for the 4 failures, and the 2-consecutive roll-up unbroken across all of them, is sufficient." Current county 35, zimas 22. **Met.**
3. **Failures blocking the flip:** broker ruled the 4 ZIMAS failures **do not block** (isolated, none two-consecutive, root cause pre-fix timeout since shipped, roll-up correctly held `live`). The diagnostic-cluster context is documented in §4 for the attestation packet's audit trail. **Met (with documented resolution).**
4. **Freshness guard exercised/built:** broker ruled the dynamic gate-READ path must be built + boundary-tested before the flip — now done (§5, §8.1). Live observation `gate_open=true`. **Met.** Broker requires at least one clean probe cycle observed under the consumer before signing; the live read at 2026-06-27 ~20:32 UTC (both endpoints live, ~2 min fresh, gate open) satisfies this.

---

## §7 — Predicate-flip diff (held — for the signing commit)

**`lib/jurisdiction/laRtcRules.ts`** — line 170:
```
-  parcelEndpointHealthCheckLive: false,
+  parcelEndpointHealthCheckLive: true,
```
(Plus the two narrative comments at ~L158–161 / ~L179–181 that currently say "one flag remains false: parcelEndpointHealthCheckLive" / "blocked on … parcelEndpointHealthCheckLive" → update to "all six satisfied; gate open." `isLaProductionUnblocked()` already requires this flag `=== true`, so no logic change there.)

**`supabase/functions/rtc-refresh/_core/laRtcRules.ts`** — regenerate via `npm run build:edge-core` (do not hand-edit), then `ci:verify-edge-core-sync`.

**Test expectations — larger ripple than predicate 5, because the flip OPENS the gate:**
- `lib/jurisdiction/laOverlay.test.ts`: L26 `isLaProductionUnblocked() === false` → `=== true`; L31 `laProductionMissingDependencies().length === 1` → `=== 0`; L64 `parcelEndpointHealthCheckLive === false` → `=== true`; comment/heading updates.
- `lib/jurisdiction/rtcFormBaselines.test.ts` L48, `lib/jurisdiction/rtcRefresh/rtcRefreshJob.test.ts` L38, `lib/jurisdiction/geocode/resolveLaAddress.test.ts` L87 — each asserts `isLaProductionUnblocked() === false` ("gate closed at HEAD"). All three flip to `true` once predicate 6 is set, so each needs its expectation updated. These tests encode "LA not live yet"; flipping predicate 6 is the event that changes that.

Same single-signing-commit pattern as predicate 5 (flip + mirror regen + test updates in one broker-attested commit) — **but only after the §8.1 gate-read path question is resolved.**

---

## §8 — Open questions for broker

### §8.1 — RESOLVED: dynamic gate-READ path built (was: not built)
**Resolution (2026-06-27, PR #95 `52e84b4`):** broker ruled "build the read path first." The dynamic freshness-gated gate-read consumer is now built (`lib/jurisdiction/parcelHealthGate.ts` + `parcelHealthGateReader.ts`), boundary-tested 18/18 (`parcelHealthGate.test.ts`), and observed open against live data (`gate_open=true`). The original finding is retained below for the audit trail.

The determination specifies a **dynamic** gate: §3 freshness window (30 min), §4 two-consecutive roll-up, §6 "gate reads the rolled-up status only," and acceptance criterion §"110".5 — "the freshness-window guard and 2-consecutive-failure logic **are implemented in the gate-read path, tested at boundary conditions** (29 min stale, 30 min stale, 1 vs 2 consecutive failures, both live, one live one not-live)."

What exists: the probe cron (writer) is live and healthy; `parcel_health_status` holds the rolled-up verdict; the `parcel_health_reader` role + RLS policy exist. **What does not exist:** any code that *reads* `parcel_health_status` on the produce/gate path, applies the 30-min freshness window, applies the 2-consecutive logic, and fails closed on staleness — and its boundary tests. The 019 migration itself defers this to "a later slice."

Consequence: flipping `parcelEndpointHealthCheckLive: true` in `laRtcRules.ts` makes `isLaProductionUnblocked()` a **static** true. It does **not** make the gate dynamically fail closed if an endpoint goes stale/down after the flip — because nothing re-reads `parcel_health_status`. That contradicts the determination's §3/§4/§6 semantics and acceptance criterion §"110".5.

**Resolved:** broker ruled (2026-06-27) to build the dynamic read path first — predicate-6 satisfaction requires it, not a static re-scope (tenant-defense: the determination's value is the *dynamic* fail-closed behavior). Built in PR #95. Remaining: produce-path wiring (`resolveLaAddressV2` → `isLaProductionLive`) + flag flip = the §8.2 signing commit.

### §8.2 — The flip is the go-live event
Flipping predicate 6 opens `isLaProductionUnblocked()` → the resolver's gate assertion passes → the produce path runs on real LA traffic. Confirm you intend this flip to *be* the LA production go-live decision (predicate 5 left the gate closed; this one opens it). If you want a staged go-live (e.g., flip the predicate but hold traffic behind another switch), that's a separate fork to call now.

### §8.3 — RESOLVED: freshness window widened to 75 min (was: 1:1 no slack)
Original finding: the deployed `*/30` cron against the determination's 30-minute window is 1:1 (no missed-probe tolerance), risking spurious not-live reads. **Resolution (broker ruling 2026-06-27):** the freshness window is widened to **75 minutes** (2.5:1 slack vs the `*/30` cron) — survives one missed probe cleanly, fails closed by the third missed cycle; cron cadence unchanged (ZIMAS probe load stays put). Implemented as `PARCEL_HEALTH_FRESHNESS_WINDOW_MS` in `parcelHealthGate.ts` (PR #95). This ruling is part of the predicate-6 ruling itself (not a correction to a signed prior ruling), so it lives here and in the eventual attestation packet §6 — no separate amendment asset.

### §8.4 — ZIMAS failures (surfaced per your request)
The 4 ZIMAS `http_status` failures in §4 — all isolated, none two-consecutive, root cause = the pre-fix ZIMAS timeout (since raised 8 s→15 s), 21 healthy probes since. Surfaced for your review before signing. No County failures.

---

## Standing disciplines

- This file is a build engineering record; it paraphrases no locked compliance prose (determination text is quoted and section-cited).
- Build-side engineering decisions (CRS, polling mechanics, log strings, API field names, timeouts) are not surfaced as questions; only broker-ruled items (§6 criteria, §8 forks) are.
- sha256 + byte count computed at share time; attorney-token scan clean (broker-scope only, no attorney engaged).

— Build engineering record · 2026-06-27 · for broker review (Jack Taglyan / CalDRE B9445457)


---

> **Annotated correction — CalDRE license number (2026-07-28):** This document's original text above
> references CalDRE **B9445457**. That number was an error; the broker's correct license number is
> **CalDRE 01871659**. Per DOC-003 §9, this is an annotated correction appended to this closed record —
> the original text above is preserved unmodified, not rewritten or deleted. See the broker's direct
> instruction (session of 2026-07-27/28) authorizing this correction, and the paired
> `docs/compliance/lane7_notion_cron_mirror_ruling_2026-07-27.md`, which already carries the corrected
> number.
>
> — Appended by engineering (Claude/Cowork) per broker instruction, 2026-07-28. Not a new ruling; does
> not reopen or otherwise alter this document's original disposition.
