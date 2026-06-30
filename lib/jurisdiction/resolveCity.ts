// lib/jurisdiction/resolveCity.ts
// Multi-city resolution layer (additive — does NOT rewrite the existing LA resolver). Maps the geocoded
// locality the existing resolver already produces → a supported CityId (LA / SM), or null (→ expansion list).
// This is the seam the city-expansion refactor keys off; the LA confirmed/not-la path is unchanged.

import { CITY_CONFIG, type CityId } from './cities';

/** Normalize a locality string the way city matching expects (upper, trimmed, punctuation-stripped). */
function normLocality(s: string): string {
  return (s ?? '').toUpperCase().replace(/[^A-Z ]+/g, ' ').replace(/\s+/g, ' ').trim();
}

const LOCALITY_TO_CITY: Record<string, CityId> = {
  'LOS ANGELES': 'los_angeles',
  'CITY OF LOS ANGELES': 'los_angeles',
  'SANTA MONICA': 'santa_monica',
  'CITY OF SANTA MONICA': 'santa_monica',
};

/** Map a geocoded locality (+ admin area) to a supported city, or null if outside MVP scope. CA-only guard. */
export function resolveCityFromLocality(locality: string, adminAreaLevel1 = 'CA'): CityId | null {
  if (normLocality(adminAreaLevel1) !== 'CA' && adminAreaLevel1 !== 'CA' && adminAreaLevel1 !== 'California') return null;
  return LOCALITY_TO_CITY[normLocality(locality)] ?? null;
}

/** Supported-city labels for the "we're expanding to…" expansion-list copy. */
export function supportedCityLabels(): string[] {
  return Object.values(CITY_CONFIG).map((c) => c.label);
}
