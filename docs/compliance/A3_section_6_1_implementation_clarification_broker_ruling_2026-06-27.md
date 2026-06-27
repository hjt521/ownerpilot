# A-3 §6.1 Implementation Clarification — Broker Ruling

**Date:** 2026-06-27 (same-day clarification, post-A-3 sign-off)
**Author:** Jack Taglyan / California Licensed Real Estate Broker / CalDRE B9445457
**Governs:** Implementation of A-3 §6.1 (Runtime resolution chain) in the live v6 resolver during predicate-5 wire-up
**References:** `workstream_a_fork_3_authoritative_determination_broker_ruling_2026-06-27.md` (sha256 `b4510858a4c4c0fdc9f4e8458c4be480e93577d22b2acfa0e0a2996136d81ee2`), §6.1 in particular

---

## §1 — Status

This is a **clarification**, not an amendment. The signed A-3 ruling is locked at sha `b4510858…` and is not edited by this document. This clarification records the broker's reading of §6.1's step-order language and authorizes a specific implementation pattern against that reading.

If this clarification's reading is itself ever in tension with the signed §6.1 prose, the signed ruling controls. The clarification's job is to make the reading explicit so the v6 resolver wire-up does not silently diverge from the audit record.

## §2 — The question this clarification answers

A-3 §6.1 defines the runtime resolution chain as four ordered steps:

> 1. Geocode normalization
> 2. ZCTA classification against the snapshot
> 3. Parcel rail consultation (for straddlers and ZCTA non-matches)
> 4. Gate-closed-with-guidance

The live v6 resolver (`lib/jurisdiction/geocode/resolveLaAddressV2.ts`) operates County-primary / ZIMAS-fallback, with the ZIP set consulted at the `county_situs_gap` decision rather than as a step-2 first consultation. Its 48-case corpus is attested under that order.

The question: **does §6.1's step ordering require the v6 resolver to be re-architected so ZCTA classification fires first, or is the ordering a logical-chain description that the v6 resolver's call sequence already satisfies?**

## §3 — Ruling

**The §6.1 step-order is the logical chain of signals consulted, not a literal API-call sequence.** The compliance property §6.1 enforces is:

1. The authoritative ZIP-set snapshot is consulted before any gate-close verdict is issued.
2. ZCTA classification produces a verdict that is either (a) unambiguous-in or unambiguous-out and terminates the chain, or (b) straddler, which routes the address to the parcel rail.
3. The parcel rail is consulted for straddlers and for addresses whose ZIP is not present in the snapshot at all (§2.2-c `zip5_no_zcta5_route_parcel`).
4. Gate-closed-with-guidance is reached only when all preceding signals are exhausted without a definitive verdict.

A resolver that satisfies properties 1–4 is in conformance with §6.1, regardless of which physical API call is issued first. Specifically: a County-primary / ZIMAS-fallback / ZIP-set-at-`county_situs_gap` order is conforming if and only if:

- The snapshot is the binding signal for `in` / `out` / `straddler` classification at the verdict-construction stage (parcel data does not produce an `in_city` verdict for a ZIP the snapshot classifies as unambiguously out, and vice versa);
- Straddler-classified ZIPs (per the snapshot) trigger the parcel-rail consultation path whether or not the parcel rail was consulted earlier in the call sequence;
- ZIP-not-present-in-snapshot addresses do not gate-close on ZCTA absence — they route to parcel rail per §2.2-c.

## §4 — Why this reading

**On the substance.** §6.1's compliance value to a tenant defense is not "the resolver issued its calls in this specific order"; it is "the resolver consulted the strongest available signal before issuing a verdict, and did not gate-close silently." A County-primary / ZIMAS-fallback resolver is in fact *better* at the substantive compliance property than a strict ZCTA-first resolver would be: parcel-level data dominates ZIP-level data whenever both are available, so consulting parcel first means the resolver returns the most precise verdict available rather than a ZIP-level verdict that parcel data would have refined.

**On the audit record.** The v6 corpus passed 48/48 against the committed snapshot, including the snapshot-sensitive cases (90401 out, 91343 in, 90017 in, 90044 straddler-routed-to-parcel). The empirical evidence is that the v6 call order applied to the snapshot produces the right verdicts. A re-architecture to a literal §6.1 call order would invalidate that corpus and require a §7.3-b substantive re-attestation cycle, with no compliance gain to show for it.

**On future re-architecture.** If at any future point the resolver's call order itself becomes a compliance question — for example, because a tenant defense pivots on the timing of which signal was consulted when, or because a new ruling makes the call order load-bearing — the §7.3-b substantive re-attestation process is the right path. This clarification does not foreclose that; it records the current reading.

## §5 — Implementation authorization

Under this clarification, the v6 resolver wire-up (A-3 §10.1 item 4) is authorized to proceed under the following pattern:

**(a)** The authoritative snapshot loads at resolver startup, exposing `in`, `straddler`, and `out` bucket-membership lookup for any ZIP5.

**(b)** The existing v6 call sequence (County-primary / ZIMAS-fallback) is preserved. No re-ordering of physical API calls.

**(c)** The ZIP-set consultation at the `county_situs_gap` decision is replaced with the authoritative snapshot's three-bucket classification:
  - `in` → the resolver produces an in-city verdict (subject to any existing parcel-disagreement guards already present in v6).
  - `out` → the resolver produces an out-of-city verdict.
  - `straddler` → the resolver routes to the parcel-rail decision path per §6.1 step-3.

**(d)** ZIP-not-in-snapshot addresses (`zip5_no_zcta5_route_parcel`, §2.2-c) preserve the existing v6 fallback path. They do not gate-close on ZCTA absence.

**(e)** The `canonical_override_exceptions` list (initially `["90056"]`) is consulted as part of the bucket lookup, with override applied per §5.4-c.

**(f)** The v6 verdict taxonomy (`county_confirm`, `zimas_confirm`, `county_situs_gap`, etc.) is preserved as the attested branch-and-verdict shape; new verdict shapes are not introduced by this wire-up.

## §6 — Verification requirements

Before the PR implementing items (a)–(f) merges:

1. The v6 corpus SHALL be re-run against the wired resolver and SHALL pass 48 / 48 (no regression against the pre-wire baseline).
2. Snapshot ZIP-set consistency spot checks SHALL be recorded: 90401 → out, 91343 → in, 90017 → in, 90044 → straddler (routed to parcel rail), 90056 → straddler-via-override (routed to parcel rail per §5.4-c).
3. The pre-commit gate sequence per A-3 §8.5 SHALL pass clean.
4. The §8 predicate-5 attestation packet SHALL reference this clarification by file path and broker signature, in addition to referencing the A-3 ruling.

## §7 — Scope of this clarification

This clarification governs:
- The v6 resolver wire-up under A-3 §10.1 item 4 (predicate-5 path).

This clarification does NOT govern:
- Future resolver architectures. If a future resolver version (v7, v8, etc.) materially changes the call sequence or verdict taxonomy, a fresh broker reading of §6.1 is required against that version.
- Workstream B / predicate 6. The parcel-rail's own canonicality, refresh cadence, etc., are out of scope here per A-3 §9.1.
- Any change to the signed A-3 ruling itself. The ruling text at sha `b4510858…` is unchanged.

## §8 — File-naming and shared-asset discipline

This clarification is shared as a new asset, not as a version of the A-3 ruling, because:
- Editing the signed A-3 ruling would break the sha256 attested in the §8 evidence file (`b4510858…`).
- Implementation clarifications are a distinct artifact class from the underlying ruling; conflating them in version history obscures the audit record.

Asset name: `A3_section_6_1_implementation_clarification_broker_ruling_2026-06-27`

---

## Signature

`— Jack Taglyan / California Licensed Real Estate Broker / CalDRE B9445457 / Broker Compliance Review · 2026-06-27`
