#!/usr/bin/env python3
"""
gen_city_of_la_zips.py — codegen for the authoritative City-of-LA ZIP module.

Reads the A-3 authoritative snapshot (C-8 × ZCTA-2010 × 0.90/0.10 three-bucket,
per workstream_a_fork_3_authoritative_determination_broker_ruling_2026-06-27.md)
and emits lib/jurisdiction/geocode/cityOfLaZips.ts as the runtime-served projection.

The snapshot JSON is the source-of-truth artifact (full provenance, sha256-traceable);
this TS module is its deterministic runtime projection. Re-run on every snapshot refresh
that passes A-2 review. Do NOT hand-edit the generated .ts.

Per the A-3 §6.1 implementation clarification (2026-06-27), the runtime resolver
preserves the v6 verdict taxonomy; this module exposes the three-bucket classification
(in / straddler / out) and the in∪straddler membership the resolver consults at the
county_situs_gap decision. canonical_override_exceptions (§5.4-c) are already applied
in the snapshot's bucket lists; the override list is carried for audit/traceability.

Usage:
  python scripts/gen_city_of_la_zips.py \
    --snapshot lib/jurisdiction/geocode/cityOfLaZipsAuthoritative.snapshot.json \
    --out lib/jurisdiction/geocode/cityOfLaZips.ts
"""
from __future__ import annotations
import argparse, hashlib, json, sys


def sha256_of(path: str) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def fmt_set(zips: list[str], indent: str = "  ") -> str:
    """8 ZIPs per line, sorted, single-quoted."""
    zips = sorted(set(zips))
    lines, row = [], []
    for z in zips:
        row.append(f"'{z}'")
        if len(row) == 8:
            lines.append(indent + ", ".join(row) + ",")
            row = []
    if row:
        lines.append(indent + ", ".join(row) + ",")
    return "\n".join(lines)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--snapshot", required=True)
    ap.add_argument("--out", required=True)
    args = ap.parse_args()

    d = json.load(open(args.snapshot))
    prov = d["provenance"]
    snap_sha = sha256_of(args.snapshot)
    zips_in = sorted(d["zips_in"])
    zips_straddler = sorted(s["zip"] for s in d["zips_straddler"])
    overrides = prov.get("canonical_override_exceptions", [])
    thresholds = prov.get("thresholds", {"high": 0.90, "low": 0.10})

    override_rows = ",\n".join(
        "  {{ zip5: '{zip5}', computedBucket: '{cb}', overrideBucket: '{ob}', "
        "areaRatio: {ar}, rulingReference: {rr} }}".format(
            zip5=o["zip5"], cb=o["construction_bucket"], ob=o["override_bucket"],
            ar=o.get("construction_area_ratio", "null"),
            rr=json.dumps(o.get("ruling_reference", "")),
        )
        for o in overrides
    )

    ts = f"""/**
 * City-of-LA AUTHORITATIVE ZIP set — `cityOfLaZipsAuthoritative` (predicate 5).
 *
 * GENERATED FILE — do not hand-edit. Regenerate via:
 *   python scripts/gen_city_of_la_zips.py \\
 *     --snapshot lib/jurisdiction/geocode/cityOfLaZipsAuthoritative.snapshot.json \\
 *     --out lib/jurisdiction/geocode/cityOfLaZips.ts
 *
 * Source-of-truth artifact: the A-3 snapshot (C-8 × Census ZCTA-2010, EPSG 2229,
 * three-bucket area-ratio {thresholds['high']}/{thresholds['low']}), governed by
 *   docs/compliance/workstream_a_fork_3_authoritative_determination_broker_ruling_2026-06-27.md
 * and the §6.1 implementation clarification (2026-06-27).
 *
 * Snapshot sha256:   {snap_sha}
 * Generated (UTC):   {prov.get('generated_at_utc', 'n/a')}
 * C-8 last edit:     {prov.get('inputs', {}).get('c8_boundary', {}).get('last_edit', 'n/a')}
 * Cross-check (C-7): {'SKIPPED (fail-soft §5.3-d)' if prov.get('cross_check_skipped') else 'present'}
 * Coverage ratio:    {prov.get('coverage_ratio', 'n/a')}
 * Counts:            in={len(zips_in)}  straddler={len(zips_straddler)}  authoritative_total={len(zips_in) + len(zips_straddler)}
 *
 * Runtime contract (per the §6.1 clarification, pattern (a)-(f)):
 *   - The resolver preserves the v6 County-primary / ZIMAS-fallback call order and
 *     its attested verdict taxonomy. This module supplies the binding ZIP-set signal.
 *   - `classifyZip(zip)` → 'in' | 'straddler' | 'out'.
 *       'in'        → ZIP is unambiguously City-of-LA (area_ratio ≥ {thresholds['high']}).
 *       'straddler' → ZIP spans the City boundary (or a broker §5.4-c override);
 *                     the resolver routes the address to the parcel rail (§6.1 step-3).
 *       'out'       → ZIP is NOT in the authoritative in∪straddler set. This covers
 *                     both ZCTA-classified-out (area_ratio ≤ {thresholds['low']}) AND
 *                     ZIPs with no ZCTA counterpart (§2.2-c `zip5_no_zcta5_route_parcel`).
 *                     Both route identically in the v6 chain (do NOT gate-close on
 *                     ZCTA absence; the existing parcel fallback handles them).
 *   - `zipInCityOfLa(zip)` = (classifyZip(zip) !== 'out') = membership in in∪straddler.
 *     This preserves the exact signature the v6 resolver consulted at the
 *     county_situs_gap decision; the data source is now the authoritative snapshot.
 *   - canonical_override_exceptions (§5.4-c) are already applied to the bucket sets
 *     below; CANONICAL_OVERRIDE_EXCEPTIONS carries them for audit/traceability.
 */

export const AUTHORITATIVE_SNAPSHOT = {{
  sha256: '{snap_sha}',
  generatedAtUtc: {json.dumps(prov.get('generated_at_utc'))},
  c8LastEdit: {json.dumps(prov.get('inputs', {}).get('c8_boundary', {}).get('last_edit'))},
  crossCheckSkipped: {str(prov.get('cross_check_skipped', False)).lower()},
  coverageRatio: {prov.get('coverage_ratio', 'null')},
  thresholds: {{ high: {thresholds['high']}, low: {thresholds['low']} }},
  ruling: 'workstream_a_fork_3_authoritative_determination_broker_ruling_2026-06-27.md',
  clarification: 'A3_section_6_1_implementation_clarification_broker_ruling_2026-06-27.md',
}} as const;

/** Unambiguous-in ZIPs (area_ratio ≥ {thresholds['high']}). */
export const CITY_OF_LA_ZIPS_IN: ReadonlySet<string> = new Set<string>([
{fmt_set(zips_in)}
]);

/** Straddler ZIPs (0.10 < area_ratio < 0.90, or a §5.4-c override). Route to parcel rail. */
export const CITY_OF_LA_ZIPS_STRADDLER: ReadonlySet<string> = new Set<string>([
{fmt_set(zips_straddler)}
]);

/** §5.4-c broker-ruled overrides, already applied to the bucket sets above (audit trail). */
export const CANONICAL_OVERRIDE_EXCEPTIONS: ReadonlyArray<{{
  zip5: string;
  computedBucket: string;
  overrideBucket: string;
  areaRatio: number | null;
  rulingReference: string;
}}> = [
{override_rows}
];

/**
 * Backward-compatible union (in ∪ straddler) — the set the resolver treats as
 * "in the City-of-LA ZIP universe" for the fall-through gate. Equivalent to the
 * prior provisional `CITY_OF_LA_ZIPS` export, now authoritative.
 */
export const CITY_OF_LA_ZIPS: ReadonlySet<string> = new Set<string>([
  ...CITY_OF_LA_ZIPS_IN,
  ...CITY_OF_LA_ZIPS_STRADDLER,
]);

export type ZipBucket = 'in' | 'straddler' | 'out';

/** Three-bucket classification of a USPS ZIP5 against the authoritative snapshot. */
export function classifyZip(zip5: string | null): ZipBucket {{
  if (zip5 == null) return 'out';
  if (CITY_OF_LA_ZIPS_IN.has(zip5)) return 'in';
  if (CITY_OF_LA_ZIPS_STRADDLER.has(zip5)) return 'straddler';
  return 'out';
}}

/**
 * True if the 5-digit ZIP is in the authoritative City-of-LA set (in ∪ straddler).
 * Fall-through gate only — NEVER a standalone jurisdiction signal (see §6.1).
 */
export function zipInCityOfLa(zip5: string | null): boolean {{
  return classifyZip(zip5) !== 'out';
}}
"""
    with open(args.out, "w") as f:
        f.write(ts)
    print(f"wrote {args.out}")
    print(f"  snapshot sha256: {snap_sha}")
    print(f"  in={len(zips_in)} straddler={len(zips_straddler)} overrides={len(overrides)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
