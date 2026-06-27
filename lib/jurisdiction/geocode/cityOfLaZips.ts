/**
 * City-of-LA AUTHORITATIVE ZIP set — `cityOfLaZipsAuthoritative` (predicate 5).
 *
 * GENERATED FILE — do not hand-edit. Regenerate via:
 *   python scripts/gen_city_of_la_zips.py \
 *     --snapshot lib/jurisdiction/geocode/cityOfLaZipsAuthoritative.snapshot.json \
 *     --out lib/jurisdiction/geocode/cityOfLaZips.ts
 *
 * Source-of-truth artifact: the A-3 snapshot (C-8 × Census ZCTA-2010, EPSG 2229,
 * three-bucket area-ratio 0.9/0.1), governed by
 *   docs/compliance/workstream_a_fork_3_authoritative_determination_broker_ruling_2026-06-27.md
 * and the §6.1 implementation clarification (2026-06-27).
 *
 * Snapshot sha256:   e40e3ab2c47bdb9429f19c1d97d69f0ca5bd20aa6ecbd2e15b203e5f47b18452
 * Generated (UTC):   2026-06-27T17:18:26.882696+00:00
 * C-8 last edit:     2026-05-19
 * Cross-check (C-7): SKIPPED (fail-soft §5.3-d)
 * Coverage ratio:    0.993
 * Counts:            in=82  straddler=37  authoritative_total=119
 *
 * Runtime contract (per the §6.1 clarification, pattern (a)-(f)):
 *   - The resolver preserves the v6 County-primary / ZIMAS-fallback call order and
 *     its attested verdict taxonomy. This module supplies the binding ZIP-set signal.
 *   - `classifyZip(zip)` → 'in' | 'straddler' | 'out'.
 *       'in'        → ZIP is unambiguously City-of-LA (area_ratio ≥ 0.9).
 *       'straddler' → ZIP spans the City boundary (or a broker §5.4-c override);
 *                     the resolver routes the address to the parcel rail (§6.1 step-3).
 *       'out'       → ZIP is NOT in the authoritative in∪straddler set. This covers
 *                     both ZCTA-classified-out (area_ratio ≤ 0.1) AND
 *                     ZIPs with no ZCTA counterpart (§2.2-c `zip5_no_zcta5_route_parcel`).
 *                     Both route identically in the v6 chain (do NOT gate-close on
 *                     ZCTA absence; the existing parcel fallback handles them).
 *   - `zipInCityOfLa(zip)` = (classifyZip(zip) !== 'out') = membership in in∪straddler.
 *     This preserves the exact signature the v6 resolver consulted at the
 *     county_situs_gap decision; the data source is now the authoritative snapshot.
 *   - canonical_override_exceptions (§5.4-c) are already applied to the bucket sets
 *     below; CANONICAL_OVERRIDE_EXCEPTIONS carries them for audit/traceability.
 */

export const AUTHORITATIVE_SNAPSHOT = {
  sha256: 'e40e3ab2c47bdb9429f19c1d97d69f0ca5bd20aa6ecbd2e15b203e5f47b18452',
  generatedAtUtc: "2026-06-27T17:18:26.882696+00:00",
  c8LastEdit: "2026-05-19",
  crossCheckSkipped: true,
  coverageRatio: 0.993,
  thresholds: { high: 0.9, low: 0.1 },
  ruling: 'workstream_a_fork_3_authoritative_determination_broker_ruling_2026-06-27.md',
  clarification: 'A3_section_6_1_implementation_clarification_broker_ruling_2026-06-27.md',
} as const;

/** Unambiguous-in ZIPs (area_ratio ≥ 0.9). */
export const CITY_OF_LA_ZIPS_IN: ReadonlySet<string> = new Set<string>([
  '90003', '90004', '90005', '90006', '90007', '90010', '90011', '90012',
  '90013', '90014', '90015', '90016', '90017', '90018', '90019', '90020',
  '90021', '90024', '90025', '90026', '90027', '90028', '90029', '90031',
  '90032', '90033', '90034', '90035', '90036', '90037', '90038', '90039',
  '90041', '90042', '90045', '90049', '90057', '90062', '90064', '90065',
  '90067', '90068', '90071', '90077', '90079', '90089', '90090', '90094',
  '90095', '90272', '90744', '91040', '91303', '91306', '91316', '91324',
  '91325', '91326', '91330', '91331', '91335', '91343', '91345', '91352',
  '91356', '91364', '91367', '91371', '91401', '91402', '91403', '91405',
  '91406', '91411', '91423', '91436', '91601', '91602', '91604', '91605',
  '91606', '91607',
]);

/** Straddler ZIPs (0.10 < area_ratio < 0.90, or a §5.4-c override). Route to parcel rail. */
export const CITY_OF_LA_ZIPS_STRADDLER: ReadonlySet<string> = new Set<string>([
  '90001', '90002', '90008', '90023', '90043', '90044', '90046', '90047',
  '90048', '90056', '90058', '90059', '90061', '90063', '90066', '90069',
  '90210', '90230', '90247', '90248', '90291', '90292', '90293', '90402',
  '90501', '90502', '90710', '90731', '90732', '91042', '91304', '91307',
  '91311', '91340', '91342', '91344', '91608',
]);

/** §5.4-c broker-ruled overrides, already applied to the bucket sets above (audit trail). */
export const CANONICAL_OVERRIDE_EXCEPTIONS: ReadonlyArray<{
  zip5: string;
  computedBucket: string;
  overrideBucket: string;
  areaRatio: number | null;
  rulingReference: string;
}> = [
  { zip5: '90056', computedBucket: 'out', overrideBucket: 'straddler', areaRatio: 0.0591, rulingReference: "workstream_a_fork_3_authoritative_determination_broker_ruling_2026-06-27.md \u00a75.4-c" }
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
export function classifyZip(zip5: string | null): ZipBucket {
  if (zip5 == null) return 'out';
  if (CITY_OF_LA_ZIPS_IN.has(zip5)) return 'in';
  if (CITY_OF_LA_ZIPS_STRADDLER.has(zip5)) return 'straddler';
  return 'out';
}

/**
 * True if the 5-digit ZIP is in the authoritative City-of-LA set (in ∪ straddler).
 * Fall-through gate only — NEVER a standalone jurisdiction signal (see §6.1).
 */
export function zipInCityOfLa(zip5: string | null): boolean {
  return classifyZip(zip5) !== 'out';
}
