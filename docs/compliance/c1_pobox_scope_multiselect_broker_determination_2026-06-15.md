# Broker Compliance Determination — C1 P.O.-Box Scope (Multi-Select Migration)

**File:** `c1_pobox_scope_multiselect_broker_determination_2026-06-15.md`
**Determination by:** Jack Taglyan, California Licensed Real Estate Broker (CalDRE B9445457)
**Date:** 2026-06-15
**Authority:** [`broker_blanket_authorization_2026-06-15.md`](broker_blanket_authorization_2026-06-15.md) — sole compliance authority.
**Lineage:** Extends the original C1 P.O.-box gate (broker-ratified under blanket authority) to the multi-select payment-methods architecture introduced by [`c7a_multiselect_face_review_broker_determination_2026-06-15.md`](c7a_multiselect_face_review_broker_determination_2026-06-15.md) and laid out by [`c7a_inperson_layout_broker_determination_2026-06-15.md`](c7a_inperson_layout_broker_determination_2026-06-15.md).
**Posture:** Broker-prepared workflow under California Licensed Real Estate Broker supervision per Bus. & Prof. Code § 10131(b). Not legal advice.

---

## §1. Ruling

The C1 P.O.-box gate on the street-address field **fires whenever `paymentMethods[].includes("in_person")` is true**, regardless of what other methods are co-selected.

| Matrix row | Combination | C1 P.O.-box gate |
|---|---|---|
| Row 1 | In Person only | **Fires** |
| Row 3 | In Person + Mail | **Fires** (unchanged from pre-migration behavior) |
| Row 6 | In Person + Bank Deposit (no mail) | **Fires** |
| Row 2 | Mail only | Does not fire |
| Row 4 | Bank Deposit (mail-inclusive) | Does not fire (no in-person leg) |
| Other mail-only / bank-only rows | Does not fire |

The gate is **a property of the in-person leg**, not of the historical `in_person_and_mail` branch it lived inside.

---

## §2. Why this scope matches C1's original intent

The C1 determination authored the P.O.-box check as a constraint on **in-person deliverability of the street-address field** — the physical fact that a P.O. box cannot accept personal delivery. The old code's narrow scope (only `in_person_and_mail`) was an artifact of the old single-branch architecture, in which `in_person_and_mail` was the only branch rendering an in-person leg.

The multi-select migration adds two new in-person-bearing branches (rows 1 and 6). The physical constraint is identical across all three rows. Limiting the gate to `in_person_and_mail` in the multi-select world would silently allow a landlord to enter a P.O. box on a row-1 (in-person-only) or row-6 (in-person + bank) notice, where the locked `inPersonOnlySentence` and `inPersonNoMailSentence` ([`c7a_multiselect_face_review_broker_determination_2026-06-15.md`](c7a_multiselect_face_review_broker_determination_2026-06-15.md) §8) direct the tenant to deliver payment in person at that exact address. That is a facial defect on the § 1161(2) face and an obvious *Eshagian v. Cepeda* (2025) facial-sufficiency target.

The gate follows the leg, not the historical branch name.

---

## §3. What "P.O. box" means for the gate

The detector flags the address field on any of the following normalized forms (case-insensitive, punctuation-tolerant) at the **start of the street-address line**:

- `PO Box`, `P.O. Box`, `P O Box`, `POB`, `P.O.B.`
- `Post Office Box`, `Postal Box`
- `Private Mail Box`, `PMB` (UPS Store and mail-forwarding boxes — same physical defect)

The detector must **not** flag street addresses where these tokens appear mid-string as part of a street name (e.g. `123 PO Box Street` — the form is `<number> <name>`, not `PO Box <number>`). Anchor the match to the start of the address line after whitespace normalization.

The gate is a **hard block**, not a soft warn. Error copy (verbatim from C1):

> "A P.O. box cannot accept personal delivery. Enter a street address where payment can be delivered in person."

---

## §4. Build-side checklist

- [ ] **[MUST FIX]** New helper `validatePayeeTrioAndDelivery(paymentMethods, payee)` in `lib/produce/gates.ts`. Runs the P.O.-box check when `paymentMethods.includes("in_person")`.
- [ ] **[MUST FIX]** The helper also continues to run the existing C1 trio checks (payee name, telephone, address presence) — no behavior change for those.
- [ ] **[MUST FIX]** Both `gates.ts` migrations route through the helper. No duplicated P.O.-box logic anywhere else in the codebase.
- [ ] **[MUST FIX]** Test matrix must include:
  - Row 1 with P.O. box → **block**
  - Row 3 with P.O. box → **block** (regression guard on pre-migration behavior)
  - Row 6 with P.O. box → **block**
  - Row 2 with P.O. box → **allow** (mail to P.O. box is permitted under § 1161(2))
  - Row 4 with P.O. box → **allow**
- [ ] **[MUST FIX]** Detector unit tests for `PO Box`, `P.O. Box`, `POB`, `Post Office Box`, `PMB`, plus a negative case (`123 PO Box Street`) to confirm anchor behavior.
- [ ] **[SHOULD FIX]** Add `c1_pobox_scope_multiselect` to the gate's source citation comment in `gates.ts`, pointing at this file.
- [ ] **[CONSIDER]** Telemetry counter on each P.O.-box block so we can see how often landlords hit the gate after multi-select ships.

---

## §5. Interaction with the C7a layout

The expanded scope dovetails cleanly with [`c7a_inperson_layout_broker_determination_2026-06-15.md`](c7a_inperson_layout_broker_determination_2026-06-15.md):

- On rows 1 and 6, the address now renders under the new locked label `inPersonOnlyLabel` ("In person to") followed by the locked sentence containing "the address above."
- For "the address above" to be a true statement on the face, the address must be physically deliverable in person. The C1 gate is what enforces that.
- Without this scope expansion, a row-1 or row-6 face could ship with a P.O. box in the `inPersonOnlyLabel` slot — the locked sentence would then point to an undeliverable address, which is exactly the on-face contradiction the Option B layout was authored to prevent.

The gate and the layout are two halves of the same § 1161(2) facial-sufficiency posture.

---

## §6. Statutory anchor (orientation only — not legal advice)

Cal. Code Civ. Proc. § 1161(2), available at [leginfo § 1161](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CCP&sectionNum=1161.).

---

## §7. Sign-off

**Approved.** Build side may proceed with the `validatePayeeTrioAndDelivery` helper and the two `gates.ts` migrations per §4. Render full row-1 and row-6 faces with a P.O.-box block in flight before the slice ships (byte-diff harness pattern from [`c7a_inperson_layout_broker_determination_2026-06-15.md`](c7a_inperson_layout_broker_determination_2026-06-15.md) §8).

— Jack Taglyan
California Licensed Real Estate Broker
CalDRE **B9445457**
Broker Compliance Review · 2026-06-15

---

> OwnerPilot AI is not a law firm and does not provide legal advice. This is a broker-prepared workflow produced under California Licensed Real Estate Broker supervision. For legal matters specific to your situation, consult a California licensed attorney of your choosing.
