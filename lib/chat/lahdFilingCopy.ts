// lib/chat/lahdFilingCopy.ts
// PR-C LAHD filing checklist — owner-facing copy (broker-authored, ratified verbatim).
// Source: pr_c_lahd_checklist_scope_omnibus_broker_ruling_2026-07-01.md §5.
//
// Six Tier-A locked-prose blocks rendered on the riskpath row LAHD filing section (§7.3). Flat string literals
// so the Shape-A locked-prose guard can extract + hash them. No interpolation slots. Names are LA-scoped by the
// `chatLahdFiling` prefix (§7.4 — LAHD is the Los Angeles Housing Department; non-LA jurisdictions get parallel
// blocks in a later slice). Markdown link syntax in §5.3 is rendered as a link on the surface (§5.7).
// EN ratified now; ES translations deferred to the general ES ratification pass (§5.7).

export const chatLahdFilingChecklistHeader = `LAHD filing — required within 3 business days of service`;

export const chatLahdFilingChecklistBody = `California law requires you to file a copy of the served notice with the Los Angeles Housing Department (LAHD) within 3 business days of serving the tenant. Failure to file gives the tenant an affirmative defense in an eviction proceeding.`;

export const chatLahdFilingChannelsPreferred = `Preferred: upload the served notice at [housing.lacity.gov/eviction-notices](https://housing.lacity.gov/eviction-notices) → Submit New Notice. Requires a free Angeleno Account.`;

export const chatLahdFilingChannelsAlternative = `Alternative: mail a paper copy of the served notice plus the LAHD Eviction Notice Filing Cover Sheet to LAHD Eviction Filing Section, PO BOX 17850, Los Angeles, CA 90057.`;

export const chatLahdFilingCoverSheetLabel = `Download pre-filled LAHD cover sheet (for mail filing)`;

export const chatLahdFilingRecordButton = `I filed this notice with LAHD`;
