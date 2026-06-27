# Workstream A — Fork A-1a Sourcing Reconnaissance (2026-06-27)

**Status:** Build-authored reconnaissance. **NOT a ruling.** No compliance prose, no loader built.
**Author:** Build (Claude), under §0 discipline (build identifies + recommends; broker rules canonicality).
**Purpose:** Return the A-1a sourcing reconnaissance that Fork A-1 §3 authorized — identify the candidate LA City GIS layer(s), document them with metadata, and **surface the layer-and-assignment-rule choice for broker ruling**. Per A-1 §3 / §5: *do not begin loader build until this surface returns and is ruled.*
**Honors:** A-1 (`workstream_a_fork_1_canonical_source_broker_ruling_2026-06-27.md`), A-2 (`..._fork_2_...md`), A-3 scaffold (`..._fork_3_authoring_scaffold_2026-06-27.md`).

---

## §1 — Headline (the load-bearing finding)

LA City GeoHub **does** publish a pre-published "ZIPs in City of LA" dataset — the layer A-1 §3 said to prefer if it exists. **But it is built with an any-intersection assignment rule over 2010 Census ZCTAs, and it grossly over-includes neighboring jurisdictions.** Its 160 distinct ZCTAs include **Beverly Hills (90210/11/12), Santa Monica (90402–90405), Long Beach (90802/90810/90813), Glendale (91201–91206/91214), Burbank (91501–91506), Culver City (90230/90232), Inglewood (90301–90305), Torrance, Carson, El Segundo, Lynwood, Malibu, Pasadena, South Pasadena, Alhambra, La Cañada** — precisely the cities A-1 §2.2 names as outside the LA Council's RTC authority.

Consequence: **the pre-published layer cannot be adopted as-is as the authoritative RTC ZIP set.** Doing so would assert RTC jurisdiction over ~48 ZIPs in other municipalities — the false-positive jurisdictional-claim category A-1 ruled categorically worst. The **assignment-rule choice A-1 §3 anticipated is therefore not optional**: a stricter rule (centroid or majority-area), applied to the City Boundary polygon × ZIP polygons, is required. This pushes A-1a onto A-1 §3's third path ("construct via boundary ∩ ZIP with an assignment rule build proposes"), because the pre-published intersect layer that exists uses the wrong rule.

---

## §2 — Candidate layers (metadata)

All on LA City's hosted ArcGIS Online org (`services5.arcgis.com/7nsPwEMP38bSkCjy`).

| # | Title | Owner | Modified | Records | ZIP field | Assignment rule | Endpoint |
|---|---|---|---|---|---|---|---|
| 1 | **City of Los Angeles Zip Codes** | `eva.pereira_lahub` (official GeoHub) | **2024-05-03** | 160 features / 160 distinct ZCTAs | `ZCTA5CE10` | any-intersection | `.../City_of_Los_Angeles_Zip_Codes/FeatureServer/0` |
| 2 | Los Angeles City Zip Codes | `DataLA` (legacy) | 2022-12-14 | (not pulled) | likely `ZCTA5CE10` | any-intersection ("Intersect of City Boundary and Zip Codes") | `.../Intersect of City Boundary and Zip Codes (LA County)/FeatureServer` |
| 3 | **City Boundary** | `lahub` | (not pulled) | 1 polygon | n/a | n/a — the municipal boundary itself | GeoHub `lahub::city-boundary` |

- **#1 is the newer, official-publisher version** (LAHub, 2024-05); **#2 is the older but heavily-used legacy** (DataLA, 2022-12, 150k views). Both are any-intersection ZCTA intersects produced by ArcGIS's "Overlay layers" geoprocessing solution.
- **#3 (City Boundary)** is the canonical municipal-boundary polygon. It is the input needed to (a) re-construct a stricter ZIP set under a centroid/majority-area rule, and (b) back the reverse-geocode point-in-polygon fallback the A-3 scaffold §6.1.6 names. Build recommends it as the *true* canonical primitive — the ZIP layers are derived from it.

**Metadata-completeness caveats on #1 (relevant to A-3 §7 licensing):** the item's `description`, `licenseInfo`, and `accessInformation` fields are blank; `access: public`. GeoHub data is generally open under the City's open-data policy, but the explicit license text is not on the item — build flags "confirm license terms before commit" per A-3 §7.1.

---

## §3 — The critical finding: any-intersection over-inclusion

The ZIP field is **`ZCTA5CE10`** = U.S. Census **2010 ZIP Code Tabulation Areas**. The layer is `City Boundary ∩ ZCTA polygons` with **every ZCTA that touches the boundary included** (any-intersection). Concrete evidence of the rule's effect:

- The first feature returned is **ZCTA `91011` (La Cañada Flintridge — a separate incorporated city) with `Shape__Area: 0`** — a zero-area sliver intersection. Any-intersection keeps a ZCTA even where the City boundary merely grazes it.
- The distinct list contains entire neighboring cities' ZCTAs (Beverly Hills, Santa Monica, Long Beach, Glendale, Burbank, etc.), none of which are City of LA.

This is the exact failure mode A-1 §2.2 / §2.4 describe: a wider set that resolves every boundary disagreement toward *asserting* RTC. It is not usable as the RTC fast-path filter without a stricter rule.

---

## §4 — Provenance caveat: ZCTA-2010 ≠ USPS ZIP, and it's 15 years stale

Two provenance issues build surfaces for A-3 §2 (source) and §3 (currency):

1. **ZCTA vs USPS ZIP mismatch.** The layer keys on Census **ZCTA5**, an areal approximation of USPS ZIPs — they mostly align but diverge (some USPS ZIPs have no ZCTA; ZCTA boundaries are tabulation areas, not postal-delivery routes). The geocoder, however, emits **USPS ZIP5** (from Google). A loader matching geocode-ZIP5 against layer-ZCTA5 will mostly work but has a known imperfect-join risk at the margins — a matching-discipline item for A-3 §2.2 / §5.
2. **2010 vintage.** The `...CE10` suffix marks 2010 Census ZCTAs. The *boundary* used for the intersect was current as of the 2024-05 layer modification, but the *ZCTA polygons* are 2010. The Census released 2020 ZCTAs; this layer has not adopted them. Relevant to A-3 §3 currency (the snapshot is "2024-05 boundary × 2010 ZCTA").

Neither is disqualifying — but both belong in the A-3 §2/§3 determination, and both argue (again) for owning the construction (boundary × a chosen ZIP/ZCTA source under a chosen rule) rather than adopting the pre-published derived layer blind.

---

## §5 — The assignment-rule fork (the decision A-1 §3 surfaces back)

Options, with build's read (broker rules):

- **(a) Any-intersection (the pre-published layer as-is)** — **build recommends AGAINST.** Over-includes ~48 other-jurisdiction ZCTAs; turns the ZIP fast-path into a false-positive generator that leans entirely on parcel-rail correction at runtime. Contradicts A-1 §2.2.
- **(b) Centroid-in-City** — include a ZIP iff its centroid falls inside the City Boundary. Cleanly excludes sliver-grazes (Beverly Hills, La Cañada). Simple, defensible, reproducible. Risk: a ZIP genuinely split ~50/50 by the boundary resolves by which side its centroid lands — but those are exactly A-1 §2.5's *straddlers*, which should defer to parcel rails anyway.
- **(c) Majority-area-in-City** — include iff >50% of the ZIP's area is inside the City. Similar effect to centroid; slightly more robust for oddly-shaped ZIPs. Needs each ZIP's total area (from the County ZCTA/ZIP layer) plus the intersected area.
- **(d) Three-bucket by area-ratio (A-1 §2.5-aligned)** — classify each ZIP: **mostly-inside (≥ high threshold) → unambiguous-in**, **mostly-outside (≤ low threshold) → out**, **in-between → straddler → parcel resolution**. This implements A-1 §2.5's three-tier model directly and is build's recommendation as the *most faithful to A-1*, at the cost of (i) a broker-ruled threshold pair and (ii) a straddler list that the runtime resolver (A-3 §6) must route to parcel rails. Note: the pre-published layer's own `Shape__Area` is unreliable (the 91011 sliver shows `0`), so the ratios must be computed from a fresh boundary × ZIP spatial intersect — i.e., build sources the **City Boundary polygon (#3)** and a ZIP/ZCTA polygon layer and computes areas itself.

**Build's recommendation:** **(d)** if the broker wants the A-1 §2.5 three-tier model wired end-to-end; **(b) centroid** as the simpler first-build that still eliminates the gross over-inclusions, with straddler-refinement deferred. Either way, **(a) is off the table on the evidence.** The threshold(s) for (c)/(d) are broker-ruled because they materially decide border-ZIP inclusion.

---

## §6 — Interaction with A-2 (why this must be ruled before any reconciliation runs)

A-2 §2.1 rules **ADDs auto-apply** (first-build), with safety resting on "the authoritative source is A-3-attested" and the parcel-rail confirmation. **If the authoritative set were the raw any-intersection layer, the first reconciliation would auto-apply ~48 ADDs that extend RTC overlay to Beverly Hills, Santa Monica, Long Beach, Glendale, Burbank, etc.** — A-2's ADD-auto-apply would become a false-positive amplifier, the exact outcome A-1 §2.4 rejected.

This is the concrete realization of A-2 §3 trigger 4 (A-3 supersedes A-2) and A-2 §2.1's premise ("trust in the source A-3 attests, not unbounded trust in any data the build produces"): **the assignment rule is part of what A-3 must attest before A-2's auto-apply is safe.** Sequencing implication: the §5 assignment-rule choice must be ruled (and folded into A-3 §2.2) *before* the A-2 diff-emitter is pointed at a live authoritative set. Build will not wire the emitter against any-intersection.

---

## §7 — Diff preview against the provisional in-repo set (quantified)

Provisional `CITY_OF_LA_ZIPS` (lib/jurisdiction/geocode/cityOfLaZips.ts): **111 ZIPs.** Pre-published layer #1: **160 distinct ZCTAs.** Raw diff (illustrative — *not* a reconciliation, which awaits the ruled assignment rule):

- **ADDs (in layer, not in provisional): 51.** Of these, **48 are clear other-jurisdiction over-inclusions** (Beverly Hills, Santa Monica, Long Beach, Glendale, Burbank, Culver City, Inglewood, Torrance, Carson, El Segundo, Lynwood, Malibu, Pasadena, South Pasadena, Alhambra, Monterey Park, La Cañada, Universal City, etc.). **Only 3 are plausibly legitimate City-of-LA ZIPs the provisional missed: `90073` (VA / West LA), `90079` (DTLA), `90090` (Cypress Park / Elysian).** *(This illustrative tagging is build's read for magnitude, not a jurisdiction ruling — jurisdiction is parcel-level per A-1 §2.5.)*
- **REMOVEs (in provisional, not in layer): 2** — `90249`, `90748`. These would route to broker review under A-2 §2.2; both are worth a look (90748 is a Wilmington PO-box ZIP; 90249 straddles Gardena/Lennox).

**Reading:** against the raw any-intersection layer, the diff is 51 ADD / 2 REMOVE, and **94% of the ADDs are over-inclusions.** Under a centroid/majority-area rule, the ADD count collapses toward the 3 legitimate ones and the over-inclusions never enter — which is the whole point of §5. The diff magnitude is itself the argument for the stricter rule.

---

## §8 — Open items surfaced for broker ruling (A-1a return)

1. **Layer choice:** adopt LAHub #1's boundary as the canonical primitive (build rec), confirm vs the DataLA #2 legacy. **→ broker rules (A-3 §2.1/§2.2).**
2. **Assignment rule:** §5 — (b) centroid / (c) majority-area / (d) three-bucket-by-area-ratio; (a) any-intersection rejected on evidence. If (c)/(d), broker rules the threshold(s). **→ broker rules (A-1 §3, folds into A-3 §2.2).**
3. **ZIP source under the rule:** Census ZCTA (2010 vs 2020) vs a USPS-ZIP polygon source, intersected with City Boundary #3. **→ broker rules (A-3 §2.2 / §3 currency).**
4. **ZCTA↔USPS-ZIP join discipline** for the loader (geocode emits USPS ZIP5; layer keys ZCTA5). **→ A-3 §2.2 / §5.**
5. **License confirmation** for the chosen layer (item license field blank). **→ A-3 §7.1.**
6. **Sequencing:** assignment rule must be ruled before the A-2 emitter runs against a live set (§6). **→ noted for A-2/A-3.**

---

## §9 — What build did NOT do (discipline)

- **No loader built.** Per A-1 §3/§5, sourcing reconnaissance only; the layer-and-assignment-rule choice returns here for ruling first.
- **No reconciliation run / no A-2 emitter wired.** The diff in §7 is an illustrative raw set-difference for magnitude, not an A-2 diff packet (which awaits the ruled assignment rule and the A-3 path/cadence).
- **No jurisdiction rulings.** The over-inclusion tagging is build's illustrative read; jurisdiction is parcel-level (A-1 §2.5) and broker-authority for the standard (A-3 §2.6).
- **No file committed to git.** This recon is written to the workspace for broker review; committing follows the project's by-hand discipline.

---

*Build-authored reconnaissance. Surfaces the layer + assignment-rule choice per A-1 §3 for broker ruling. The strong recommendation: do not adopt the pre-published any-intersection layer; rule a centroid/majority-area/three-bucket rule and construct from the City Boundary polygon. Awaiting broker ruling before any loader work.*
