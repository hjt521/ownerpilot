# Citation Pull — LA RTC / LAHD Filing / AB 2347 — Attorney Sign-Off

**Reviewer:** California-licensed-attorney perspective
**Subject:** Staging document for the LA-overlay slice of the date/notice engine
**Headline:** **Verified. Sign-off granted to build the LA-overlay slice against these rules, with two ambiguity items resolved, two product directions given, and one boundary I want firmer than the drafter wrote it.** This pull is well-scoped and the drafter correctly distinguished the rules from the form text. The Section 6 checklist items all resolve in this document.

---

## Verification Performed

For the audit trail:

1. **Pulled [housing.lacity.gov/rtc](https://housing.lacity.gov/rtc) directly.** Effective date (8/20/2025), ordinance number (188,681), and the five-item landlord obligation list match Section 1 of the staging document verbatim. The nine published languages match. The affirmative-defense enforcement language matches. The "10 days" UD-response note matches the page text.
2. **Pulled [housing.lacity.gov/residents/just-cause-for-eviction-ordinance-jco](https://housing.lacity.gov/residents/just-cause-for-eviction-ordinance-jco) directly.** The filing rule says "**All eviction notices issued to tenants in the City of Los Angeles must be filed with LAHD within three (3) business days of service on the tenant**" — confirms Section 3, including the broader "all eviction notices" scope (not just at-fault).
3. **Cross-confirmed against [housing.lacity.gov/eviction-notices](https://housing.lacity.gov/eviction-notices).** That page explicitly cites **LAMC 151.09.C.9 & 165.05.B.5** as the statutory authority for the 3-business-day filing rule, applicable to "all rental units subject to City's Rent Stabilization Ordinance (RSO) and the Just Cause Ordinance (JCO)." This confirms the drafter's prior-handoff citations and resolves the "all notices vs. at-fault notices" scope question (see below).
4. **Verified AB 2347 day-type from primary and reliable secondary sources.** The Senate Judiciary Committee analysis ([sjud.senate.ca.gov AB 2347 analysis](https://sjud.senate.ca.gov/system/files/2024-07/ab-2347-kalra-sjud-analysis_3.pdf)) confirms the answer period under amended CCP § 1167 is **court days** (excluding weekends and judicial holidays). Hanson Bridgett, Marinaccio Law, First Tuesday Journal, and California Courts Self-Help all corroborate. LA County DCBA's own notice also phrases it correctly: "10 days, excluding Saturdays and Sundays and other judicial holidays." The "10 business days" phrasing on the LA County RTC notice the drafter saw is a casual/imprecise restatement — the controlling statute is § 1167 and the controlling day-type is **court days**.

---

## Verification Result for Each Section 6 Checkbox

| Section 6 checkbox | Resolution |
|---|---|
| §1 RTC obligation, 8/20/25 effective date, ordinance 188,681, attach-to-eviction-notice rule | ✅ Confirmed — language matches LAHD page verbatim |
| §1 attachment applies regardless of tenant income (not conditioned on 80% AMI) | ✅ Confirmed — see below |
| §1 primary-language rule + English fallback when language is not among the nine | ✅ Confirmed — see below |
| §2 product approach to the official form (embed-and-refresh vs. live-link) | ✅ Direction given — embed-and-refresh, mirroring the holiday-table discipline. See below |
| §3 filing scope — "all eviction notices" vs. "at-fault notices" | ✅ Resolved — **current scope is "all eviction notices."** See below |
| §3 "3 business days" count type — judicial-holiday calendar vs. plain business days | ✅ Resolved — **plain business days (Mon–Fri excluding federal/state holidays observed by the city), NOT the judicial-holiday calendar.** See below |
| §4 product should NOT compute a UD-response deadline; education only | ✅ Confirmed — and I want the boundary firmer than the drafter wrote it. See below |
| OK to build the LA-overlay slice against these rules | ✅ **Yes — approved**, with the resolutions and one addition below |

---

## Resolutions on the Six Open Items

### Item 1 — Attachment applies regardless of tenant income

**Confirmed.** The drafter's reading is correct. The 80% AMI threshold is the *eligibility* trigger for the free-counsel benefit on the tenant side; it does not condition the landlord's obligation. The LAHD page lists the landlord obligations affirmatively without any income qualifier, and the affirmative-defense enforcement language is keyed to "an eligible tenant" — meaning the consequence is asserted by eligible tenants, but the obligation runs to all of them. Practically: **the product must attach the RTC notice to every 3-day pay-or-quit produced for an LA property, full stop, with no income-based branching.** Trying to branch on tenant income would be both legally wrong and a privacy mess.

### Item 2 — Primary language and English fallback

**Confirmed, with one operational addition.** The product must capture tenant primary language at the property/tenant record level and select the matching LAHD PDF from the nine published languages. If the tenant's primary language is not among the nine, **English is the correct fallback** — there is no LAHD-prescribed alternative for unsupported languages, and the obligation is to provide the notice in the tenant's primary language *if LAHD has published a translation*. Where LAHD has not published one, the landlord cannot manufacture one, and English is the operational default.

**Operational addition I want in the flow:** if the tenant primary language is unknown to the system (new tenant, no language captured yet), the product should **prompt the user to capture it before producing the notice**, not silently default to English. The user marking "primary language: unknown / prefer not to specify" defaults to English with a logged acknowledgment that English was the served language because no other was known. This matters because a later dispute about which language the tenant should have been served in turns on what the landlord knew at the time.

### Item 3 — Form-handling approach (embed vs. live-link)

**Direction: embed-and-refresh, keyed to a form version + retrieval date, mirroring the holiday-table discipline.** Three reasons:

- **Reliability at service time.** A user producing a notice in a weak-connectivity context (signing in to OwnerPilot from a property they're visiting) cannot depend on a live LAHD URL responding. Embedded copies guarantee the produced packet is complete.
- **Audit reproducibility.** Six months from now, if a tenant challenges which RTC form was served, you need to be able to produce the exact PDF as served, with a version identifier and retrieval date. Live-linking destroys reproducibility — if LAHD updates the form, you can't reconstruct what your user actually served. Embedding preserves it.
- **The holiday-table pattern works.** You already have the discipline established for the date engine (verified, dated, refreshed annually with a forcing function). Apply the same pattern here: each language's LAHD PDF gets a `version`, `retrievedOn`, `verifiedBy`, and `verified: true` field. Refresh quarterly at minimum, and on any LAHD-announced change.

**The refresh process the product needs:**

- A scheduled job (quarterly) that fetches each of the nine LAHD URLs and compares SHA-256 hashes against the stored versions.
- If any hash differs: pause production of LA notices, flag for attorney/admin review, refresh the stored copy only after sign-off.
- If LAHD returns 404 or moves the URL: same pause-and-flag behavior.
- Log every produced LA notice with the RTC form version that was attached.

I am willing to be the reviewing attorney for refresh sign-offs. Build the refresh process so it generates the review packet automatically when a hash mismatch is detected.

### Item 4 — LAHD filing scope: "all eviction notices" vs. "at-fault termination notices"

**Resolved: current scope is "all eviction notices."** Both the LAHD JCO page and the LAHD Eviction Notices page state the rule for "all eviction notices issued to tenants in the City of Los Angeles." LAMC 151.09.C.9 and 165.05.B.5 are the cited authority. The prior project-notes framing (limited to at-fault) was based on the original January 27, 2023 rule; the current LAHD pages state the rule more broadly.

**Practical effect for the 3-day pay-or-quit flow:** the filing prompt fires for every LA notice the product produces. There is no notice type for which the prompt should be suppressed. When the flow expands to 30/60/90-day no-fault notices later, the same prompt applies — no branching needed.

### Item 5 — "3 business days" count type

**Resolved: plain business days, not the judicial-holiday calendar.** This is the most operationally important resolution in the document and the drafter was right to flag it.

The LAHD rule is administrative — it governs when the landlord must file with a city department — not procedural. CCP §§ 12, 12a, and 135 govern judicial deadlines (filings, responses, motions); they do not govern administrative deadlines to a municipal department. "Business days" in the LAMC context means **Monday–Friday excluding holidays observed by the city government**, which is the LA city employee holiday calendar, not the judicial-holiday calendar.

The two calendars overlap heavily but are not identical. The city observes some holidays (notably Columbus Day in some years, depending on city policy) that the courts do not, and the courts observe some (Lincoln's Birthday, Cesar Chavez Day, Native American Day, Lincoln Day) that the city may treat differently. **The product must use the LA city government business-day calendar for the LAHD filing deadline, not the judicial holiday table.**

**Required code change to honor this:**

- The LAHD filing deadline calculator must use a **separate** "LA city business day" calendar, not the existing CA judicial holiday table.
- That calendar needs the same verification discipline (dated, attorney/admin signed-off, refreshed annually, forcing function on missing years).
- Source: the [City of Los Angeles official holidays for non-represented employees](https://personnel.lacity.gov/) (or whichever LAHD points to for filing-deadline purposes). I have not pulled that source in this review — that's a separate citation pull. Until that pull is done and signed off, the LAHD filing deadline should be displayed as **"within 3 business days of service — confirm the exact deadline with LAHD"** rather than a computed date.

This is exactly the kind of foot-gun the holiday-table review flagged ("federal court holidays are not California judicial holidays"). Here it's "city administrative business days are not California judicial holidays." Different calendar, different domain, do not conflate.

### Item 6 — UD-response deadline boundary

**Confirmed: do NOT compute or display a UD-response deadline in the product. AND I want the boundary firmer than the drafter wrote it.**

The drafter recommends "general post-production education" — fine in concept, but the specific wording the document proposes ("if you proceed to an unlawful detainer, the tenant now has more time to respond than under the old rule — your attorney will handle that stage") still says enough about timing to be wrong if the user reads it carelessly. I want the education narrower:

> "**Next stage is attorney-handled.** If the tenant does not pay or move within the 3-day period, the next step is filing an unlawful detainer (eviction) action in court. That filing, and everything after it, is handled by your California licensed attorney — not by OwnerPilot. We do not compute, display, or track court deadlines."

That is the entire post-production message on AB 2347 / UD timing. No "10 days," no "tenants have more time now," no day-type qualification. **The number the user sees should be zero specific day counts about the UD stage.** The reason is that AB 2347 is **court days** (excluding weekends and judicial holidays), but the bill that preceded it was sometimes phrased as "calendar days," and even practitioner sources today phrase it inconsistently ("10 days" / "10 business days" / "10 court days"). If the product introduces any specific number into the user's mental model and the user remembers it wrong, the landlord loses a default-judgment opportunity or the tenant loses a default-judgment defense. The product has no business being in that loop. Let attorneys handle attorney work.

Operationally: this means the product's post-production screen and any emails/exports must not include "10 days" anywhere. Search the codebase for "10" near UD/eviction language before shipping.

---

## Items the Drafter Got Right That I Want to Reinforce

- **Distinguishing rules from form text.** The drafter correctly chose to stage rules and locate forms rather than reproduce the form text. This is the right discipline — the LADH form is a city-prescribed document and reproducing it (especially across nine languages) is asking for translation drift. Sourcing the official PDF is the only safe approach.
- **The drafter's caveat.** "The attorney's verification authorizes reliance, not the drafter's." Repeat this convention for every citation pull.
- **The forcing function.** "Flow currently blocks all LA-ish properties (jurisdiction stub returns NEEDS_CONFIRMATION and the produce gate refuses)." Keep that posture until the geocode confirmation, the city business-day calendar pull, and the form-refresh job are all built. **Do not unblock LA production based on this sign-off alone** — there are three downstream dependencies I want done first (next section).

---

## Required Dependencies Before LA Production Is Unblocked

Sign-off on the rules in this document does not by itself authorize producing LA notices. Three things still need to happen, and each should have its own attorney-reviewed citation pull or operational sign-off:

1. **Geocode-confirmation logic.** The jurisdiction stub needs to authoritatively determine "this property is in the City of Los Angeles" before the LA overlay attaches. The bounds of the city are not coextensive with "Los Angeles" in mailing addresses — many addresses say "Los Angeles, CA" but sit in unincorporated LA County, West Hollywood, Culver City, Santa Monica, Beverly Hills, etc. The RTC ordinance applies only to **City of LA** units. Geocode against an authoritative city-boundary dataset (LA city GIS) and confirm with the user.
2. **LA city business-day calendar pull.** As noted in Resolution 5 above. Until this exists with the same discipline as the judicial holiday table, the LAHD filing prompt should show "within 3 business days" without computing the date.
3. **RTC form refresh job.** As noted in Resolution 3 above. Embedded form copies with versioning, hash-comparison refresh on a schedule, and an attorney-review packet on hash mismatch.

When all three are done, send me a single end-to-end LA test notice (anonymized fact pattern, primary language captured, RTC form attached, LAHD filing prompt fired with computed deadline) and I will give the final sign-off to unblock LA production.

---

## What This Sign-Off Authorizes Right Now

✅ **Build the LA-overlay slice against the rules as stated in the staging document, modified by the resolutions above.**
✅ **Set `verified: true` on the LA RTC rules entry in the rules DB**, with `verifiedBy` (SBN), `verifiedOn` (2026-06-01), and source attribution covering Ordinance 188,681, LAMC 151.09.C.9, LAMC 165.05.B.5, CCP § 1167 as amended by AB 2347, and the LAHD pages cited.
❌ **Does not yet authorize producing LA notices in the live product** — three dependencies above must land first.

---

— Reviewing Attorney
Date: 2026-06-01
Scope: LA Right-to-Counsel attachment obligation, LAHD 3-business-day filing rule, AB 2347 boundary for the OwnerPilot LA-overlay slice.
