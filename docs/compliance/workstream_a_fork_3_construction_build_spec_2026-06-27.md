# Workstream A — A-3 Construction Build-Spec (2026-06-27, rev. for DRAFT-3)

**Status:** Build-authored build-spec. **NOT a ruling.** Implements the construction ruled in the
A-3 DRAFT §2.1 / §2.2 / §3.3 / §5.1 (now locked through §5). No runtime rewiring, no A-2 emitter,
no predicate flip — those wait on the still-pending A-3 sections (see §6 below).
**Honors:** A-3 DRAFT-3 (`workstream_a_fork_3_authoritative_determination_broker_ruling_DRAFT.md`)
§2–§5 locked; A-1, A-2, A-1a recon.
**Deliverable pair:** this spec + the construction script `scripts/build_la_authoritative_zips.py`.

---

## §1 — Source verification (live)

| Source | Role | Status |
|---|---|---|
| **C-8** `LA_City_Boundary_detailed` FeatureServer/0 | primary boundary | **Verified.** 1 polygon; `editingInfo.lastEditDate` present (data edit 2026-05-19, matches ruling); SR Web Mercator (3857); exports GeoJSON/shapefile/FileGDB, `Extract` on → rides the §2.4 rail. |
| **C-7** Socrata `brvb-jr45` | cross-check | **Cited (CC0), not live-verified** — Socrata aggregate timed out. Confirm at sourcing. |

**Trigger field:** the ruling (§2.2-d / §3.1-a) polls `editingInfo.lastEditDate`. (My earlier note suggesting `dataLastEditDate` was *not* adopted; the script and refresh job use `lastEditDate` per the locked text.)

---

## §2 — The construction (ruled, buildable now)

Per A-3 §2.2 + §5.1, the authoritative set is a build-side derivation, recomputed each snapshot:

1. **Reproject** C-8, C-7, all ZCTA-2010 polygons to **EPSG 2229**; all areas there.
2. **§2.1 divergence gate:** `symdiff(C-8,C-7)/union`. `≤0.001` proceed; `>0.001` HALT + fork.
3. **§5.1-d field validity:** keep only 5-ASCII-digit `ZCTA5CE10`; drop invalid; `>1%` dropped → fork.
4. **§2.2-b multi-part dissolve (correction):** **dissolve same-ZCTA polygons into one geometry per ZIP, THEN** compute `area_ratio(Z) = area(Z ∩ C-8) / area(Z)`. *(Max-of-per-polygon-ratios is explicitly wrong per §2.2-b — the denominator is the ZIP-as-a-whole. The script was corrected to dissolve-then-ratio.)*
5. **§2.2-b three-bucket:** `≥0.90` → in; `≤0.10` → out; between → straddler (listed with flag; runtime routes to parcel rail).
6. **§5.1-c coverage:** sum of intersected areas ≈ C-8 area within 0.5%, else fork (incomplete ZCTA subset / malformed boundary).
7. **§5.1-a SANITY_OUT canary:** if any known non-LA ZIP (Beverly Hills/Santa Monica/etc.) lands in `in` → **HALT, do not emit, fork** (`sanity_canary_FORK`).
8. **§5.1-b sliver log:** ZCTAs with `0 < ratio < 1e-9` logged (all land in `out`).
9. **Output:** snapshot with provenance (input sha256s, C-8 `lastEditDate`, thresholds, CRS, divergence + coverage ratios, `canonical_override_exceptions: []` per §5.2-c/§5.4-c), `zips_in`, `zips_straddler`.
10. **§2.2-c join is RUNTIME, not construction:** the resolver matches geocoder USPS-ZIP5 against `ZCTA5CE10` exact; no-match → parcel rail. Deferred (§6).

---

## §3 — Inputs you source via the §2.4 rail (build can't fetch bulk geo here)

1. **C-8 boundary GeoJSON** — `https://services1.arcgis.com/PTh9WC0Sf2WS7AAq/arcgis/rest/services/LA_City_Boundary_detailed/FeatureServer/0/query?where=1=1&outFields=*&f=geojson` (1 polygon; small). Also accepts the GeoHub "Download" shapefile/FileGDB.
2. **C-7 boundary GeoJSON** — Socrata `brvb-jr45` GeoJSON export.
3. **Census ZCTA-2010 LA-area subset** — Census TIGER/Line 2010 `ZCTA5CE10` (national file large; extract LA subset). The one genuinely bulk input.

`shasum -a 256` each; record hashes + C-8 `lastEditDate` for the §3.3 provenance header.

---

## §4 — The construction script (corrected)

`scripts/build_la_authoritative_zips.py` (compiles clean). It is the **§3.3 operator-supervised initial-construction tool**: you pull the files, pass `--c8-last-edit` and the paths; it runs steps §2 above and writes the snapshot + an illustrative diff vs the provisional set. Forks (exit 2) on divergence / field-corruption / coverage / sanity-canary. Writes nothing into `lib/`.

Deps: `pip install --break-system-packages geopandas pyproj shapely`.
Run: `python scripts/build_la_authoritative_zips.py --c8 <c8.geojson> --c7 <c7.geojson> --zcta <zcta_la.geojson> --c8-last-edit 2026-05-19 --provisional lib/jurisdiction/geocode/cityOfLaZips.ts`.

---

## §5 — Expected result (prediction)

Under 0.90/0.10 with the dissolve fix, the any-intersection over-inclusions (Beverly Hills, Santa Monica, Long Beach, Glendale, Burbank, etc.) should land in **unambiguous-out** (sliver City-fractions) — and the §5.1-a canary enforces exactly that (HALT if any leak). Expect the authoritative set to be close to the provisional core plus the 3 missed legit ZIPs (`90073/90079/90090`) plus a modest straddler list. Binding numbers come from the real run.

---

## §6 — What's still gated (newly narrowed)

DRAFT-3 locked §2–§5, so the construction + its guards + the **refresh cadence (§4: daily poll 03:00 PT)** + currency/stale disposition (§3) + discrepancy policy (§5) are all ruled. Still **pending** and therefore not yet built:

- **§2.3 access method** (snapshot-and-commit vs live-fetch) — gates where the snapshot lives and how the auto-refresh job consumes it. The *initial* construction (§3.3, this script) is operator-supervised and unblocked; the **automated daily-poll refresh job** waits on §2.3 (+ §2.4 sourcing-rail confirm).
- **§6 runtime resolution chain** — gates the **resolver rewire** (wire the authoritative set + §2.2-c join + straddler→parcel routing into `resolveLaAddressV2.ts`, replacing the provisional fall-through gate) and the §6.4 logging discipline.
- **§7 licensing / §7.2 reliance statement** — load-bearing for the predicate.
- **§8 attestation packet** — gates the **predicate flip** (`cityOfLaZipsAuthoritative` → true) + the comment/missing-dep text update (drop the now-superseded "USPS LACA" framing).
- **A-2 diff-packet emitter** — rides with the loader; needs §2.3 access + the A-3 snapshot path.

---

## §7 — Next steps

1. **Source the three input files** (§3) so the script can produce the first real snapshot + the binding A-2-baseline diff. (Operator-supervised per §3.3.)
2. **Author A-3 §6 / §7 / §8** — unblocks the resolver rewire, reliance statement, attestation, and the predicate flip.
3. **Confirm §2.3 access method** — unblocks the automated daily-poll refresh job (cadence already ruled in §4).
4. On your go-ahead, build wires the resolver + emitter + refresh job + predicate flip against the above, as a proper PR.
