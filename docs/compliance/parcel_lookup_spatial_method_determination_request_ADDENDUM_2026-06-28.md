# Determination Request — ADDENDUM: Two Disposition Forks Surfaced While Building the Spatial Method

**Date:** 2026-06-28
**Prepared by:** Engineering (for broker/compliance ruling)
**Decision owner:** California Licensed Real Estate Broker (CalDRE B9445457)
**Status:** OPEN — awaiting ruling. Blocks finalizing the County classify logic.
**Relates to:** `county_parcel_lookup_method_broker_ruling_2026-06-28.md` (Decisions 1 & 4)

---

## 1. Why this addendum exists

The 2026-06-28 ruling authorized switching the County parcel lookup to spatial point-in-polygon (Decision 1) and confirmed the fallback order (Decision 4). While building it, engineering found **two points where the ruling's stated behavior (§4 step 2) differs from the behavior currently shipped in code** — and the difference can change a `not_la` result into `manual_review` (or vice-versa) for real address classes. Per §0, engineering will not choose disposition logic; these need an explicit ruling.

The ruling (§1.2) describes its multi-feature/zero-feature handling as "the existing rule." On inspection of the shipped code, it is **not** the existing rule — it is a behavior change. We flag that plainly so the choice is deliberate, not an accident of wording.

---

## 2. Evidence gathered (reproducible, spatial point-in-polygon at the coordinate)

| Case | Coordinate | County spatial result | Resulting verdict |
|---|---|---|---|
| 5537 La Mirada Ave (the trigger) | 34.0939, -118.3106 | `TaxRateCity: "LOS ANGELES"`, AIN 5536003018 | county_confirms_la ✓ |
| Santa Monica (regression #4 class) | 34.0118, -118.4912 | `TaxRateCity: "SANTA MONICA"`, AIN 4290012902 | county_denies_la → **not_la** ✓ |
| Unincorporated gap (West Athens area) | 33.9230, -118.3010 | **zero features** (`features: []`) | depends on the fork below |

The Santa Monica result is the important reassurance: under the spatial method a non-LA incorporated city denies **directly** via `TaxRateCity`, with no dependence on the old situs-gap workaround. The zero-features result is the problem case the two forks below govern.

---

## 3. Current shipped behavior vs. ruling §4 text

| Situation | Shipped code today | Ruling §4 step 2 text |
|---|---|---|
| County returns >1 parcel, TaxRateCity values disagree | `county_ambiguous` → **manual_review** (never ZIMAS) | "multi-feature disagreement → **fall through to ZIMAS**" |
| County returns 0 features AND ZIP not in City-of-LA set | `county_situs_gap` → **manual_review** (deliberately not ZIMAS, to stop border artifacts) | "zero features → **fall through to ZIMAS**" |
| County returns 0 features AND ZIP in City-of-LA set | falls through to ZIMAS | falls through to ZIMAS (agree) |

---

## 4. Fork 1 — Multi-feature disagreement

**Situation:** the spatial query returns more than one parcel at the point and their `TaxRateCity` values disagree (overlapping records, condo master/unit splits, easement parcels).

- **Option A — Fall through to ZIMAS** (ruling §4 literal). Disagreement → inconclusive → ZIMAS decides. *Changes prior behavior.* A County conflict could then be resolved to `confirmed_la` by ZIMAS.
- **Option B — Manual review** (current `county_ambiguous`). A County-internal conflict is never silently overridden by ZIMAS; a human looks at it.

**Engineering note (not a determination):** Option B is the more conservative posture for a tenant-defense-conscious platform — a County record conflict is exactly the kind of ambiguity a human should adjudicate, and it is rare. Option A is what the ruling text literally says. Please rule.

---

## 5. Fork 2 — Zero features at the coordinate

**Situation:** the point falls in no County parcel polygon at all (private streets, unincorporated gaps, brand-new subdivisions, water-adjacent geometry). Confirmed reproducible (West Athens point above).

- **Option A — Fall through to ZIMAS** (ruling §4 literal). Risk: an unincorporated / non-LA point that ZIMAS also cannot confirm (CNCL_DIST "OUTLA") becomes **manual_review**, not **not_la**. This could regress the corpus #5 (West Athens unincorporated) `not_la` requirement.
- **Option B — Keep the situs-gap guard.** Zero features AND ZIP **not** in the City-of-LA set → `manual_review` (county_situs_gap), do not consult ZIMAS. Zero features WITH ZIP in the LA set → ZIMAS. This is the current border-artifact protection (closed the #4 failure mode historically).

**Engineering note (not a determination):** these two are in direct tension with the §1.2 regression gate, which requires #5 (West Athens unincorporated) to remain `not_la`. Neither option below obviously yields `not_la` for a zero-feature unincorporated point — Option A yields manual_review, Option B yields manual_review (situs_gap). If the firm requirement is that unincorporated stays `not_la`, we may need a **third rule**: *zero features AND ZIP not in City-of-LA set → `not_la`* (treat "no City-of-LA parcel + ZIP outside the City set" as a deny rather than a gap). That is a new disposition and explicitly needs your ruling — engineering will not introduce a new `not_la` path without it.

**Decision requested on Fork 2:** Option A, Option B, or the third rule (zero features + ZIP-not-in-LA → not_la)?

---

## 6. What engineering will do regardless of the ruling

- Build the spatial County adapter, audit-capture extension, and ZIMAS hardening (Decisions 1 & 3) — these do not depend on the forks.
- Run the full v6 ZIP/parcel corpus as the merge gate (ruling §1.2). The actual corpus #5 coordinate (not the approximate West Athens point used above) will be the binding regression check; if the chosen fork option regresses #5, that is a blocker and we will return to you.
- Implement whichever option you rule, isolated so it is a one-line switch if you revise.

---

## 7. Decisions requested

1. **Fork 1 (multi-feature disagreement):** Option A (→ ZIMAS) or Option B (→ manual_review)?
2. **Fork 2 (zero features):** Option A (→ ZIMAS), Option B (situs-gap guard), or the third rule (zero features + ZIP-not-in-LA → not_la)?
3. Confirm: does the §1.2 requirement that #5 (West Athens unincorporated) stay `not_la` still bind given the spatial method's zero-feature behavior, and if so, is the third rule in Fork 2 authorized as the mechanism?

— Engineering, 2026-06-28
