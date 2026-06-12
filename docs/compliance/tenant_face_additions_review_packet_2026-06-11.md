# RiskPath Phase 1 — Tenant-Face Additions Review Packet (served-notice change process)
Prepared: 2026-06-11. Engineering facts only.
The DETERMINATION section (§6) is intentionally blank. It must be completed by
a qualified source of the user's choosing. No legal wording or compliance
determination in this document was authored by Claude.

---

## 1. What is proposed

As part of the RiskPath(TM) Connected Forms feature (Phase 1, spec of
2026-06-10), two ADDITIONS to the face of the served California 3-Day Notice
to Pay Rent or Quit (the "Tenant Service Copy"):

a) A page label reading:

   > TENANT SERVICE COPY

   rendered at the top or bottom of the served notice page, outside the
   formal notice body.

b) A tenant-facing QR footer block, visually separated from the notice body
   (thin border, neutral footer styling per the feature spec), containing:

   - Title: "General Information About This Notice"
   - Body: "Scan to learn more"
     (revised by the user 2026-06-11 from the spec's original longer line:
     "Scan to learn what this type of notice generally means and where to
     find independent help.")
   - A QR code (Phase 1: placeholder; Phase 2: links to a public,
     non-case-specific tenant information page)
   - Disclaimer: "OwnerPilot does not represent you or your landlord. This
     information is not legal advice."

Spec placement constraints: footer only; QR never inside the notice body;
minimum 0.9in x 0.9in QR; must not interfere with required/formal notice text.

## 2. What is NOT changing

- The 13 v4 HOW-TO-PAY locked prose constants (including
  `mailboxRuleSentence`), the A1 Part D face text, the title-line statute
  citation, the forfeiture-election language, and the Proof of Service
  citations remain BYTE-IDENTICAL. The additions render around the existing
  notice body; no locked string is edited. Existing exact-equality test pins
  continue to enforce this.
- The Owner Record Copy, Service Log, and Checklist pages are owner-only
  documents and are not served; they are outside this packet's scope.

## 3. Why this packet exists

The locked-constant change process covers edits to locked strings. These
additions do not edit any locked string, but they DO change the printed
artifact a tenant receives. The user (broker) directed that changes to the
served document face be run through a written determination before shipping,
consistent with the process used for the FIX 2 mailing-citation review.

## 4. The questions to be determined (by the qualified source)

a) Is it acceptable for the served 3-Day Notice to carry the page label
   "TENANT SERVICE COPY" on its face? If acceptable only with constraints
   (e.g., placement, wording, size), state them.

b) Is it acceptable for the served notice to carry the tenant-facing QR
   footer described in §1(b)? If acceptable only with constraints, state them.

c) Is the proposed footer wording approved verbatim — title
   "General Information About This Notice", body "Scan to learn more",
   disclaimer "OwnerPilot does not represent you or your landlord. This
   information is not legal advice."? If not, supply the EXACT replacement
   wording verbatim.

d) Phase 1 ships a placeholder QR (no live destination). Is it acceptable to
   print a placeholder/inactive QR on a served notice, or must the tenant QR
   be omitted from served copies until the public information page (Phase 2)
   is live? If omitted, may the label in (a) still ship alone?

e) Any other condition the source attaches (e.g., re-review when the Phase 2
   tenant information page content is finalized).

## 5. What happens after determination

- If approved (with or without constraints): the user supplies/confirms the
  exact footer strings; engineering wires them verbatim as pinned constants
  and builds the additions per the stated constraints. The sign-off reference
  is recorded in §6 and this packet is filed in docs/compliance/.
- If (d) requires omitting the QR until Phase 2: Phase 1 ships the tenant
  copy with the approved label only (or unchanged, per the determination).
- If not approved: the Tenant Service Copy renders the notice exactly as
  today, and all labels/QR content move to the cover sheet and owner-only
  pages.

## 6. DETERMINATION (to be completed by the qualified source — leave blank otherwise)

Determination on (a) label:

Determination on (b) QR footer:

Approved footer wording, verbatim (c):

Determination on (d) placeholder QR / Phase 1 scope:

Other conditions (e):

Determined by (name / qualification / date):

Signature or written-confirmation reference:
