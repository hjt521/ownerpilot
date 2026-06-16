# Broker Compliance Determination — In-Person-Only Address-Row Layout (C7a)

**File:** `c7a_inperson_layout_broker_determination_2026-06-15.md`
**Determination by:** Jack Taglyan, California Licensed Real Estate Broker (CalDRE B9445457)
**Date:** 2026-06-15
**Authority:** [`broker_blanket_authorization_2026-06-15.md`](broker_blanket_authorization_2026-06-15.md) — sole compliance authority.
**Lineage:** Resolves the layout gap left open by [`c7a_multiselect_face_review_broker_determination_2026-06-15.md`](c7a_multiselect_face_review_broker_determination_2026-06-15.md) §8 (which authored the two in-person-without-mail sentences and approved matrix rows 1 and 6 but did not specify the address-row layout). Formalizes the determination requested in the build-side review packet `c7a_inperson_layout_review_packet_2026-06-15.md`.
**Posture:** Broker-prepared workflow under California Licensed Real Estate Broker supervision per Bus. & Prof. Code § 10131(b). Not legal advice.

---

## §0. Scope

This determination selects the **address-row layout for in-person-without-mail notices** (multi-select matrix rows 1 and 6) and, if a new locked label is selected, supplies that label's verbatim string. It does not alter the two locked closure sentences (`inPersonOnlySentence`, `inPersonNoMailSentence`), which remain as authored in the multi-select determination §8 unless this determination states otherwise in §3 below.

No notice that produced before this determination is affected: the three pre-migration branches (`mail_only`, `in_person_and_mail`, `bank_deposit`) render byte-identically, proven by the build side's byte-diff harness. This determination governs only the new in-person-without-mail faces.

---

## §1. Engineering facts (carried over verbatim from the review packet — build side, not broker authorship)

### §1.1 The structural fact that creates the question

In the renderer, the **street address only ever appears attached to a method label.** The two locked labels that carry the address are (A1 Part-D constants, verbatim):

- `mailToLabel`: "By mail to"
- `inPersonOrMailLabel`: "In person or by mail to"

The payee block above them renders only `payableToLabel` ("Payable to" + name) and `telephoneLabel` ("Telephone" + phone). It does **not** render the street address as its own row. A third locked label, `personalDeliveryLabel` ("Available for personal delivery"), heads the days/hours schedule, not the address.

**Consequence:** for an in-person-only face, neither address-carrying label is usable. "By mail to" and "In person or by mail to" both assert mail is available, directly contradicting the locked `inPersonOnlySentence` ("Mail … payment [is] not offered for this notice"). Putting either label on an in-person-only face creates an on-face contradiction (label offers mail; sentence denies it) — the kind of internal inconsistency a §1161(2)/*Eshagian* facial-sufficiency challenge targets. The address therefore needs another label, or the configuration must be narrowed.

### §1.2 The candidate layouts (engineering facts; no recommendation embedded)

**Option A — Reuse `personalDeliveryLabel` for a combined address + schedule row.**
The address and days/hours render together under the existing locked label "Available for personal delivery". Value formats:
- A1: `Available for personal delivery: [street address], [days], [hours]`
- A2: `Available for personal delivery: [street address] ([days], [hours])`

Uses only existing locked labels; authors no new face text. The locked sentence's "the address above" resolves to this row. Structural change: `personalDeliveryLabel` today heads days/hours alone; here it heads address + days/hours.

**Option B — Author one new locked label.**
A new locked label (e.g. `inPersonOnlyLabel: "In person to"` — exact string to be authored by the broker) heads the address row; `personalDeliveryLabel` continues to head days/hours separately.
```
Payable to: [payee name]
Telephone: [phone]
In person to: [street address]
Available for personal delivery: [days], [hours]
Payment must be delivered in person at the address above ...
```
Cleanest semantics. Requires a NEW locked face constant — the broker authors the verbatim string, which the build side wires verbatim (same treatment as the two sentences).

**Option C — Disallow in-person-only; require In Person to pair with By Mail.**
Matrix rows 1 and 6 removed. The two new sentences go unused (defined, not rendered) pending a future determination. Zero new face text or structure, but narrows the feature and re-opens the §3.1 in-person-only approval the multi-select determination already granted.

---

## §2. The determination requested (from the review packet §3)

> Select the in-person-without-mail address-row layout: Option A1, A2, B (and supply the verbatim new label string), or C. If A, confirm the same `personalDeliveryLabel`-headed row is used for both the in-person-only (row 1) and in-person+bank-no-mail (row 6) faces. If B, supply the exact locked label string. State whether the locked `inPersonOnlySentence` / `inPersonNoMailSentence` wording remains unchanged under the chosen layout.

---

## §3. Ruling

**Option B is adopted.** A new locked face constant is authored under broker authority:

```
inPersonOnlyLabel = "In person to"
```

The verbatim string is **`In person to`** — no trailing colon, no trailing punctuation. The colon and space after the label (`": "`) are render glue applied by `renderNotice.ts`, matching the existing pattern used for `mailToLabel`, `inPersonOrMailLabel`, `payableToLabel`, and `telephoneLabel`. The build side wires the string verbatim; any future edit to it fails the `BROKER_WORKFLOW_PRODUCTION_LIVE` CI guard.

The new label is applied identically to **both** in-person-without-mail matrix rows:

- **Row 1 — In Person only:** `inPersonOnlyLabel` heads the street-address row; `personalDeliveryLabel` ("Available for personal delivery") continues to head the days/hours row alone; the face closes with `inPersonOnlySentence`.
- **Row 6 — In Person + Bank Deposit (no mail):** identical layout (same `inPersonOnlyLabel` address row, same `personalDeliveryLabel` schedule row), followed by the existing locked bank-deposit block, closing with `inPersonNoMailSentence`.

`personalDeliveryLabel`'s role is preserved: it continues to head the days/hours schedule alone, byte-identical to its pre-migration usage. No structural reuse, no semantic drift.

The two locked sentences `inPersonOnlySentence` and `inPersonNoMailSentence` — authored in [`c7a_multiselect_face_review_broker_determination_2026-06-15.md`](c7a_multiselect_face_review_broker_determination_2026-06-15.md) §8 — remain **unchanged**. The phrase "the address above" in each sentence now resolves cleanly to the row headed by `inPersonOnlyLabel`. No edit to either sentence is authorized by this determination.

**Why not Option A1/A2.** Reusing `personalDeliveryLabel` ("Available for personal delivery") to head a combined address-plus-schedule row creates a label-content mismatch: the locked string describes *availability* (a schedule concept), but in the combined layout it would also carry *location* (an address concept). On an §1161(2) facial-sufficiency challenge under the *Eshagian v. Cepeda* (2025) line, an opposing tenant attorney can fairly argue the face is internally inconsistent — a locked label promising a schedule but delivering an address. That is exactly the structural ambiguity the multi-select determination went out of its way to eliminate by authoring `inPersonOnlySentence` and `inPersonNoMailSentence` verbatim. Option B authors one new locked label whose plain-English meaning matches the row's contents 1:1, which is the smallest possible addition to the locked-prose set and the cleanest UD-defensible layout.

**Why not Option C.** The multi-select determination ([`c7a_multiselect_face_review_broker_determination_2026-06-15.md`](c7a_multiselect_face_review_broker_determination_2026-06-15.md) §3.1) approved in-person-only on the merits under § 1161(2). Removing rows 1 and 6 now would silently re-open a settled question and leave the two new locked sentences defined-but-unused, creating future drift risk. Option C is not authorized.

The standing direction — a determination that is "not too restrictive but valid for UD court" — points squarely at Option B: it preserves the multi-select feature without forcing the layout through a label reused outside its original semantic scope.

---

## §4. Locked constants ratified by this determination

The following verbatim locked face constants are placed on record by this determination and protected by the `BROKER_WORKFLOW_PRODUCTION_LIVE` CI guard:

| Constant | Verbatim value | Status | Source |
|---|---|---|---|
| `inPersonOnlyLabel` | `In person to` | **NEW — authored by this determination §3** | This file §3 |
| `inPersonAddressLabelVersion` | `v1` | NEW — authored by this determination §4 | This file §4 |
| `inPersonOnlySentence` | (verbatim from prior determination §8) | UNCHANGED | [`c7a_multiselect_face_review_broker_determination_2026-06-15.md`](c7a_multiselect_face_review_broker_determination_2026-06-15.md) §8 |
| `inPersonNoMailSentence` | (verbatim from prior determination §8) | UNCHANGED | [`c7a_multiselect_face_review_broker_determination_2026-06-15.md`](c7a_multiselect_face_review_broker_determination_2026-06-15.md) §8 |
| `mailToLabel` | `By mail to` | UNCHANGED | A1 Part D (broker-ratified) |
| `inPersonOrMailLabel` | `In person or by mail to` | UNCHANGED | A1 Part D (broker-ratified) |
| `personalDeliveryLabel` | `Available for personal delivery` | UNCHANGED (role preserved) | A1 Part D (broker-ratified) |
| `payableToLabel` | `Payable to` | UNCHANGED | A1 Part D (broker-ratified) |
| `telephoneLabel` | `Telephone` | UNCHANGED | A1 Part D (broker-ratified) |

The source-citation comment in `lib/produce/renderNotice.ts` for `inPersonOnlyLabel` and `inPersonAddressLabelVersion` resolves to **this file, §3 and §4** respectively. The build side may cite the file as `c7a_inperson_layout_broker_determination_2026-06-15.md` with no further version qualifier.

`inPersonAddressLabelVersion = "v1"` is the first version stamp on this new constant. Any future change to `inPersonOnlyLabel` requires a new broker determination, a bumped version stamp, and a new entry in the locked-prose hash manifest per [`system_prompt_drift_diff_attorney_correction_2026-06-07.md`](system_prompt_drift_diff_attorney_correction_2026-06-07.md) (broker-ratified).

---

## §5. Statutory anchor (orientation only — not legal advice)

Cal. Code Civ. Proc. § 1161(2), available at [leginfo § 1161](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CCP&sectionNum=1161.).

---

## §6. Sign-off

**Approved.** Build side may proceed to wire `inPersonOnlyLabel = "In person to"` and `inPersonAddressLabelVersion = "v1"` verbatim, applied to matrix rows 1 and 6 per §3, with `inPersonOnlySentence` and `inPersonNoMailSentence` carried over unchanged from the multi-select determination §8. Render full row-1 and row-6 faces for broker confirmation before the slice ships, per the byte-diff harness pattern.

— Jack Taglyan
California Licensed Real Estate Broker
CalDRE **B9445457**
Broker Compliance Review · 2026-06-15

---

> OwnerPilot AI is not a law firm and does not provide legal advice. This is a broker-prepared workflow produced under California Licensed Real Estate Broker supervision. For legal matters specific to your situation, consult a California licensed attorney of your choosing.
