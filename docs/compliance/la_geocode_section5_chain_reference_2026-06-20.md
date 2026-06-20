# §5 geocode classifier chain — unified reference (build-side pointer)

**File:** `la_geocode_section5_chain_reference_2026-06-20.md`
**Date:** 2026-06-20
**Authored by:** Build side (engineering). **Pointer document — NOT a determination.** This maps the governing rulings to the modules that implement them and restates the binding classifier order as ruled, so future PRs cite one reference instead of five. It authors NO compliance, legal, or jurisdiction-standard content; every normative statement points to the ruling that authored it.
**Status:** The §5 chain is ratified at HEAD `07cd5f3` (`la_geocode_resolver_v6_production_attestation_broker_ratification_2026-06-20`). `geocodeConfirmationBuilt = true`; LA production remains gated on the other dependencies.
**Posture:** Broker-scope only. No attorney engagement.

---

## 1. The governing rulings (the source of every rule below)

| Ruling | Authored | What it governs |
|---|---|---|
| `la_geocode_parcel_lookup_open_questions_broker_ruling_response_2026-06-20.md` | parent | §5 binding classifier order; #4/#5/#9/#16 non-negotiables; SitusCity prohibited as jurisdiction signal; County `TaxRateCity` authoritative. |
| `la_geocode_zimas_adapter_diagnostic_v6_broker_ratification_2026-06-20.md` | ZIMAS v6 | ZIMAS two-signal rule (CNCL_DIST 1–15 ∩ TRACT non-blank); OUTLA forensic; no cross-signals. |
| `la_geocode_b1_rerun_correction_flag_broker_ruling_response_2026-06-20.md` | Q1 | Correction-flag gate field set: `hasReplacedComponents \|\| possibleNextAction=='FIX'`; `hasInferredComponents` excluded. |
| `la_geocode_b1_q2_correction_gate_reorder_broker_ruling_response_2026-06-20.md` | Q2 | Correction gate moved post-parcel; ASYMMETRIC (suppress confirm, passthrough deny). |
| `la_geocode_v3_county_branch_broker_ruling_response_2026-06-20.md` | v3 County | County stem/structured-field matching; `county_situs_gap` (ZIP-gated); `county_ambiguous`; amended §6 #4 (county_situs_gap acceptable). |

The amended §6 acceptance criteria = parent + Q1 + Q2 + v3 County. The v6 ratification is the sign-off that the chain meets them.

---

## 2. Module → role map (HEAD 07cd5f3)

| Module (`lib/jurisdiction/geocode/`) | Role | Governing ruling |
|---|---|---|
| `resolveLaAddressV2.ts` | §5 orchestrator: pure pre-parcel classifier + async parcel branches + asymmetric correction gate; full audit record. | parent + Q1 + Q2 + v3 |
| `geocodeSignalsAdapter.ts` | Google AV + reverse-geocode → V2 signal shape; §4.2 correction-flag extraction. | parent §4; Q1 |
| `countyParcelAdapter.ts` | County `TaxRateCity` via structured-field query (SitusHouseNo + SitusStreet core + SitusZIP), directional/unit/suffix-agnostic; `county_ambiguous`. | parent §4; v3 §2 |
| `zimasParcelAdapter.ts` | ZIMAS spatial point-in-polygon two-signal rule; fail-closed. | ZIMAS v6 |
| `cityOfLaZips.ts` | City-of-LA ZIP set as a fall-through gate ONLY (not a jurisdiction signal) for the situs-gap branch. | v3 §3.3 |
| `geocodeTypes.ts` | Dispositions, manual-review reasons, granularity types. | all |

Gate module: `lib/jurisdiction/laRtcRules.ts` — `isLaProductionUnblocked()` (the production gate; see §5 below).

---

## 3. The binding classifier order (as ruled)

Pure pre-parcel steps (no network), then async parcel branches:

```
1. Granularity gate (+1a PROXIMITY-locality-deny → not_la)        [parent §5, §4.3]
2. Locality presence → manual_review (no_locality)                [parent §5]
3. Locality "Los Angeles" + admin "California" → proceed; else not_la  [parent §5]
4. County TaxRateCity (structured-field query):                   [parent §4; v3 §2,§3]
     confirms_la → confirmed_la (subject to step 6)
     denies_la   → not_la (final)
     ambiguous   → manual_review (county_ambiguous)
     0 features:  ZIP in City-of-LA set → fall to ZIMAS
                  ZIP not in set        → manual_review (county_situs_gap)  [closes #4]
5. ZIMAS two-signal → confirmed_la (subject to step 6) / fall-through  [ZIMAS v6]
6. Correction gate (ASYMMETRIC):                                  [Q1 field set; Q2 reorder]
     confirmed_la + isCorrected → manual_review (input_corrected) [suppress]
     not_la                     → passthrough (deny NEVER suppressed)
     both fell through + isCorrected → input_corrected
     both fell through + clean       → parcel_lookup_inconclusive
```

`isCorrected = hasReplacedComponents || possibleNextAction === 'FIX'` (Q1).

---

## 4. Audit schema + manual-review reasons

**Audit record** (`GeocodeAuditRecord`, §A.6): deciding branch; County sub-record (taxRateCityRaw, situsCityRaw [forensic], ain/apn, parcelFound); ZIMAS sub-record (pind/pin/tract/cncl_dist, two_signal_passed/fail_reason, council_district); correction flags; `countyQueryReturnedZeroFeatures` + `countyZipInLaZipSet` (v3 §3.5).

**Manual-review reasons** (`geocodeTypes.ts`): `coarse_granularity`, `no_locality`, `input_corrected`, `parcel_lookup_inconclusive`, `county_situs_gap`, `county_ambiguous`.

**Branches** (`ClassifierBranch`): granularity_proximity_deny, coarse_granularity, no_locality, locality_not_la, county_confirm, county_deny, county_situs_gap, county_ambiguous, zimas_confirm, zimas_miss, correction_suppressed, correction_inconclusive, api_error.

---

## 5. Production gate (where this chain meets LA go-live)

`isLaProductionUnblocked()` (`laRtcRules.ts`) requires ALL of:
- Build-correctness flags: `geocodeConfirmationBuilt` (**true** — ratified), `cityBusinessDayCalendarBuilt`, `rtcFormRefreshJobBuilt`.
- Production-traffic conditions (v6 ratification §2.6): `geocodeAuditDurabilityWired`, `cityOfLaZipsAuthoritative`, `parcelEndpointHealthCheckLive`.

Flipping `geocodeConfirmationBuilt` is a code-correctness sign-off, NOT a production-traffic authorization. Real LA traffic stays blocked until the remaining five conditions land (v6 ratification §2.6, §3).

---

## 6. Open follow-ups (per v6 ratification §3)

Pre-production-traffic blockers: Supabase audit-log + manual-review-queue durability; authoritative City-of-LA ZIP set (USPS LACA / LA City GIS); County+ZIMAS endpoint health-check cron. Post-flip hygiene: legacy `resolveLaAddress.ts` (v1) deletion; this pointer doc's upkeep. Open ruling-followups: ZIP-set refresh cadence; audit-log retention spec; endpoint outage notification policy.

---

Authored by build (Claude) as a navigation pointer. No determinations. Every rule above is sourced to a broker ruling named in §1.
