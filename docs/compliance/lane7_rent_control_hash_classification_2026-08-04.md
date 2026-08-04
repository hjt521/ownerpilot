# Rent-Control Cities Cron `2faf60f6` — Hash-Change Classification — 2026-08-04

**Basis:** 2026-08-01 07:02 CEST cron run report (Perplexity Computer session 28e720f4 artifact).  
**Ratified by Founder:** 2026-08-04 13:10 PDT.

## §1 Los Angeles (LAHD landing page)

- URL: https://housing.lacity.gov/
- Previous hash: 78fb0948228e6f017c8692207b74ef647532566875eeb507f07ffae64438ae0b
- Current hash: b3da980091f3575f4aea7d9388fc7d9585046ac0218f3066976e87d9892bf2a5
- Diff signature: whitespace normalization around navigation items + addition of "LAHD – City of Los Angeles Housing Department" title element
- Classification: **cosmetic (chore)** — template restyle; no policy/ordinance/disclosure/form-availability text in visible diff
- Broker sign-off required: NO
- Caveat: cron report shows only top-20 diff lines; residual truncation risk. Recommend Lane 3 producer improvement to persist full diffs.

## §2 Santa Monica Rent Control landing page

- URL: https://www.smgov.net/Departments/RentControl/
- Previous hash: e4142b4a1a217e7c7c19b2e85285be09be4c837a16efc2850261d6a111ac8917
- Current hash: 2aee8d1aabcf8dd3f151bd3566aa69535cb3caf76b82c886298923ace9deef18
- Diff signature: whitespace normalization around accordion "Open" toggles + addition of "santamonica.gov - Rent Control" title element
- Classification: **cosmetic (chore)** — identical municipal-CMS template update pattern to LA
- Broker sign-off required: NO
- Caveat: same top-20-lines truncation risk

## §3 Coordinated municipal-CMS observation

Both LA and SM diffs share identical structural pattern (title element added + whitespace normalization around navigation), consistent with a shared component library update across LA-region municipal sites. Not substantive to rent-control policy.

## §4 Lane 3 candidate — tracking target switch

Current cron hashes the top-level jurisdiction landing page (highest-noise target). Lane 3 candidate: switch tracking to primary policy document or "current ordinance" endpoint per jurisdiction, materially reducing cosmetic-vs-substantive classification burden.

## §5 Baseline hash acceptance

The 2026-08-01 current hashes (LA `b3da980...`, SM `2aee8d1...`) are accepted as the new baseline. No cron config update required — the producer already stores the new hash as its snapshot after emitting the notification.

— Jack Taglyan / California Licensed Real Estate Broker / CalDRE B9445457 / Broker Compliance Review · 2026-08-04
