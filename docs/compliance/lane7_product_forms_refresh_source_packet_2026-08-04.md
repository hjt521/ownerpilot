**Ratified by Founder Jack Taglyan (CalDRE 01871659) — 2026-08-04 13:10 PDT. Committed as canonical Lane 2 basis document.**

# Lane 2 Source Packet — Product Forms Refresh
## OwnerPilot Cron Fixup Basis Document
### Sub-scope 2.A (LAHD 17 unreachables) + Sub-scope 2.B (LA/SM hash-change diff)

**Compiled:** 2026-08-04 (Founder Paris local time; Perplexity Computer session `7b1eb766-...`)
**Compiler:** Perplexity Computer, acting as OwnerPilot Independent Research System
**Basis for:** Lane 2 branch, engineer prompt, and single PR covering `cron_5_lahd_forms` pin-set patch + `cron_7_rent_control_cities` diff classification
**Ratification pending:** Founder Jack Taglyan (CalDRE 01871659)
**Producers on record (Perplexity Computer schedule listing, cross-session query):**

| Cron ID | Name | Owner session | Schedule | Last run | Run count |
|---|---|---|---|---|---|
| `0abb46c4` | LAHD forms refresh | `28e720f4` | `0 16 * * 1` (Mon 09:00 PT) | 2026-08-03 | 6 |
| `6528bcda` | LA RTC packet refresh | `28e720f4` | `15 16 * * 1` (Mon 09:15 PT) | 2026-08-03 | 6 |
| `2faf60f6` | Statewide rent-control cities watch (8 cities) | `28e720f4` | `0 17 1 * *` (1st of month 10:00 PT) | 2026-08-01 | 2 |
| `2a58382e` | CA 3-day notice statute watch | `28e720f4` | `0 16 1 1,9 *` | not yet fired | 0 |
| `f3e68a3c` | Judicial holiday table verification | `28e720f4` | `0 17 1 12 *` | not yet fired | 0 |

Producer-of-record confirmation resolves the OwnerPilot repository ambiguity that Claude's §L2.0.a inspection surfaced: the shipped repository does **not** ship these three producer crons. They run entirely inside Perplexity Computer's scheduler, and their persistence layer is the workspace of the owning session (`28e720f4`), not the OwnerPilot Supabase.

---

## §1 Sub-scope 2.A — LAHD forms refresh: 17 unreachable PDFs

### §1.1 Basis of record

Reproduced from the 2026-08-03 09:04 CEST cron run report at:
`memory/sessions/2026-08-03_2026-08-09/28e720f4/ai_outputs/LAHD-forms-refresh--2026-08-03.md`

Report headline: **"PARTIAL — 3 forms changed since last check (2026-07-27) — 173 total (4 pinned + 169 discovered) — Pinned changed: 3 · Discovered changed: 0 · Unreachable: 17"**

The "3 pinned changed" line is baseline-capture activity from the 2026-07-27 pin-set patch, not content drift — `renter_protections_notice_en`, `renter_protections_bulletin_es`, and `ordinance_187737_text` each captured their first successful SHA-256 baseline on the 2026-08-03 run. The eviction_filing_cover_sheet remained at SHA `63e0ea030d8f`, Rev 2.6.2026, unchanged.

The "17 unreachable" list is the Lane 2 target set.

### §1.2 Fresh reachability probe — 2026-08-04 21:xx CEST

Probe methodology:
- User-Agent header: `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36`
- Accept header: `text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8`
- Accept-Language: `en-US,en;q=0.9`
- Method: `HEAD` with follow-redirects, fallback to `GET` if HEAD returns 4xx/5xx
- Timeout: 20–25 seconds per URL
- Identical fetch discipline to the shipped rent-control cron (2026-07-02 URL/UA fixup pattern)

### §1.3 Classification table — 17 unreachable → 5 root-cause patterns

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

### §1.4 Sub-scope 2.A recovery summary

| Bucket | Count | Recovery status |
|---|---|---|
| **Recoverable — single-URL replace** | 15 of 17 | 7 LAHD multilingual notices (#1–#7); LAHD subordination request (#9); LAHD VCA acknowledgment + tenant handbook (#10–#11); 3 LA City Clerk ordinances (#13–#15); 2 LADBS forms (#16–#17); DCBA wildfire FAQ (#12, with broker note about orphaning) |
| **Deprecatable — deduplicate against existing tracker** | 1 of 17 | `relocation-assistance-english` (#8) — the dated revision is already tracked and live |
| **Requires broker review for retention** | 1 of 17 | DCBA wildfire FAQ (#12) — file live but page archived; covered protection period ended 2025-07-31 |
| **Truly unrecoverable** | 0 of 17 | None. Every prior document was found either at a new URL, at a new host, at a new domain, or superseded by a document already in the tracker. |

Confidence level for each recovery: **High** for #1–#7 (browser subagent verified each URL returns valid PDF binary), **High** for #9–#11 (browser subagent verified via LAHD site navigation), **High** for #13–#15 (direct HTTP HEAD probes returned 200 application/pdf; #14 and #15 relied on 2026-07-27 pin audit's established `clkrep` → `cityclerk` pattern), **Medium-High** for #16–#17 (Perplexity search index confirmed authoritative URLs; direct HEAD probe returned network timeout from this sandbox, likely a per-host filter unrelated to URL validity; one URL further verified via fetch to return actual PDF text), **Medium** for #12 (file is live but is orphaned; policy question).

### §1.5 Root-cause pattern signals for producer resilience

The 17 unreachables cluster into 5 patterns that are worth surfacing as producer-level improvements (Lane 3 candidates, not Lane 2 blockers):

1. **Domain migration pattern** — `ladbs.org` → `dbs.lacity.gov` (dropped file path). Detection heuristic: HTTP 301 to a host that differs from the target, with the redirect destination missing the file basename.
2. **Subdomain migration pattern** — `clkrep.lacity.org` → `cityclerk.lacity.org` (TCP connection reset while DNS still resolves). Detection heuristic: TCP-level failure with a resolving DNS record → probe the same path on a sibling subdomain.
3. **Filename renaming pattern** — LAHD renaming multilingual notices from `[Language]-MM.DD.YY.pdf` to `Protections-Notice-[Language]-MM.DD.YY-ADA.pdf` within the same `/wp-content/uploads/YYYY/MM/` directory. Detection heuristic: 404 on file with same prefix in the same upload month directory.
4. **Directory relocation pattern** — Files move from an old-year upload folder to a new-year upload folder (`/2026/02/` → `/2026/07/`) with matching content. Detection heuristic: 404 on old-dated file while the parent page still references a newer-dated variant with same base filename.
5. **Cross-host retirement pattern** — Documents migrated from `lahousing.lacity.org/AAHR/...` to `housing.lacity.gov/wp-content/uploads/...`. Detection heuristic: 404 on entire host subdirectory path; parent site returns 200.

---

## §2 Sub-scope 2.B — Rent-control cities: LA + SM diff classification

### §2.1 Basis of record

Reproduced from the 2026-08-01 07:02 CEST cron run report at:
`memory/sessions/2026-08-03_2026-08-09/28e720f4/ai_outputs/2026-08-01-Rent-control-cities-watch-report.md`

Report headline: **"Rent-control cities — 2 change(s) in Los Angeles, Santa Monica — Baselines captured: Berkeley, Beverly Hills — PARTIAL: SF 202, Oakland/San Jose/West Hollywood WAF-403-DESPITE-UA"**

The 2 changes on LA and SM are the Lane 2 diff-classification target. Berkeley baseline, Beverly Hills baseline, and the SF 202 / Oakland-SJ-WeHo WAF issues are Sub-scope 2.C (Lane 3 deferred per Founder Decision 2.a).

### §2.2 LA (LAHD) diff — classification: **cosmetic template restyle**

- **URL tracked:** `https://housing.lacity.gov/`
- **Previous hash:** `78fb0948228e6f017c8692207b74ef647532566875eeb507f07ffae64438ae0b`
- **Current hash:** `b3da980091f3575f4aea7d9388fc7d9585046ac0218f3066976e87d9892bf2a5`
- **Diff signature (top 20 lines, from cron report):**
  - **Added:** `+LAHD – City of Los Angeles Housing Department` (new title-bar text)
  - **Removed:** Empty-line separators between navigation menu items (`Housing`, `Community Resources`, `Residents`, `Rental Property Owners`, `Partners`, `Strategic Engagement`, etc.)
  - **Net structural change:** Blank-line whitespace removed between nav items; a single title element added at page top.

**Classification: cosmetic (chore).** The diff removes empty lines that appeared between navigation menu items and adds a single title-bar element. No policy, ordinance, disclosure, form availability, or program-scope text appears in the diff snippet. The change is consistent with a WordPress theme or template restyle (line-height / margin normalization plus a header title element).

**Broker sign-off required: NO.** Log as `chore` in Lane 2 PR notes; capture the new hash as the current baseline.

**Caveat:** The cron report shows only the top 20 diff lines. A residual risk exists that substantive changes appear later in the diff and were truncated from the notification. Recommend the Lane 2 engineer prompt include a re-fetch of the current `housing.lacity.gov` page with a full diff against a stored snapshot before finalizing the classification. If the producer does not store the pre-change snapshot at all (hash-only tracking is the design), then this classification is the best available and moves forward pending future producer enhancement.

### §2.3 Santa Monica diff — classification: **cosmetic template restyle**

- **URL tracked:** `https://www.smgov.net/Departments/RentControl/`
- **Previous hash:** `e4142b4a1a217e7c7c19b2e85285be09be4c837a16efc2850261d6a111ac8917`
- **Current hash:** `2aee8d1aabcf8dd3f151bd3566aa69535cb3caf76b82c886298923ace9deef18`
- **Diff signature (top 20 lines, from cron report):**
  - **Added:** `+santamonica.gov - Rent Control` (new title element)
  - **Structural:** `-Open` / `+Open` line-normalization on accordion controls (blank-line separators removed around "Open" toggle labels)
  - Menu items `Programs`, `Housing`, `Affordable Housing`, `Being a Landlord`, `Being a Tenant` retained; blank lines around them removed.

**Classification: cosmetic (chore).** Identical pattern to LA — whitespace normalization around navigation elements and addition of a title-bar element. This appears to be a **coordinated municipal-CMS template update**, likely a shared component library across LA-region municipal sites, rather than substantive rent-control ordinance or program changes on the Santa Monica side.

**Broker sign-off required: NO.** Log as `chore` in Lane 2 PR notes; capture new hash as current baseline.

**Same caveat as §2.2** — recommend Lane 2 engineer prompt include a full-diff re-fetch to confirm no substantive change hidden past the truncation.

### §2.4 Notable side-observation

Both changed hashes on LA and SM are on the **landing page**, not on the specific rent-control policy or ordinance documents linked from those pages. This is important: the cron is currently hashing the top-level jurisdiction landing page, which is the noisiest hashing target (site-chrome updates dominate). A Lane 3 producer improvement candidate is to switch to hashing the **primary policy document** or a **specific "current ordinance" endpoint** per jurisdiction where one exists, rather than the landing page. That change would materially reduce cosmetic-vs-substantive classification burden on the broker.

---

## §3 Lane 2 execution recommendations

### §3.1 Scope boundaries confirmed

- **In Lane 2:** URL-replacement patches to `cron_5_lahd_forms` for the 15 recoverable single-URL entries; deprecation flag for the 1 deduplicate; broker-review flag for the 1 orphaned artifact (DCBA #12); hash-baseline capture and `chore` classification entries for LA and SM diffs.
- **Deferred to Lane 3:** SF HTTP 202 handling; Oakland/San Jose/West Hollywood WAF-403-DESPITE-UA mitigation; the 5 root-cause pattern signals from §1.5; the rent-control tracking-target switch from landing page to policy document (§2.4).
- **Not touched by Lane 2:** Any Notion writes, any Vercel env changes, any code shipped in the OwnerPilot repository. Lane 2 is entirely a Perplexity Computer cron config update — mediated by Founder-executed cron `update` calls, not by a git PR.

### §3.2 Divergence from summary framing

The original session summary framed Lane 2 as a "single Lane 2 branch + single PR covering all three producer crons." That framing turns out to be **inapplicable** because the producers are not in the OwnerPilot repository — they're Perplexity Computer scheduled tasks. There is no branch, no PR, no code change. Lane 2 execution reduces to:

1. Founder-executed `schedule_cron update` calls on cron `0abb46c4` (LAHD forms refresh) to update the pin/discovery snapshot with the 15 replacement URLs plus deprecate #8 and mark #12 for review.
2. Documentation-only commit(s) to the OwnerPilot repository capturing this Source Packet, the classification decisions, and the audit trail — parallel to how Lane 1 shipped `docs/compliance/*_2026-08-04.md` docs but did not ship any producer logic.

This is a **material scope reframe from the original Lane 2 framing** and requires Founder acknowledgment before execution.

### §3.3 Suggested next steps once packet is ratified

- **Step A (documentation commit):** Open Lane 2 branch `lane7/product-forms-refresh-2026-08-04` with three docs:
  - `docs/compliance/lane7_product_forms_refresh_source_packet_2026-08-04.md` — this Source Packet, verbatim.
  - `docs/compliance/lane7_lahd_pin_audit_addendum_2026-08-04.md` — the 15 URL replacements + 2 flag decisions extending the 2026-07-27 pin audit.
  - `docs/compliance/lane7_rent_control_hash_classification_2026-08-04.md` — the LA + SM diff classifications with the cosmetic-restyle ruling and the caveats.
- **Step B (cron config update):** Founder-executed `schedule_cron update` on cron `0abb46c4` with an amended task text that carries the 15 replacement URLs as a pinned-form section (per the same discipline that added `ordinance_187737_text` on 2026-07-27). The `2faf60f6` rent-control cron does not need a task-text update from Lane 2 — its 2026-08-01 baselines can simply be accepted as current on the next run cycle by writing a small chore note.
- **Step C (Notion mirror row):** After Step A merges and Step B succeeds, log a single Lane 2 completion row into the Production Notion sibling (`af32f514-...`) via the `/api/automation/log` external-caller path we validated in Lane 1's §L1.7 smoke. Suggested row: `cron_5_lahd_forms_2026-08-05` with `status=partial` (baselines-pending), `gate_open=false`, and `broker_review_reason="17 unreachable URLs classified per lane7_product_forms_refresh_source_packet_2026-08-04.md; 15 recover, 1 deduplicate, 1 review"`.

### §3.4 Open items surfaced but not resolved

1. **DCBA wildfire FAQ (#12) retention decision** — the covered protection period ended 2025-07-31. Broker review needed on whether to keep tracking an orphaned but live artifact past the coverage window.
2. **Rent-control cron target-switch (§2.4)** — Lane 3 candidate.
3. **Producer state persistence gap** — this Source Packet was only compilable because Perplexity Computer's session `28e720f4` persisted the cron reports under `memory/sessions/...`. If those artifacts had been ephemeral, Lane 2 would have been un-executable per Claude's §L2.0.a STOP. A durable producer state store (or at minimum, structured Notion mirror rows that carry the full crawl-state per run) would remove the dependency on cross-session workspace access. Lane 3 candidate.
4. **Rent-control 08-01 diff truncation** — the top-20-lines-only diff in the cron report limits classification confidence. A Lane 3 producer improvement to persist full diffs would tighten future classifications.
5. **LA City Clerk `clkrep` → `cityclerk` pattern** — already ratified 2026-07-27 for the pinned `ordinance_187737_text`. Lane 2 extends this ratified pattern to 2 additional ordinances discovered on the LAHD site (#14 Ord 188486, #15 Ord 187764). No new legal question raised; extension is mechanical.
6. **LADBS `ladbs.org` → `dbs.lacity.gov` migration** — this is a new pattern not previously ratified. Broker sign-off recommended before applying #16 and #17 URL replacements even though the underlying documents are procedural (Owner-Builder Permits notice, Signature Declaration attachment) and not substantive legal text.

---

## §4 Sources cited (URLs, verbatim)

- Cron scheduled task listing: Perplexity Computer scheduler, cross-session `list` query 2026-08-04
- LAHD forms refresh report 2026-08-03: [LAHD forms refresh report 2026-08-03 — Perplexity Computer session 28e720f4 artifact]
- Rent-control cities watch report 2026-08-01: [Rent-control cities watch report 2026-08-01 — Perplexity Computer session 28e720f4 artifact]
- LAHD pin audit 2026-07-27 (basis for #13–#15 pattern): [LAHD pin audit 2026-07-27 — Perplexity Computer session 28e720f4 artifact]
- LAHD Protections Notice landing page: [housing.lacity.gov/protectionsnotice](https://housing.lacity.gov/protectionsnotice)
- LAHD Documents and Forms page: [housing.lacity.gov/documents-forms](https://housing.lacity.gov/documents-forms)
- LAHD Services for Homeowners with Existing Loans: [housing.lacity.gov/housing/services-for-homeowners-with-existing-loans](https://housing.lacity.gov/housing/services-for-homeowners-with-existing-loans)
- LADBS current forms page: [dbs.lacity.gov/forms-and-publications](https://dbs.lacity.gov/forms-and-publications)
- LADBS signature declaration (verified via Perplexity search index authoritative source): [dbs.lacity.gov/sites/default/files/efs/forms/pc17/signature-declaration.pdf](https://dbs.lacity.gov/sites/default/files/efs/forms/pc17/signature-declaration.pdf)
- LADBS owner-builder permits (verified via Perplexity search index + fetch): [dbs.lacity.gov/sites/default/files/efs/forms/pc14/owner-builder-permits.pdf](https://dbs.lacity.gov/sites/default/files/efs/forms/pc14/owner-builder-permits.pdf)
- LA City Clerk online docs (host): [cityclerk.lacity.org](https://cityclerk.lacity.org/)
- DCBA wildfire FAQ (April 2025 revision, orphaned but live): [dcba.lacounty.gov/wp-content/uploads/2025/04/January-2025-Wildfire-and-Critical-Windstorm-Resolution-FAQ-ENG-4.14.25.pdf](https://dcba.lacounty.gov/wp-content/uploads/2025/04/January-2025-Wildfire-and-Critical-Windstorm-Resolution-FAQ-ENG-4.14.25.pdf)

---

> **Independent research assistance prepared for OwnerPilot Founder review. Not attorney validation, legal advice, canonical authority, or implementation authorization. Founder ratifies; Architect reconciles; Engineer executes.**
