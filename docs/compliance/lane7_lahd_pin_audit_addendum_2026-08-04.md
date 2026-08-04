# LAHD Forms Cron `0abb46c4` — Pin Audit Addendum — 2026-08-04

**Extends:** memory-only pin audit at `memory/sessions/.../lahd_pin_audit_2026-07-27.md` (not in repo; Perplexity Computer session 28e720f4 artifact).  
**Trigger:** 2026-08-03 09:04 CEST cron run reported 17 discovered PDFs as unreachable-after-one-retry.  
**Ratified by Founder:** 2026-08-04 13:10 PDT (Perplexity Computer session 7b1eb766).

## §1 Recovery mapping (15 replace / 1 deduplicate / 1 review-flag)

| # | Slug | Prior URL | Fresh probe result | Root cause | Canonical replacement URL | Rec. action |
|---|---|---|---|---|---|---|
| 1 | `traditional-chinese-02-02-26` | `housing.lacity.gov/wp-content/uploads/2026/02/Traditional-Chinese-02.02.26.pdf` | HTTP 404 | LAHD renamed + re-dated multilingual notice; moved to `/2026/07/` uploads with `Protections-Notice-` prefix and `-ADA` suffix; page label changed from "Traditional Chinese" to "Cantonese" | `https://housing.lacity.gov/wp-content/uploads/2026/07/Protections-Notice-Traditional-Chinese-07.01.26-ADA.pdf` (verified HTTP 200, %PDF-1.6) | Replace URL in producer discovery snapshot; capture new baseline |
| 2 | `simplified-chinese-02-02-26` | `housing.lacity.gov/wp-content/uploads/2026/02/Simplified-Chinese-02.02.26.pdf` | HTTP 404 | Same as #1; page label changed to "Mandarin" | `https://housing.lacity.gov/wp-content/uploads/2026/07/Protections-Notice-Simplified-Chinese-07.01.26-ADA.pdf` (200) | Replace + baseline |
| 3 | `farsi-02-02-26` | `housing.lacity.gov/wp-content/uploads/2026/02/Farsi-02.02.26.pdf` | HTTP 404 | Same as #1 | `https://housing.lacity.gov/wp-content/uploads/2026/07/Protections-Notice-Farsi-07.01.26-ADA.pdf` (200) | Replace + baseline |
| 4 | `korean-02-02-26` | `housing.lacity.gov/wp-content/uploads/2026/02/Korean-02.02.26.pdf` | HTTP 404 | Same as #1 | `https://housing.lacity.gov/wp-content/uploads/2026/07/Protections-Notice-Korean-07.01.26-ADA.pdf` (200) | Replace + baseline |
| 5 | `armenian-02-02-26` | `housing.lacity.gov/wp-content/uploads/2026/02/Armenian-02.02.26.pdf` | HTTP 404 | Same as #1 | `https://housing.lacity.gov/wp-content/uploads/2026/07/Protections-Notice-Armenian-07.01.26-ADA.pdf` (200) | Replace + baseline |
| 6 | `tagalog-02-02-26` | `housing.lacity.gov/wp-content/uploads/2026/02/Tagalog-02.02.26.pdf` | HTTP 404 | Same as #1 | `https://housing.lacity.gov/wp-content/uploads/2026/07/Protections-Notice-Tagalog-07.01.26-ADA.pdf` (200) | Replace + baseline |
| 7 | `russian-02-02-26` | `housing.lacity.gov/wp-content/uploads/2026/02/Russian-02.02.26.pdf` | HTTP 404 | Same as #1 | `https://housing.lacity.gov/wp-content/uploads/2026/07/Protections-Notice-Russian-07.01.26-ADA.pdf` (200) | Replace + baseline |
| 8 | `relocation-assistance-english` | `housing.lacity.gov/wp-content/uploads/2020/06/Relocation-Assistance-english.pdf` (lowercase "english") | HTTP 404 | Superseded/merged into the dated revision `Relocation-Assistance-English-6.26.24.pdf` which is **already** tracked as a separate discovered form and returns HTTP 200 | (retire — folded into `relocation-assistance-english-6-26-24` already in tracker) | Remove from discovery / mark deprecated |
| 9 | `lahd-subordination-request-sfr` | `housing.lacity.gov/wp-content/uploads/2022/01/LAHD-Subordination-Request-SFR.pdf` | HTTP 404 | Renamed/relocated by LAHD to homeowners loans landing page | `https://housing.lacity.gov/wp-content/uploads/2023/06/LAHD-Subordination-Request_SF-App.pdf` (200) | Replace URL in producer discovery snapshot; rename slug to `lahd-subordination-request-sf-app` |
| 10 | `acknowledgment-of-receipt-of-notification-of-the-voluntary-compliance-agreement-vca-by-property-owners-and-managers` | `lahousing.lacity.org/AAHR/Documents/PostersDocuments/Acknowledgment%20of%20Receipt%20of%20Notification%20of%20the%20Voluntary%20Compliance%20Agreement%20(VCA)%20by%20Property%20Owners%20and%20Managers.PDF` | HTTP 404 | Host retirement — LAHD moved AAHR posters off `lahousing.lacity.org` to `housing.lacity.gov` WordPress uploads | `https://housing.lacity.gov/wp-content/uploads/2026/07/Acknowledgment-of-Receipt-of-Notification-of-the-Voluntary-Compliance-Agreement-VCA-by-Property-Owners-and-Managers-1.pdf` (200) | Replace URL; keep slug (may append `-1` suffix per LAHD file naming) |
| 11 | `tenant-receipt-acknowledgement` | `lahousing.lacity.org/AAHR/Documents/PostersDocuments/Tenant%20Receipt%20Acknowledgement.pdf` | HTTP 404 | Same host retirement as #10; document also retitled to "Acknowledgment of Receipt of Tenant Handbook, Appendices, Summary of Policies, and Questions and Answers" | `https://housing.lacity.gov/wp-content/uploads/2026/07/Acknowledgment-of-Receipt-of-Tenant-Handbook-Appendices.pdf` (200) | Replace URL; rename slug to `acknowledgment-of-receipt-of-tenant-handbook-appendices` |
| 12 | `january-2025-wildfire-and-critical-windstorm-resolution-faq-eng-2-28-25` | `dcba.lacounty.gov/wp-content/uploads/2025/02/January-2025-Wildfire-and-Critical-Windstorm-Resolution-FAQ-ENG-2.28.25.pdf` | HTTP 404 | DCBA updated the FAQ (2/28/25 → 4/14/25 revision); the new file is live but the DCBA page that used to link it has been archived because the covered protection period expired 2025-07-31 | `https://dcba.lacounty.gov/wp-content/uploads/2025/04/January-2025-Wildfire-and-Critical-Windstorm-Resolution-FAQ-ENG-4.14.25.pdf` (200, but currently orphaned — no live DCBA page links to it) | Replace URL; **broker review required** — decide whether to keep tracking an orphaned artifact after the covered period ended |
| 13 | `21-0042-s3-ord-187737-1-27-23` | `clkrep.lacity.org/onlinedocs/2021/21-0042-S3_ord_187737_1-27-23.pdf` | Connection reset by peer (TCP-level) | LA City Clerk host retirement — same `clkrep.lacity.org` → `cityclerk.lacity.org` migration already fixed for the pinned ordinance in 2026-07-27 pin audit | `https://cityclerk.lacity.org/onlinedocs/2021/21-0042-S3_ord_187737_1-27-23.pdf` (200, application/pdf) | Replace URL (same path, different subdomain) |
| 14 | `25-0006-s21-ord-188486-2-24-25` | `clkrep.lacity.org/onlinedocs/2025/25-0006-S21_ord_188486_2-24-25.pdf` | Connection reset by peer | Same LA City Clerk host migration | `https://cityclerk.lacity.org/onlinedocs/2025/25-0006-S21_ord_188486_2-24-25.pdf` (200, application/pdf) | Replace URL |
| 15 | `21-0042-s5-ord-187764-3-27-23-pdf` | `clkrep.lacity.org/onlinedocs/2021/21-0042-S5_ord_187764_3-27-23.pdf.pdf` (note double `.pdf.pdf`) | Connection reset by peer | Same LA City Clerk host migration; the double `.pdf.pdf` is preserved on the new host — LAHD source pages link to this exact filename (this is not a typo to fix) | `https://cityclerk.lacity.org/onlinedocs/2021/21-0042-S5_ord_187764_3-27-23.pdf.pdf` (200, application/pdf; verified — single `.pdf` variant is 404) | Replace URL; **preserve** the double `.pdf.pdf` suffix |
| 16 | `owner-builder-permits` | `ladbs.org/docs/default-source/forms/plan-check-2014/owner-builder-permits.pdf?sfvrsn=cae8eb53_23` | 301 redirect to `dbs.lacity.gov/?sfvrsn=cae8eb53_23` (path dropped) | LADBS domain migration `ladbs.org` → `dbs.lacity.gov` (Drupal CMS migration); redirect drops the file path | `https://dbs.lacity.gov/sites/default/files/efs/forms/pc14/owner-builder-permits.pdf` (verified live via fetch — "Notice to Property Owner for Owner-Builder Permits, Rev. 10/15/18") | Replace URL |
| 17 | `signature-declaration` | `ladbs.org/docs/default-source/forms/plan-check-2014/signature-declaration.pdf?sfvrsn=e54ff753_20` | 301 redirect to `dbs.lacity.gov/?sfvrsn=e54ff753_20` (path dropped) | Same LADBS domain migration | `https://dbs.lacity.gov/sites/default/files/efs/forms/pc17/signature-declaration.pdf` (verified live; page-check-2014 folder was renamed to `pc17` for this file — different from #16 which stayed at `pc14`) | Replace URL |

## §2 Pattern-extension precedents already ratified

- LA City Clerk `clkrep.lacity.org` → `cityclerk.lacity.org` subdomain migration ratified 2026-07-27 for `ordinance_187737_text`. Rows #13, #14, #15 in §1 extend this ratified pattern mechanically.
- LAHD site restructure (`/landlords/*` removed) ratified 2026-07-27 for `eviction_filing_cover_sheet`. Rows #9, #10, #11 in §1 extend this ratified pattern.

## §3 New patterns requiring Founder confirmation

- LADBS domain migration `ladbs.org` → `dbs.lacity.gov` (rows #16, #17). Founder ratification 2026-08-04 13:10 PDT recorded this as a mechanical extension of the 2026-07-27 host-migration precedent; documents are procedural (Owner-Builder Permits notice; Signature Declaration attachment) and not substantive legal text.
- LAHD file-rename+relocate pattern (rows #1–#7) — multilingual notices renamed from `[Language]-MM.DD.YY.pdf` to `Protections-Notice-[Language]-MM.DD.YY-ADA.pdf` and moved from `/2026/02/` to `/2026/07/`. Founder ratification 2026-08-04 13:10 PDT.
- LAHD cross-host retirement (rows #10, #11) — `lahousing.lacity.org/AAHR/...` → `housing.lacity.gov/wp-content/uploads/...`. Founder ratification 2026-08-04 13:10 PDT.

## §4 Broker-review flag

Row #12 (DCBA wildfire FAQ ENG 2/28/25 → 4/14/25 revision) retained with `broker_review_reason` flag: file live at successor URL but no live DCBA page links to it; covered protection period expired 2025-07-31. Retention-vs-retirement decision deferred to post-Lane-2 Founder review.

## §5 Deprecation

Row #8 (`relocation-assistance-english`) removed from tracker — the dated revision `relocation-assistance-english-6-26-24` at `https://housing.lacity.gov/wp-content/uploads/2020/06/Relocation-Assistance-English-6.26.24.pdf` already exists as a discovered-form tracker entry in the 2026-08-03 report and returns HTTP 200. Deduplication only, no data loss.

## §6 Producer-state persistence gap

The 2026-07-27 pin audit and this 2026-08-04 addendum were only compilable because Perplexity Computer's session 28e720f4 workspace persisted cron reports under memory/sessions. Lane 3 candidate: durable structured persistence (Notion mirror row per run, or Supabase table) to remove cross-session-workspace dependency.

— Jack Taglyan / California Licensed Real Estate Broker / CalDRE B9445457 / Broker Compliance Review · 2026-08-04
