# OwnerPilot — LAHD Eviction-Notice Filing Walkthrough (v1.1)

**Version:** 1.1 · 2026-07-03 · revises v1 (`ownerpilot_lahd_filing_walkthrough_v1_2026-07-02.md`, the pre-filing snapshot) with **post-filing portal reality** learned from the founding LIVE filing (LAHD record `EFS0317078`, filed 2026-07-02).
**Owner:** Engineering (Claude Code), per omnibus §3.1 (Lane W1).
**Scope:** How an LA property owner files an eviction notice with LAHD through the Eviction Notice Filing System (EFS). This is a product/ops guide — no tenant PII is included by design.

> **What changed from v1:** v1 assumed the cover sheet is the primary filing artifact and that filing is packet-centric. The live filing proved the **online EFS portal collects fields interactively**, the **cover sheet is not needed online**, only the **3-day notice PDF is uploaded**, and several portal rules (notice-type dropdown, FMR threshold, 60-day edit window, automatic bilingual receipt, late-filing rule) are enforced by LAHD. v1.1 folds all of these in.

---

## 0 — Cover sheet: online-optional / mail-required (top-level correction)

The LAHD **cover sheet is NOT required when filing online** through the EFS portal — the portal collects the same fields interactively. The cover sheet is **required only for mail or in-person filings.**

| Filing method | Cover sheet | Destination |
|---|---|---|
| **Online portal (preferred)** | **Not required** | https://housing.lacity.gov/eviction-notices |
| Mail | **Required** | LAHD Eviction Filing Section, PO BOX 17850, Los Angeles, CA 90057 |
| In person | **Required** | LAHD public counter (see LAHD site for hours/location) |

OwnerPilot still generates the cover sheet (it's needed for the mail/in-person paths and as a landlord record), but the walkthrough should present online filing as the default and treat the cover sheet as optional there.

## 1 — Notice-type dropdown reality (3 Day / 5 Day only)

The EFS portal's notice-type dropdown has **only two options: `3 Day` and `5 Day`.** Termination-of-tenancy notices (**30-day / 60-day / 90-day**) do **not** file through EFS — they flow through the separate **Declaration of Intent to Evict** pathway.

- If the owner is filing a 3-day (pay-or-quit / cure-or-quit) or 5-day notice → EFS flow (this walkthrough).
- If the owner has a 30/60/90-day termination → route to the Declaration of Intent flow; the form is at **https://housing.lacity.gov/landlords/forms-notices**. (Product routing for this is Lane W2 / §3.2.)

## 2 — FMR threshold pre-check (non-payment)

For a **non-payment** eviction, the LAHD portal displays and **enforces a Fair Market Rent (FMR) threshold by bedroom count.** If the amount the tenant owes is **at or below** the applicable FMR, a non-payment eviction is **blocked at the portal** — it is not merely discouraged. (LAHD wording: "Landlords may not evict a tenant who falls behind in rent unless the tenant owes an amount higher than the Fair Market Rent.")

**LAHD FMR table — effective 2026-05-21 to 2026-09-30** (pulled from the LAHD portal; the 2BR value matches the founding filing):

| Year | 0-BR | 1-BR | 2-BR | 3-BR | 4-BR |
|---|---|---|---|---|---|
| 2025-2026 | $2,079 | $2,328 | $2,903 | $3,681 | $4,098 |

**Effective window matters:** this table is valid **through 2026-09-30**. It rotates after that — the FF-4 pre-check must key the threshold on the filing date and refresh the table when LAHD publishes the next window (a cron/watch candidate).

**Productization:** OwnerPilot adds an FMR pre-check at intake (Lane FF-4 / §3.3) that blocks a below-/at-FMR non-payment attempt with a clear message **before** the owner assembles a packet.

## 3 — What gets uploaded vs. retained

Only the **3-day (or 5-day) notice PDF** is uploaded to the EFS portal. Everything else is a **landlord record**, retained — not uploaded online.

| Artifact | Upload to EFS online | Retain (landlord records) | Mail/in-person only |
|---|---|---|---|
| 3-day / 5-day notice PDF | ✅ | ✅ | — |
| Cover sheet | — | ✅ | ✅ (required for mail/in-person) |
| Proof of Service (POS) | — | ✅ | — |
| RTC notice — English | — | ✅ | — |
| RTC notice — Spanish | — | ✅ | — |
| Exhibits (posting photos) | — | ✅ | — |

**Productization:** the packet manifest generator (Lane W3 / §3.4) tags each artifact with `upload_to_lahd_online`, `retain_landlord_records`, `mail_or_in_person_only`.

## 4 — Post-filing edit window (60 days, five fields)

After filing, LAHD allows edits for **60 days** but only to **five tenant fields**: **unit #, phone, email, first name, last name.** Everything else is **locked**.

**Productization:** the post-filing UI (Lane W4 / §3.5) shows which fields are still editable during the 60-day window and disables in-app "edit filing" for locked fields.

## 5 — Bilingual receipt is automatic

LAHD emails a **single confirmation containing both English and Spanish** — the landlord does **not** assemble or translate a bilingual receipt. The email arrives from **`donotreplylahd@lahdsystems.lacity.org`**, subject "Filed Eviction Notice Confirmation - Los Angeles Housing Department," and contains the `EFS####` record number.

**Productization:** post-filing capture (Lane W4 / §3.5) stores this email as the canonical receipt and parses the `EFS####` record number.

## 6 — Late-filing escape hatch

LAHD requires filing **within 3 business days** of the notice/service date. The confirmation email states LAHD's rule verbatim:

> "If the filing date is more than 3 business days after the notice date, it violates the municipal code."

If a notice was served **more than 3 business days ago and has not been filed**, the recovery path is: **re-serve with a new service date, then file within 3 business days of the re-service.**

**Productization:** the late-filing escape hatch (Lane W6 / §3.7) detects service_date > 3 business days ago with no filing and prompts the owner to re-serve and reset the clock.

## 7 — Day-count + cover-sheet-revision gates (unchanged, still enforced)

Two gates the platform already enforces and that the founding filing passed:

- **Day-count engine:** for a service date, the engine's computed expiration must match the on-face notice expiration (LA business days, holiday-aware). The founding filing: service 2026-06-29 → Day-3 expiration 2026-07-02, matched.
- **Cover-sheet revision:** the served template's revision must match the app-runtime `COVER_SHEET_REVISION` constant (founding filing: `Rev 2.6.2026`, no drift). This is the Fork-G clean-drift-fire criterion (`0abb46c4`).

## 8 — OwnerPilot integration opportunities (v1 list, status)

The v1 walkthrough listed integration opportunities; the 2026-07-02 omnibus addresses them. Mapping (each portal-reality finding → the lane that productizes it):

| Integration opportunity (from portal reality) | Omnibus lane | Status |
|---|---|---|
| Present online filing as default; cover sheet online-optional | W1 (this doc) | ✅ addressed |
| Route 30/60/90-day → Declaration of Intent, not EFS | W2 / §3.2 | authorized |
| FMR pre-check blocks below-FMR non-payment at intake | FF-4 / §3.3 | authorized |
| Packet manifest tags upload/retain/mail-only per artifact | W3 / §3.4 | authorized |
| Post-filing UI: 60-day edit window, five editable fields | W4 / §3.5 | authorized |
| Capture the automatic bilingual receipt + parse `EFS####` | W4 / §3.5 | authorized |
| Late-filing escape hatch (re-serve + refile clock) | W6 / §3.7 | authorized |
| Filename convention enforced at generator level | W5 / §3.6 | authorized |
| DO NOT SERVE as a first-class data object (blocks progression) | W7 / §3.8 | authorized |

---

## §4.2 attestation (Lane W1)
- **Source of truth:** founding LIVE filing materials (`EFS0317078`) — LAHD filing confirmation, packet manifest, cover-sheet field transcript — plus the LAHD portal FMR table (effective 2026-05-21 to 2026-09-30). All portal-reality claims trace to those artifacts; the full FMR-by-bedroom table is now pinned from the portal (2BR $2,903 matches the founding filing) with its effective window recorded so FF-4 refreshes it on rotation.
- **PII discipline:** no tenant PII (name, phone, email, address) is included — this is a product ops guide, not a case file. Founding case referenced only by LAHD record number.
- **Locked prose:** none introduced by this doc; the Declaration-of-Intent stub copy is locked in Lane W2, not here.
- **No code change:** documentation deliverable; nothing to typecheck/test.

---

— Engineering (Claude Code) · Lane W1 Walkthrough v1.1 · 2026-07-03
