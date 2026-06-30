// lib/jurisdiction/addressNormalize.ts
// Decision 2 address-key normalizer — SSOT.
//
// Reconstructed per lane5 missing-normalizer broker ruling (2026-06-30) from the resolver-behavior
// addendum and PINNED by lib/decision2/__tests__/normalize.test.ts (13 captured input→output pairs).
// lib/decision2/normalize.ts re-exports `normalizeAddress` from here (Guard C: normalize-identical-to-resolver).
//
// This produces a dedup/MATCH KEY for broker-confirm requests — NOT the legal jurisdiction determination
// (that comes from the geocode/parcel resolver). Do not conflate with normalizeAddressKey in
// lib/flow/jurisdictionVerdict.ts (that is a different, simpler trim+lowercase key for a different layer).
//
// Behavior (addendum-locked):
//   1. trim
//   2. remove non-ASCII ENTIRELY — accented chars are dropped, NOT transliterated ("Café" → "CAF", not "CAFE";
//      so "Café Ave" and "Cafe Ave" key differently — addendum-witnessed)
//   3. uppercase
//   4. "#" → " UNIT "; "." and "," → space
//   5. collapse whitespace
//   6. expand street-type abbreviations on whole-word boundaries (ST→STREET, …)
//   7. collapse whitespace again
//   Directionals (N/S/E/W/NORTH/SOUTH/EAST/WEST) are NOT collapsed (passthrough). Idempotent.

const SUFFIX_MAP: Record<string, string> = {
  ST: "STREET",
  AVE: "AVENUE",
  BLVD: "BOULEVARD",
  RD: "ROAD",
  DR: "DRIVE",
  LN: "LANE",
  CT: "COURT",
  PL: "PLACE",
  PKWY: "PARKWAY",
};
const SUFFIX_RE = new RegExp(`\\b(${Object.keys(SUFFIX_MAP).join("|")})\\b`, "g");

export function normalizeAddressForJurisdictionKey(rawAddress: string | undefined | null): string {
  let s = (rawAddress ?? "").trim();
  s = s.replace(/[^\x00-\x7F]/g, ""); // drop non-ASCII entirely (accent chars removed, not transliterated)
  s = s.toUpperCase();
  s = s.replace(/#/g, " UNIT ");
  s = s.replace(/[.,]/g, " ");
  s = s.replace(/\s+/g, " ").trim();
  s = s.replace(SUFFIX_RE, (m) => SUFFIX_MAP[m]);
  s = s.replace(/\s+/g, " ").trim();
  return s;
}
