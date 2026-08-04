# Cron `0abb46c4` (LAHD forms refresh) — Update Payload — 2026-08-04

**Status:** FINAL — READY FOR FOUNDER EXECUTION.
**To be executed by:** Founder Jack Taglyan (Perplexity Computer session, `schedule_cron update` action).
**Do NOT execute by Claude Code.**

Reconciled against live cron `0abb46c4` task text on 2026-08-04 13:36 PDT (see §6 Reconciliation Log). All placeholders resolved. Duplicate entry removed. Slug convention normalized. DCBA flag mechanism tightened. Notion mirror step upgraded to reflect Lane 1 validation.

## §1 Change summary

Extend the pinned-forms list from 4 items to **19 items** (initial DRAFT proposed 20; item #16 removed as duplicate of existing pin #3 — see §6.2):

- 4 existing pins retained (`renter_protections_notice_en`, `renter_protections_bulletin_es`, `ordinance_187737_text`, `eviction_filing_cover_sheet`) with live URLs preserved verbatim
- 15 new pins added from Source Packet §1.3 rows #1–#7 (LAHD multilingual notices), #9 (subordination request), #10 and #11 (AAHR poster host migration), #12 (DCBA wildfire FAQ — broker-review flagged), #13–#15 (three ordinances at `cityclerk.lacity.org`; note: row #13 already applied to existing pin #3 and NOT re-added), #16 and #17 (LADBS forms at `dbs.lacity.gov`)
- 1 discovered-form tracker entry (`relocation-assistance-english`) marked for removal from discovery output (row #8 deduplication)

Row #12 (DCBA wildfire FAQ) is a URL replacement AND carries a broker-review flag; §3 describes the flag mechanism.

## §2 Pinned forms — full 19-item list for the updated cron task text

1. `renter_protections_notice_en` — https://housing.lacity.gov/wp-content/uploads/2023/06/LA-RENTER-Protections-Notification.pdf — existing pin retained
2. `renter_protections_bulletin_es` — https://housing.lacity.gov/wp-content/uploads/2023/05/LA-Renter-protections-Bulletin-Spanish.pdf — existing pin retained
3. `ordinance_187737_text` — https://cityclerk.lacity.org/onlinedocs/2021/21-0042-S3_ord_187737_1-27-23.pdf — existing pin retained (already on cityclerk.lacity.org per 2026-07-27 host-migration ratification)
4. `eviction_filing_cover_sheet` — https://housing.lacity.gov/wp-content/uploads/2023/02/Eviction_Filing_Cover_Sheet.pdf — existing pin retained; `Rev 2.6.2026` baseline instruction and `COVER_SHEET_REVISION` follow-up prose preserved (see §4)
5. `traditional_chinese_07_01_26` — https://housing.lacity.gov/wp-content/uploads/2026/07/Protections-Notice-Traditional-Chinese-07.01.26-ADA.pdf — Source Packet row #1
6. `simplified_chinese_07_01_26` — https://housing.lacity.gov/wp-content/uploads/2026/07/Protections-Notice-Simplified-Chinese-07.01.26-ADA.pdf — row #2
7. `farsi_07_01_26` — https://housing.lacity.gov/wp-content/uploads/2026/07/Protections-Notice-Farsi-07.01.26-ADA.pdf — row #3
8. `korean_07_01_26` — https://housing.lacity.gov/wp-content/uploads/2026/07/Protections-Notice-Korean-07.01.26-ADA.pdf — row #4
9. `armenian_07_01_26` — https://housing.lacity.gov/wp-content/uploads/2026/07/Protections-Notice-Armenian-07.01.26-ADA.pdf — row #5
10. `tagalog_07_01_26` — https://housing.lacity.gov/wp-content/uploads/2026/07/Protections-Notice-Tagalog-07.01.26-ADA.pdf — row #6
11. `russian_07_01_26` — https://housing.lacity.gov/wp-content/uploads/2026/07/Protections-Notice-Russian-07.01.26-ADA.pdf — row #7
12. `lahd_subordination_request_sf_app` — https://housing.lacity.gov/wp-content/uploads/2023/06/LAHD-Subordination-Request_SF-App.pdf — row #9
13. `vca_acknowledgment_property_owners_managers` — https://housing.lacity.gov/wp-content/uploads/2026/07/Acknowledgment-of-Receipt-of-Notification-of-the-Voluntary-Compliance-Agreement-VCA-by-Property-Owners-and-Managers-1.pdf — row #10
14. `tenant_handbook_appendices_acknowledgment` — https://housing.lacity.gov/wp-content/uploads/2026/07/Acknowledgment-of-Receipt-of-Tenant-Handbook-Appendices.pdf — row #11
15. `dcba_wildfire_windstorm_resolution_faq_eng_4_14_25` — https://dcba.lacounty.gov/wp-content/uploads/2025/04/January-2025-Wildfire-and-Critical-Windstorm-Resolution-FAQ-ENG-4.14.25.pdf — row #12; broker-review flagged (see §3)
16. `ord_188486_2_24_25` — https://cityclerk.lacity.org/onlinedocs/2025/25-0006-S21_ord_188486_2-24-25.pdf — row #14; extends 2026-07-27 host-migration ratification
17. `ord_187764_3_27_23` — https://cityclerk.lacity.org/onlinedocs/2021/21-0042-S5_ord_187764_3-27-23.pdf.pdf — row #15; extends 2026-07-27 host-migration ratification; **preserve exact double `.pdf.pdf` suffix**
18. `owner_builder_permits` — https://dbs.lacity.gov/sites/default/files/efs/forms/pc14/owner-builder-permits.pdf — row #16; LADBS `ladbs.org` → `dbs.lacity.gov` domain migration (Founder ratified 2026-08-04 13:10 PDT)
19. `signature_declaration` — https://dbs.lacity.gov/sites/default/files/efs/forms/pc17/signature-declaration.pdf — row #17; LADBS migration; note `pc17` path (not `pc14`)

## §3 Broker-review flag mechanism (DCBA wildfire FAQ)

For pin `dcba_wildfire_windstorm_resolution_faq_eng_4_14_25`, the updated cron task text includes this instruction:

> On every run, regardless of hash status, append `[BROKER REVIEW — DCBA orphaned artifact, coverage period expired 2025-07-31; retention decision pending]` to the notification body until Founder removes the flag by explicit cron update.

This is a nag-until-removed flag, not a one-shot. Rationale: the file is live at its successor URL but no live DCBA page links to it; retention-vs-retirement is a decision the Founder deferred at Lane 2 ratification. A one-shot flag would fire only on baseline capture and then silence; a persistent flag keeps the retention question visible in every weekly notification until resolved.

## §4 Update payload — exact `task` text to pass

```text
LAHD forms refresh — OwnerPilot AI automation cron #5 (per ownerpilot_automation_layer_broker_ruling_2026-06-28.md).

Fetch all landlord/tenant forms from https://housing.lacity.gov/landlords/forms-notices and any linked subpages with downloadable PDFs.

## Explicitly pinned forms (must always be checked, in addition to discovery)

These forms have authoritative URLs and stable form_slugs. If discovery fails to find them, the run is PARTIAL and must report which pinned form was missed.

1. form_slug: `renter_protections_notice_en`
   URL: https://housing.lacity.gov/wp-content/uploads/2023/06/LA-RENTER-Protections-Notification.pdf
   basis: Ord. No. 187737 — start-of-tenancy / posting disclosure (JCO summary). Distinct from RTC.

2. form_slug: `renter_protections_bulletin_es`
   URL: https://housing.lacity.gov/wp-content/uploads/2023/05/LA-Renter-protections-Bulletin-Spanish.pdf
   basis: Spanish-language counterpart bulletin to the English Renter Protections Notice.

3. form_slug: `ordinance_187737_text`
   URL: https://cityclerk.lacity.org/onlinedocs/2021/21-0042-S3_ord_187737_1-27-23.pdf
   basis: Authoritative ordinance text (City Clerk). Reference for ratification flagging.

4. form_slug: `eviction_filing_cover_sheet`
   URL: https://housing.lacity.gov/wp-content/uploads/2023/02/Eviction_Filing_Cover_Sheet.pdf
   basis: LAHD eviction filing cover sheet, Rev 2.6.2026 baseline (per lahd_eviction_filing_cover_sheet_and_3day_count_defect_broker_ruling_2026-06-30.md and pr_c_lahd_checklist_scope_omnibus_broker_ruling_2026-07-01.md §2.4). If URL 404s during discovery, try https://housing.lacity.gov/eviction-notices as the canonical landing page and locate the direct PDF link (anchor text 'LAHD Eviction Notice Filing Cover Sheet'). Any revision-string change from `Rev 2.6.2026` MUST be flagged in the notification body — the app-runtime `COVER_SHEET_REVISION` constant (per PR-C §7.2 as-built fallback) requires broker follow-up when drift is detected: (a) update the app constant in a follow-up PR, (b) invalidate any served copies per lahd_eviction_filing_cover_sheet_and_3day_count_defect_broker_ruling_2026-06-30.md §3.4 refresh discipline.

5. form_slug: `traditional_chinese_07_01_26`
   URL: https://housing.lacity.gov/wp-content/uploads/2026/07/Protections-Notice-Traditional-Chinese-07.01.26-ADA.pdf
   basis: LAHD multilingual renter-protections notice (Traditional Chinese, now labeled Cantonese by LAHD). Successor to prior Traditional-Chinese-02.02.26.pdf per Lane 2 §1.3 row #1 (Founder ratified 2026-08-04).

6. form_slug: `simplified_chinese_07_01_26`
   URL: https://housing.lacity.gov/wp-content/uploads/2026/07/Protections-Notice-Simplified-Chinese-07.01.26-ADA.pdf
   basis: LAHD multilingual renter-protections notice (Simplified Chinese, now labeled Mandarin by LAHD). Lane 2 §1.3 row #2.

7. form_slug: `farsi_07_01_26`
   URL: https://housing.lacity.gov/wp-content/uploads/2026/07/Protections-Notice-Farsi-07.01.26-ADA.pdf
   basis: LAHD multilingual renter-protections notice (Farsi). Lane 2 §1.3 row #3.

8. form_slug: `korean_07_01_26`
   URL: https://housing.lacity.gov/wp-content/uploads/2026/07/Protections-Notice-Korean-07.01.26-ADA.pdf
   basis: LAHD multilingual renter-protections notice (Korean). Lane 2 §1.3 row #4.

9. form_slug: `armenian_07_01_26`
   URL: https://housing.lacity.gov/wp-content/uploads/2026/07/Protections-Notice-Armenian-07.01.26-ADA.pdf
   basis: LAHD multilingual renter-protections notice (Armenian). Lane 2 §1.3 row #5.

10. form_slug: `tagalog_07_01_26`
    URL: https://housing.lacity.gov/wp-content/uploads/2026/07/Protections-Notice-Tagalog-07.01.26-ADA.pdf
    basis: LAHD multilingual renter-protections notice (Tagalog). Lane 2 §1.3 row #6.

11. form_slug: `russian_07_01_26`
    URL: https://housing.lacity.gov/wp-content/uploads/2026/07/Protections-Notice-Russian-07.01.26-ADA.pdf
    basis: LAHD multilingual renter-protections notice (Russian). Lane 2 §1.3 row #7.

12. form_slug: `lahd_subordination_request_sf_app`
    URL: https://housing.lacity.gov/wp-content/uploads/2023/06/LAHD-Subordination-Request_SF-App.pdf
    basis: LAHD Subordination Request (SF App). Lane 2 §1.3 row #9.

13. form_slug: `vca_acknowledgment_property_owners_managers`
    URL: https://housing.lacity.gov/wp-content/uploads/2026/07/Acknowledgment-of-Receipt-of-Notification-of-the-Voluntary-Compliance-Agreement-VCA-by-Property-Owners-and-Managers-1.pdf
    basis: LAHD AAHR — Voluntary Compliance Agreement acknowledgment. Cross-host retirement from lahousing.lacity.org/AAHR/... to housing.lacity.gov/wp-content/uploads/... Lane 2 §1.3 row #10 (Founder ratified 2026-08-04).

14. form_slug: `tenant_handbook_appendices_acknowledgment`
    URL: https://housing.lacity.gov/wp-content/uploads/2026/07/Acknowledgment-of-Receipt-of-Tenant-Handbook-Appendices.pdf
    basis: LAHD AAHR — Tenant Handbook appendices acknowledgment. Lane 2 §1.3 row #11.

15. form_slug: `dcba_wildfire_windstorm_resolution_faq_eng_4_14_25`
    URL: https://dcba.lacounty.gov/wp-content/uploads/2025/04/January-2025-Wildfire-and-Critical-Windstorm-Resolution-FAQ-ENG-4.14.25.pdf
    basis: LA County DCBA — January 2025 Wildfire and Critical Windstorm Resolution FAQ (English, 4/14/25 revision). Lane 2 §1.3 row #12. BROKER-REVIEW FLAGGED: on every run, regardless of hash status, append '[BROKER REVIEW — DCBA orphaned artifact, coverage period expired 2025-07-31; retention decision pending]' to the notification body until Founder removes the flag by explicit cron update.

16. form_slug: `ord_188486_2_24_25`
    URL: https://cityclerk.lacity.org/onlinedocs/2025/25-0006-S21_ord_188486_2-24-25.pdf
    basis: LA City Clerk — Ord. 188486 (2/24/25). Extends 2026-07-27 clkrep-to-cityclerk host-migration ratification. Lane 2 §1.3 row #14.

17. form_slug: `ord_187764_3_27_23`
    URL: https://cityclerk.lacity.org/onlinedocs/2021/21-0042-S5_ord_187764_3-27-23.pdf.pdf
    basis: LA City Clerk — Ord. 187764 (3/27/23). Preserve exact double `.pdf.pdf` suffix — the single `.pdf` variant returns 404. Extends 2026-07-27 host-migration ratification. Lane 2 §1.3 row #15.

18. form_slug: `owner_builder_permits`
    URL: https://dbs.lacity.gov/sites/default/files/efs/forms/pc14/owner-builder-permits.pdf
    basis: LADBS — Owner-Builder Permits notice. LADBS `ladbs.org` → `dbs.lacity.gov` domain migration; Founder ratified 2026-08-04 13:10 PDT as mechanical extension of 2026-07-27 host-migration precedent. Lane 2 §1.3 row #16.

19. form_slug: `signature_declaration`
    URL: https://dbs.lacity.gov/sites/default/files/efs/forms/pc17/signature-declaration.pdf
    basis: LADBS — Signature Declaration attachment. Note pc17 path (not pc14 as with the Owner-Builder notice). Same LADBS migration. Lane 2 §1.3 row #17.

## Discovery deduplication

Discovery output must exclude `relocation-assistance-english` pointing to `Relocation-Assistance-english.pdf` — the dated revision `relocation-assistance-english-6-26-24` at https://housing.lacity.gov/wp-content/uploads/2020/06/Relocation-Assistance-English-6.26.24.pdf is already returned as a discovered form and returns HTTP 200. Deduplication only.

## Workflow

For each PDF (pinned + discovered):
1. Download it.
2. Compute SHA-256.
3. Compare against snapshot in /home/user/workspace/cron_tracking/lahd_forms/snapshots/<form_slug>.sha256
4. If hash changed: download the new PDF, save it to /home/user/workspace/cron_tracking/lahd_forms/current/<form_slug>.pdf, log the change.

On first run for a newly pinned form: capture baseline (save SHA + PDF), include in the notification as "<form_slug> — baseline captured" alongside any other results.

Generate report at /home/user/workspace/cron_tracking/lahd_forms/reports/<YYYY-MM-DD>_lahd_refresh.md with:
- Headline: 'No changes detected' OR '<N> forms changed since last check (<prev date>)'
- Pinned-forms section: for each pinned form, show form_slug, status (baseline_captured / unchanged / changed / unreachable), SHA(s), file size, source URL
- Discovered-forms section: same per-form details for any non-pinned forms found via discovery
- Source links: every URL pulled
- Signed: '— Jack Taglyan / California Licensed Real Estate Broker / CalDRE B9445457 / Broker Compliance Review · <date>'

Failure handling: retry once after 60 seconds. If still failing, write a PARTIAL report and send notification with 'PARTIAL' prefix; leave snapshots untouched for the affected forms.

Notification:
- channels: ['in_app', 'email']
- title: 'LAHD forms refresh — <N> change(s) detected' OR '— no changes this cycle' OR '— baseline captured (<form_slug list>)'
- body: 1–2 sentences per changed or newly-baselined form, under 800 chars. If `eviction_filing_cover_sheet` shows any revision string other than `Rev 2.6.2026`, prepend the body with '[COVER SHEET REVISION DRIFT — broker follow-up required]'. For `dcba_wildfire_windstorm_resolution_faq_eng_4_14_25`, on every run regardless of hash status, append '[BROKER REVIEW — DCBA orphaned artifact, coverage period expired 2025-07-31; retention decision pending]' to the notification body until Founder removes the flag by explicit cron update.
- email_args: {'template': 'generic', 'subject': 'LAHD forms refresh — <date>'}
- schedule_description: 'Weekly · Mon 09:00 PT'

Mirror to Notion: after run completes, POST a row to the OwnerPilot Automation Log Production Notion database via external-caller path `POST /api/automation/log` with header `x-automation-secret`. The Production DB `af32f514-d1ef-4742-9241-b082fc8c4573` and external-caller path were validated in Lane 1 (attestation `docs/compliance/lane7_production_remediation_attestation_2026-08-04.md`). If the POST fails (non-2xx), note it in the report but do not fail the run.
```

## §5 Execution instructions for Founder

1. Open a Perplexity Computer conversation (any session; the scheduler is cross-session).
2. Invoke `schedule_cron` with:
   - action=`update`
   - cron_id=`0abb46c4`
   - task=<the exact fenced text in §4 above, from `LAHD forms refresh —` through the final `... but do not fail the run.` line>
3. Do NOT change `cron_expression` (stays `0 16 * * 1`), `background`, `exact`, or `subagent_type`.
4. Confirm the update by invoking `schedule_cron` action=`list`, `cross_session=true`; locate cron_id=`0abb46c4`; verify the pinned-forms list contains 19 numbered entries and the DCBA broker-review clause is present.
5. Verify the scheduler's displayed next-run time. As of reconciliation (2026-08-04 13:36 PDT), live cron shows next run Monday, August 10, 2026 at 6:00 PM CEST = 09:00 PT. The update should not change this.
6. After successful `schedule_cron update`, execute the Lane 2 §L2.7 Notion completion row via `POST /api/automation/log` on Production with header `x-automation-secret`. Do not merge PR #339 until both the cron update and the Notion row succeed.

## §6 Reconciliation log (added 2026-08-04 13:36 PDT)

This section records the changes made between the initial DRAFT payload (committed at branch head `54aff902…` on 2026-08-04) and this FINAL version. Reconciliation basis: live cron `0abb46c4` task text pulled via `schedule_cron list cross_session=true` at 2026-08-04 13:33 PDT.

### §6.1 Placeholder resolution

Three DRAFT entries carried `[retain current live URL from cron 0abb46c4]` placeholders. All three resolved against live cron:

| # | form_slug | Resolved URL |
|---|---|---|
| 1 | `renter_protections_notice_en` | `https://housing.lacity.gov/wp-content/uploads/2023/06/LA-RENTER-Protections-Notification.pdf` |
| 2 | `renter_protections_bulletin_es` | `https://housing.lacity.gov/wp-content/uploads/2023/05/LA-Renter-protections-Bulletin-Spanish.pdf` |
| 4 | `eviction_filing_cover_sheet` | `https://housing.lacity.gov/wp-content/uploads/2023/02/Eviction_Filing_Cover_Sheet.pdf` |

### §6.2 Duplicate removal — item #16 dropped

The DRAFT proposed adding `21-0042-s3-ord-187737-1-27-23` as item #16, pointing to `https://cityclerk.lacity.org/onlinedocs/2021/21-0042-S3_ord_187737_1-27-23.pdf`. The live cron already carries this exact URL as existing pin #3 (`ordinance_187737_text`). Source Packet row #13 was the migration for this ordinance, but the migration was ratified and applied on 2026-07-27. Item #16 removed. List size: 20 → 19.

### §6.3 Slug normalization

DRAFT items #5–#20 used kebab-case form_slugs, inconsistent with the snake_case convention of live pins #1–#4. Normalized all new form_slugs to snake_case:

| DRAFT (kebab) | FINAL (snake) |
|---|---|
| `traditional-chinese-07-01-26` | `traditional_chinese_07_01_26` |
| `simplified-chinese-07-01-26` | `simplified_chinese_07_01_26` |
| `farsi-07-01-26` | `farsi_07_01_26` |
| `korean-07-01-26` | `korean_07_01_26` |
| `armenian-07-01-26` | `armenian_07_01_26` |
| `tagalog-07-01-26` | `tagalog_07_01_26` |
| `russian-07-01-26` | `russian_07_01_26` |
| `lahd-subordination-request-sf-app` | `lahd_subordination_request_sf_app` |
| `acknowledgment-of-receipt-of-vca-by-property-owners-and-managers` | `vca_acknowledgment_property_owners_managers` |
| `acknowledgment-of-receipt-of-tenant-handbook-appendices` | `tenant_handbook_appendices_acknowledgment` |
| `january-2025-wildfire-and-critical-windstorm-resolution-faq-eng-4-14-25` | `dcba_wildfire_windstorm_resolution_faq_eng_4_14_25` |
| `25-0006-s21-ord-188486-2-24-25` | `ord_188486_2_24_25` |
| `21-0042-s5-ord-187764-3-27-23-pdf` | `ord_187764_3_27_23` |
| `owner-builder-permits` | `owner_builder_permits` |
| `signature-declaration` | `signature_declaration` |

### §6.4 DCBA broker-review flag mechanism tightened

DRAFT §3 flag fired only "on unreachable OR when this row's status is 'baseline_captured'". Baseline capture is a one-shot state; the flag would silence after the first successful run. FINAL §3 changes to "on every run, regardless of hash status, until Founder removes the flag by explicit cron update" — nag-until-removed, consistent with the retention-decision-pending posture.

### §6.5 Notion mirror step upgraded

DRAFT preserved the live cron's conditional Notion step ("If the database doesn't exist yet (Claude Code hasn't created it), skip the Notion step"). As of Lane 1 close (2026-08-04), the Production Notion DB `af32f514-d1ef-4742-9241-b082fc8c4573` exists and the external-caller path `POST /api/automation/log` with `x-automation-secret` header was validated. FINAL updates the task text to POST to the validated external-caller path and cite the Lane 1 attestation, with "note failure but do not fail the run" as the failure mode.

### §6.6 Preserved verbatim from live cron

The following live-cron content was preserved verbatim in the FINAL payload's §4 task text without modification:
- Header line ("LAHD forms refresh — OwnerPilot AI automation cron #5 (per ownerpilot_automation_layer_broker_ruling_2026-06-28.md).")
- Discovery target URL ("https://housing.lacity.gov/landlords/forms-notices")
- Pins #1–#4 (URLs and basis prose, including `eviction_filing_cover_sheet` `Rev 2.6.2026` broker-follow-up prose)
- Workflow steps 1–4 and snapshot/report paths
- Report format, headline options, and signature line
- Failure handling (retry once after 60s → PARTIAL)
- Notification channels, title options, email_args, schedule_description

— Jack Taglyan / California Licensed Real Estate Broker / CalDRE B9445457 / Broker Compliance Review · 2026-08-04
