# LA Go-Live Defect Remediation — Closure Summary

**Date:** 2026-06-28
**Prepared by:** Engineering (for broker / compliance officer)
**Status:** RESOLVED & DEPLOYED TO PRODUCTION — verified live
**Scope:** The defects surfaced in the 2026-06-28 live broker test of the LA 3-day-notice flow.

---

## What was wrong

1. **Jurisdiction false-negative (primary).** Genuine City-of-LA addresses — including the broker's own property, **5537 La Mirada Ave, Unit 202, LA 90038** — were routed to `manual_review` ("we weren't able to verify jurisdiction") and could not produce a notice. Root cause: the County parcel lookup matched by reconstructed **address string**, which missed real parcels, and the ZIMAS fallback intermittently timed out.
2. **Day-count concern ("Defect A").** Reported as an off-by-one in the 3-day compliance period.

## What was fixed (per the four 2026-06-28 broker rulings)

- **County lookup → spatial point-in-polygon** at the geocoded coordinate (Decision 1). Decision rule unchanged (`TaxRateCity` only; `SitusCity` still prohibited).
- **ZIMAS hardening** (Decision 3): retry on timeout only, bounded 10s per attempt, attempt telemetry.
- **Disposition forks** (zero/multi-feature ruling): multi-feature disagreement → `county_ambiguous` (no ZIMAS); zero features → ZIP-gated (`county_situs_gap` when out-of-set). Fallback order preserved (Decision 4).
- **Audit forensics added** (no migration): `queryMethod`, coordinate, feature count, per-feature `TaxRateCity`, ZIMAS attempts.
- **County timeout tuned to 3000ms** from a 24-address latency probe.

## Verification (live production, server-confirmed)

- **5537 La Mirada Ave** and **1200 Wilshire Blvd** → **`confirmed_la`**. The audit log shows the same La Mirada address going from `manual_review` (yesterday, address-string) to `confirmed_la` via `county_confirm` / `spatial_point_in_polygon` (today), ZIMAS not consulted.
- **Corpus / #4–#5 non-negotiables hold:** LA-city addresses → `confirmed_la`; **Santa Monica (2600 Wilshire) and unincorporated (11460 S Normandie) → `not_la`.** A Santa Monica false-positive is structurally prevented.
- **Tests:** 64 suites green, incl. 14 pinned disposition-fork regressions; typecheck clean; Edge mirror in sync; CI green; PR #99 merged; Vercel deploy Ready.
- **Latency:** p99 382–520ms, zero timeouts; the prior one-off 180s stall did not reproduce.

## Defect A — no defect

The engine is statutorily correct (CCP §12/§12a, AB 2343). The report assumed 2026-06-28 was a Saturday; it is a **Sunday**. Live engine trace: served 2026-06-29 → expires 2026-07-02, matching the wizard. **No code change** (full trace on file: `defect_A_daycount_verification_2026-06-28.md`).

## One open, non-blocking item

A **municipal-border geocoding edge**: an address typed with one city that sits on a city line can geocode across the boundary, and the resolver (correctly, per the ratified rules) trusts the geocoded parcel over the typed city. Observed with the test string "1600 Main Street, Santa Monica," which geocodes to a real **Venice/Los Angeles** parcel — a *correct* confirm for where it resolved, not a Santa Monica error. This is flagged for a separate determination; it does **not** affect the correctness of what is deployed.

## Net

The morning's blocking defect is fixed and live; the jurisdiction non-negotiables are intact and server-verified; Defect A is closed. The manual broker-confirm path (Decision 2) is a separate in-progress slice and is not required for this remediation.

— Engineering, 2026-06-28
