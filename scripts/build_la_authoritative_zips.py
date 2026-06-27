#!/usr/bin/env python3
"""
build_la_authoritative_zips.py — Workstream A construction (A-3 DRAFT §2.1 / §2.2 / §3.3 / §5.1).

Derives the authoritative City-of-LA ZIP set for `cityOfLaZipsAuthoritative` (predicate 5)
from the City Boundary polygon × Census ZCTA-2010 polygons, under the broker-ruled
three-bucket area-ratio rule (thresholds 0.90 / 0.10), with the §2.1 cross-publisher
divergence gate and the §5.1 construction-time guards. This is the operator-supervised
initial-construction tool of §3.3. Standalone and data-agnostic: it reads the sha256-verified
inputs you source via the §2.4 rail and writes a snapshot candidate you review. It does NOT
touch lib/, does NOT flip the predicate, and does NOT run A-2 reconciliation.

Ruled parameters (A-3 DRAFT):
  - Boundary: C-8 LA_City_Boundary_detailed (primary), C-7 Socrata brvb-jr45 (cross-check).
  - ZIP source: U.S. Census ZCTA-2010 (ZCTA5CE10), LA-County subset.
  - Assignment: three-bucket area-ratio, high=0.90 / low=0.10, areas in EPSG 2229.
  - §2.2-b multi-part: same-ZCTA polygons are DISSOLVED into one geometry per ZIP BEFORE the
    ratio is computed (the ratio's denominator is the ZIP-as-a-whole; NOT max-of-per-polygon).
  - §2.1 divergence gate: symdiff/union of C-8,C-7; > 0.001 => HALT + fork.
  - §5.1 guards: SANITY_OUT canary (HALT on leak), zero-area sliver log, coverage check,
    ZCTA-field validity.

Usage:
  pip install --break-system-packages geopandas pyproj shapely
  python scripts/build_la_authoritative_zips.py \
      --c8 c8_boundary.geojson --c7 c7_boundary.geojson --zcta zcta_la.geojson \
      [--provisional lib/jurisdiction/geocode/cityOfLaZips.ts] \
      [--c8-last-edit 2026-05-19] [--out la_authoritative_zips_snapshot.json]

Exit codes: 0 ok; 2 broker fork (divergence / sanity canary / coverage / field corruption).
"""
from __future__ import annotations
import argparse, hashlib, json, re, sys
from datetime import datetime, timezone

EPSG_STATE_PLANE_V = 2229   # NAD83 / California State Plane Zone V (US ft) — City of LA standard CRS
HIGH_DEFAULT = 0.90         # §2.2-b unambiguous-in threshold
LOW_DEFAULT = 0.10          # §2.2-b unambiguous-out threshold
DIVERGENCE_TOL = 0.001      # §2.1 fork threshold (0.1%)
COVERAGE_TOL = 0.015        # §5.1-c coverage tolerance — 1.5% (broker-ruled 2026-06-27 on first-construction empirical 0.993; ZCTA open-space non-tiling)
SLIVER_EPS = 1e-9           # §5.1-b zero-area sliver epsilon
FIELD_DROP_FORK = 0.01      # §5.1-d: >1% dropped rows => fork

# §5.1-a SANITY_OUT canary — well-known ZIPs that must NEVER land in the `in` bucket.
# Build-side QA artifact, NOT a jurisdiction ruling (jurisdiction is parcel-level, A-1 §2.5).
SANITY_OUT = {
    "90210", "90211", "90212", "90230", "90232", "90245", "90250", "90262", "90265",
    "90275", "90280", "90301", "90302", "90304", "90305", "90402", "90403", "90404",
    "90405", "90501", "90502", "90504", "90717", "90745", "90802", "90810", "90813",
    "91011", "91030", "91105", "91201", "91204", "91205", "91206", "91501", "91504",
    "91505", "91506", "91754", "91801", "91803",
}
ZCTA_FIELD_CANDIDATES = ["ZCTA5CE10", "GEOID10", "ZCTA5CE", "ZCTA5", "GEOID20", "ZCTA5CE20"]


def sha256_of(path: str) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def detect_zip_field(gdf) -> str:
    for c in ZCTA_FIELD_CANDIDATES:
        if c in gdf.columns:
            return c
    raise SystemExit(
        f"ERROR: no ZCTA field found. Looked for {ZCTA_FIELD_CANDIDATES}; got {list(gdf.columns)}. "
        f"Pass a layer keyed on ZCTA5CE10 (A-3 §2.2-a)."
    )


def parse_provisional(path: str) -> set[str]:
    return set(re.findall(r"['\"](9[0-1]\d{3})['\"]", open(path, encoding="utf-8").read()))


def fork(event: str, **payload) -> int:
    print(json.dumps({"event": event, "action": "HALT — retain prior snapshot live; surface to broker.",
                      **payload}, indent=2))
    return 2


def main() -> int:
    ap = argparse.ArgumentParser(description="A-3 City-of-LA authoritative ZIP construction")
    ap.add_argument("--c8", required=True, help="C-8 primary boundary (GeoJSON/shapefile)")
    ap.add_argument("--c7", default=None, help="C-7 cross-check boundary; optional — skipped fail-soft per §5.3-d")
    ap.add_argument("--zcta", required=True, help="ZCTA-2010 LA-subset polygons (GeoJSON/shapefile)")
    ap.add_argument("--provisional", default=None, help="cityOfLaZips.ts for illustrative diff")
    ap.add_argument("--c8-last-edit", default=None, help="C-8 editingInfo.lastEditDate (provenance, §3.3)")
    ap.add_argument("--high", type=float, default=HIGH_DEFAULT)
    ap.add_argument("--low", type=float, default=LOW_DEFAULT)
    ap.add_argument("--divergence-tol", type=float, default=DIVERGENCE_TOL)
    ap.add_argument("--out", default="la_authoritative_zips_snapshot.json")
    args = ap.parse_args()

    try:
        import geopandas as gpd
        from shapely.ops import unary_union
    except ImportError:
        raise SystemExit("ERROR: pip install --break-system-packages geopandas pyproj shapely")

    # --- load + reproject to EPSG 2229 (§2.2-b: all areas in State Plane V) --------------
    c8 = gpd.read_file(args.c8).to_crs(EPSG_STATE_PLANE_V)
    zcta = gpd.read_file(args.zcta).to_crs(EPSG_STATE_PLANE_V)
    zip_field = detect_zip_field(zcta)
    c8_geom = unary_union(list(c8.geometry))

    # --- §2.1 divergence gate (fail-soft skip if C-7 absent, §5.3-d) ---------------------
    cross_check_skipped = args.c7 is None
    divergence_ratio = None
    if not cross_check_skipped:
        c7 = gpd.read_file(args.c7).to_crs(EPSG_STATE_PLANE_V)
        c7_geom = unary_union(list(c7.geometry))
        union_area = c8_geom.union(c7_geom).area
        divergence_ratio = (c8_geom.symmetric_difference(c7_geom).area / union_area) if union_area else 0.0
        if divergence_ratio > args.divergence_tol:
            return fork("boundary_divergence_FORK", divergence_ratio=divergence_ratio,
                        tolerance=args.divergence_tol, ref="A-3 §2.1")
        print(f"[§2.1] divergence_ratio={divergence_ratio:.6f} <= {args.divergence_tol} — within tolerance.")
    else:
        print("[§2.1] C-7 cross-check SKIPPED (fail-soft per §5.3-d) — provenance marked cross_check_skipped.")

    # --- §5.1-d ZCTA-field validity (5 ASCII digits; drop invalid; >1% => fork) ----------
    total_rows = len(zcta)
    zcta = zcta.copy()
    zcta["_zip"] = zcta[zip_field].astype(str).str.strip()
    valid = zcta["_zip"].str.fullmatch(r"\d{5}")
    dropped = int((~valid).sum())
    if total_rows and dropped / total_rows > FIELD_DROP_FORK:
        return fork("zcta_field_corruption_FORK", dropped=dropped, total=total_rows,
                    fraction=round(dropped / total_rows, 4), ref="A-3 §5.1-d")
    zcta = zcta[valid]

    # --- §2.2-b multi-part: DISSOLVE same-ZCTA polygons into one geometry per ZIP --------
    dissolved = zcta.dissolve(by="_zip")  # unions all polygons sharing a ZCTA5

    # --- per-ZIP area_ratio against the dissolved geometry ------------------------------
    buckets = {"in": [], "straddler": [], "out": []}
    slivers = []          # §5.1-b
    total_intersected = 0.0
    for z, geom in dissolved.geometry.items():
        z = str(z)
        if geom is None or geom.is_empty:
            continue
        za = geom.area
        if za <= 0:
            continue
        inter = geom.intersection(c8_geom).area
        total_intersected += inter
        ratio = inter / za
        if 0 < ratio < SLIVER_EPS:
            slivers.append(z)        # §5.1-b zero-area sliver
        if ratio >= args.high:
            buckets["in"].append((z, ratio))
        elif ratio <= args.low:
            buckets["out"].append((z, ratio))
        else:
            buckets["straddler"].append((z, ratio))

    authoritative_in = sorted(z for z, _ in buckets["in"])
    straddlers = [{"zip": z, "area_ratio": round(r, 4)} for z, r in sorted(buckets["straddler"])]
    authoritative_set = set(authoritative_in) | {s["zip"] for s in straddlers}

    # --- §5.1-c coverage check (sum intersected ≈ C-8 area within 0.5%) ------------------
    coverage_ratio = (total_intersected / c8_geom.area) if c8_geom.area else 0.0
    if abs(coverage_ratio - 1.0) > COVERAGE_TOL:
        return fork("coverage_check_FORK", coverage_ratio=round(coverage_ratio, 5),
                    tolerance=COVERAGE_TOL,
                    hint="ZCTA subset incomplete or boundary geometry malformed.", ref="A-3 §5.1-c")
    print(f"[§5.1-c] coverage_ratio={coverage_ratio:.5f} within {COVERAGE_TOL} of 1.0 — ZCTA subset covers the City.")

    # --- §5.1-a SANITY_OUT canary (HALT on leak into `in`) ------------------------------
    leaked = sorted(SANITY_OUT & set(authoritative_in))
    if leaked:
        return fork("sanity_canary_FORK", leaked_zips=leaked,
                    note="Known non-LA ZIPs in the `in` bucket — likely wrong boundary/CRS/ZCTA/threshold.",
                    ref="A-3 §5.1-a")
    print("[§5.1-a] sanity canary OK: no known non-LA jurisdiction in the `in` bucket.")
    if slivers:
        print(f"[§5.1-b] zero-area slivers observed (logged, all in `out`): {slivers}")

    snapshot = {
        "provenance": {
            "generated_at_utc": datetime.now(timezone.utc).isoformat(),
            "ruling": "workstream_a_fork_3_authoritative_determination_broker_ruling (DRAFT) §2.1/§2.2/§5.1",
            "crs": EPSG_STATE_PLANE_V,
            "thresholds": {"high": args.high, "low": args.low},
            "divergence_ratio": round(divergence_ratio, 6) if divergence_ratio is not None else None,
            "cross_check_skipped": cross_check_skipped,
            "coverage_ratio": round(coverage_ratio, 5),
            "zcta_rows_dropped_invalid": dropped,
            "zero_area_slivers": slivers,
            "canonical_override_exceptions": [],   # §5.2-c / §5.4-c: broker-ruled overrides go here
            "inputs": {
                "c8_boundary": {"path": args.c8, "sha256": sha256_of(args.c8),
                                "last_edit": args.c8_last_edit},
                "c7_boundary": ({"path": args.c7, "sha256": sha256_of(args.c7)} if args.c7 else {"skipped": True}),
                "zcta_2010":   {"path": args.zcta, "sha256": sha256_of(args.zcta),
                                "zip_field": zip_field},
            },
        },
        "counts": {"in": len(authoritative_in), "straddler": len(straddlers),
                   "out": len(buckets["out"]), "authoritative_total": len(authoritative_set)},
        "zips_in": authoritative_in,
        "zips_straddler": straddlers,
    }
    with open(args.out, "w") as f:
        json.dump(snapshot, f, indent=2)

    print(f"[§2.2-b] in={len(authoritative_in)}  straddler={len(straddlers)}  "
          f"out={len(buckets['out'])}  authoritative_total={len(authoritative_set)}")
    if straddlers:
        print("  straddlers (runtime routes to parcel rail per §2.2-b): "
              + ", ".join(f"{s['zip']}({s['area_ratio']})" for s in straddlers))

    if args.provisional:
        prov = parse_provisional(args.provisional)
        adds = sorted(authoritative_set - prov)
        removes = sorted(prov - authoritative_set)
        print(f"\n[illustrative diff vs provisional {len(prov)}] ADD={len(adds)} REMOVE={len(removes)}")
        print("  ADD:    " + (", ".join(adds) or "(none)"))
        print("  REMOVE: " + (", ".join(removes) or "(none)"))
        print("  (NOT an A-2 reconciliation — that runs under the ruled A-2 discipline.)")

    print(f"\nsnapshot written -> {args.out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
