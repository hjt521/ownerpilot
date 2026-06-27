# Workstream A — Fork A-3 (Authoritative Determination — §2.6) Broker Ruling

**Author:** Jack Taglyan (broker).
**Date:** [authoring in progress — §§2.1/2.2 locked 2026-06-27; remaining sections pending; full document date finalized at completion]
**CalDRE / role:** B9445457 — California Licensed Real Estate Broker; sole compliance authority on OwnerPilot AI under Bus. & Prof. Code § 10131(b).
**Scope:** Resolves Fork A-3 of Workstream A (`cityOfLaZipsAuthoritative`, predicate 5 of `LA_PRODUCTION_DEPENDENCIES`). Authors the substantive §2.6 "authoritative" determination — what counts as authoritative for City-of-LA ZIP-set produceability, the source provenance, currency and refresh discipline, discrepancy policy, runtime resolution chain, and broker-scope reliance statement.
**Governs:** the substantive standard A-2's surfacing serves; the engineering scope of the A-1a-returned loader/normalizer; the runtime resolution behavior; the predicate-5 attestation packet.
**Honors:** Fork A-1 ruling (`workstream_a_fork_1_canonical_source_broker_ruling_2026-06-27.md`); Fork A-2 ruling (`workstream_a_fork_2_reconciliation_discipline_broker_ruling_2026-06-27.md`); A-3 authoring scaffold (`workstream_a_fork_3_authoring_scaffold_2026-06-27.md`); §0 broker-scope-only posture (`broker_scope_internal_note_2026-06-09.md`).
**Supersedes (per A-2 §3 trigger 4):** any conflicting prior disposition in A-2 on substantive criteria, source canonicality, or runtime resolution.

---

## §0 Posture

Broker compliance determination authored under broker-scope authority (Bus. & Prof. Code § 10131(b)). No attorney engagement on this project. This ruling authors the substantive §2.6 "authoritative" determination for `cityOfLaZipsAuthoritative` (predicate 5 of LA production gate). It states the standard by which individual diff items (per A-2) are ruled; defines the source-canonicality, currency, refresh-cadence, discrepancy, and runtime-resolution postures the build must wire; and is the load-bearing broker-scope reliance statement for predicate 5 under § 10131(b).

---

## §1 — Ruling summary

For OwnerPilot AI's purposes, the **authoritative City-of-LA ZIP set** (predicate `cityOfLaZipsAuthoritative`) is the snapshot produced by intersecting the City of Los Angeles GIS boundary layer **C-8** (`LA_City_Boundary_detailed`, published by the BOE GIS Mapping Division on the City's GeoHub ArcGIS infrastructure, last edited 2026-05-19) with the U.S. Census **TIGER/Line ZCTA-2010** polygons for California, in EPSG 2229, under a **three-bucket area-ratio assignment rule with thresholds 0.90 / 0.10**: a ZIP is *unambiguous-in* if its City-overlap area is at least 90% of its ZCTA area, *unambiguous-out* if at most 10%, and *straddler* in between. The Socrata layer **C-7** (`brvb-jr45`, CC0 1.0) serves as a corroborative cross-check under §2.1, fail-soft per §5.3-d. Currency is gated by an **18-month dormancy clock** anchored to the more recent of the C-8 `lastEditDate` or the broker's initial attestation (§3.1-b); the snapshot is **refreshed daily at 03:00 PT** under the construction discipline in §2.4 with A-2 reconciliation on every diff (§4). At runtime, jurisdictional determination flows through a **four-step ordered chain** (§6.1): geocode normalization → ZCTA classification against the snapshot → parcel-rail consultation for straddlers and ZCTA non-matches → gate-closed-with-guidance for unresolved cases. Discrepancies are managed by an internal QA suite (SANITY_OUT canary, zero-area sliver detection, 1.5% coverage tolerance, ZCTA-field validity) plus a `canonical_override_exceptions` mechanism for broker-ruled deviations (§5.4-c); first-construction recorded one override (90056, City-side area ratio 0.0591, forced to straddler so City-of-LA "Ladera" addresses route through parcel rail rather than gate-close on a clean `out`). Licensing posture is open across all three input layers: C-8 open under City of LA open-data policy, C-7 explicit CC0 1.0, ZCTA-2010 federal public domain (§7.1); the broker relies on this construction under **Cal. Bus. & Prof. Code § 10131(b)** as a real-estate-professional jurisdictional determination, with no attorney engaged on this project (§7.2). Predicate 5 of the LA go-live gate (`cityOfLaZipsAuthoritative`) is satisfied by the attestation packet specified in §8: a manifest pointing at this ruling, the first committed snapshot, the v6 corpus verification, the A-2 emitter, and the broker's signature flipping the gate. This ruling does not address parcel-endpoint health (Workstream B, predicate 6), gate-closed-with-guidance UX copy, LA Municipal Code monitoring, non-LA jurisdictions, geocode-provider canonicality, or retroactive disposition of pre-ruling notices (§9).

---

## §2 — Source provenance

**Interim lock status:** §§2.1 and 2.2 locked by broker 2026-06-27. §§2.3, 2.4, 2.5 pending. §§2.1/2.2 are substrate for §§3–7; downstream sections cite them as settled.

### §2.1 — Publisher identity

**Canonical primitive publisher:** Bureau of Engineering, City of Los Angeles — GIS Mapping Division. The authoritative input from which `cityOfLaZipsAuthoritative` is constructed is the **City Boundary polygon** published by BOE / GIS Mapping Division. The ZIP set is a build-side derivation from this boundary (see §2.2); no pre-published "ZIPs in City of LA" layer is canonical, on the evidence developed in A-1a (any-intersection over-inclusion of ~48 other-jurisdiction ZCTAs; A-1 §2.2 / §2.4 categorically rejects).

**Primary canonical layer (C-8):** `LA_City_Boundary_detailed` — BOE/labss-published GeoHub FeatureServer.
- GeoHub item ID: [`d0c000ec94c0436ba947d1f0e86f2825`](https://geohub.lacity.org/datasets/d0c000ec94c0436ba947d1f0e86f2825)
- FeatureServer endpoint: `https://services1.arcgis.com/PTh9WC0Sf2WS7AAq/arcgis/rest/services/LA_City_Boundary_detailed/FeatureServer/0`
- Publisher account: `joseph.perman_labss` — BOE GIS Mapping Division active publisher (same account publishes the official Council Districts layer)
- Selected as primary on operational currency: data last edit 2026-05-19, weeks-current relative to this ruling.

**Cross-check layer (C-7):** `City Boundary of Los Angeles` — BOE official, data.lacity.org Socrata dataset.
- Socrata ID: [`brvb-jr45`](https://data.lacity.org/City-Infrastructure-Service-Requests/City-Boundary-of-Los-Angeles/brvb-jr45)
- Endpoint: `https://data.lacity.org/resource/brvb-jr45.json`
- Publisher: `Public Works: Engineering OpenData` (BOE / GIS Mapping Division)
- License: [CC0 1.0 Universal (Public Domain Dedication)](http://creativecommons.org/publicdomain/zero/1.0/legalcode) — explicit license clarity (relevant to §7.1)
- Published 2025-02-26.
- Role: divergence detector against C-8, and license-clarity anchor (C-8 carries no explicit license field; C-7's CC0 publication on the same BOE/GIS-Mapping-Division authorship chain supplies the license posture).

**Divergence-detection discipline.** On every C-8 publisher-edit refresh (see §2.2 snapshot trigger), build fetches both C-8 and C-7 geometries and computes a divergence ratio:

```
divergence_ratio = area( symmetric_difference(C-8, C-7) ) / area( union(C-8, C-7) )
```

Areas computed in **NAD83 / California State Plane Zone V (EPSG 2229)** — the City of LA standard CRS.

- `divergence_ratio ≤ 0.001` (≤ 0.1%): expected vintage drift between the two publishers (C-7 last published 2025-02-26; C-8 edited 2026-05-19). Logged to the geocode-audit sink as `boundary_divergence_within_tolerance` with the computed ratio. No fork.
- `divergence_ratio > 0.001` (> 0.1%): **fork to broker.** Build halts the snapshot refresh, retains the prior snapshot as operationally live (per A-2 "operational continuity" discipline — no tenant loses RTC during review), and surfaces the divergence with: the computed ratio, the affected geographic regions (any ZIP whose three-bucket determination would flip if computed against C-7 instead of C-8), and the publisher edit-timestamps for both layers. Broker rules whether to (a) accept the new C-8 as canonical, (b) wait for C-7 to catch up, (c) escalate to BOE/GIS Mapping Division for cross-publisher reconciliation, or (d) other.

**Tertiary surface (C-9 `josh674` City Boundary, GeoHub):** **NOT canonical, NOT cross-check.** Surfaced in A-1a for completeness; provenance is weaker than C-7/C-8 (individual GeoHub account, no BOE/GIS Mapping Division attribution in metadata). Build will not consult C-9 in the refresh path. If C-7 and C-8 both fail to fetch in a refresh attempt, the failure surfaces as a partial-fetch fork (§5.3 territory), not a fall-through to C-9.

**Publishers explicitly rejected (audit trail per A-1):**
- USPS LACA / Locatable Address Conversion API — answers postal-delivery scope, not municipal-jurisdiction scope (A-1 §2.4 categorical rejection).
- LAHD as publisher — no LAHD-published jurisdictional GIS layer exists (A-1a infrastructure caveat).
- Office of Finance ZIP listing (C-11 PDF, revised 2003) — non-geospatial reference document, 23-year-old content, asterisks already concede that border cases require map verification.

### §2.2 — Dataset identity within the publisher

The `cityOfLaZipsAuthoritative` dataset is a **build-side derivation**, not an adopted pre-published layer. This is the load-bearing §2.6 "authoritative" determination: the authoritative answer to "which ZIPs are in the City of LA for RTC overlay purposes" is the output of the construction defined below, produced by build under broker ruling, snapshotted under the §2.2 snapshot trigger, and attested under the §8 packet shape.

**Why a derivation and not a pre-published layer.** Every pre-published candidate A-1a surfaced (C-1 GeoHub eva.pereira_lahub, C-2 data.lacity.org Socrata, C-3 GeoHub DataLA `Intersect of City Boundary and Zip Codes`, C-4 GeoHub calvin.sung_lahub) uses an **any-intersection assignment rule** over 2010 Census ZCTA polygons. C-1's 160 ZCTAs include Beverly Hills (90210/11/12), Santa Monica (90402–05), Long Beach (90802/10/13), Glendale (91201–06/214), Burbank (91501–06), Culver City (90230/32), Inglewood (90301–05), Torrance, Carson, El Segundo, Lynwood, Malibu, Pasadena, South Pasadena, Alhambra, La Cañada — every one a separately incorporated municipality outside the Los Angeles City Council's RTC authority. The 91011 (La Cañada Flintridge) feature in C-1 carries `Shape__Area = 0`, evidencing the any-intersection rule's failure mode at boundary slivers. Adopting any of C-1/C-2/C-3/C-4 as-is would assert RTC jurisdiction over ~48 other-jurisdiction ZIPs — the false-positive jurisdictional-claim category A-1 §2.2 / §2.4 ruled categorically worst, and the failure mode A-2 §2.1's ADD-auto-apply premise ("trust in the source A-3 attests") cannot absorb (see §6 below and A-2 §3 trigger 4).

The build-side derivation is therefore the canonical dataset for `cityOfLaZipsAuthoritative`.

#### §2.2-a — Construction inputs

1. **City Boundary polygon:** C-8 primary, C-7 cross-check, per §2.1.
2. **ZIP polygon source:** **U.S. Census Bureau ZIP Code Tabulation Areas, 2010 Census vintage (ZCTA5CE10)**, sourced from the Census TIGER/Line shapefile catalog. National coverage; LA County subset extracted by Census FIPS filter (County FIPS 037, State FIPS 06).
   - **Lineage-continuity rationale (binding):** ZCTA-2010 is the keying basis of every City pre-published ZIP layer (C-1, C-2, C-3, C-4) and of the City Office of Finance reference document (C-11). Identical keying means any divergence between our derivation and the City's own pre-published sets attributes cleanly to our assignment-rule choice (see §2.2-b), not to source-data vintage drift. Switching to ZCTA-2020 would force the broker to defend two simultaneous divergences (rule + source vintage) against any future challenge, weakening the audit trail.
   - **Acknowledged staleness:** ZCTA-2010 is 15 years old. USPS adds/retires ZIPs continually; the LA County ZIP set has likely seen incremental changes since 2010. The straddler discipline (§2.2-b) and the parcel-rail rerouting on ZCTA-no-match (§2.2-c) absorb these incremental changes operationally — any USPS-current ZIP that has no ZCTA-2010 counterpart routes to parcel rail, where ZIMAS/County answer at the parcel level rather than the ZIP level. The lineage-continuity benefit outweighs the staleness cost for first-build; broker will revisit when ZCTA-2030 lands or when a stable operational baseline supports migration (see §10 action items).
   - **Rejected ZIP-source alternatives (audit trail):**
     - **ZCTA-2020:** more current, but breaks lineage continuity with every City-published reference set. Tracked as a follow-up migration once first-build baseline is stable.
     - **USPS ZIP polygon (authoritative):** would be the cleanest match to geocoder output (Google emits USPS ZIP5), but USPS does not publish authoritative ZIP polygons; all such polygons in market are licensed commercial products (Esri, HERE, Maptitude). Rejected on availability.
     - **C-5 NavigateLA County ZIPs (311 features):** BOE-operational, but `editingInfo` is unpopulated and vintage is undocumented — "frozen-or-unknown currency" is operationally worse than "known-stale" for an audit posture. Rejected as primary; may serve as a secondary cross-check if a future ruling needs one.
     - **C-6 Thomas Bros (315 features):** vendor discontinued, lineage is a frozen historical cartographic dataset of unknown maintenance status. Rejected.

#### §2.2-b — Assignment rule (the load-bearing §2.6 determination)

**Three-bucket area-ratio rule (option (d) of A-1a §5), with thresholds 0.90 / 0.10.** For each ZCTA-2010 polygon `Z` in the LA County subset, compute:

```
area_ratio(Z) = area( intersection( Z, C-8 ) ) / area( Z )
```

All areas computed in **NAD83 / California State Plane Zone V (EPSG 2229)**.

Classification:

| Bucket | Condition | Disposition |
|---|---|---|
| **Unambiguous-in** | `area_ratio(Z) ≥ 0.90` | ZIP is in `cityOfLaZipsAuthoritative`. Geocode rail accepts as in-City without consulting parcel. |
| **Unambiguous-out** | `area_ratio(Z) ≤ 0.10` | ZIP is not in `cityOfLaZipsAuthoritative`. Geocode rail rejects as out-of-City without consulting parcel. |
| **Straddler** | `0.10 < area_ratio(Z) < 0.90` | ZIP is **listed** in `cityOfLaZipsAuthoritative` with a `disposition: straddler` flag. Geocode rail routes the address to **parcel rail (ZIMAS / County)** for in/out determination at the parcel level. |

**Why 0.90 / 0.10 (not 0.85 / 0.15 or 0.50 single-threshold):**
- Symmetric thresholds (high + low summing to 1.0) preserve the property that a ZIP and its complement classify consistently — operationally important when reasoning about boundary regions.
- 0.90 high / 0.10 low produce a **wider straddler zone (the middle 80% of area-ratio space) than 0.85/0.15** (middle 70%). The wider zone biases toward parcel-rail resolution for any ZIP whose City-fraction is not strongly majority-in or strongly majority-out — i.e., toward A-1 §2.5's parcel-level border-case discipline. Build's recommendation was 0.85/0.15 on grounds of operational ZIP volume; broker ruled tighter (0.90/0.10) and the additional straddler routing is the conservative posture the broker has authority to set.
- A single-threshold majority rule (0.50) was rejected: it would collapse to option (c) ("majority-area-in-City") and lose A-1 §2.5's explicit three-tier model — straddlers would be silently auto-decided one direction or the other based on which side of 0.50 they fell, without parcel-rail consultation.
- Any-intersection (option (a), threshold effectively 0+) is rejected on the A-1a evidence (~48 other-jurisdiction over-inclusions in C-1).

**Computed `area_ratio` is authoritative over pre-published layer `Shape__Area` values.** The C-1 zero-area sliver for 91011 demonstrates that pre-published `Shape__Area` fields are unreliable as ratio inputs. The construction recomputes area from a fresh C-8 × ZCTA-2010 spatial intersect every snapshot refresh; no pre-published area field is consulted.

**Multi-part ZCTA handling.** A single ZCTA5CE10 string may appear as multiple polygon rows in the source ZCTA-2010 TIGER/Line dataset (multi-part geometries serialized as separate features; ZCTAs that have discontinuous geographic parts). Build SHALL dissolve same-ZCTA polygons into one geometry per ZIP **before** computing `area_ratio`, so each ZIP yields exactly one ratio computed against its combined area. Max-of-per-polygon-ratios is not the correct rule — the question is "what fraction of the ZIP is in the City," which requires the ZIP-as-a-whole as the denominator.

#### §2.2-c — Join discipline (USPS ZIP5 → ZCTA5CE10)

The Google-backed geocoder emits **USPS ZIP5** for any address. The construction's lookup table keys on **ZCTA5CE10** (Census ZCTA 5-digit). ZCTA5 and USPS ZIP5 are mostly identical strings but diverge at the margins: some USPS ZIPs (notably PO-box-only ZIPs and very-small-population ZIPs) have no ZCTA counterpart; some ZCTAs cover areas where USPS has issued additional ZIPs since 2010. The loader's match discipline:

1. **Exact-string match attempt.** Geocoder-emitted USPS ZIP5 is matched, as a 5-character string, against the `ZCTA5CE10` field of the construction output.
2. **Match found:** use the matched ZCTA's three-bucket classification (§2.2-b) as the in/out determination. Log to geocode-audit sink as `zip5_zcta5_exact` with the matched ZCTA, the area-ratio, and the bucket.
3. **No match found** (USPS ZIP5 has no ZCTA5CE10 counterpart in the LA County subset): **route to parcel rail (ZIMAS / County)** for in/out determination at the parcel level. Log to geocode-audit sink as `zip5_no_zcta5_route_parcel` with the geocoder-emitted ZIP5 and the address. **No fuzzy match, no nearest-ZCTA fallback, no synthetic ZCTA imputation.** The no-match case is treated as a degenerate border case where the entire ZIP is a border — exactly the case A-1 §2.5 routes to parcel rail.
4. **ZCTA-versus-parcel disagreement detection.** When parcel rail is consulted independently (whether because of straddler classification per §2.2-b, no-match routing per §2.2-c step 3, or any other §6 chain step) and parcel rail's in/out determination contradicts what the ZCTA classification would have said for the matched ZIP, log to geocode-audit sink as `zip5_zcta5_disagreement` with both determinations and the parcel reference. Build expects these to be rare (single-digit ZIP count across LA County) but the audit log captures them for periodic broker review at cadence ruled in §6.

#### §2.2-d — Snapshot trigger and refresh

The `cityOfLaZipsAuthoritative` snapshot is recomputed (full C-8 × ZCTA-2010 spatial intersect, full three-bucket reclassification, full ZIP list re-derivation) **on every C-8 publisher edit**.

- **Mechanism:** build polls the C-8 FeatureServer `editingInfo.lastEditDate` field on the §4-ruled cadence. When the observed `lastEditDate` advances past the value embedded in the most recent snapshot's provenance header, the snapshot is recomputed.
- **Not triggered by:** ZCTA-2010 Census re-release (ZCTA-2010 is frozen; the 2030 release is a tracked migration per §10, not a refresh trigger); C-7 cross-check publisher edits (C-7 is divergence-detection only per §2.1; a C-7 edit without a corresponding C-8 edit triggers a §2.1 divergence-ratio check, not a snapshot recompute); pre-published candidate layers (C-1/C-2/C-3/C-4 are not in the canonical path and their edits do not trigger anything).
- **Snapshot output goes through A-2 reconciliation** before becoming the live operational set. The recomputed snapshot is the input to the A-2 emitter; ADDs, REMOVEs, CORPUS-IMPACT REMOVEs, and NO-DIFF dispositions are ruled by the A-2 discipline, not by A-3.
- **Operational continuity:** during any A-2 review window (REMOVEs pending broker review, CORPUS-IMPACT halts, divergence-fork holds per §2.1), the **previously-attested snapshot continues serving** the runtime. No tenant loses RTC overlay during a snapshot refresh review cycle. This is the A-2 "operational continuity" premise as it applies to A-3.

#### §2.2-e — Provisional in-repo set status

The current in-repo provisional `CITY_OF_LA_ZIPS` (`lib/jurisdiction/geocode/cityOfLaZips.ts`, 111 ZIPs) is **not authoritative** under this ruling. It served as a working set during pre-A-3 build; once the first construction snapshot (C-8 × ZCTA-2010 × 0.90/0.10 three-bucket) is produced and broker-attested per §8, the provisional file is **superseded** and the construction output becomes the operational authoritative set. The provisional may serve as the input to the **first A-2 reconciliation packet** (illustrative A-1a diff: ~51 ADDs, ~2 REMOVEs against C-1's any-intersection set — but under the three-bucket rule the ADD count collapses sharply because over-inclusions never reach the unambiguous-in bucket); the actual first reconciliation against the construction output will produce the binding numbers and is ruled under A-2.

### §2.3 — Access method

**C-8 access (primary canonical).** C-8 is accessed via the ArcGIS Online REST Feature Service hosted at `services1.arcgis.com/PTh9WC0Sf2WS7AAq/arcgis/rest/services/LA_City_Boundary_detailed/FeatureServer/0`. Build SHALL fetch:

1. **Item metadata** (for `editingInfo.lastEditDate`, `licenseInfo`, `accessInformation`, and publisher account verification) via the ArcGIS Online item-info endpoint.
2. **Feature geometry** via the FeatureServer `/0/query` endpoint with `outSR=2229` (EPSG 2229 California State Plane Zone V, US survey feet, the construction's working CRS), `returnGeometry=true`, `geometryPrecision` sufficient to retain boundary fidelity (build's default), and pagination handled per ArcGIS standard `resultOffset`/`resultRecordCount` semantics.
3. **Format**: GeoJSON output (`f=geojson`) is the canonical request format; ArcGIS-native JSON (`f=json`) is acceptable as a fallback if the GeoJSON encoder is unavailable for a given query.

Build SHALL record the request URL and the response sha256 of the geometry payload in the snapshot provenance (`inputs.c8_boundary.sha256`), so the snapshot is reproducible against the exact bytes fetched at construction time. ArcGIS Online may serve the same logical geometry with bit-identical or near-identical bytes across refreshes; the sha256 captures the precise bytes used regardless.

**C-7 access (cross-check, fail-soft per §5.3-d).** C-7 is accessed via the data.lacity.org Socrata dataset `brvb-jr45`. Build SHALL fetch the dataset export in GeoJSON or Shapefile format via the Socrata web UI's "Download file" path (Export → GeoJSON or Shapefile). The Socrata SODA3 JSON API endpoint is **not the canonical access method** for C-7: that endpoint is auth-gated for large geometry payloads and returns row-level JSON rather than a stable GeoJSON feature collection. The "Download file" path returns a static export suitable for hashing into snapshot provenance.

If the C-7 GeoJSON/Shapefile export is unavailable at construction time (download path unreachable, authentication required, export format unsupported), build SHALL set `cross_check_skipped: true` in the snapshot provenance and emit the construction without the divergence check. This is the §5.3-d fail-soft posture: C-7's role is corroborative, not authoritative, and absence of C-7 does not block C-8-based construction. First-construction (2026-06-27) ran with `cross_check_skipped: true` because the Socrata UI initially surfaced only the auth-gated SODA3 endpoint; the GeoJSON "Download file" path is to be exercised at the next refresh.

**ZCTA-2010 access.** The Census TIGER/Line ZCTA-2010 shapefile is fetched from the Census Bureau's public TIGER/Line FTP/HTTPS distribution. Build uses the California state file (`tl_2010_06_zcta510.shp` and its companion `.dbf` / `.shx` / `.prj`). The full California ZCTA-2010 set is loaded (not pre-filtered to LA County), with the LA County subset derived at construction time via intersection with C-8. This preserves the audit property that any ZCTA later observed near the boundary can be traced back to its original Census polygon without a separate fetch.

Build SHALL record the ZCTA shapefile's sha256 in `inputs.zcta_2010.sha256`. Because TIGER/Line ZCTA-2010 is a fixed historical vintage (released after the 2010 Census, not subsequently revised), the sha256 is expected to be stable across all refreshes; a change in the recorded sha256 between snapshots indicates either a re-download from a different mirror or a defect in the input pipeline, and SHALL be investigated under §3.2 / §5 disciplines.

### §2.4 — Sourcing-rail mechanics

**Build-side construction rail.** The snapshot is produced by a single build-side construction script (the `build_la_authoritative_zips.py` pattern established in first-construction). The script's responsibilities, in order:

1. Fetch C-8 geometry per §2.3 access method; reproject to EPSG 2229.
2. Fetch C-7 geometry per §2.3 access method if available; reproject to EPSG 2229; otherwise set `cross_check_skipped: true`.
3. Load the full California ZCTA-2010 shapefile; reproject to EPSG 2229; validate ZCTA5CE10 field per §5.1-d.
4. For each ZCTA polygon, compute `intersection_area = area(ZCTA ∩ C-8)` and `area_ratio = intersection_area / area(ZCTA)`.
5. **Multi-part ZCTA handling (§2.2 dissolve-first):** ZCTAs whose Census representation is multi-part (e.g., 90402 with island components) are dissolved before the intersection so a single area-ratio is computed for the ZIP as a whole, not per-part.
6. Apply the 0.90 / 0.10 three-bucket assignment (§2.2-b) to produce `in`, `straddler`, `out` lists in the city-intersecting frame.
7. Apply the SANITY_OUT canary check (§5.1-a); halt on canary fail.
8. Apply the coverage check (§5.1-c); halt on coverage fail.
9. Apply the zero-area sliver scan (§5.1-b); record any observations to provenance.
10. Apply any `canonical_override_exceptions` (§5.4-c) by moving the specified ZIPs between buckets after natural classification; record the override in provenance.
11. Compute the C-7 divergence ratio if C-7 is available (§2.1 cross-check; halt if divergence > 0.001 of C-8 area in EPSG 2229); record divergence to provenance.
12. Emit the snapshot file with the full provenance header (inputs sha256s, thresholds, ratios, override list, attestation references).
13. Emit the A-2 diff packet against the prior baseline (provisional 111-set on first-construction; prior snapshot on every refresh thereafter).

**Snapshot file format.** JSON with a top-level `provenance` block and `counts`, `zips_in`, `zips_straddler` (each straddler entry carrying its area_ratio), and optionally `zips_out` (the city-intersecting out subset; the full 1615 non-intersecting set is implicit and not enumerated). The schema is build-defined within the bounds of §8.4 verification-evidence requirements; build may extend it for diagnostic purposes provided the required provenance fields remain present.

**Snapshot file location.** During the first-construction review window (before A-3 sign-off + §8 packet attestation), the snapshot is committed to a build working folder as a review artifact and does NOT supersede `lib/jurisdiction/geocode/cityOfLaZips.ts`. At predicate-5 flip, the snapshot moves to the runtime-served location determined by the resolver-rewire PR (build's call); the path at that point SHALL be recorded in the §8 attestation packet under predicate 7.

**Atomic refresh discipline.** Snapshot writes SHALL be atomic: the new snapshot is written to a temporary path, validated against the full §5.1 build-side QA suite, and only then renamed into the runtime-served path. A partial or invalid snapshot SHALL NOT be runtime-visible. This protects the runtime chain (§6.1) from reading a half-written or QA-failing snapshot.

**Refresh-cron invocation.** The daily 03:00 PT cron (§4.1) invokes the construction script with a `--refresh` flag (build-defined; canonical name suggested but not required). The refresh path differs from first-construction only in that (a) the prior snapshot is the A-2 baseline rather than the provisional 111-set, (b) NO-DIFF outcomes trigger auto-attestation per A-2 §2.3, and (c) the construction-script log line `cadence_axis_5_implementation_visible: true` (§4.2) is asserted at each refresh.

### §2.5 — Authentication / API discipline

**C-8 (ArcGIS Online REST Feature Service).** No authentication required. The service is publicly accessible under the BOE GIS Mapping Division publisher account's open-access posture. Build SHALL NOT pass an API key, OAuth token, or any other credential on C-8 requests; doing so could (a) implicitly bind the construction to a credentialed access tier that does not apply, (b) leak credentials through request logging, or (c) trigger rate-limiting behavior different from the public tier the construction is documented to use.

**C-7 (Socrata data.lacity.org).** The "Download file" GeoJSON/Shapefile export path on Socrata is publicly accessible without authentication. The SODA3 JSON API endpoint that surfaced during first-construction was auth-gated; that endpoint is **not the canonical access path** for C-7 per §2.3, and build SHALL NOT authenticate against SODA3 to bypass its gating. If the "Download file" path is also gated at a future refresh, the correct disposition is to set `cross_check_skipped: true` and surface a §3.2 disposition, not to authenticate.

**ZCTA-2010 (Census TIGER/Line).** Public HTTPS distribution; no authentication. Build's fetch SHALL use HTTPS (not FTP) and SHALL verify the certificate chain. If certificate verification fails, halt and surface as `census_tigerline_cert_failure_FORK` rather than disabling verification.

**Rate-limit posture.** All three sources are well within their public rate limits at the daily-refresh cadence (§4.1). The ArcGIS Online FeatureServer has been observed to serve LA City Boundary queries with no throttling at single-refresh-per-day cadence. The Socrata "Download file" path serves a static export per request; no rate concern. Census TIGER/Line is a static FTP/HTTPS mirror; no rate concern. If a future refresh observes a rate-limit response (HTTP 429 or equivalent), build SHALL retry once after a 60-second back-off per §3.2-c, then escalate per the §3.2-c two-cycle escalation rule rather than authenticating or spoofing user-agent.

**User-agent and request hygiene.** Build SHALL identify itself in HTTP requests via a `User-Agent` header containing the string `OwnerPilot-A3-construction/<version>`. This is a courtesy to the publishers (lets them distinguish OwnerPilot traffic in their logs if they investigate a traffic pattern) and an audit signal (if a publisher contacts OwnerPilot about traffic, the broker can correlate to specific construction runs). Build SHALL NOT spoof a browser user-agent or omit the header.

**Credential storage.** No credentials are required by this ruling. If a future refresh requires credentials (e.g., a publisher transitions a layer behind authentication), the correct path is NOT to add credentials to the construction pipeline silently. It is to (a) surface the change as a §3.2 stale-snapshot disposition, (b) author a §7.3-b substantive re-attestation amending §2.5 to specify the credential type, scope, and rotation discipline, and (c) only then add credentials to the construction script under the amended ruling. This is broker-rule-of-thumb: credentials change the auth posture of the ruling and therefore require broker attestation, not a quiet build-side change.

---

## §3 — Currency

**Interim lock status:** §§3.1, 3.1-a, 3.1-b, 3.2, 3.3 locked by broker 2026-06-27.

### §3.1 — Currency window definition

**Hybrid: most-recent-published, with an 18-month sanity-check alert.** A snapshot is "current" if it was constructed from the most recent publisher-edit of the canonical layer (C-8, per §2.1). It is "sanity-check stale" if the canonical layer has not seen a publisher edit in 18 months — not because our snapshot is stale (it isn't; we tracked the publisher), but because publisher silence itself is a signal that warrants attention.

**§3.1-a — How "most-recent-published" is determined.** Build polls C-8's FeatureServer `editingInfo.lastEditDate` field on the cadence ruled in §4. When the observed `lastEditDate` advances past the value embedded in the most recent snapshot's provenance header, the snapshot is recomputed per §2.2-d. The polling is build-side mechanics; the broker-relevant property is: **the construction is always at most one polling-cycle behind the canonical publisher.**

**§3.1-b — 18-month sanity-check alert clock.** Clock attaches to **the more recent of (i) C-8's `editingInfo.lastEditDate` on the snapshot currently in production, or (ii) the broker's initial attestation date for this construction (the date the first production snapshot was attested per §8).** If 18 months pass with no advance in either timestamp, build raises an alert.

The "or broker initial attestation" clause exists to handle the startup case: if the broker first attests on (say) 2026-07-15 against a C-8 snapshot whose `lastEditDate` was 2026-05-19, the 18-month clock runs from the more recent date — the attestation — not from the older publisher edit. This prevents a brand-new operational baseline from self-triggering a dormancy alert during its first months in production. Once a subsequent publisher edit arrives, the clock advances to that edit's date.

The alert is not a halt. It is an instruction to the broker to verify that the canonical publisher is still maintaining the layer (typically a 5-minute check on GeoHub: is the layer still listed, is the publisher account still active, are there any City-side notices about deprecation). If the publisher is still active and the layer is simply stable (the City boundary doesn't change often — incorporations, annexations, and de-annexations are rare), the broker dismisses the alert with a one-line note in the audit log. If the publisher has gone dormant or the layer is deprecated, the broker opens a new fork: re-source against an alternative publisher, or escalate to BOE/GIS Mapping Division.

### §3.2 — Stale-snapshot disposition

Two failure modes, two postures:

**(a) Publisher has published a newer version we haven't pulled yet — fail-soft.** The build is mid-polling-cycle or the recompute hasn't completed; we have a snapshot, just not the very newest. The previously-attested snapshot continues serving the runtime. No tenant loses RTC overlay. Build proceeds with the recompute on its normal cadence; the new snapshot enters A-2 review and replaces the prior one through the A-2 discipline. **No broker action required during the fail-soft window.**

Rationale: the City boundary changes glacially — annexations and de-annexations are years-to-decades events. The marginal accuracy loss from being one polling cycle behind is negligible compared to the operational continuity gain. A-2's review window is itself measured in days; fail-soft over hours-to-days of publisher-lag is well within the same tolerance.

**(b) 18-month sanity-check alert triggered (publisher silence) — fail-closed posture, broker-gated.** The 18-month dormancy alert per §3.1-b fires. The previously-attested snapshot continues serving (no abrupt RTC loss), but **build halts any cadence change that would extend reliance on the dormant snapshot** — no auto-extension of the polling cadence, no auto-suppression of the alert, no auto-degradation to a slower-trigger mode. The broker must affirmatively act: dismiss the alert (publisher confirmed still active, layer stable), re-source to an alternative publisher (publisher dormant, alternative identified), or escalate (publisher dormant, no alternative — raises a §6.5 gate-closed-with-guidance candidate for the affected ZIPs).

Rationale: 18-month publisher silence is a signal that the data has lost its maintenance relationship with the publishing institution. Continuing to rely on it silently is the failure mode this clause exists to prevent. A halt-on-cadence-change posture preserves operational continuity (runtime keeps serving) while forcing a human-in-the-loop decision before the reliance extends further.

**(c) Publisher fetch failure (transient).** Build's polling cycle fails to reach C-8 (network, ArcGIS service outage, auth issue). Retry once after 60 seconds (the discipline already in use for the statute-watch cron and the parcel-health probe). If still failing, log to audit sink as `c8_fetch_fail_transient` and re-attempt on next polling cycle. Two consecutive cycle failures escalate to `c8_fetch_fail_persistent` and surface to broker as a partial-fetch fork (§5.3 territory). The previously-attested snapshot continues serving throughout.

### §3.3 — Initial snapshot baseline

**The initial snapshot baseline is the first C-8 × ZCTA-2010 × 0.90/0.10 three-bucket construction produced after this ruling is signed, broker-attested per the §8 packet shape, and committed to the production runtime.**

Mechanics (build-decided, recorded here for the audit trail):

1. Build fetches C-8 (`LA_City_Boundary_detailed` FeatureServer query) and C-7 (Socrata `brvb-jr45.json`) at the moment of initial construction. **Initial construction is operator-supervised:** the operator pulls C-8 and C-7 as files, computes sha256 for the provenance header, and passes the C-8 `editingInfo.lastEditDate` as a manual provenance argument. Subsequent refresh runs (per §4.1 daily polling) auto-extract `editingInfo.lastEditDate` from the live FeatureServer response — the manual-vs-auto distinction is build-side mechanics, not a posture change.
2. Build computes the C-8 × C-7 divergence ratio per §2.1; if ≤ 0.001, proceeds; if > 0.001, halts and surfaces the divergence fork to broker before construction.
3. Build fetches the LA County ZCTA-2010 subset from Census TIGER/Line.
4. Build computes the C-8 × ZCTA-2010 spatial intersect in EPSG 2229; for each ZCTA polygon, computes `area_ratio` and assigns to one of the three buckets per §2.2-b.
5. Build emits the initial snapshot file with provenance header containing: C-8 `editingInfo.lastEditDate`, C-7 publication date, ZCTA-2010 TIGER/Line release identifier, divergence-ratio computed, construction timestamp, three-bucket counts (unambiguous-in count, unambiguous-out count, straddler count), threshold values used (0.90 / 0.10).
6. Build emits the A-2 first-reconciliation packet comparing the initial snapshot to the in-repo provisional (`lib/jurisdiction/geocode/cityOfLaZips.ts`, 111 ZIPs) for broker review per A-2 §2.
7. Broker reviews the A-2 packet, rules ADDs (auto-applied under A-2 §2.1 first-build posture), REMOVEs (broker-reviewed under A-2 §2.2), and any CORPUS-IMPACT REMOVEs (build-halted, three-disposition packet per A-2 §2.3).
8. Broker attests the initial snapshot per §8. This attestation date becomes the §3.1-b clock anchor (the "broker initial attestation" date).
9. Build commits the initial snapshot to production runtime; the in-repo provisional `cityOfLaZips.ts` is superseded per §2.2-e.

The initial snapshot baseline is a one-time event. All subsequent snapshots are refresh snapshots per §2.2-d and run through the same A-2 emitter, but with the prior snapshot (not the provisional) as the diff baseline.

---

## §4 — Refresh cadence

**Interim lock status:** §§4.1, 4.2, 4.3 locked by broker 2026-06-27.

### §4.1 — Cadence choice

**Daily polling at 03:00 PDT/PST (10:00 UTC during PDT; 11:00 UTC during PST).** Build polls C-8's FeatureServer `editingInfo.lastEditDate` once per day. If the timestamp has advanced beyond what the production snapshot's provenance header records, build initiates the recompute pipeline per §2.2-d and feeds the result into A-2 review.

Daily polling means the production snapshot is at most one calendar day behind any publisher edit. Recompute itself takes minutes (the C-8 × ZCTA-2010 intersect is a small computation; LA County has ~300 ZCTAs); A-2 review of any resulting diff is broker-paced, not build-paced.

### §4.2 — Cadence justification (axes)

**Axis 1: How often does the publisher actually change the data?** Rarely. The City of LA boundary is established by municipal ordinance; annexations, de-annexations, and corrections happen on a multi-year cadence (the C-8 layer's last substantive edit before 2026-05-19 is months-to-years prior; the C-7 cross-check published 2025-02-26 confirms low edit velocity). The actual change rate is well below daily. Daily polling guarantees we catch any change within 24 hours regardless of when it lands.

**Axis 2: How bad is being one day behind?** Operationally, very low impact. Even if the City annexes a new ZIP today, the prior boundary set is still correct for every parcel that was in the City yesterday; the new ZIP's parcels will resolve to "out" for one day, then "in" after the next polling cycle. The fail-soft posture (§3.2(a)) absorbs this gracefully.

**Axis 3: How bad is over-polling?** Negligible. C-8's FeatureServer accepts `editingInfo` queries as a lightweight metadata call (no geometry transfer); the daily polling load is roughly 365 lightweight HTTP requests per year against a public ArcGIS endpoint with no rate limits documented or expected at this volume.

**Axis 4: Defensibility.** "We poll the canonical publisher daily and recompute on every publisher edit" is a posture a broker can defend to a tenant, a court, or the DRE without needing to explain a tradeoff. Slower cadences (weekly, monthly) invite "why didn't you catch this sooner" questions. Faster cadences (hourly, every minute) invite "why are you hammering the City's server" questions. Daily sits in the defensible middle and matches the cadence pattern already in use on the statute-watch cron's analog (twice-yearly for statute monitoring where the publisher cadence is annual-to-multi-year).

**Axis 5: Interaction with A-2.** A-2's review window is measured in days for ADDs and longer for REMOVEs / CORPUS-IMPACT REMOVEs. A daily polling cadence aligns with A-2's natural rhythm; faster cadences would back up A-2's review queue without meaningful benefit.

### §4.3 — Cadence change discipline

The cadence in §4.1 is the binding cadence. Build may not unilaterally:

- Slow the cadence (e.g., to weekly or monthly) under any operational pressure (e.g., "the daily poll is logging noise"). Slowing cadence is a posture change with tenant-defense consequence and is broker-ruled.
- Speed the cadence (e.g., to hourly) without broker review. Faster cadence consumes more publisher resources and changes the operational profile.
- Suppress polling temporarily (e.g., "the publisher is having an outage; let's skip a few days"). Suppression is the partial-fetch posture of §3.2(c) / §5.3, not a cadence change.

Build may, without broker review:

- Adjust the polling clock-time (e.g., from 03:00 to 04:00) for operational reasons (avoiding overlap with other cron jobs, etc.); the "daily" property is what's bound, not the specific hour.
- Retry failed polling attempts per §3.2(c).
- Add observational instrumentation (latency tracking, success-rate dashboarding) that does not change the polling pattern itself.

---

## §5 — Discrepancy policy

**Interim lock status:** §§5.1, 5.2, 5.3, 5.4 locked by broker 2026-06-27.

This section governs how the build responds when something doesn't match — within the canonical source itself, between canonical and cross-check, between publisher and reality, or between the construction and a broker's direct lookup of a specific address.

### §5.1 — Intra-source discrepancy

**Intra-source discrepancy** means the canonical source (C-8) returns data that is internally inconsistent or that fails a build-side sanity check, independent of any comparison to another publisher.

**§5.1-a — SANITY_OUT canary check (build-side guard).** Build SHALL maintain a developer-curated list of well-known ZIP codes that are unambiguously NOT in the City of LA (Beverly Hills 90210-12, Santa Monica 90402-05, Long Beach 90802/10/13, Glendale 91201-06/214, Burbank 91501-06, Culver City 90230/32, Inglewood 90301-05, El Segundo, Lynwood, Malibu, Pasadena, South Pasadena, Alhambra, Monterey Park, La Cañada Flintridge 91011, and similar). At every construction time (initial baseline per §3.3 and every refresh recompute per §2.2-d), build SHALL verify that **no SANITY_OUT ZIP appears in the unambiguous-in bucket** of the resulting construction.

- **Canary pass:** zero SANITY_OUT ZIPs in `in` bucket. Construction proceeds to A-2 review.
- **Canary fail:** one or more SANITY_OUT ZIPs in `in` bucket. **HALT construction.** Do not emit the snapshot. Do not feed A-2. Surface to broker as `sanity_canary_FORK` with the leaked ZIPs, the computed area-ratios, and the boundary/ZCTA sha256s. The prior production snapshot continues serving.

The SANITY_OUT list is **not a jurisdictional ruling.** It is a build-side QA artifact — known cases that should never enter the `in` bucket under any correct application of the 0.90/0.10 three-bucket rule. A canary failure means something has gone wrong upstream: wrong boundary file, wrong CRS, wrong ZCTA vintage, corrupted input, or a threshold misconfiguration. The cause is debugged before the construction is allowed to proceed.

The SANITY_OUT list is broker-extensible: if the broker observes a leak pattern over time, additional known-out ZIPs can be added to the list. Removing entries from the list requires broker review (could indicate the broker is masking a real bug rather than fixing it).

**§5.1-b — Zero-area sliver detection.** Build SHALL identify any ZCTA polygon in the construction output whose computed `area_ratio` is between 0 and a build-set epsilon (default `1e-9`). These are degenerate intersections — the C-1 91011 case where any-intersection produced a `Shape__Area = 0` row. Under the 0.90/0.10 rule these sit in the `out` bucket cleanly, but their presence is logged to the audit sink as `zero_area_sliver_observed` with the ZCTA, for build-side diagnostic value (a spike in zero-area slivers across a refresh might indicate a boundary-data anomaly).

**§5.1-c — Total-ratio coverage check.** Build SHALL verify that the sum of intersected areas across all ZCTAs in the LA County subset is approximately equal to the area of C-8 itself, within a tolerance of **1.5%** (i.e., `coverage_ratio ≥ 0.985`). The slack absorbs the known structural property that Census ZCTAs do not tile unpopulated open space (parks, flood-control basins, water bodies) — first-construction empirical measurement is `coverage_ratio = 0.993`, attributable primarily to the Hansen Dam / Tujunga basin and similar Valley flood-control / parks areas (~3.3 sq-mi). A coverage miss greater than 1.5% (i.e., `coverage_ratio < 0.985`) means the ZCTA subset is materially incomplete or the boundary geometry is malformed; halt construction and surface as `coverage_check_FORK`. Sub-1.5% drift from year to year is absorbed silently; sub-1.5% drift that is itself a multi-percent step-change from the prior snapshot SHALL be logged as `coverage_drift_observed` for build-side diagnostic visibility, even if it does not trip the halt threshold.

**§5.1-c calibration note.** This tolerance was set at 1.5% on first empirical contact with the C-8 × CA ZCTA-2010 construction (broker ruling 2026-06-27, applied at first-construction). The prior provisional figure of 0.5% predated the empirical measurement and was tightened on a-priori assumption rather than observed structure. The 1.5% setting retains ~0.8% headroom above the observed 0.7% gap for future C-8 boundary edits that may add additional open-space geometry (e.g., parks-department annexations, flood-control easement transfers) without forcing a re-ruling under §5.4-c. Real defect detection remains active: ZCTA-file corruption, CRS reprojection bugs, or upstream Census release defects manifest as multi-percent coverage loss and would still trip the gate.

**§5.1-d — ZCTA-field validity.** Build SHALL verify every ZCTA5CE10 value in the input is exactly five ASCII digits. Non-conforming rows (empty strings, four-digit ZIPs, alphanumeric values) are dropped with audit log entries (`zcta_field_invalid` per dropped row). If more than 1% of input rows are dropped, halt and surface as `zcta_field_corruption_FORK`.

### §5.2 — Cross-source corroboration (optional but ruled)

**Cross-source corroboration** means consulting a non-canonical layer to verify that the construction's classification of a given ZIP is consistent with what an independent publisher would say. This is **always optional and never authoritative** — the canonical answer is what the C-8 × ZCTA-2010 × 0.90/0.10 construction produces. Cross-source is a diagnostic.

**§5.2-a — When build runs cross-source.** Only on broker-initiated investigation. There is no scheduled cross-source job. If a runtime resolver disagreement (§2.2-c step 4 `zip5_zcta5_disagreement`) accumulates beyond a threshold the broker sets for a specific ZIP, the broker may direct build to run a cross-source corroboration query against the C-3 GeoHub DataLA layer (which has the `AnalysisArea` overlap-fraction field) or against C-5 NavigateLA County ZIPs (for ZIP-code-list cross-check, not jurisdiction ruling).

**§5.2-b — What corroboration measures.** Build computes, for the ZIP in question, what each non-canonical source would say (in/out/straddler under that source's apparent rule, or in/out under any-intersection for the pre-published layers). Build reports the multi-source disposition to the broker; broker rules whether the disagreement triggers a §6.5 gate-closed-with-guidance posture for that ZIP, or no change.

**§5.2-c — Cross-source CANNOT override canonical.** Even if every non-canonical source disagrees with the C-8 construction's classification for a specific ZIP, the canonical construction is what the production runtime serves. Overriding the canonical requires a broker ruling and a documented exception in the snapshot's provenance header (`canonical_override_exceptions`). Build cannot apply cross-source overrides silently or automatically. This preserves the audit property that **the production set is exactly what the canonical construction produces, plus broker-ruled exceptions, and nothing else.**

### §5.3 — Publisher-acknowledged-error response

**Publisher-acknowledged error** means BOE / GIS Mapping Division (or another authoritative city office) issues a public correction or deprecation notice for C-8, C-7, or both.

**§5.3-a — Detection.** Build does not automatically detect publisher errata. Detection is operator-driven: the broker (or build, on broker-prompted investigation) checks GeoHub item page, the data.lacity.org Socrata dataset page, the BOE / GIS Mapping Division news feed, and any City open-data office announcements. The §3.1-b 18-month dormancy alert is the build-side prompt that often triggers this check.

**§5.3-b — Response posture.** When a publisher error is confirmed:

1. **Identify scope:** which ZIPs are affected, what the publisher's correction says.
2. **Compute impact:** rerun the construction against a corrected-input candidate (the broker supplies the corrected boundary file or accepts the publisher's next-published layer). Compare against the current production snapshot. The diff is an A-2 packet.
3. **Operational continuity:** the current production snapshot continues serving during the impact-assessment window. No silent flip to corrected data.
4. **A-2 processing:** the diff packet enters A-2 review under the standard discipline; ADDs / REMOVEs / CORPUS-IMPACT REMOVEs are ruled per A-2 §2. Publisher-acknowledged-error packets get a `publisher_errata` tag so they are visually distinguishable from normal refresh diffs in the A-2 queue.
5. **Provenance:** the corrected snapshot's provenance header records the publisher errata reference (URL or citation), the date the broker became aware, and the resolution path. This is part of the audit trail for any future tenant challenge.

**§5.3-c — Persistent C-8 fetch failure (§3.2(c) escalation).** If the daily-polling job hits two consecutive cycle failures against C-8, the failure surfaces as a `c8_fetch_fail_persistent` fork. Broker investigates: is the FeatureServer endpoint URL still valid, has the layer been moved/renamed, has the publisher account been deactivated. Possible outcomes: (a) endpoint recovered, resume polling; (b) endpoint permanently moved, broker rules a URL update and re-attests the new endpoint as part of the C-8 identity; (c) layer deprecated, escalate as §3.2(b) publisher-dormancy case.

**§5.3-d — C-7 cross-check failure.** If C-7 fetch fails persistently but C-8 succeeds, the divergence gate (§2.1) cannot run. Build SHALL log the missing cross-check (`c7_fetch_fail_persistent`) and proceed with the construction, marking the snapshot's provenance header with `cross_check_skipped`. This is fail-soft because C-7 is divergence-detection only, not canonical; a missing cross-check is a degradation of audit posture, not a failure of the canonical chain. If C-7 remains unreachable for more than 30 days, surface to broker as a separate fork for cross-check re-sourcing.

### §5.4 — Disagreement with broker direct lookup

**Broker direct lookup** means the broker queries a specific address against ZIMAS or another City lookup tool by hand (typically during tenant-dispute investigation) and the result contradicts what the production runtime would have returned for the same address.

**§5.4-a — Three categories of disagreement:**

1. **ZCTA classification was correct; parcel says different.** The runtime correctly routed a straddler ZIP to parcel rail, and parcel rail returned the answer the runtime served. The broker's manual ZIMAS lookup confirms parcel rail's answer. **No disagreement.** This is the system working as designed.

2. **ZCTA classified as unambiguous-in/out; parcel says different.** The runtime did NOT consult parcel rail because the ZCTA was outside the straddler zone, but the broker's manual lookup at the parcel level returns the opposite answer. This is the `zip5_zcta5_disagreement` case (§2.2-c step 4). Single instances are logged but expected to be rare. Pattern detection (more than 3 disagreements for the same ZIP within 30 days) surfaces to broker as a §5.4-b investigation.

3. **ZCTA had no match (no-match routing); parcel says in-City.** The runtime correctly routed an unknown ZIP to parcel rail per §2.2-c step 3, and parcel rail returned in-City. **No disagreement** — the runtime answered correctly via parcel rail. The audit-log entry `zip5_no_zcta5_route_parcel` is the documentation.

**§5.4-b — Investigation cadence for accumulated disagreements.** The broker reviews accumulated `zip5_zcta5_disagreement` entries at the cadence ruled in §6.4 (logging discipline section). For any ZIP with three or more disagreements in a rolling 30-day window, the broker SHALL:

1. Manually verify the parcel-rail answers (sample at least three of the disagreement cases).
2. Compute or request the ZIP's current `area_ratio` against the most recent C-8 (the ratio may have shifted across a refresh).
3. Determine whether the ZIP should be:
   - **Re-classified** by adjusting its disposition manually in the next snapshot's provenance `canonical_override_exceptions` (if the disagreement reflects a systematic 0.90/0.10 boundary miss).
   - **Left as is** (if the disagreements are address-specific edge cases that parcel rail handles correctly when consulted).
   - **Escalated** as a §6.5 gate-closed-with-guidance candidate (if the ZIP is fundamentally unsuited to ZIP-level classification).

**§5.4-c — Override exceptions in provenance.** Any broker-ruled override (re-classifying a ZIP against what the 0.90/0.10 rule produces) SHALL be recorded in the snapshot provenance header as `canonical_override_exceptions: [{zip, computed_bucket, override_bucket, ruling_date, ruling_reference}]`. This is the audit-trail mechanism by which the production set differs from the pure construction output — every override is named, dated, and tied to a broker ruling. Overrides accumulated over time form part of the predicate-5 attestation packet (§8).

---

## §6 — Runtime resolution chain

**Interim lock status:** §§6.1, 6.2, 6.3, 6.4, 6.5 locked by broker 2026-06-27.

This section defines what happens when a tenant address arrives at the OwnerPilot runtime: the ordered chain that converts an address into a binding answer to "is this property in the City of LA for RTC overlay purposes." §2.2-c defined the join discipline (USPS ZIP5 → ZCTA5CE10 match); this section defines the full chain end-to-end, including the parcel-rail handoff named in A-1 §2.5 and reused throughout §§2.2-b / 2.2-c.

### §6.1 — Chain definition (ordered)

The runtime resolver SHALL walk these steps in this exact order. Each step has a defined outcome (terminate the chain with a verdict) or hand-off (continue to the next step). Build cannot reorder, skip, or short-circuit steps without a broker ruling.

**Step 1 — Geocode the address.** The Google Geocoding API receives the address and returns (a) a USPS ZIP5, (b) latitude/longitude, (c) Google's `administrative_area_level_*` fields, and (d) the resolved formatted address. If geocoding fails (no result, ambiguous result, address-not-found), terminate with verdict `geocode_failed`; no RTC overlay applied; runtime surfaces "address not resolved" to the user. Log to audit sink as `geocode_fail` with the input address and Google's error.

**Step 2 — ZCTA5CE10 lookup against the current production snapshot.** The USPS ZIP5 returned by Step 1 is matched, as a 5-character string, against the `ZCTA5CE10` field of the current production snapshot (§2.2 construction output). Three outcomes:

- **Match found, unambiguous-in bucket:** terminate with verdict `in_city_zcta_unambiguous`. RTC overlay applies. Log to audit sink as `zip5_zcta5_exact` (per §2.2-c step 2) with the matched ZCTA, the area-ratio, and the bucket.
- **Match found, unambiguous-out bucket:** terminate with verdict `out_city_zcta_unambiguous`. RTC overlay does NOT apply. Log to audit sink as `zip5_zcta5_exact` with the bucket = `out`.
- **Match found, straddler bucket:** do NOT terminate. Log to audit sink as `zip5_zcta5_exact` with the bucket = `straddler`; **hand off to Step 3 (parcel rail)** per §2.2-b straddler discipline.
- **No match found:** do NOT terminate. Log to audit sink as `zip5_no_zcta5_route_parcel` (per §2.2-c step 3); **hand off to Step 3 (parcel rail)** with the geocoder-emitted ZIP5 and the address.

**Step 3 — Parcel rail consultation.** The address from Step 1 (with latitude/longitude) is sent to the parcel-rail resolver (Workstream B's `parcelEndpointHealthCheckLive` infrastructure: ZIMAS primary, County secondary, both currently health-checked at */30 UTC). Three outcomes:

- **Parcel-rail returns in-City:** terminate with verdict `in_city_parcel_resolved`. RTC overlay applies. Log to audit sink as `parcel_in` with the parcel APN (Assessor's Parcel Number), the resolved jurisdiction tag, and the rail used (ZIMAS vs County).
- **Parcel-rail returns out-of-City:** terminate with verdict `out_city_parcel_resolved`. RTC overlay does NOT apply. Log to audit sink as `parcel_out` with the same fields.
- **Parcel-rail unavailable or returns inconclusive:** do NOT terminate. Log to audit sink as `parcel_fail` with the rail attempted and the failure mode; **hand off to Step 4 (gate-closed-with-guidance)**.

**Step 4 — Gate-closed-with-guidance disposition.** When Steps 1–3 have all run and the chain still has no verdict (geocode succeeded but both ZCTA classification and parcel-rail consultation could not produce a binding answer), the runtime SHALL apply the §6.5 gate-closed-with-guidance UX. This is the only chain step that does NOT produce a verdict in the {`in_city`, `out_city`} binary; it produces verdict `gate_closed_guidance_served`. Log to audit sink as `gate_closed_with_guidance` with the chain history (which steps ran, which logged what), the input address, and the gate-closed reason code. The user sees §6.5 guidance UX, not a notice-generation flow.

### §6.2 — Chain termination semantics

The chain SHALL terminate at exactly one step. The verdict produced at termination is binding for the duration of that user session for that address. The chain does NOT re-run automatically if a downstream snapshot refresh or parcel-rail health-check would now produce a different answer; the user's session captured a determination at a moment in time, and subsequent system state changes do not retroactively flip prior determinations.

**§6.2-a — Why termination is binding within a session.** A notice generation flow that began under verdict `in_city_zcta_unambiguous` cannot mid-stream become `out_city` because the snapshot refreshed. The user has been told the notice applies; they have started composing it; they may have collected information from the tenant. Retroactively reversing the jurisdictional determination in the same session would be a worse failure than serving a slightly-stale verdict. The next session for the same address gets the current snapshot's answer.

**§6.2-b — Cache lifetime.** The verdict for an address is cached per session, not across sessions. A new session (new browser, new login, or after session expiry per the standard OwnerPilot session policy) re-runs the chain from Step 1. There is no longer-lived per-address cache at the runtime layer; the snapshot file IS the long-lived cache.

**§6.2-c — Retroactive correction.** If a snapshot refresh under §2.2-d produces a diff that the broker rules (via A-2 review) shifts a previously-`in` ZIP to `out` (or vice versa), prior notices generated under the old verdict are NOT invalidated. The notice was correct at the moment it was generated under the then-current production snapshot. The audit trail (notice provenance includes snapshot sha256 at generation time) is the defense if a tenant later disputes the determination.

### §6.3 — Tools available to the broker

When the broker needs to manually investigate a specific address (§5.4 broker direct lookup, §5.4-b accumulated-disagreement investigation, or general operational diligence), the following tools are available and broker-trusted:

**Build-side tools (read-only, query against current production snapshot):**

- `lookup_zip` (build CLI): given a USPS ZIP5, returns the current production snapshot's classification (`in` / `out` / `straddler` / `no_zcta_match`), the area-ratio if matched, the snapshot sha256, and the snapshot construction timestamp.
- `lookup_address` (build CLI): given a free-text address, runs the full §6.1 chain and returns the verdict, the chain history (which steps ran), and every audit-sink event the chain would have emitted at runtime. Does NOT generate any notice; pure diagnostic.
- `snapshot_diff` (build CLI): given two snapshot sha256s, returns the ADD / REMOVE / RECLASSIFY diff between them at the ZIP level. Useful for retrospectively understanding why a ZIP's determination changed across a refresh.

**City-side tools (manual broker lookup, authoritative for parcel-level questions):**

- [ZIMAS](https://zimas.lacity.org/) — City of LA parcel inquiry system. The broker enters an APN or an address; ZIMAS returns the City Council district, the Community Plan Area, the General Plan Land Use, and — critically — explicit "this property is/is not within the City of Los Angeles" by virtue of being in (or not in) a Council District. ZIMAS is City-published and is the parcel-rail authoritative resolver in Workstream B.
- [NavigateLA](https://navigatela.lacity.org/) — City of LA's broader GIS portal. Used for cross-checking layer ancestry, viewing the City Boundary visually, and confirming that a specific ZIP's interior parcels are inside the boundary as drawn. The web UI is Akamai-protected against automated traffic but accepts manual broker queries.
- [LA County Assessor Parcel Detail](https://portal.assessor.lacounty.gov/) — County-side parcel detail; useful when ZIMAS is unavailable or when investigating a border parcel whose City status is genuinely ambiguous (County tells you which jurisdiction the parcel rolls up to for tax purposes).
- [data.lacity.org Socrata catalog](https://data.lacity.org/) — used to verify C-7 and other BOE-published layers directly.
- [GeoHub](https://geohub.lacity.org/) — used to verify C-8 and inspect the publisher account, edit history, and item metadata.

**Use discipline.** Broker tools are read-only diagnostics; they inform broker rulings but do not modify the production snapshot. Any change to production (override exceptions per §5.4-c, threshold adjustments, source re-canonicalization) requires the full A-3 amendment process — a broker ruling document, a re-attested snapshot, and §8 packet update.

### §6.4 — Logging discipline for chain consultation

Every chain invocation SHALL emit exactly one terminal audit-sink event (corresponding to the step at which the chain terminated) plus zero or more intermediate events (logged at hand-off points). Every event SHALL include:

| Field | Type | Required | Notes |
|---|---|---|---|
| `event_type` | string | yes | One of the event-type strings defined in §§2.2-c, 3.2(c), 5.x, and 6.1 |
| `timestamp_utc` | ISO-8601 string | yes | UTC, microsecond precision |
| `session_id` | UUID | yes | Per-session, per-user; ties chain events together |
| `address_input` | string | yes | Raw user input, pre-geocoding |
| `geocoded_zip5` | string\|null | conditional | Required after Step 1 succeeds |
| `geocoded_lat_lon` | [float, float]\|null | conditional | Required after Step 1 succeeds |
| `snapshot_sha256` | string | yes | Production snapshot in effect at chain start |
| `step_reached` | int (1–4) | yes | Highest step number the chain reached |
| `verdict` | string | yes | Terminal verdict (per §6.1 enumerated set) |
| `chain_history` | array of step-events | yes | Ordered list of intermediate hand-offs |
| `tenant_address_hash` | string | yes | Salted SHA-256 of the resolved address for de-duplication without storing PII |

**§6.4-a — Retention.** Chain audit events are retained for **5 years** in the geocode-audit sink (the same retention window as the parcel-health audit sink, per Workstream B). 5-year retention covers the longest plausible look-back window for a tenant dispute: California statute of limitations on a breach-of-contract or wrongful-eviction claim is typically four years (Cal. Code Civ. Proc. § 337), with one year added for procedural slack.

**§6.4-b — Accumulated-disagreement review cadence (referenced from §5.4-b).** The broker SHALL review accumulated `zip5_zcta5_disagreement` entries **monthly**. The review consists of: querying the audit sink for the past 30 days of disagreement entries, grouped by ZIP; for any ZIP with 3 or more disagreements, executing the §5.4-b investigation flow; recording each ZIP investigation's outcome in the audit log as `disagreement_review_outcome` with the ruling.

Monthly is the binding cadence; the broker may run reviews more frequently at their discretion (weekly, or ad-hoc on specific tenant disputes). Reducing the cadence below monthly requires an A-3 amendment.

**§6.4-c — Snapshot-correlated query support.** The audit sink SHALL support queries of the form "for a given snapshot sha256, return all chain events where that snapshot was in effect." This supports the §6.2-c retroactive-correction defense — a broker can demonstrate that a notice was generated under the snapshot in effect at the time, even if the snapshot has since been superseded.

### §6.5 — Gate-closed-with-guidance UX (named, deferred)

**§6.5-a — What this is.** Gate-closed-with-guidance is the runtime UX surface that fires when the resolver chain (§6.1) cannot produce a binding `in_city` / `out_city` verdict. It is the operational realization of A-1 §2.4 ("a false-positive jurisdictional claim is worse than a no-answer") and A-1 §2.5 ("border cases resolve at parcel layer, not ZIP layer") at the moment a tenant address fails to resolve.

Named scenarios that trigger §6.5:
- Both ZCTA classification and parcel rail are unavailable / fail / return inconclusive (§6.1 Step 4)
- A ZIP has been explicitly escalated to §6.5 status per §5.4-b ("fundamentally unsuited to ZIP-level classification")
- A broker-ruled `canonical_override_exceptions` entry has classified a ZIP as `gate_closed_guidance_served` rather than re-classifying it `in` or `out`

**§6.5-b — What the user sees (deferred).** The specific UX copy, page layout, escalation path, and call-to-action are NOT defined in this ruling. They are deferred to a separate broker ruling under a future Workstream that owns runtime-tenant-facing UX. This ruling reserves the term `gate_closed_guidance_served` as the verdict name and the audit-event type, so the chain can already emit it correctly today; the UX layer plugs in later.

**§6.5-c — What gate-closed-with-guidance is NOT.** It is not a refusal. It is not an error page. It is not a silent failure. It is a deliberate posture: the system has determined that it cannot give a binding answer for this address at this moment, names that explicitly, and routes the user to the next correct action (which the deferred UX ruling will define — likely: contact a licensed real estate professional or the broker directly, or attempt re-entry with a different address format).

**§6.5-d — Telemetry posture during deferral.** Until the §6.5 UX is built, the runtime SHALL still emit `gate_closed_with_guidance` audit events on Step 4 hits, with chain history populated. The verdict is recorded; the user-facing UX is a placeholder "address could not be resolved — contact support" page that links to the broker. This means the chain is operationally complete even with §6.5 UX deferred; only the visual presentation layer is pending.

---

## §7 — Data licensing / sourcing provenance

**Interim lock status:** §§7.1, 7.2, and 7.3 all locked by broker 2026-06-27.

### §7.1 — License of canonical source

**Primary canonical layer (C-8 `LA_City_Boundary_detailed`):** The GeoHub item carries no explicit license field (the `licenseInfo` and `accessInformation` metadata fields are blank on the item page). Access is set to `public`. Under the City of Los Angeles open-data policy (per the City's [Open Data Executive Directive](https://data.lacity.org/) and the data.lacity.org platform terms), all City-published GIS data hosted under the City's organizational ArcGIS account or on the Socrata platform is open for public reuse absent an explicit override. C-8 is published by `joseph.perman_labss` — a BOE GIS Mapping Division active publisher account — on the City's GeoHub infrastructure, with no override notice.

C-8 license posture: **open for public reuse under the City of LA open-data policy.** The absence of an explicit license-text on the C-8 item is treated as default-open, not default-restricted, on the strength of the publisher account's institutional placement.

**Cross-check layer (C-7 `City Boundary of Los Angeles`, data.lacity.org Socrata `brvb-jr45`):** Explicit license is [CC0 1.0 Universal (Public Domain Dedication)](http://creativecommons.org/publicdomain/zero/1.0/legalcode) per the dataset's `Public:Licensing` field. This is the clean license anchor: the same BOE / GIS Mapping Division authorship chain (the publisher account is `Public Works: Engineering OpenData`) explicitly releases the equivalent City Boundary data under CC0 1.0. C-7's explicit CC0 supports the inference that C-8 — same authorship, same data subject, different platform — is similarly open.

**License risk posture.** If a future challenge arose to the use of C-8 specifically (e.g., the City retroactively asserted a license restriction not visible at publication time), the operational fallback is to switch the canonical primitive to C-7 (which carries explicit CC0) and accept the 14-month-older edit date (2025-02-26 vs C-8's 2026-05-19). The construction pipeline (§2.2, §3.3) is publisher-agnostic with respect to the boundary input; only the §2.1 primary/cross-check designation would change. This is a tracked risk in §10, not an active threat: BOE / GIS Mapping Division publishes both layers and shows no pattern of restrictive licensing.

**Census ZCTA-2010 source:** U.S. Census TIGER/Line shapefiles are released into the public domain as federal government work product (17 U.S.C. § 105). No license attribution required for use, modification, or redistribution.

**Derived snapshot output:** The construction's output (the `cityOfLaZipsAuthoritative` snapshot file) is a derived work combining (a) C-8 / C-7 boundary geometries (open per above), (b) Census ZCTA-2010 polygons (public domain), and (c) build-side computation under the 0.90/0.10 three-bucket rule (broker-authored under this ruling). The combined work is internal to OwnerPilot AI; no third-party redistribution license is required. If the snapshot were ever published externally, attribution would name BOE / GIS Mapping Division (boundary), U.S. Census Bureau (ZCTA), and OwnerPilot AI (derivation rule), with no licensing complication on any input layer.

**License documentation in provenance.** Every snapshot provenance header SHALL include a `license_inputs` block recording: C-8 license posture ("open per City of LA open-data policy; no explicit license-text on item"), C-7 explicit license ("CC0 1.0"), Census ZCTA-2010 license ("public domain, 17 U.S.C. § 105"). This documents the broker's license diligence at snapshot creation time for the audit record.

### §7.2 — Broker-scope reliance statement (Bus. & Prof. Code § 10131(b))

**§7.2-a — The reliance posture.**

This ruling, the snapshot it governs, and the runtime resolution chain (§6) it produces are authored and attested by Jack Taglyan as a California Licensed Real Estate Broker (CalDRE B9445457), acting under the scope of Cal. Bus. & Prof. Code § 10131(b) ("a real estate broker is a person who, for a compensation or in expectation of a compensation … sells or offers to sell, buys or offers to buy, solicits prospective sellers or purchasers of, solicits or obtains listings of, or negotiates the purchase, sale or exchange of real property or a business opportunity"). Determining whether a specific property is within a specific municipal jurisdiction — here, the City of Los Angeles — is a real-estate-professional act squarely within the broker scope: it is the kind of determination a broker routinely makes in the course of representing a property, negotiating its sale, advising on its applicable land-use regulation, or producing transactional documents that turn on its jurisdiction.

No attorney is engaged on this project, no attorney has reviewed this ruling, and no attorney-client work product is incorporated. The broker is the sole compliance authority. This ruling does not constitute legal advice, does not interpret statute beyond the operational scope of producing a defensible jurisdictional determination for OwnerPilot AI's documented use cases, and is not a substitute for independent legal counsel by any user of the OwnerPilot AI platform.

**§7.2-b — Scope of the reliance.**

The broker's reliance covers:
1. The selection of C-8 / C-7 as canonical / cross-check publishers (§2.1).
2. The three-bucket area-ratio assignment rule with thresholds 0.90 / 0.10 (§2.2-b).
3. The currency, refresh-cadence, discrepancy, and runtime-resolution dispositions in §§3, 4, 5, 6.
4. The license-posture inferences for C-8 (§7.1).
5. The attestation packet shape and contents (§8).

The broker's reliance does NOT cover:
1. Any specific notice generated by the OwnerPilot AI platform against an individual tenant or property — that reliance attaches to the notice-generation flow and to the tenant- or property-specific facts at notice time, not to the jurisdictional determination upstream.
2. Any tenant's legal rights or remedies — those are determined by applicable statute, case law, and the tenant's own counsel.
3. The accuracy of third-party data sources (Google Geocoding, ZIMAS, County Assessor) at the moment of any specific runtime resolution — those are best-effort consultations and their failure modes are absorbed by the chain (§6.1) and the discrepancy policy (§5).

**§7.2-c — The defensibility chain.**

If a tenant, attorney, court, the DRE, or any other authority challenges a specific notice on the grounds that the property is not in the City of LA, the broker's defensibility chain is:

1. **Notice provenance:** the notice carries a snapshot sha256 reference (§6.2-c). The broker retrieves the snapshot in effect at notice time.
2. **Snapshot provenance:** the snapshot carries the C-8 `editingInfo.lastEditDate`, C-7 publication date, ZCTA-2010 release identifier, divergence-ratio, thresholds (0.90 / 0.10), and license posture (§7.1) at construction time.
3. **Ruling provenance:** the snapshot's construction follows this ruling (§2.2 construction + §2.2-b assignment rule); this ruling is broker-attested under §7.2.
4. **Chain provenance:** the notice generation captured the audit-sink events from the §6.1 chain (verdict, step reached, ZCTA-classification details or parcel-rail consultation). Retrieving these events demonstrates exactly how the determination was made for that specific address.
5. **Authority provenance:** the broker's CalDRE B9445457 license and the broker-scope statement above support the broker's competence to make the underlying determination.

Each link is named, dated, and retrievable. The chain is the defense.

**§7.2-d — What the broker does NOT claim.**

The broker does not claim:
1. That C-8 / C-7 / ZCTA-2010 are infallible — they are best-available authoritative sources, used under documented discipline.
2. That the 0.90 / 0.10 thresholds are uniquely correct — they are the broker's reasoned ruling under the three-bucket framework, with alternatives (0.85/0.15, 0.80/0.20) explicitly considered and rejected on the audit trail.
3. That every individual ZIP determination is correct in every case — the straddler discipline and the parcel-rail handoff and the gate-closed-with-guidance UX exist precisely because ZIP-level determination is not always sufficient; the broker has documented the limits.
4. That the operational system has zero risk — the broker has documented the failure modes (§5), the recovery postures (§3.2, §5.3), and the broker-investigation tools (§6.3) that bound the risk.

What the broker claims is that this ruling, applied through this construction, refreshed at this cadence, with this discrepancy policy, resolved through this runtime chain, and attested through this packet — constitutes a defensible jurisdictional determination posture under the broker's CalDRE B9445457 license authority for the OwnerPilot AI platform's documented use cases.

### §7.3 — Re-attestation discipline

The broker re-attests under the following circumstances:

**§7.3-a — Routine re-attestation (per snapshot refresh).** Every snapshot refresh that produces an A-2 packet with non-trivial diff (more than 5 ADDs or 0 REMOVEs/CORPUS-IMPACT REMOVEs) carries a broker attestation as part of the A-2 review and snapshot commit. "Routine" means "applied via the standing A-2 §2.1 ADD-auto-apply discipline plus broker REMOVE/CORPUS-IMPACT review;" the re-attestation is implicit in the A-2 review and is recorded in the snapshot's provenance header as `broker_attestation_routine` with the date and snapshot sha256.

**§7.3-b — Substantive re-attestation (per ruling amendment).** Any amendment to this ruling (changing the canonical publisher, changing the three-bucket thresholds, changing the discrepancy policy, changing the runtime chain order, changing the licensing posture) requires:
1. A new ruling document (or an addendum that explicitly amends the named section).
2. Broker signature on the amendment.
3. A fresh snapshot construction against the amended rules.
4. A fresh §8 attestation packet.
5. Updated cross-references in any downstream documents (A-2 if A-3 thresholds change, etc.).

This is the formal A-3 amendment process referenced throughout (§6.3, §6.4-b, etc.). It is heavier than routine re-attestation because amendments change the rules of the ruling itself, not just the production data the ruling governs.

**§7.3-c — Triggered re-attestation (per discovered defect).** If a defect is discovered in the ruling — a logical inconsistency, an unreachable edge case, an unworkable mechanic surfaced by operational experience — the broker re-attests after the defect is resolved. The resolution may be a clarification (paragraph-level edit, no rule change), an amendment (§7.3-b path), or a full re-write of an affected section. Defect-triggered re-attestations are flagged as `broker_attestation_defect_resolution` in the snapshot provenance with the defect reference (a ticket ID, a session-context reference, or an inline description).

**§7.3-d — Time-triggered re-attestation (annual).** The broker SHALL re-read this ruling in full and either re-attest as-is (recording `broker_attestation_annual_review` in the next snapshot's provenance) or open the §7.3-b amendment process for any items that have become unworkable. Annual cadence is the floor; the broker may re-read at any time for any reason.

**§7.3-e — What re-attestation does NOT do.** Re-attestation does not retroactively invalidate prior notices generated under the prior attestation state (§6.2-c). Re-attestation is forward-looking: it governs constructions, refreshes, and notices produced from the re-attestation date forward. Prior notices remain defensible under their as-of-time provenance chain (§7.2-c).

---

## §8 — Predicate attestation packet shape

This section defines the exact contents of the predicate-5 (`cityOfLaZipsAuthoritative`) attestation packet — the deliverable that flips predicate 5 from FALSE to TRUE on the LA go-live gate. The packet must demonstrate that every ruling in §§2–7 of this determination has a corresponding committed, retrievable artifact in the OwnerPilot AI workspace and repository.

### §8.1 — Packet location and naming

**§8.1-a — Packet file.** The attestation packet SHALL be authored as a single markdown file at:

`/home/user/workspace/predicate_5_city_of_la_zips_authoritative_attestation_packet_<YYYY-MM-DD>.md`

where `<YYYY-MM-DD>` is the broker-attestation date (the date the broker signs the packet, not necessarily the date the underlying artifacts were produced).

**§8.1-b — Companion artifacts.** The packet references — and the broker SHALL ensure are simultaneously committed to the repository at the time of packet signing — the artifacts enumerated in §§8.3–8.5 below. The packet is a manifest pointing at committed artifacts; it is not a standalone document.

**§8.1-c — Shared-asset name for version history.** When shared via `share_file`, the packet uses the asset name `predicate_5_city_of_la_zips_authoritative_attestation_packet` so subsequent attestations (under §7.3-b substantive re-attestation or §7.3-d annual re-attestation) update the same asset and produce version history.

### §8.2 — Packet sections (manifest structure)

The packet SHALL contain the following sections in order:

1. **§1 — Predicate identity.** Names the predicate (`cityOfLaZipsAuthoritative`), its position on the LA go-live gate (predicate 5 of 6), the governing ruling (this A-3 determination, by sha256 + path), and the attestation date.
2. **§2 — Predicate satisfaction table.** A markdown checklist (one row per predicate in §8.3) showing each predicate, the artifact that satisfies it, and the broker's attestation that it is satisfied.
3. **§3 — Artifact inventory.** Full paths and sha256 hashes for every committed artifact referenced in §2.
4. **§4 — Runtime verification evidence.** Output excerpts from the verification steps in §8.4 (snapshot load, v6 corpus pass, A-2 emitter dry-run, etc.).
5. **§5 — Cross-predicate dependencies.** A note on any dependency this predicate has on the other five gate predicates (none expected; this is the cleanest predicate in terms of cross-coupling, but the section exists for completeness).
6. **§6 — Broker signature.** Single sign-off line per the standing pattern.

### §8.3 — Predicate satisfaction list (the 10 conditions)

The attestation packet attests that all ten of the following conditions are satisfied. Each row maps to an attestable artifact or runtime event.

**Predicate 1 — Canonical source identified and broker-attested.**
- **Satisfied by:** §2 of this ruling (C-8 primary, C-7 cross-check, ZCTA-2010 derivation).
- **Artifact:** this ruling document (`workstream_a_fork_3_authoritative_determination_broker_ruling_<date>.md`), committed to the workspace and referenced by sha256.

**Predicate 2 — Currency window defined and broker-ruled.**
- **Satisfied by:** §3 of this ruling (18-month dormancy clock on more-recent of C-8 lastEditDate or broker initial attestation date).
- **Artifact:** same ruling document; no separate runtime artifact required for predicate satisfaction (currency-check code lives in the snapshot construction pipeline; verified under predicate 7).

**Predicate 3 — Refresh cadence defined and broker-ruled.**
- **Satisfied by:** §4 of this ruling (daily polling at 03:00 PT).
- **Artifact:** same ruling document, plus the cron registration (workstream B's parcel-health-cron-slice pattern; see the cron registration manifest committed alongside the packet, identified by jobid).

**Predicate 4 — Discrepancy policy defined and broker-ruled.**
- **Satisfied by:** §5 of this ruling (intra-source divergence tolerance 0.001, SANITY_OUT canary, override-exceptions mechanism, cross-source corroboration discipline).
- **Artifact:** same ruling document, plus the `canonical_override_exceptions` provenance schema (committed as part of the snapshot tooling; verified under predicate 7).

**Predicate 5 — Runtime resolution chain defined and broker-ruled.**
- **Satisfied by:** §6 of this ruling (4-step ordered chain: Geocode → ZCTA → Parcel rail → Gate-closed-with-guidance).
- **Artifact:** same ruling document, plus the chain implementation (located in the geocode-resolver surface; specific module path provided in packet §3).

**Predicate 6 — License / reliance posture defined and broker-ruled.**
- **Satisfied by:** §7 of this ruling (C-8 open-by-policy, C-7 CC0 1.0, ZCTA public domain, broker reliance under Bus. & Prof. Code § 10131(b), re-attestation discipline).
- **Artifact:** same ruling document.

**Predicate 7 — First snapshot loaded and sha256-verified.**
- **Satisfied by:** the construction pipeline (Python script per build's contribution) running against C-8/C-7/ZCTA-2010 inputs, producing the first snapshot, with the snapshot's sha256 recorded in the packet.
- **Artifact:** the snapshot file at the path determined by the construction pipeline (e.g., `cityOfLaZipsAuthoritative_<YYYY-MM-DD>_<sha7>.json` or equivalent format chosen at build), plus a snapshot-load test confirming the runtime can read it and parse its three buckets (`in`, `straddler`, `out`).
- **Verification evidence:** snapshot sha256 + bucket counts (`in_count`, `straddler_count`, `out_count`) + SANITY_OUT canary result (zero in `in`) + license_inputs block contents.

**Predicate 8 — v6 corpus passes against authoritative snapshot.**
- **Satisfied by:** the geocode resolver v6 corpus test suite running with the snapshot loaded, all cases passing including straddler cases routed to parcel rail.
- **Artifact:** test run output (committed as a verification log or referenced by CI run ID), showing pass/fail counts and any cases that changed verdict from the pre-snapshot baseline.
- **Verification evidence:** corpus pass count, fail count (target: zero new failures attributable to the snapshot), and a delta against the pre-snapshot baseline showing which addresses changed verdict (e.g., addresses that previously routed via Google-only inference and now route via snapshot-classified ZIP).

**Predicate 9 — A-2 diff packet emitter live and tested.**
- **Satisfied by:** the A-2 diff packet emitter (per Fork A-2 ruling §2.1 ADD-auto-apply / REMOVE-broker-review discipline) running against a synthetic diff with at least one ADD and one REMOVE, producing the expected packet shape.
- **Artifact:** the emitter implementation path + a synthetic-diff test fixture + the produced test packet (committed as an example artifact in the test fixtures directory).
- **Verification evidence:** the test packet contents (or its sha256 + bucket-bucket counts), demonstrating the emitter correctly distinguishes ADD vs. REMOVE vs. CORPUS-IMPACT REMOVE per A-2.

**Predicate 10 — NO-DIFF auto-attestation observed (first refresh) — OR — synthetic NO-DIFF test if first refresh is post-go-live.**
- **Satisfied by:** either (a) the first scheduled refresh (under §4.1's daily-at-03:00-PT cadence) produces a NO-DIFF outcome and the auto-attestation event is recorded in the snapshot provenance and audit-sink, OR (b) if the gate flips before the first scheduled refresh runs, a synthetic NO-DIFF test fixture is executed against the emitter and the auto-attestation pathway is observed.
- **Artifact:** the audit-sink event ID (production) or the test fixture output (synthetic), showing `broker_attestation_routine` recorded with appropriate identifiers.
- **Verification evidence:** the event payload or test output excerpt.
- **Discretionary note:** Build may select either path at packet-authoring time. The production-NO-DIFF path is preferred when timing permits (it exercises the live cron); the synthetic path is acceptable when the gate-flip timing predates the first scheduled refresh.

### §8.4 — Verification evidence requirements

For each predicate that has a runtime component (predicates 7, 8, 9, 10), the packet SHALL include in §4 of the packet:

1. **Predicate 7:** snapshot file path, snapshot sha256, bucket counts, SANITY_OUT canary result, license_inputs block.
2. **Predicate 8:** v6 corpus test command, pass/fail counts, delta-against-baseline list.
3. **Predicate 9:** synthetic-diff fixture path, emitter command, emitted-packet sha256 or contents excerpt.
4. **Predicate 10:** event ID or test fixture output (whichever path was selected).

Non-runtime predicates (1–6) require only the ruling-document reference; no further verification evidence is needed because the ruling document itself is the artifact.

### §8.5 — Pre-commit gate sequence

Before the broker signs the predicate-5 attestation packet, the standing pre-commit gate sequence SHALL pass clean against the workspace and repository state at packet-signing time:

1. `tsc --noEmit` — type check
2. `run_tests.mjs` — test suite
3. `ci:verify-locked-prose` — locked-prose guard
4. `ci:verify-parcel-health-core-sync` — parcel-health core sync (covers workstream B's surface; predicate-5 packet uses the same gate sequence for consistency)
5. `ci:typecheck-edge` — edge-function type check (covers the rtc-refresh edge function; same consistency rationale)

If any gate fails, the packet is not signed until the failure is resolved. A red-gate signing would create defect liability (a defect-triggered re-attestation under §7.3-c would be required to recover).

### §8.6 — Packet sign-off

The packet's §6 (broker signature) uses the standing sign-off line:

`— Jack Taglyan / California Licensed Real Estate Broker / CalDRE B9445457 / Broker Compliance Review · <packet-attestation-date>`

This signature is the act that flips predicate 5. The packet is the artifact; the signature is the attestation. Both must be present in the same committed file for the gate to recognize predicate 5 as satisfied.

---

## §9 — What this ruling does NOT address

This ruling governs the `cityOfLaZipsAuthoritative` predicate and the constructions, refreshes, dispositions, and runtime chains that flow from it. Several adjacent matters are intentionally out of scope; they are named here so the boundary of the ruling is explicit.

### §9.1 — Predicate-6 (parcel-endpoint health) and Workstream B

The parcel-endpoint health check predicate (predicate 6 of 6 on the LA go-live gate) is governed by Workstream B's separate ruling track (slice-1 migration alignment, slice-2 endpoint specs DRIP-001 through DRIP-003, etc.). This ruling references the parcel rail as the §6.1 step-3 fallback when ZCTA classification places an address in the `straddler` bucket, but the parcel rail's own canonicality, refresh cadence, discrepancy policy, and license posture are out of scope here. Workstream B's rulings govern those. If the two workstreams collide on a substantive point (e.g., a runtime ordering question that depends on both ZIP and parcel state), the collision is resolved by the broker authoring an addendum to whichever ruling needs to defer; this ruling does not pre-resolve that.

### §9.2 — Gate-closed-with-guidance UX copy

§6.5 defines the gate-closed-with-guidance behavior as a named runtime disposition (the 4th step in the §6.1 chain), but the user-facing copy — the actual words shown to a broker who reaches a gate-closed verdict — is **deferred** to a separate authoring pass. The UX copy carries tenant-defense weight (it is what a broker reads before deciding whether to proceed with a notice on an ambiguous-jurisdiction property), and it deserves its own focused authoring rather than being buried in this ruling. Tracked as an open item in §10.

### §9.3 — LA Municipal Code monitoring gap

This ruling addresses jurisdictional determination — "is this address in the City of LA?" — but does not address whether the City of LA's substantive ordinances (RSO eligibility, just-cause coverage, local notice requirements above and beyond state minimums) have themselves changed in ways that affect notice content. That monitoring is performed under the CA-3-day-statute-watch cron (`2a58382e`) for state law, and a parallel LA-Municipal-Code monitoring discipline has not yet been authored. The gap is acknowledged here; closing it is a separate workstream, not an A-3 amendment.

### §9.4 — Non-LA jurisdictions

This ruling is City-of-LA-specific. The C-8/C-7/ZCTA-2010 construction is not portable to other California municipalities without a fresh canonical-source attestation per municipality (each city has its own publisher, edit cadence, and boundary discipline; Beverly Hills, Santa Monica, Glendale, Burbank, Culver City, Long Beach, and La Cañada are SANITY_OUT canaries under §5.1-a precisely because they are *not* in the LA City set under this ruling). When the platform expands to non-LA jurisdictions, each gets its own A-3-equivalent ruling. Cross-jurisdictional resolution ("this address could be in LA or Beverly Hills depending on which side of the boundary segment") is handled by the parcel rail under §6.1; the ZIP set ruling itself is single-jurisdiction.

### §9.5 — Historical-snapshot retroactivity

Per §7.3-e, re-attestation is forward-looking. This ruling does not retroactively invalidate any notice generated before the ruling's attestation date, nor does it retroactively validate any notice generated before this ruling whose underlying jurisdictional determination did not follow the §6.1 chain. Pre-ruling notices stand on their as-of-time provenance; this ruling governs the construction, refresh, and resolution discipline from the attestation date forward.

### §9.6 — Geocode-provider canonicality

The §6.1 step-1 (geocode normalization) consults the geocode-provider surface (Google Geocoding as the production primary, per the geocode-provider-comparison broker ruling already in the workspace). The choice of geocode provider and its own discrepancy / failover discipline are out of scope here; they are governed by `la_geocode_provider_comparison_acceptance_broker_ruling_response_2026-06-19.md` and the v6 resolver attestation already on file. This ruling assumes the geocode surface is operational and treats geocode-provider selection as a closed prior question.

### §9.7 — A-1 and A-2 substantive rulings

Forks A-1 (canonical-source ruling: LA City GIS sole canonical, USPS rejected, parcel rails own border cases) and A-2 (reconciliation discipline: ADD auto-apply, REMOVE / corpus-impact REMOVE broker-review, NO-DIFF auto-attests) are referenced throughout but not re-litigated. This ruling is constrained by A-1 and refines / extends A-2; it does not amend A-1, and it supersedes A-2 only on the narrow conflict-resolution clause in A-2 §3 trigger 4. If A-1 or A-2 require amendment as operational experience develops, that is a separate ruling, not an A-3 modification.

---

## §10 — Action items

Close-out checklist for items this ruling either creates, defers, or hands off. Each item is tagged with an owner (`build`, `broker`, or `cron`) and a status (`open`, `tracked`, `next-up`). Build executes `open` and `next-up` items; broker reviews and rules on items requiring attestation; `tracked` items remain on the watchlist without an immediate action.

### §10.1 — Immediate (gate-flip path)

1. **[broker · next-up]** Sign this ruling at completion (full sign-off line at §11; rename DRAFT → final per §10.4).
2. **[build · next-up]** Author the Python construction script per §2.2 (already drafted in-session; reconcile with finalized §2.2-b 0.90/0.10 thresholds and §5.1-a SANITY_OUT canary list, then commit to repo).
3. **[build · next-up]** Run first snapshot construction; produce `cityOfLaZipsAuthoritative_<YYYY-MM-DD>_<sha7>.json`; record sha256 + bucket counts + SANITY_OUT canary result.
4. **[build · next-up]** Wire snapshot load into v6 resolver per §6.1 step-2 (ZCTA classification consultation).
5. **[build · next-up]** Run v6 corpus against loaded snapshot; produce pass/fail + delta-against-baseline.
6. **[build · next-up]** Author A-2 diff emitter synthetic-diff test fixture + commit example test packet.
7. **[broker · next-up]** Author the predicate-5 attestation packet per §8 once items 2–6 land.
8. **[broker · next-up]** Sign the predicate-5 attestation packet (this flips predicate 5; combined with predicate 6 attestation under Workstream B, opens the LA go-live gate).

### §10.2 — Cron + ops

9. **[cron · open]** Register daily 03:00 PT polling job per §4.1 (cron expression `0 11 * * *` in UTC, with PT/PST DST handling per system convention). Job behavior: fetch C-8 + C-7 metadata, compare to baseline, emit A-2 diff packet on change, emit `broker_attestation_routine` event on NO-DIFF.
10. **[build · open]** Implement currency-window check per §3 (18-month dormancy clock; emit `fail-soft` on newer-version-unfetched per §3.2-a; emit `fail-closed` on 18-month silence per §3.2-b).
11. **[build · open]** Implement transient-fetch-fail retry per §3.2-c (60-second retry, two-cycle escalation).
12. **[build · tracked]** Wire `canonical_override_exceptions` provenance mechanism per §5.4-c (no exceptions expected at gate-flip; mechanism exists for future broker-ruled deviations).

### §10.3 — Deferred (named, scheduled separately)

13. **[broker · deferred]** Author gate-closed-with-guidance UX copy per §9.2 (deferred from this ruling; tracked as a separate authoring item).
14. **[broker · deferred]** Author LA-Municipal-Code monitoring discipline per §9.3 (parallel to the CA-3-day-statute-watch cron `2a58382e`, but for LA local ordinances; scope and cadence TBD).
15. **[broker · tracked]** Monitor C-8 license posture per §7.1 fallback note (no action absent a license-restriction signal from the City; if such a signal appears, execute the C-7-canonical swap).
16. **[broker · tracked]** Annual re-attestation per §7.3-d (calendar reminder: re-read this ruling in full on the anniversary of the broker sign-off date).

### §10.4 — File-naming closeout

17. **[build · next-up]** At broker sign-off, rename `workstream_a_fork_3_authoritative_determination_broker_ruling_DRAFT.md` to `workstream_a_fork_3_authoritative_determination_broker_ruling_<sign-off-date>.md`; share via `share_file` with the asset name `workstream_a_fork_3_authoritative_determination_broker_ruling_<sign-off-date>` (NOT the DRAFT name; the final ruling is a new shared asset, not a version of the DRAFT).
18. **[build · next-up]** Update the workspace's SHARED ASSETS index (in the next session-context update) to reflect the final filename and remove the DRAFT placeholder.

### §10.5 — Cross-workstream signals

19. **[build · tracked]** Notify workstream B if the §6.1 step-3 parcel-rail handoff produces any unexpected failure modes during v6 corpus runs (per §10.1 item 5). The parcel rail is workstream B's surface; this ruling's chain depends on it operating correctly. Failure signals belong in the workstream B ruling track for resolution.
20. **[broker · tracked]** If A-1 or A-2 amendments become necessary (e.g., a future canonical-source ruling change), update this ruling's cross-references in §1, §2.1, §6.1 to reflect the amendment; cross-reference drift is a defect-triggered re-attestation event under §7.3-c.

## §11 — Signature

`— Jack Taglyan / California Licensed Real Estate Broker / CalDRE B9445457 / Broker Compliance Review · 2026-06-27`
