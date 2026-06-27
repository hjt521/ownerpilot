# Workstream A — Fork A-1 (Canonical Source) Broker Ruling (2026-06-27)

**Author:** Jack Taglyan (broker).
**Date:** 2026-06-27.
**CalDRE / role:** B9445457 — California Licensed Real Estate Broker; sole compliance authority on OwnerPilot AI under Bus. & Prof. Code § 10131(b).
**Scope:** Resolves Fork A-1 of Workstream A (`cityOfLaZipsAuthoritative`, predicate 5 of `LA_PRODUCTION_DEPENDENCIES`).
**Governs:** all downstream A-1 build work — sourcing rail, loader/normalizer, reconciliation surface, classifier rewiring, attestation packet.
**Honors:** kickoff scoping in `la_final_predicates_kickoff_prompt.md` (§"Workstream A"); §0 broker-scope-only posture (`broker_scope_internal_note_2026-06-09.md`); jurisdiction-rules attribution ruling (`la_jurisdiction_attorney_framing_broker_ruling_response_2026-06-23.md`).

---

## §0 Posture

Broker compliance determination authored under broker-scope authority (Bus. & Prof. Code § 10131(b)). No attorney engagement on this project. This ruling determines the canonical data source for `cityOfLaZipsAuthoritative`; it does not author the §2.6 "authoritative" determination prose itself (that is Fork A-3, separate).

---

## §1 — Ruling

**LA City GIS is the sole canonical source for the authoritative City-of-LA ZIP set.**

**USPS LACA (Locality Alias) is rejected as a source for this predicate.**

**Border-case resolution is parcel-level via the Workstream B parcel-health rails (ZIMAS / County parcel lookup), not ZIP-level via a secondary dataset.**

---

## §2 — Reasoning

### §2.1 — The question the predicate actually asks

`cityOfLaZipsAuthoritative` gates the geocoder's RTC-overlay classification: does the address at hand fall under City of LA Ordinance 188,681 (Right-to-Counsel)? That is a **municipal-jurisdiction** question. The ordinance was enacted by the Los Angeles City Council and binds only properties inside the City of LA's municipal boundary. The Council had no authority to enact RTC over Santa Monica, West Hollywood, Culver City, Beverly Hills, or unincorporated LA County, so RTC does not apply to those properties regardless of how their mail is addressed.

The authoritative ZIP set must answer "is this ZIP inside the City of LA municipal boundary," not "does USPS deliver mail there under the city name 'Los Angeles, CA.'"

### §2.2 — Why USPS LACA answers the wrong question

USPS LACA describes postal-delivery geography, not municipal jurisdiction. The two diverge systematically:

- USPS assigns ZIPs to postal-city names based on which post office serves them, not on municipal boundaries.
- USPS LACA includes ZIPs serving unincorporated LA County areas under the "Los Angeles, CA" postal city.
- USPS LACA includes addresses in incorporated municipalities other than the City of LA (e.g., portions of 90210 Beverly Hills, portions of 90232/90230 Culver City, portions of 90401-series Santa Monica, depending on USPS preferred-city assignments) under "Los Angeles, CA" where post-office service crosses municipal lines.

Using USPS LACA as the canonical source would assert RTC jurisdiction over addresses where the City of LA has no ordinance-making authority. Operationally, OwnerPilot would generate a notice asserting RTC applies; when the underlying case surfaces, the tenant's RTC defense fails because the property is not in the City; the product has stated a legal fact that is not true.

False-positives on a jurisdictional claim are categorically worse for a broker-scope product than false-negatives on coverage. Bus. & Prof. Code § 10131(b) reliance on the data requires that the data answer the legally-operative question, not an adjacent one.

### §2.3 — Why LA City GIS is the right source

LA City GIS publishes the City of LA municipal boundary and ZIP-level layers derived from it. It answers the municipal-jurisdiction question by construction. It is the dataset City departments themselves use for jurisdictional determinations (City Planning, Bureau of Engineering, LA Housing Department, City Attorney). Aligning OwnerPilot's authoritative ZIP set with the City's own jurisdictional view is the defensible posture under broker scope.

### §2.4 — Why a USPS "fallback" or "belt-and-suspenders" posture was considered and rejected

A "LA City GIS primary, USPS fallback" rule would resolve every dataset disagreement in favor of asserting RTC, because USPS is a strictly wider set. The disagreement cases are exactly the cases where LA City GIS is correct and USPS is incorrect for this question (Beverly Hills 90210, Mar Vista / Santa Monica borders, Culver City borders, unincorporated LA County). A fallback to USPS would be a false-positive amplifier, not a safety net.

A "LA City GIS canonical, USPS as reconciliation companion" posture (committed for diffing only, every disagreement surfaced for broker review) was considered. It is rejected for first build on these grounds:

1. It carries an ongoing reconciliation-review burden on every authoritative-set refresh, for a dataset (USPS) whose disagreements are predictable and uniformly resolve toward "LA City GIS is right."
2. The audit-trail value of "we considered USPS and chose not to use it" is captured in this ruling and in the §2.6 determination prose (Fork A-3), without USPS needing to be wired into the build.
3. If observed evidence later surfaces a case where LA City GIS is wrong and a USPS cross-check would have caught it, this ruling may be revisited with measured evidence. Per the cadence-ruling discipline (parcel-health cron-slice ruling §"Every 15 min — rejected"), the standing posture is to optimize for the observed problem, not the imagined one.

### §2.5 — Why border-case resolution belongs at the parcel layer, not the ZIP layer

No ZIP-level dataset resolves ZIPs that straddle the municipal boundary, because the boundary cuts through ZIPs at the address level. The legally-operative question — "does this specific property sit inside the City of LA?" — is a parcel-level question that ZIPs can only approximate.

Workstream B's parcel-health rails (ZIMAS for City Planning landbase, County parcel MapServer for County records) are the architecture that answers the parcel-level question directly. ZIMAS in particular returns the parcel's municipal jurisdiction by design.

This means A-1's job is not to be the complete answer to "is this address in the City of LA." A-1's job is to be the **fast-path ZIP filter**:

- ZIP is unambiguously inside the City of LA → RTC overlay applies, no parcel lookup needed for jurisdiction.
- ZIP is unambiguously outside the City of LA → RTC overlay does not apply, no parcel lookup needed for jurisdiction.
- ZIP is a known straddler → parcel-level resolution (Workstream B rails) is the authoritative answer; ZIP-level cannot decide.

LA City GIS gives the ZIP-level filter; parcel rails give the address-level resolution. Single-source-with-fallback is the wrong frame; two-tier-by-question-type is the right one.

### §2.6 — Runtime fallback (named here, ruled later)

A separate operational case exists where neither the ZIP-level fast path nor the parcel-level resolver gives a clean answer (e.g., ZIP is a known straddler AND ZIMAS is unavailable at the moment of produceability). That case calls for a gate-closed-with-guidance posture: surface the ordinance text and an explicit message that City of LA jurisdiction cannot be confirmed without parcel-level lookup, which is currently unavailable; retry or consult counsel.

That fallback is a **runtime produceability determination**, not a Fork A-1 dataset question. It is named here to keep it on the record; it will be authored separately at the produceability-layer determination stage and is not a blocker for A-1 build.

---

## §3 — Sub-fork A-1a (which LA City GIS layer)

Fork A-1a (specific GIS layer) does not reach broker-authority scope and is delegated to build:

- Build sources LA City GIS, identifies the available authoritative-ZIP layer(s), and surfaces the choice with a recommendation.
- If LA City Planning publishes an RTC-overlay-specific dataset, that layer is preferred (it answers the exact question by construction).
- If not, the next preference is a pre-published "ZIPs in City of LA" dataset from LA City GIS open-data.
- If neither exists, the construction is "LA City Boundary polygon intersected with ZIP polygons" using the assignment rule build proposes (centroid, majority-area, or any-intersection); build surfaces the assignment-rule choice for broker ruling at that point because the rule materially affects which border ZIPs are included.

Build is authorized to do the sourcing reconnaissance now. The layer-and-assignment-rule choice surfaces back for broker ruling before any loader is built; it is not silent.

---

## §4 — What this ruling does NOT decide

- **Fork A-2 (reconciliation rule for ZIP add/remove diffs against the existing provisional `cityOfLaZips.ts`):** separate, next.
- **Fork A-3 (§2.6 "authoritative" determination prose — source provenance, currency, refresh cadence, discrepancy policy):** separate, the most load-bearing broker authoring work in Workstream A.
- **Fork A-4 (data licensing / sourcing provenance):** may ride inline in A-3 or as a discrete ruling; either acceptable.
- **The runtime gate-closed-with-guidance fallback (§2.6 above):** named, not authored; produceability-layer determination, deferred.
- **Workstream A vs. Workstream B sequencing (which flips first / which is the gate-opener):** separate broker call; not constrained by this ruling.

---

## §5 — Action items

- **[BROKER ACTION — DONE]** Author this ruling.
- **[BUILD ACTION — IMMEDIATE]** Acknowledge receipt; commit this file to the workspace; reference it inbound on any A-1 sourcing/build artifact.
- **[BUILD ACTION — AUTHORIZED]** Sourcing reconnaissance of LA City GIS: identify available authoritative-ZIP layers, document candidates, surface the layer-and-assignment-rule choice (§3 above) for broker ruling. **Do not begin loader build until that surface returns and is ruled.**
- **[BROKER ACTION — NEXT]** Fork A-2 ruling (reconciliation rule).
- **[BROKER ACTION — AFTER A-2]** Fork A-3 ruling (§2.6 determination prose).
- **[CONSIDER]** Fork A-4 (licensing) — author inline in A-3 unless A-4-specific complexity surfaces during reconnaissance.

---

— Jack Taglyan / California Licensed Real Estate Broker / CalDRE B9445457 / Broker Compliance Review · 2026-06-27
