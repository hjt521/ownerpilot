# Determination Request — County Parcel Lookup Method (Spatial vs. Address-String)

**Date:** 2026-06-28
**Prepared by:** Engineering (for broker/compliance ruling)
**Decision owner:** California Licensed Real Estate Broker (CalDRE B9445457)
**Status:** OPEN — awaiting ruling
**Severity:** Blocks LA production for a class of genuine City-of-LA addresses (false `manual_review`)

---

## 1. The question to rule on

A real City-of-Los-Angeles property is being routed to `manual_review` ("we weren't able to verify jurisdiction") instead of `confirmed_la`, even though both authoritative parcel sources confirm it is in the City of LA when queried correctly. The root cause is the **method** by which the County parcel signal is obtained, not the decision rule.

**Decision requested:** May we change the County parcel lookup from an **address-string match** to a **spatial point-in-polygon (by coordinates)** query, keeping the existing decision rule (`TaxRateCity == "los angeles"` ⇒ City of LA) unchanged? And do you want an accompanying manual broker-confirm path for genuinely inconclusive addresses?

The decision rule is already ratified (`la_geocode_parcel_lookup_open_questions_broker_ruling_response_2026-06-20`, Decision A: TaxRateCity authoritative; SitusCity prohibited). The **query method** (structured address-field match) was separately ratified (v3 ruling §2.4). Because the method was a ratified choice, changing it requires this ruling.

---

## 2. Trigger

Discovered in the live broker test immediately after predicate-6 go-live (LA production gate fully open, all six predicates true; server-side resolver confirmed working).

- **Address tested (broker-owned, real):** 5537 La Mirada Ave, Unit 202, Los Angeles, CA 90038 (Hollywood; unambiguously within the City of Los Angeles).
- **Observed result:** `disposition: manual_review`, `reviewReason: parcel_lookup_inconclusive`.
- **Consistency:** Re-run live against production 3× in a row — all three returned `manual_review / parcel_lookup_inconclusive`. Not a transient blip.

---

## 3. Evidence

### 3.1 Production audit-log row (geocode_audit_log, decided_at 2026-06-28 17:38:21Z)

| Field | Value |
|---|---|
| input_address | 5537 La Mirada Ave, Unit 202, Los Angeles, CA 90038 |
| formatted_address | 5537 La Mirada Avenue Unit 202, Los Angeles, CA 90038-2376, USA |
| latitude / longitude | 34.0939268 / -118.3105939 |
| county_zip_in_la_zip_set | **true** (90038 is in the authoritative City-of-LA ZIP set) |
| county_query_returned_zero_features | **true** (County address-string query matched no parcel) |
| county verdict | county_inconclusive (apn null, parcelFound false) |
| zimas verdict | zimas_inconclusive, **failureMode: timeout** |
| disposition / review_reason / branch | manual_review / parcel_lookup_inconclusive / zimas_miss |

Both legs failed: County matched zero parcels; ZIMAS timed out. By design the resolver fails **safe** (never auto-confirms LA without a positive parcel match), so it routed to manual review. The fail-safe behaved correctly; the inputs to it were wrong.

### 3.2 Direct verification against the same coordinates (reproducible)

Querying both sources **spatially** (point-in-polygon) at the property's coordinates `-118.31059, 34.09393`:

**LA County parcel layer** (`public.gis.lacounty.gov/.../LACounty_Parcel/MapServer/0/query`, `geometryType=esriGeometryPoint`, `inSR=4326`, `spatialRel=esriSpatialRelIntersects`, `outFields=TaxRateCity,AIN`):

```json
{"features":[{"attributes":{"TaxRateCity":"LOS ANGELES","AIN":"5536003018"}}]}
```
→ `county_confirms_la`.

**ZIMAS landbase layer** (`zimas.lacity.org/arcgis/rest/services/zm4/landbase/MapServer/105/query`, same point, `outFields=TRACT,CNCL_DIST`):

```json
{"features":[{"attributes":{"TRACT":"LA PALOMA TRACT","CNCL_DIST":"13"}}]}
```
→ CNCL_DIST 13 (valid 1–15) AND TRACT non-empty → two-signal rule passes → `zimas_confirms_la`.

**Both authoritative sources confirm City of LA when queried by coordinates.** ZIMAS also responded quickly on this manual check, confirming its production timeouts are intermittent, not a dead endpoint.

### 3.3 Why production missed

Production queries County by **reconstructed address string**:

```
SitusHouseNo = '5537' AND SitusStreet LIKE 'LA MIRADA%' AND SitusZIP LIKE '90038%'
```

This returned **zero features** — the County's stored situs fields don't match that reconstruction for this parcel (a known brittleness of address-string matching; the code comments already acknowledge County misses are an expected fail-soft path that leans on ZIMAS). The spatial query at the identical coordinates returns the parcel cleanly. ZIMAS, the intended fallback, then timed out — so a genuine LA parcel fell through both legs.

---

## 4. Root cause (plain language)

The address-string County query is fragile: a real parcel can "disappear" because the County stores the street/house/ZIP differently from Google's formatted address. The resolver was designed to lean on ZIMAS when County misses, but ZIMAS (LA City's server) is intermittently slow and times out. When both happen at once — as for this property — a valid City-of-LA address is wrongly sent to manual review.

---

## 5. Proposed remedy (for ruling)

**Change the County parcel signal from address-string match to spatial point-in-polygon**, using the latitude/longitude the resolver already obtains from geocoding (the same input ZIMAS uses).

- **Decision rule unchanged:** still reads `TaxRateCity` only; `los angeles` ⇒ confirms LA; any other non-null value ⇒ denies LA; SitusCity remains prohibited (forensic capture only).
- **Carry-overs unchanged:** multi-parcel agreement / ambiguity handling, fail-closed-on-error (never confirm on a failure), ZIP gating.
- **Effect:** County becomes a reliable **primary** confirm path; ZIMAS remains the **secondary** signal. Clear cases (like this property) confirm without depending on the flaky ZIMAS endpoint.

This is a method change to a ratified component, hence this request.

---

## 6. Decisions requested

Please rule on each:

1. **County method change** — Adopt spatial point-in-polygon for the County parcel lookup (rule unchanged)? **Yes / No / Conditions.**
2. **Manual broker-confirm path** — Add a path so an address that is *still* inconclusive after the change is routed to a broker confirm/override (and a tracked review queue), rather than dead-ending the owner at "try again"? **Yes / No / Defer.**
3. **ZIMAS hardening** — Independently raise the ZIMAS per-attempt timeout and/or retries as backup defense? **Yes / No / Conditions.**
4. **Fallback order & conditions** — Confirm desired precedence (proposed: County spatial primary → ZIMAS secondary → manual review), and any conditions (e.g., require the two sources not to disagree; latency ceilings; whether a single confirming source is sufficient as today).

---

## 7. Open engineering-validation items (regardless of ruling)

- **County spatial latency:** one manual spatial County request stalled (~180s) before a retry returned instantly. Before shipping, engineering will measure County spatial-query latency/reliability across a sample of real LA addresses to confirm it meets the production latency ceiling, and set timeouts accordingly.
- **Regression corpus:** re-run the existing v6 ZIP/parcel corpus under the spatial-County method to confirm no previously-correct dispositions change.
- **Parcel-health probe mirror:** the County/ZIMAS adapters are mirrored into the parcel-health Edge Function core; any method change must regenerate that mirror in the same change (CI: verify-parcel-health-core-sync).

---

## 8. §0 scope note

Engineering will build the method change, tests, latency validation, and migration, and will **flag** all sub-forks. Engineering will **not** author the determination or alter the decision rule. The ruling on Sections 6.1–6.4 is the broker's to author.
