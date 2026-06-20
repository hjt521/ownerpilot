/**
 * City-of-LA ZIP set (v3 County ruling §3.3).
 *
 * Used ONLY as a fall-through gate, NEVER as a jurisdiction signal:
 *   When the County branch returns 0 features for an address:
 *     - ZIP in this set      → fall to ZIMAS (the parcel may exist there).
 *     - ZIP not in this set   → manual_review (county_situs_gap), do NOT fall to ZIMAS
 *                               (avoids the ZIMAS border-artifact confirm, e.g. #4).
 *
 * The distinction (ruling §3.3): ZIP-as-jurisdiction would say "this ZIP is Santa
 * Monica → not_la." This is ZIP-as-fall-through-gate: "this ZIP isn't in our
 * City-of-LA ZIP universe AND County has no parcel, so further parcel checks won't
 * resolve cleanly — route to manual review." It does NOT decide jurisdiction.
 *
 * IMPORTANT — data source (ruling §5 step 2): the authoritative City-of-LA ZIP set
 * should be pulled from USPS LACA or LA City GIS and given a refresh cadence. This
 * module is the build-side starter enumeration covering the City of LA's primary
 * ZIPs INCLUDING the non-LA-postal-city ZIPs that are jurisdictionally LA (so the
 * gate does not misfire on cases like #3 North Hills 91343 or Venice 90291). It is
 * deliberately INCLUSIVE: a ZIP wrongly included only causes a fall-to-ZIMAS (which
 * fails closed to manual_review on a miss), whereas a ZIP wrongly excluded could
 * route a true-LA situs-gap address to county_situs_gap. When in doubt, include.
 *
 * Build flags this for broker review: the set below is a documented starter, not
 * the USPS LACA pull. Replacing it with the official list is tracked.
 */

/** City-of-LA ZIP set (starter; see module docstring re: USPS LACA pull). */
export const CITY_OF_LA_ZIPS: ReadonlySet<string> = new Set<string>([
  // Core LA basin / DTLA / mid-city / Hollywood / Westside (City of LA)
  '90001', '90002', '90003', '90004', '90005', '90006', '90007', '90008',
  '90010', '90011', '90012', '90013', '90014', '90015', '90016', '90017',
  '90018', '90019', '90020', '90021', '90023', '90024', '90025', '90026',
  '90027', '90028', '90029', '90031', '90032', '90033', '90034', '90035',
  '90036', '90037', '90038', '90039', '90041', '90042', '90043', '90044',
  '90045', '90046', '90047', '90048', '90049', '90056', '90057', '90058',
  '90059', '90061', '90062', '90063', '90064', '90065', '90066', '90067',
  '90068', '90069', '90071', '90077', '90089', '90094', '90095',
  // Harbor (San Pedro / Wilmington / Harbor City) — City of LA
  '90710', '90731', '90732', '90744', '90748',
  // South / Watts area City-of-LA ZIPs
  '90248', '90249',
  // San Fernando Valley — City of LA (incl. non-LA-postal-city names that are
  // jurisdictionally LA: North Hills 91343, Van Nuys, Reseda, Northridge, etc.)
  '91040', '91042', '91303', '91304', '91306', '91307', '91311', '91316',
  '91324', '91325', '91326', '91330', '91331', '91335', '91340', '91342',
  '91343', '91344', '91345', '91352', '91356', '91364', '91367', '91401',
  '91402', '91403', '91405', '91406', '91411', '91423', '91436', '91601',
  '91602', '91604', '91605', '91606', '91607',
  // Coastal City-of-LA (Venice, Pacific Palisades, Playa) — incl non-LA-postal names
  '90272', '90291', '90292', '90293',
]);

/** True if the 5-digit ZIP is in the City-of-LA ZIP set (fall-through gate only). */
export function zipInCityOfLa(zip5: string | null): boolean {
  return zip5 != null && CITY_OF_LA_ZIPS.has(zip5);
}
