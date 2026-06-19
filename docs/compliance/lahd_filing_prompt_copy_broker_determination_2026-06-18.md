# LAHD Filing Prompt Copy — Build-Side Determination

**File:** `lahd_filing_prompt_copy_broker_determination_2026-06-18.md`
**Date:** 2026-06-18
**Determination by:** Jack Taglyan, California Licensed Real Estate Broker, CalDRE **B9445457**
**Authority:** Broker scope under Bus. & Prof. Code § 10131(b); Broker Blanket Authorization §§ 1–7 (2026-06-15)
**Lineage:** Builds on `ownerpilot_la_rtc_citation_pull_attorney_signoff.md` (ratified) → `geocode_dependency_attorney_review.md` → present
**Posture:** Locked-prose set is **required-but-pending**. This determination adds three new strings to the Tier B locked-prose manifest. Until the CI guard ships, treat each string as required-but-pending in the codebase.

---

## §0 Scope

This determination authors the **post-production LAHD filing prompt** that fires on the Produce Wizard confirmation screen whenever the property is geocode-confirmed inside the **City of Los Angeles** boundary. The prompt is build-side copy — it is not part of the 3-day notice face. It instructs the user on the LAMC 151.09.C.9 / 165.05.B.5 filing obligation, the supporting documents to file, and the three lawful filing channels. The strings authored here join the locked-prose set (Tier B) and must be hash-tracked under `docs/compliance/locked_prose_manifest.json`.

This determination does **not** compute the 3-business-day deadline as a calendar date. Per the LA RTC citation pull (§5, "plain business days, not the judicial-holiday calendar"), the LA city business-day calendar is a separate citation pull that has not yet shipped. Until that calendar exists with the same discipline as the judicial-holiday table, the prompt displays the obligation as **"within 3 business days of service"** with no computed deadline date.

---

## §1 Ruling

I authorize the following four strings to be added to the locked-prose set (Tier B, hash-tracked, lowercased and trimmed before hash). All four are required-but-pending until the locked-prose CI guard ships (see `locked_prose_ci_guard_scope_broker_determination_2026-06-15.md`).

| Key | Tier | Status |
|---|---|---|
| `lahdFilingPromptHeader` | B | NEW |
| `lahdFilingPromptBody` | B | NEW |
| `lahdFilingChannelsList` | B | NEW |
| `lahdFilingPromptCopyVersion` | metadata | NEW (`"v1"`) |

Locked strings (verbatim):

### `lahdFilingPromptHeader`

> File this notice with LAHD within 3 business days

### `lahdFilingPromptBody`

> The City of Los Angeles requires this 3-day notice to be filed with the Los Angeles Housing Department (LAHD) within 3 business days of service on the tenant. Filing applies to all eviction notices for all rental units in the City of LA, regardless of whether the unit is covered by the Rent Stabilization Ordinance or the Just Cause Ordinance. Filing is the landlord's obligation. Failure to file may be raised by the tenant as an affirmative defense in an unlawful detainer action. Authority: Los Angeles Municipal Code §§ 151.09.C.9 and 165.05.B.5.

### `lahdFilingChannelsList`

> File one of three ways:
>
> 1. **Online** — Upload a PDF of the notice to the LAHD eviction filing portal at housing.lacity.gov. This is the fastest method and produces an automatic confirmation receipt.
> 2. **By mail** — Mail a hard copy of the notice (with a printed LAHD cover sheet) to LAHD. Postmark date is not the filing date — LAHD's date of receipt controls.
> 3. **In person** — Deliver a hard copy of the notice to an LAHD public counter.
>
> File the actual notice that was served. The LAHD cover sheet alone is not a filing. Include the proof of service if one was prepared — the service date is what the 3-business-day clock measures from.

### `lahdFilingPromptCopyVersion`

> v1

---

## §2 Reasoning

### §2.1 Why this prompt is broker-scope (not attorney-scope)

The prompt is an operational compliance reminder, not legal advice. It restates a municipal filing obligation that LAHD itself publishes on three public-facing pages ([housing.lacity.gov/rtc](https://housing.lacity.gov/rtc), [housing.lacity.gov/renter-protections-2](https://housing.lacity.gov/renter-protections-2), [housing.lacity.gov/eviction-notices](https://housing.lacity.gov/eviction-notices)) and identifies the controlling LAMC sections. Broker compliance authority under Bus. & Prof. Code § 10131(b) covers operational property-management workflows including notice production, service, and post-service filing reminders. No attorney engagement is required and none exists.

### §2.2 Why "within 3 business days" and not a computed date

Per `ownerpilot_la_rtc_citation_pull_attorney_signoff.md` (Resolution 5), the LAHD filing deadline runs on **LA city government business days**, not the California judicial holiday calendar. The two calendars overlap heavily but diverge on specific dates (Columbus Day, Lincoln's Birthday, Cesar Chavez Day, Native American Day, Lincoln Day). The LA city business-day calendar has not been pulled into a verified, dated, signed-off rules table the way the judicial holiday table has. Until that pull is done, computing a specific deadline date risks computing it against the wrong calendar.

The safe operational posture is to display the obligation as a **3-business-day duty** keyed to the service date, and let the user count using LAHD's published guidance.

### §2.3 Why all three filing channels are listed

LAHD's June 2025 landlord guidance video ([youtube.com/watch?v=3S9mgUDQ1JQ](https://www.youtube.com/watch?v=3S9mgUDQ1JQ)) explicitly enumerates three filing methods: online portal upload, mail with cover sheet, and in-person at the public counter. All three are operationally valid. The product does not pick for the user — different users prefer different channels (online for speed, in-person for confirmation receipt, mail for documentation-heavy filings with proofs of service).

### §2.4 Why the prompt restates the affirmative-defense consequence

LAHD's Renter Protections page ([housing.lacity.gov/renter-protections-2](https://housing.lacity.gov/renter-protections-2)) states: "Failure to do so may be used by the tenant as a defense in an unlawful detainer case." This is the operationally important consequence — it is why the user must file, not just an administrative nicety. Stating the consequence concisely in the prompt body is the difference between users who file on time and users who forget and lose default judgments.

### §2.5 Why filing applies to ALL units (not RSO/JCO branching)

Per the LA RTC citation pull (Resolution 4), the LAMC filing rule applies to **all eviction notices issued to tenants in the City of Los Angeles**, regardless of whether the unit is RSO/JCO-covered. The product must not branch on RSO/JCO status for filing purposes — the prompt fires for every LA notice. (RSO/JCO status does affect other determinations elsewhere in the system, but not this one.)

---

## §3 Application

### §3.1 When the prompt fires

The prompt is displayed on the **post-production confirmation screen** of the Produce Wizard whenever:

1. `jurisdictionResolved === "CITY_OF_LA"` (from geocode confirmation), AND
2. The produced notice is any of: 3-Day Pay-or-Quit, 3-Day Cure-or-Quit, 3-Day Unconditional Quit, 30-Day, 60-Day, 90-Day, or any other tenancy-termination notice.

### §3.2 When the prompt does NOT fire

- Properties in unincorporated LA County (e.g., Altadena, Marina del Rey, View Park).
- Properties in independent cities within LA County (e.g., West Hollywood, Culver City, Santa Monica, Beverly Hills, Inglewood, Long Beach, Pasadena, Glendale). Each of those cities has its own filing rules covered by `ca_local_jurisdiction_3day_notice_supplemental_documentation_matrix_broker_determination_2026-06-18.md`.
- Properties where `jurisdictionResolved === "NEEDS_CONFIRMATION"`. In that state, production is blocked upstream by the geocode-confirmation gate. Do not display the LAHD prompt as a placeholder — it would imply the property is in the City of LA when the system has not yet determined that.

### §3.3 Where the prompt is displayed

On the confirmation screen, in a distinct "City of Los Angeles Post-Service Obligation" section that appears between the served-notice preview and the service-method capture. The section header uses `lahdFilingPromptHeader`. The body uses `lahdFilingPromptBody`. The channels list uses `lahdFilingChannelsList`.

The prompt is **post-service** — it appears after the user has indicated the notice has been served, not at production time. Filing is keyed to the service date, not the preparation date, per LAMC.

### §3.4 What the prompt does NOT do

- It does NOT auto-file with LAHD on the user's behalf. Filing is the user's obligation; the product surfaces the obligation and lists the channels. Direct LAHD API filing is a future phase and requires additional citation work on data-handling and audit trails.
- It does NOT compute a specific calendar deadline date (see §2.2).
- It does NOT track whether the user actually filed. The user may flag the filing as complete in their own records — the product does not chase the LAHD filing receipt back.
- It does NOT block notice production. The prompt is post-production, advisory in tone, and the user can dismiss it. The obligation runs on the user as the landlord; the product surfaces it but does not police it.

---

## §4 Locked-Constants Table

| Key | Tier | Stored At | Hash Method |
|---|---|---|---|
| `lahdFilingPromptHeader` | B | `docs/compliance/locked_prose_manifest.json` | trim + lowercase + SHA-256 |
| `lahdFilingPromptBody` | B | `docs/compliance/locked_prose_manifest.json` | trim + lowercase + SHA-256 |
| `lahdFilingChannelsList` | B | `docs/compliance/locked_prose_manifest.json` | trim + lowercase + SHA-256 |
| `lahdFilingPromptCopyVersion` | metadata | `docs/compliance/locked_prose_manifest.json` | stored verbatim, surfaced in audit log |

Hashes are populated when the CI guard ships. Until then, the three strings are required-but-pending — engineering checks them in to `locked_prose_manifest.json` with `"hash": null, "status": "pending"` and the guard treats any drift as a hard fail once it lands.

---

## §5 Build-Side Checklist

- [MUST FIX §5.1] Add `lahdFilingPromptHeader`, `lahdFilingPromptBody`, `lahdFilingChannelsList`, and `lahdFilingPromptCopyVersion` to the locked-prose manifest in their verbatim form above. Lowercase + trim before hashing.
- [MUST FIX §5.2] Wire the prompt to display on the Produce Wizard confirmation screen, gated on `jurisdictionResolved === "CITY_OF_LA"`. Do not display when `jurisdictionResolved === "NEEDS_CONFIRMATION"`.
- [MUST FIX §5.3] Order on the confirmation screen: served-notice preview → LAHD prompt section (header + body + channels) → service-method capture. The LAHD section is between the preview and service capture, not above the preview or below the service capture.
- [SHOULD FIX §5.4] Make the prompt persistent — it does not auto-dismiss after a timer. User must explicitly acknowledge it (checkbox or "I will file this within 3 business days" affirmation) before the wizard advances to the next step.
- [SHOULD FIX §5.5] Log the user's acknowledgment timestamp to the audit log alongside `lahdFilingPromptCopyVersion`. This produces an audit trail showing the user was advised of the LAHD filing obligation at the version of copy in force at service time.
- [CONSIDER §5.6] Add a "View on housing.lacity.gov" link beneath the channels list, deep-linking to the LAHD eviction-notices page. Useful for users who want to see LAHD's first-party guidance before filing.
- [CONSIDER §5.7] Track in product metrics how often users acknowledge the prompt — high acknowledgment is a positive signal; if many users skip or rage-click, the copy may be too dense.

---

## §6 Statutory Anchor

- **Los Angeles Municipal Code § 151.09.C.9** — landlord's obligation to file termination notices with LAHD within 3 business days of service on the tenant; applies to all RSO units.
- **Los Angeles Municipal Code § 165.05.B.5** — same obligation extended to all units covered by the Just Cause Ordinance.
- **LAHD Renter Protections page** — first-party LAHD guidance restating the rule for "all rental units in the City of LA" regardless of RSO/JCO coverage ([housing.lacity.gov/renter-protections-2](https://housing.lacity.gov/renter-protections-2)).
- **LAHD Eviction Notices page** — first-party LAHD enumeration of the three filing channels ([housing.lacity.gov/eviction-notices](https://housing.lacity.gov/eviction-notices)).
- **LAHD June 2025 landlord guidance video** — first-party walkthrough of the LAHD online portal filing process ([youtube.com/watch?v=3S9mgUDQ1JQ](https://www.youtube.com/watch?v=3S9mgUDQ1JQ)).

---

## §7 Open Items

- LA city business-day calendar pull (deadline for the calendar to be available with the same verification discipline as the judicial-holiday table). Until shipped, the prompt cannot compute a calendar deadline date.
- LAHD form refresh job (quarterly hash check of the 9 RTC PDFs). Tracked in `ownerpilot_la_rtc_citation_pull_attorney_signoff.md` Resolution 3. Not blocked by this determination; runs in parallel.
- Geocode-confirmation logic must authoritatively decide "City of LA vs. unincorporated LA County vs. other independent city." `jurisdictionResolved` is the input to the gate in §3.1; the gate must be reliable before this prompt can be relied upon.

---

— Jack Taglyan
California Licensed Real Estate Broker
CalDRE **B9445457**
Broker Compliance Review · 2026-06-18

> OwnerPilot AI is not a law firm and does not provide legal advice. This is a broker-prepared workflow produced under California Licensed Real Estate Broker supervision. For legal matters specific to your situation, consult a California licensed attorney of your choosing.
