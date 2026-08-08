// P0-A — structured California eligibility for operative notice production.
//
// This predicate is intentionally independent of local-overlay classification.
// It consumes only structured administrative_area_level_1 components returned by
// the existing trusted Google address/geocode substrate. Freeform address text,
// city strings, ZIP strings, and NO_KNOWN_OVERLAY are never authorization inputs.

export type CaliforniaEligibility =
  | 'CONFIRMED_CALIFORNIA'
  | 'NON_CALIFORNIA'
  | 'UNKNOWN';

export interface CaliforniaEligibilityEvidence {
  status: CaliforniaEligibility;
  addressKey: string;
  resolvedAt: string;
  source: 'google_places';
}

/** Minimal common shape accepted from Places API (New) and the existing reverse-geocode adapter. */
export interface StructuredStateComponent {
  types?: readonly string[];
  longText?: string;
  shortText?: string;
  long_name?: string;
  short_name?: string;
}

const US_STATE_NAME_TO_CODE: Readonly<Record<string, string>> = {
  alabama: 'AL', alaska: 'AK', arizona: 'AZ', arkansas: 'AR', california: 'CA',
  colorado: 'CO', connecticut: 'CT', delaware: 'DE', florida: 'FL', georgia: 'GA',
  hawaii: 'HI', idaho: 'ID', illinois: 'IL', indiana: 'IN', iowa: 'IA', kansas: 'KS',
  kentucky: 'KY', louisiana: 'LA', maine: 'ME', maryland: 'MD', massachusetts: 'MA',
  michigan: 'MI', minnesota: 'MN', mississippi: 'MS', missouri: 'MO', montana: 'MT',
  nebraska: 'NE', nevada: 'NV', 'new hampshire': 'NH', 'new jersey': 'NJ',
  'new mexico': 'NM', 'new york': 'NY', 'north carolina': 'NC', 'north dakota': 'ND',
  ohio: 'OH', oklahoma: 'OK', oregon: 'OR', pennsylvania: 'PA', 'rhode island': 'RI',
  'south carolina': 'SC', 'south dakota': 'SD', tennessee: 'TN', texas: 'TX', utah: 'UT',
  vermont: 'VT', virginia: 'VA', washington: 'WA', 'west virginia': 'WV',
  wisconsin: 'WI', wyoming: 'WY', 'district of columbia': 'DC',
  'american samoa': 'AS', guam: 'GU', 'northern mariana islands': 'MP',
  'puerto rico': 'PR', 'u.s. virgin islands': 'VI', 'us virgin islands': 'VI',
};

const US_STATE_CODES = new Set(Object.values(US_STATE_NAME_TO_CODE));
const SESSION_KEY = 'op.californiaEligibility.v1';

function normalizedText(value: string | undefined): string | null {
  const v = value?.trim();
  return v ? v : null;
}

/** Match the existing jurisdiction-verdict key rule without depending on overlay code. */
export function californiaEligibilityAddressKey(address: string | undefined | null): string {
  return (address ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
}

/**
 * Resolve one structured state component to a canonical postal code.
 * Any malformed or internally conflicting structured evidence returns null so
 * the caller fails closed as UNKNOWN.
 */
function canonicalStateCode(component: StructuredStateComponent): string | null {
  const shortRaw = normalizedText(component.shortText ?? component.short_name);
  const longRaw = normalizedText(component.longText ?? component.long_name);

  const shortCode = shortRaw?.toUpperCase() ?? null;
  const shortValid = shortCode !== null && US_STATE_CODES.has(shortCode);
  const longCode = longRaw ? (US_STATE_NAME_TO_CODE[longRaw.toLowerCase()] ?? null) : null;

  // A supplied-but-unrecognized structured field is malformed evidence, not a
  // negative California determination.
  if (shortRaw !== null && !shortValid) return null;
  if (longRaw !== null && longCode === null) return null;

  if (shortValid && longCode && shortCode !== longCode) return null;
  return shortValid ? shortCode : longCode;
}

/**
 * Classify California eligibility from structured state evidence only.
 *
 * - one unambiguous CA state => CONFIRMED_CALIFORNIA
 * - one unambiguous recognized non-CA US state/territory => NON_CALIFORNIA
 * - missing, malformed, or conflicting state evidence => UNKNOWN
 */
export function classifyCaliforniaEligibility(
  components: readonly StructuredStateComponent[] | null | undefined,
): CaliforniaEligibility {
  const stateComponents = (components ?? []).filter((component) =>
    (component.types ?? []).includes('administrative_area_level_1'),
  );

  if (stateComponents.length === 0) return 'UNKNOWN';

  const codes: string[] = [];
  for (const component of stateComponents) {
    const code = canonicalStateCode(component);
    if (!code) return 'UNKNOWN';
    codes.push(code);
  }

  const distinct = new Set(codes);
  if (distinct.size !== 1) return 'UNKNOWN';

  return codes[0] === 'CA' ? 'CONFIRMED_CALIFORNIA' : 'NON_CALIFORNIA';
}

/**
 * Keep the structured selection evidence alive across the wizard -> Serve & Track
 * page transition in the same browser tab. This cache never derives state from
 * address text and never upgrades UNKNOWN. Tests/server callers may instead carry
 * the same evidence explicitly on NoticeFlowData.
 */
export function rememberCaliforniaEligibilityEvidence(
  address: string,
  status: CaliforniaEligibility,
): CaliforniaEligibilityEvidence {
  const evidence: CaliforniaEligibilityEvidence = {
    status,
    addressKey: californiaEligibilityAddressKey(address),
    resolvedAt: new Date().toISOString(),
    source: 'google_places',
  };
  if (typeof window !== 'undefined') {
    try {
      window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(evidence));
    } catch {
      // Storage failure is fail-closed: read returns no evidence.
    }
  }
  return evidence;
}

/** Manual/fallback address entry invalidates any prior structured state evidence. */
export function clearCaliforniaEligibilityEvidence(): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // Nothing to preserve on storage failure.
  }
}

/** Read only current, well-shaped, address-matching structured evidence. */
export function readCaliforniaEligibilityEvidence(
  address: string | undefined | null,
): CaliforniaEligibilityEvidence | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    const raw = window.sessionStorage.getItem(SESSION_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as Partial<CaliforniaEligibilityEvidence>;
    const validStatus =
      parsed.status === 'CONFIRMED_CALIFORNIA' ||
      parsed.status === 'NON_CALIFORNIA' ||
      parsed.status === 'UNKNOWN';
    if (
      !validStatus ||
      parsed.source !== 'google_places' ||
      typeof parsed.addressKey !== 'string' ||
      typeof parsed.resolvedAt !== 'string' ||
      parsed.addressKey !== californiaEligibilityAddressKey(address)
    ) {
      return undefined;
    }
    return parsed as CaliforniaEligibilityEvidence;
  } catch {
    return undefined;
  }
}
