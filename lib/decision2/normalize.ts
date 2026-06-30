// lib/decision2/normalize.ts
// Lane 5 Decision 2 — address normalization. Re-export ONLY (no local logic) per the Option-1 fork ruling
// (lane5_decision2_normalization_fork_broker_ruling_2026-06-29) + lane5 missing-normalizer ruling (2026-06-30).
// SSOT: lib/jurisdiction/addressNormalize.ts (normalizeAddressForJurisdictionKey — the address MATCH/dedup key,
// addendum-pinned by decision2/__tests__/normalize.test.ts). NOT lib/flow/jurisdictionVerdict.normalizeAddressKey
// (a different, simpler key for the geocode layer — distinct function, do not substitute).
export { normalizeAddressForJurisdictionKey as normalizeAddress } from '@/lib/jurisdiction/addressNormalize';
