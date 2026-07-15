// lib/marketing/legalBoilerplate.ts
// Marketing Tranche 1 — single source of truth for the required legal boilerplate on every marketing surface
// (addendum 2026-07-14a §5B.4). Every SEO page, blog article, carousel end-card, lead-magnet cover, and video
// end-card imports these constants so the Gate T1-A exact-string CI check is drift-proof rather than depending on
// 20+ hand-copies. Do NOT inline or paraphrase this copy anywhere — import it.
//
// Attribution is BROKER-ONLY (addendum §4A): the license line names the broker credential only. Never add attorney
// attribution, SBN references, or attorney-broker "trust badge" pairings to any marketing surface.

/** Sitewide disclaimer — identical wording on every marketing surface (ruling §Required elements #1). */
export const SITEWIDE_DISCLAIMER =
  'OwnerPilot AI is not a law firm and does not provide legal advice. OwnerPilot provides broker-supervised ' +
  'document preparation workflows and recordkeeping tools for California property owners. For legal advice about ' +
  'your specific situation, consult a California licensed attorney.';

/** Broker license line — broker-only attribution (ruling §Required elements #2, addendum §4A). */
export const BROKER_LICENSE_LINE = 'California Licensed Real Estate Broker · CalDRE B9445457';

/** Short-form disclaimer variant for constrained creative (9:16 video end-cards, tight ad slots). */
export const SITEWIDE_DISCLAIMER_SHORT =
  'OwnerPilot AI is not a law firm and does not provide legal advice. Consult a California licensed attorney for ' +
  'legal advice.';
