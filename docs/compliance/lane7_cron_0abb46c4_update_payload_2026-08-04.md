# Cron `0abb46c4` (LAHD forms refresh) — Update Payload — 2026-08-04

**Status:** DRAFT — Founder must reconcile §4 against the live cron task before execution because the complete current task text was not available to the repository operator.  
**To be executed by:** Founder Jack Taglyan (Perplexity Computer session, `schedule_cron update` action).  
**Do NOT execute by Claude Code.**

## §1 Change summary

Extend the pinned-forms list from 4 items to 20 items:

- 4 existing pins retained (`renter_protections_notice_en`, `renter_protections_bulletin_es`, `ordinance_187737_text`, `eviction_filing_cover_sheet`)
- 16 replacement/retained-with-review entries represented by Source Packet rows #1–#7, #9–#17, including row #12 with a broker-review flag
- 1 discovered-form tracker entry (`relocation-assistance-english`) marked for removal from discovery output (row #8 deduplication)

The ratified packet and prompt retain the phrase “15 replace / 1 deduplicate / 1 review-flag.” The executable 20-item list treats row #12 as both a replacement and a review-flagged item; Founder must preserve that dual treatment.

## §2 Pinned forms — full 20-item list for the updated cron task text

1. `renter_protections_notice_en` — [retain current live URL from cron 0abb46c4] — existing pin retained; reconcile against live cron state
2. `renter_protections_bulletin_es` — [retain current live URL from cron 0abb46c4] — existing pin retained; reconcile against live cron state
3. `ordinance_187737_text` — https://cityclerk.lacity.org/onlinedocs/2021/21-0042-S3_ord_187737_1-27-23.pdf — existing pin retained; 2026-07-27 host migration precedent
4. `eviction_filing_cover_sheet` — [retain current live URL from cron 0abb46c4] — existing pin retained; reconcile against live cron state
5. `traditional-chinese-07-01-26` — https://housing.lacity.gov/wp-content/uploads/2026/07/Protections-Notice-Traditional-Chinese-07.01.26-ADA.pdf — Lane 2 row #1 replacement
6. `simplified-chinese-07-01-26` — https://housing.lacity.gov/wp-content/uploads/2026/07/Protections-Notice-Simplified-Chinese-07.01.26-ADA.pdf — Lane 2 row #2 replacement
7. `farsi-07-01-26` — https://housing.lacity.gov/wp-content/uploads/2026/07/Protections-Notice-Farsi-07.01.26-ADA.pdf — Lane 2 row #3 replacement
8. `korean-07-01-26` — https://housing.lacity.gov/wp-content/uploads/2026/07/Protections-Notice-Korean-07.01.26-ADA.pdf — Lane 2 row #4 replacement
9. `armenian-07-01-26` — https://housing.lacity.gov/wp-content/uploads/2026/07/Protections-Notice-Armenian-07.01.26-ADA.pdf — Lane 2 row #5 replacement
10. `tagalog-07-01-26` — https://housing.lacity.gov/wp-content/uploads/2026/07/Protections-Notice-Tagalog-07.01.26-ADA.pdf — Lane 2 row #6 replacement
11. `russian-07-01-26` — https://housing.lacity.gov/wp-content/uploads/2026/07/Protections-Notice-Russian-07.01.26-ADA.pdf — Lane 2 row #7 replacement
12. `lahd-subordination-request-sf-app` — https://housing.lacity.gov/wp-content/uploads/2023/06/LAHD-Subordination-Request_SF-App.pdf — Lane 2 row #9 replacement
13. `acknowledgment-of-receipt-of-vca-by-property-owners-and-managers` — https://housing.lacity.gov/wp-content/uploads/2026/07/Acknowledgment-of-Receipt-of-Notification-of-the-Voluntary-Compliance-Agreement-VCA-by-Property-Owners-and-Managers-1.pdf — Lane 2 row #10 replacement
14. `acknowledgment-of-receipt-of-tenant-handbook-appendices` — https://housing.lacity.gov/wp-content/uploads/2026/07/Acknowledgment-of-Receipt-of-Tenant-Handbook-Appendices.pdf — Lane 2 row #11 replacement
15. `january-2025-wildfire-and-critical-windstorm-resolution-faq-eng-4-14-25` — https://dcba.lacounty.gov/wp-content/uploads/2025/04/January-2025-Wildfire-and-Critical-Windstorm-Resolution-FAQ-ENG-4.14.25.pdf — Lane 2 row #12 replacement; broker-review flag required
16. `21-0042-s3-ord-187737-1-27-23` — https://cityclerk.lacity.org/onlinedocs/2021/21-0042-S3_ord_187737_1-27-23.pdf — Lane 2 row #13 host replacement
17. `25-0006-s21-ord-188486-2-24-25` — https://cityclerk.lacity.org/onlinedocs/2025/25-0006-S21_ord_188486_2-24-25.pdf — Lane 2 row #14 host replacement
18. `21-0042-s5-ord-187764-3-27-23-pdf` — https://cityclerk.lacity.org/onlinedocs/2021/21-0042-S5_ord_187764_3-27-23.pdf.pdf — Lane 2 row #15; preserve double .pdf.pdf
19. `owner-builder-permits` — https://dbs.lacity.gov/sites/default/files/efs/forms/pc14/owner-builder-permits.pdf — Lane 2 row #16 LADBS migration
20. `signature-declaration` — https://dbs.lacity.gov/sites/default/files/efs/forms/pc17/signature-declaration.pdf — Lane 2 row #17 LADBS migration

## §3 Broker-review flag mechanism

For row #12 (`january-2025-wildfire-and-critical-windstorm-resolution-faq-eng-4-14-25`), the updated cron task text includes this additional instruction:

> on unreachable OR when this row's status is 'baseline_captured', append '[BROKER REVIEW — DCBA orphaned artifact, coverage period expired 2025-07-31; retention decision pending]' to the notification body.

## §4 Update payload — exact `task` text to pass

```text
DRAFT — FOUNDER MUST RECONCILE AGAINST LIVE CRON `0abb46c4` TASK TEXT BEFORE EXECUTION.

Run the existing LAHD forms refresh workflow without changing its schedule, background, exact, or subagent type settings. Preserve all existing crawl, retry, hashing, notification, and reporting instructions unless expressly amended below.

Pinned forms: use the complete 20-item list in §2 of this artifact. For entries whose URL is marked `[retain current live URL from cron 0abb46c4]`, copy the exact current URL from the live cron task before update; do not execute while any placeholder remains.

Discovery deduplication: remove `relocation-assistance-english` pointing to `Relocation-Assistance-english.pdf` from discovery output because the live dated revision `relocation-assistance-english-6-26-24` is already tracked.

DCBA broker flag: for `january-2025-wildfire-and-critical-windstorm-resolution-faq-eng-4-14-25`, on unreachable OR when status is `baseline_captured`, append `[BROKER REVIEW — DCBA orphaned artifact, coverage period expired 2025-07-31; retention decision pending]` to the notification body.

Preserve the exact double `.pdf.pdf` suffix for the Ord. 187764 URL. Capture a new SHA-256 baseline for every newly replaced URL on the first successful run and distinguish baseline capture from content drift. Continue to report total pinned, discovered, changed, and unreachable counts.
```

## §5 Execution instructions for Founder

1. Reconcile §4 against the live `0abb46c4` task and replace all bracketed placeholders with the exact current values. Do not execute the draft while a placeholder remains.
2. In the Perplexity Computer conversation, invoke `schedule_cron` action=`update`, cron_id=`0abb46c4`, task=<the reconciled text in §4>.
3. Do **not** change the `cron_expression`, `background`, `exact`, or `subagent_type` fields.
4. Confirm the update by invoking `schedule_cron` action=`list`, `cross_session=true`, and locate cron_id=`0abb46c4`; verify the reconciled task text is in place.
5. Next scheduled run stated by the controlling prompt: Monday, 2026-08-10 09:00 PT, under cron expression `0 16 * * 1`. Founder should verify the scheduler's displayed next-run time because the calendar date and weekday must be confirmed against live scheduler state.
