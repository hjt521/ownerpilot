# Predicate-5 Verification Evidence — `cityOfLaZipsAuthoritative` v1

**Author:** Build (engineering record); ratified by broker 2026-06-27.
**Purpose:** Records the empirical verification evidence required by A-3 §8.4 for the predicate-5 attestation packet. To be referenced verbatim in the packet's §4 (Runtime verification evidence) at sign-off.
**Status:** v1 snapshot committed as review artifact; supersedes provisional 111-set only after A-3 sign-off and §8 packet attestation per §3.3.

---

## §1 — Snapshot identity

| Field | Value |
|---|---|
| Snapshot file | `la_authoritative_zips_snapshot.json` |
| Snapshot sha256 | `e40e3ab2c47bdb9429f19c1d97d69f0ca5bd20aa6ecbd2e15b203e5f47b18452` |
| Committed | 2026-06-27 (review artifact, not yet superseding `lib/jurisdiction/geocode/cityOfLaZips.ts`) |
| Authoritative total (in + straddler) | 119 |
| Override count | 1 |
| Override ZIPs | `["90056"]` |

## §2 — Bucket counts (city-intersecting frame)

| Bucket | Count |
|---|---|
| Unambiguous-in (`area_ratio ≥ 0.90`) | 82 |
| Straddler (`0.10 ≤ area_ratio < 0.90`) including 90056 override | 37 |
| Unambiguous-out (`area_ratio < 0.10`, city-intersecting) | 35 |
| Non-intersecting ZCTAs in full CA input (`area_ratio == 0`) | 1615 |
| Total out rows (35 + 1615) | 1650 |

Authoritative total = in + straddler = **119**.

## §3 — §5.1 build-side QA results

| Check | Result |
|---|---|
| SANITY_OUT canary (§5.1-a) | **CLEAN** — no SANITY_OUT ZIP in `in` bucket; 90056→straddler override introduces no non-LA ZIP into `in` |
| Zero-area sliver detection (§5.1-b) | None observed (`zero_area_slivers: []`) |
| Coverage check (§5.1-c) | **PASS** — `coverage_ratio = 0.993`, within 1.5% tolerance per the 2026-06-27 calibration |
| ZCTA-field validity (§5.1-d) | **PASS** — `zcta_rows_dropped_invalid: 0` |

## §4 — §5.4-c canonical_override_exceptions

One override recorded, broker-attested 2026-06-27:

- **ZIP 90056** — construction bucket `out` (`area_ratio = 0.0591`), override bucket `straddler`. Intersection area 2,603,456.1 sq ft; ZCTA total 44,035,353.5 sq ft. Empirical corroboration of split City-of-LA "Ladera" / unincorporated "Ladera Heights" jurisdiction matches published sources. Full override text in the snapshot provenance header.

## §5 — Inputs (provenance)

| Input | Path | sha256 | Edit/vintage |
|---|---|---|---|
| C-8 boundary | `c8_boundary.geojson` | `328b4db47541d9cb8bac1d5bc66570f62f587406172ac488d543bf71dbb68b38` | 2026-05-19 |
| C-7 boundary | — | — | **SKIPPED** (fail-soft §5.3-d; cross_check_skipped: true) |
| ZCTA-2010 | `tl_2010_06_zcta510.shp` | `3f2de4022aeb5ef3c1806c91b62b433a49f3feb73238065b9717a2ea298f7a02` | 2010 vintage, ZIP field `ZCTA5CE10` |

Construction parameters:
- CRS: EPSG 2229 (California State Plane Zone V, US survey feet)
- Three-bucket thresholds: 0.90 / 0.10
- Cross-check: skipped (C-7 GeoJSON not yet sourced; tracked in §10.2 / §10.3)

## §6 — A-2 first-reconciliation packet

| Field | Value |
|---|---|
| Packet file | `workstream_a_A2_first_reconciliation_packet.json` |
| Packet sha256 | `5288c999874f79291301bd3e41f8e33ab18bd9f6414ccd6f2121d5f843369437` |
| Generated | 2026-06-27T17:38:55.907960+00:00 |
| Baseline | provisional 111-set at `lib/jurisdiction/geocode/cityOfLaZips.ts` |
| ADD auto-applied (A-2 §2.1) | 10 — 3 legit in-set (90079, 90090, 91371), 7 border straddlers (90210, 90230, 90247, 90402, 90501, 90502, 91608) |
| REMOVE broker-ruled (A-2 §2.2) | 3 — 90056 with §5.4-c override, 90249 + 90748 clean |
| Broker attestation | Jack Taglyan / CalDRE B9445457 / 2026-06-27 |

## §7 — v6 corpus verification

| Field | Value |
|---|---|
| Test suite | `lib/jurisdiction/geocode/resolveLaAddressV2.test.ts` |
| Result | **48 / 48 PASS** |
| Delta vs pre-snapshot baseline | No new failures attributable to the snapshot |
| Snapshot ZIP-set consistency (spot check) | 90401 out ✓ (corpus expects out); 91343 in ✓ (corpus expects in); 90017 in; 90044 straddler |

## §8 — Cross-check posture

| Field | Value |
|---|---|
| C-7 divergence check | **SKIPPED** under §5.3-d (fail-soft); C-7 Socrata export auth-gated at first-construction |
| `cross_check_skipped` provenance field | `true` |
| Deferred to | Next snapshot refresh once C-7 GeoJSON sourced via dataset "Download file" → GeoJSON/Shapefile path |
| Tracked in A-3 §10 | Yes (cross-workstream signal) |

## §9 — Outstanding gates before predicate-5 flip

This evidence file documents predicate-5 packet items 7–10 of A-3 §8.3. Items 1–6 (canonical source, currency, cadence, discrepancy, runtime chain, license/reliance) are documented by the A-3 ruling itself. Items still pending before the §8 attestation packet can be authored:

1. A-3 §1 ruling summary (broker authoring, in progress)
2. A-3 §§2.3 / 2.4 / 2.5 (access method, sourcing-rail mechanics, auth — broker authoring)
3. A-3 DRAFT → final rename at sign-off
4. Predicate-5 §8 attestation packet (broker authoring after above lands)

— Build engineering record · 2026-06-27 · ratified by Jack Taglyan / CalDRE B9445457
