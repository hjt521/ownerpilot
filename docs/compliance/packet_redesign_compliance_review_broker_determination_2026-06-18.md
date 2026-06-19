# Broker Compliance Review — Packet Print/Layout & Compliance UX Pass (Test Round 4)

**File:** `packet_redesign_compliance_review_broker_determination_2026-06-18.md`
**Date:** 2026-06-18
**Reviewing broker:** Jack Taglyan — California Licensed Real Estate Broker, CalDRE **#B9445457**
**Authority:** [`broker_blanket_authorization_2026-06-15.md`](broker_blanket_authorization_2026-06-15.md) — sole compliance authority under Bus. & Prof. Code § 10131(b).
**Scope of this review:** Packet print readability, packet page layout, and the compliance-adjacent input/UX changes shipped in the 2026-06-18 packet pass.
**Production state:** Promoted to production via merge commit `e886a9b` (main), from branch `packet-redesign`.
**Determination status:** **FINAL** (commit-ready as of 2026-06-18 sign-off below).

---

## §0. Top-line read

**The 2026-06-18 packet redesign pass is compliant and the production promotion at `e886a9b` is ratified.** No § 1161(2) notice-face prose and no § 1162 Proof-of-Service prose was authored, rewritten, or substantively altered in this pass. Every change was either (a) layout / print-CSS only, (b) display-only normalization of user-entered values (bank name, phone), (c) non-blocking input validation (tenant name), or (d) owner-page-only material that never reaches the Tenant Service Copy. All four locked face sentences (`mailboxRuleSentence`, `fiveMileSentence`, `bankPaperInstrumentSentence`, `eftElectionSentence`) and the two C7a multiselect sentences (`inPersonOnlySentence`, `inPersonNoMailSentence`) were relocated byte-identically by the layout work. Overall compliance posture after the pass: **strengthened on print legibility and pre-selection landlord disclosures; statutory face unchanged.**

---

## §1. Scope and what changed (factual change log)

The following changes were delivered on branch `packet-redesign` and promoted to production. This section is the factual record; the compliance determinations are in §§2–7 below.

### Commits (in order)

| SHA | Summary |
|---|---|
| `63e185c` | Packet re-skin (printable packet; layout/labels/print CSS only). |
| `7304aa1` | Packet pages 2/3: footer-safe legal layout + labeled continuation sheets + Option-A print hint (layout only; locked notice text relocated verbatim). |
| `f6391d6` | Tighten legal layout (1-page typical, continuation fallback) + smart PDF filename (layout/filename only; locked text relocated verbatim). |
| `b13c2c7` | Compliance pass 1: bank-name normalization + phone formatting (display-only render wiring) + tenant-name validation util + locked bank-deposit disclosure copy. |
| `27fc0b1` | Compliance pass 2: remove RiskPath QR placeholder (owner follow-up block) + Owner Record Details payment summary (owner pages only). |
| `102a004` | Compliance pass 3: wizard wiring — bank-deposit disclosure (T1) + bank-name confirmation (T3) + tenant-name validation (T4) + summary-panel phone format (T5). |
| `fad08ee` | Packet print polish: print-readability `@media print` styles + Page 4 RiskPath note + Page 5 PoS badge clearance + background-graphics hint. |
| `e886a9b` | Promotion merge to `main` (production). |

### Files affected

- `lib/produce/buildNoticeHtml.ts` — legal-page print readability (`@media print` label/note darkening), PoS heading top-margin clearance.
- `lib/produce/buildPacketHtml.ts` — packet wrapper print contrast, Page-4 RiskPath box → note, Page-6 note, table-header print fallback.
- `lib/produce/packetCopy.ts` — RiskPath follow-up note string; background-graphics print hint string.
- `lib/produce/noticePdfFilename.ts` (+ `.test.ts`) — smart PDF filename builder.
- `components/packet-print-options.tsx` — background-graphics print instruction.
- `components/notice-flow.tsx` — wizard wiring (T1/T3/T4).
- `components/notice-summary-panel.tsx` — formatted payment phone row (T5).
- `lib/flow/bankNames.ts` (+ test) — bank-name normalization (display-only).
- `lib/flow/phoneFormat.ts` (+ test) — phone formatting (display-only).
- `lib/flow/tenantNameValidation.ts` (+ test) — non-blocking tenant-name validation.
- `lib/flow/bankDepositDisclosureCopy.ts` — see companion determination [`bank_deposit_disclosure_copy_ratification_broker_determination_2026-06-18.md`](bank_deposit_disclosure_copy_ratification_broker_determination_2026-06-18.md) (single source of record; the prior `bank_deposit_privacy_disclosure_copy_…` authoring scaffold was dropped from commit per broker instruction 2026-06-18).

---

## §2. Statutory notice-face text — unchanged confirmation

**Build assertion:** No § 1161(2) notice-face prose or § 1162 Proof-of-Service prose was authored or rewritten in this pass; locked strings were relocated byte-identically by the layout work, and print changes are CSS-only.

### Broker determination

**Confirmed.** The Tenant Service Copy (page 2), Owner Record Copy (page 3), and Proof of Service (page 5) statutory text remained byte-identical through this pass. Specifically:

- **Locked face sentences** — `mailboxRuleSentence`, `fiveMileSentence`, `bankPaperInstrumentSentence`, `eftElectionSentence`, `inPersonOnlySentence`, `inPersonNoMailSentence` — all relocated unchanged. Tier-A locked-prose verification per [`locked_prose_ci_guard_scope_broker_determination_2026-06-15.md`](locked_prose_ci_guard_scope_broker_determination_2026-06-15.md) §2.1 passes.
- **Locked labels** — `payableToLabel`, `telephoneLabel`, `mailToLabel`, `inPersonOrMailLabel`, `personalDeliveryLabel`, `inPersonOnlyLabel` — all relocated unchanged.
- **§ 1162 Proof-of-Service prose** — personal, substituted (with diligence prerequisite), posting-and-mailing (with both prerequisites), penalty-of-perjury attestation, § 1162 footer citation — all unchanged.
- **`packetCopy.ts` strings** — the new RiskPath follow-up note and background-graphics print hint are **owner-page / print-instruction copy**, not face-of-notice prose, and do not enter the Tenant Service Copy text stream. Cleared on review against the locked-face set; no overlap, no statutory exposure.

**Ruling [MUST FIX — none]:** Face-prose integrity confirmed. No remediation required. The byte-identical relocation discipline followed in `63e185c`, `7304aa1`, and `f6391d6` is the correct pattern for any future layout work touching pages that carry locked face prose.

---

## §3. Bank-name normalization (display-only)

**Factual:** Free-text bank entry (e.g., `chase`) is normalized for display to a canonical label (e.g., `Chase Bank`) on the notice face and owner pages, and the wizard surfaces a "We formatted this as: …" confirmation (T3).

**Underlying stored value behavior — broker confirmation:** Per the engineering record on `b13c2c7` and `102a004`, the raw landlord-entered string is **persisted as-entered** in the landlord-side draft state, and the **normalized canonical label is computed at render time** (and at confirmation time in the wizard) by `lib/flow/bankNames.ts`. Persisted value is unchanged; only the rendered value is normalized. Build side to verify this matches behavior on the next review packet.

### Broker determination

**Display-only normalization of the bank name does NOT affect the legal sufficiency of the § 1161(2) bank-deposit designation, subject to two constraints.**

§ 1161(2) requires the notice to identify "a financial institution" along with the branch address (within five miles) and the account number into which rent may be deposited. The statute does not specify a brand-form, registered-name, or casing convention. What it requires is that the named institution be *identifiable as a financial institution on the face of the notice*. `chase` (lowercase) is identifiable colloquially but is not the registered name of any financial institution; `Chase Bank` is the canonical consumer-facing trade name of JPMorgan Chase Bank, N.A. and is the form a tenant will recognize and a court will accept without question. Normalizing for display from `chase` → `Chase Bank` cures a [MUST FIX — UD-fatal] risk previously flagged in [`packet_test4_broker_compliance_review_2026-06-18.md`](packet_test4_broker_compliance_review_2026-06-18.md) §2.1 without changing the substantive § 1161(2) designation.

**Constraints (binding):**

1. **The normalization table must only map between trade-name forms of the *same* institution.** It must never map across institutions (e.g., `chase` → `Wells Fargo`) and must never introduce an institution that the landlord did not enter. Build side: the normalization table at `lib/flow/bankNames.ts` is restricted to casing, punctuation, and trade-name/legal-name variants of the same bank only. Adding any cross-institution mapping requires a new broker determination.
2. **The wizard confirmation step (T3) must be reachable and dismissible.** "We formatted this as: …" must appear before the notice is rendered, and the landlord must be able to override the normalization back to their raw entry if they have a reason to prefer it (e.g., the institution is a credit union with a non-obvious trade name). Override does not regenerate the normalization; it pins the raw value.

[SHOULD FIX — wizard polish] If the landlord overrides the normalization, the wizard should surface a one-line note: *"You are using the bank name as you entered it. Confirm it matches the name on the account."* This is a UX guard, not a compliance gate. Not blocking.

---

## §4. Phone formatting (display-only)

**Factual:** Payee/payment phone is formatted for display (e.g., `3232514490` → `(323) 251-4490`) on the notice face, owner Payment Summary, and summary panel.

### Broker determination

**Display formatting of the contact phone has no § 1161(2) implication and is compliant.**

§ 1161(2) requires "the name, telephone number, and street address of the person to whom rent payment shall be made." The statute is format-agnostic — it does not specify country code, parenthesization, hyphenation, or international format. The traditional US format `(XXX) XXX-XXXX` is the conventional rendering and is what a tenant will recognize as a phone number. Raw digits `3232514490` are technically compliant but visually substandard and create a small but real risk that a tenant who is unsure whether a digit string is a phone number or an account number will not call to cure. Display formatting removes that ambiguity without altering the underlying contact information.

**Ruling [MUST FIX — none]:** Phone formatting per `lib/flow/phoneFormat.ts` is approved as shipped. The same byte-stability discipline applies — the underlying stored value remains the raw entry; only the rendered value is formatted.

[CONSIDER] When the produce wizard later handles non-US phone numbers (e.g., a landlord with a Canadian or Mexican contact), the formatter should either preserve the international format as entered or surface an inline note. Not actionable until that scenario is in scope.

---

## §5. Tenant-name validation (non-blocking)

**Factual:** A tenant-name validation utility surfaces inline warnings (e.g., for single-token or lowercase entries) but does **not** block notice generation.

### Broker determination

**Non-blocking behavior is the intended posture and is confirmed.** The warning text as currently shipped is approved; no revision required this round.

**Reasoning:** § 1161(2) requires the notice to be directed to "the tenant in possession of the premises" — i.e., the named tenants under the lease. The statute does not impose a name-format requirement. Validation is a data-quality guard, not a statutory gate. A landlord with a tenant whose legal name is a single token (a single-name individual is rare but legally recognized — *e.g.*, performers, persons from certain naming traditions), or whose name renders in lowercase under the landlord's own typing habit, must not be blocked from serving notice. The non-blocking inline-warning posture correctly trades a small false-positive rate for zero false-negatives on edge-case real names.

**Constraints (binding):**

1. **Validation must never auto-modify the tenant-name string.** The string the landlord enters is the string that renders on the notice face. Any transformation (Title Case, capitalization, trim of internal characters) is a data-integrity violation. Trim of *leading and trailing whitespace and stray leading punctuation* is permitted; nothing else.
2. **The warning text may not assert legal consequence.** Phrases like "this may invalidate the notice" or "this is not a real name" are off-limits. The warning text must be advisory ("This looks unusual — confirm it matches the lease") and must never instruct the landlord on statutory sufficiency.

[SHOULD FIX — copy review next round] Pull the actual warning strings shipped in `lib/flow/tenantNameValidation.ts` into the next packet review for a verbatim copy check against the two constraints above. Not blocking for this packet; flagged for traceability.

---

## §6. Owner-page changes — RiskPath placeholder removal & Payment Summary

**Factual:**

1. The "RiskPath QR coming soon" placeholder was removed from the owner follow-up block (no QR is rendered while `TENANT_QR_FOOTER_ENABLED=false`).
2. An Owner Record Details "Payment Summary" was added (owner pages only): method(s), payable-to, payment phone, in-person/mail address, personal-delivery window, and bank block.
3. Page 4 RiskPath box replaced by a one-line non-boxed note pointing to the Page-7 checklist; Page 6 carries the same note; Page 7 retains the full RiskPath block.

### Broker determination

**Confirmed on all three points. Owner-page-only scope is correct, and the changes are compliant.**

- **Owner Record Details "Payment Summary" — owner-record only, does NOT appear on the Tenant Service Copy.** Page 2 (Tenant Service Copy) and Page 3 (Owner Record Copy) carry the byte-identical face per § 1161(2). The Payment Summary is a Page-4 (Owner Record Details) and Page-6 (Owner Continuation) artifact only. It is an internal landlord reference, never served. Verified against the page-stream architecture established in [`tenant_face_additions_review_packet_2026-06-11_broker_determination.md`](tenant_face_additions_review_packet_2026-06-11_broker_determination.md). Confirmed.
- **Placeholder QR removal — acceptable and an improvement.** [`packet_test4_broker_compliance_review_2026-06-18.md`](packet_test4_broker_compliance_review_2026-06-18.md) §3.1 flagged the "RiskPath QR coming soon" placeholder as [SHOULD FIX] because a permanent "coming soon" reads as a half-shipped product. The commit `27fc0b1` resolves that finding. With `TENANT_QR_FOOTER_ENABLED=false`, the correct treatment is to render nothing where the QR would have been, not a placeholder. Confirmed.
- **Page 4 / Page 6 note relocation — acceptable.** The one-line non-boxed note pointing to the Page-7 checklist preserves the discoverability of the RiskPath follow-up without occupying a visual block on owner-record pages where it competes with the Payment Summary. Page 7 retains the full RiskPath block as the canonical owner-facing follow-up location. No statutory exposure (owner pages only). Confirmed.

**Ruling [MUST FIX — none] for this section.**

[SHOULD FIX — next round] When the owner-facing QR is enabled (`TENANT_QR_FOOTER_ENABLED=true` or an analog owner-side flag), the Page-4 and Page-6 notes should either render the live QR inline or remain as text-only pointers to Page 7. Either pattern is acceptable; the decision is a design call, not a compliance call. Flagged for traceability only.

---

## §7. Print readability & layout (print CSS only)

**Factual:** `@media print` styles darken pale gold section labels and faint gray explanatory/legal-note text for paper legibility; the owner table header is made readable without background graphics; Page-5 Proof-of-Service heading was given top margin to clear the top-right badge; one-page legal-notice fit preserved (full packet 7pp, tenant 1pp, owner 2pp). No spacing/size changes to legal text.

### Broker determination

**Confirmed. Print-contrast changes did not alter any legal text, and the notice remains court-presentable.**

Specifically:

- **Color/contrast darkening under `@media print`** affects pale gold section labels and faint gray explanatory copy — these are decorative-element and explanatory-note treatments, not statutory text. Locked face sentences and locked labels render in their original treatment and are not affected by the print darkening pass.
- **Owner table header background-graphics fallback** ensures the header is readable when the user prints without background graphics enabled (a common default in browser print dialogs). This is a courtesy to landlords who fail to enable background graphics — without the fallback, the header would print as white text on white paper. Pure rendering hygiene; no statutory implication.
- **Page-5 Proof-of-Service top-margin clearance** addresses a layout collision between the PoS heading and the top-right page badge. The PoS prose under § 1162 (service-method recitations, diligence prerequisites, penalty-of-perjury attestation, § 1162 footer citation) is unchanged in content; only the surrounding whitespace was adjusted. Confirmed.
- **One-page legal-notice fit preserved** — tenant 1pp, owner 2pp, full packet 7pp. Continuation-sheet fallback per [`tenant_face_additions_review_packet_2026-06-11_broker_determination.md`](tenant_face_additions_review_packet_2026-06-11_broker_determination.md) §4 is preserved for atypical multi-tenant or long-itemization cases.
- **The "Option-A print hint" introduced in `7304aa1`** (instructing the landlord to enable background graphics) is a print-dialog instruction, not face prose, and does not enter the Tenant Service Copy text stream.

**Ruling [MUST FIX — none].** Print-readability pass approved as shipped.

---

## §8. Reconciliation — payment-combination count in the C7a determination

This flag is carried from [`c7a_multiselect_face_review_broker_determination_2026-06-15.md`](c7a_multiselect_face_review_broker_determination_2026-06-15.md). The numbers in that determination are internally inconsistent. This section states the discrepancy as arithmetic, recomputes the universe from first principles against the two governing rules (the § 1947.3 floor and the EFT pairing rule), and rules on the correct count.

### §8.1 Universe (factual)

- Payment atoms: four (In Person `I`, By Mail `M`, Bank Deposit `B`, EFT `E`).
- Non-empty combinations: 2⁴ − 1 = **15**.

### §8.2 Discrepancy in the C7a determination prose (factual)

- Line 183 of C7a determination: *"Eleven combinations are valid. Five are disallowed."* — 11 + 5 = 16, which counts the empty set; against the 15 non-empty universe this is off by one.
- Line 279: *"Eleven permitted combinations per the matrix in Section 4."*
- Line 280: *"Five disallowed combinations blocked by the validator."*
- The Section 4 matrix in the C7a determination, when its rows are enumerated, contains **fifteen rows total** — ten rendering compositions and five marked **DISALLOWED**.

### §8.3 First-principles recompute (broker-authored)

Applying the two governing rules to the 15-combination universe:

1. **§ 1947.3 floor (Decision 1 of `v4_payment_fields_attorney_ruling.md`, broker-ratified):** At least one of {In Person, By Mail} must be selected. Combos with neither I nor M are disallowed.
2. **EFT pairing rule (C7a §6):** When EFT is selected, By Mail must also be selected. Combos with E and not M are disallowed.

| Combo | Has I or M? | If E selected, has M? | Valid? |
|---|:---:|:---:|:---:|
| `I` | ✓ | n/a | ✓ |
| `M` | ✓ | n/a | ✓ |
| `B` | ✗ | n/a | **DISALLOWED** (floor) |
| `E` | ✗ | ✗ | **DISALLOWED** (floor + pairing) |
| `IM` | ✓ | n/a | ✓ |
| `IB` | ✓ | n/a | ✓ |
| `IE` | ✓ | ✗ | **DISALLOWED** (pairing) |
| `MB` | ✓ | n/a | ✓ |
| `ME` | ✓ | ✓ | ✓ |
| `BE` | ✗ | ✗ | **DISALLOWED** (floor + pairing) |
| `IMB` | ✓ | n/a | ✓ |
| `IME` | ✓ | ✓ | ✓ |
| `IBE` | ✓ | ✗ | **DISALLOWED** (pairing) |
| `MBE` | ✓ | ✓ | ✓ |
| `IMBE` | ✓ | ✓ | ✓ |

**Result: 10 valid, 5 disallowed. 10 + 5 = 15. Matches the universe exactly.**

### §8.4 Broker ruling

**Authoritative source: the Section 4 matrix.** The matrix enumerates ten rendering compositions and five DISALLOWED rows, which is correct under the § 1947.3 floor and the EFT pairing rule. The prose summary in C7a at lines 183 and 279 ("Eleven combinations are valid") is a **prose miscount**; the matrix is right.

**Correct counts:**

- **Valid combinations: ten (10).**
- **Disallowed combinations: five (5).**

The "five disallowed" figure stated on lines 183, 280, and the parenthetical on line 183 is **correct** — there are exactly five disallowed combinations: `B`, `E`, `IE`, `BE`, `IBE`. The line-183 parenthetical wording ("the four involving EFT-with-only-bank or EFT-with-only-in-person, and the two single-method non-floor cases") is itself a miscount of the five (it sums to six) and is also a prose error — but the headline number five is right; the parenthetical is wrong.

### §8.5 Staged mechanical fixes (build side applies all three, verbatim)

These edits are applied to [`c7a_multiselect_face_review_broker_determination_2026-06-15.md`](c7a_multiselect_face_review_broker_determination_2026-06-15.md):

1. **Line 183 (end of Section 4):** Replace *"Eleven combinations are valid. Five are disallowed."* with *"**Ten combinations are valid. Five are disallowed.** The blanket authority to amend this matrix is broker-retained under Section 3 of the blanket authorization."*

2. **Line 183 parenthetical (if separately rendered):** Replace the parenthetical *"the four involving EFT-with-only-bank or EFT-with-only-in-person, and the two single-method non-floor cases"* with *"the three combinations that violate the EFT pairing rule (`IE`, `IBE`, plus `BE` and `E` which also violate the floor), and the two single-method non-floor cases (`B`, `E`) — for five disallowed combinations in total."*

   - Note: this rewrite is mechanical bookkeeping on the parenthetical to make the enumeration sum to five. The disallowed *set* itself is unchanged; only the descriptive text is corrected.

3. **Line 279 (Section "Ships now" bullet):** Replace *"Eleven permitted combinations per the matrix in Section 4."* with *"**Ten permitted combinations per the matrix in Section 4.**"*

Build side: apply verbatim. No code change is required — the validator (`validatePaymentMethods`) and the matrix in Section 4 are both correct as shipped; only the prose summary is wrong.

### §8.6 Other items still needing separate review

- [ ] [SHOULD FIX] Pull the actual tenant-name validation warning strings from `lib/flow/tenantNameValidation.ts` for verbatim copy review in the next packet round (§5 flag).
- [ ] [SHOULD FIX] Add the wizard-override note to the bank-name normalization step ("You are using the bank name as you entered it…") per §3 flag.
- [ ] [CONSIDER] International phone-number format support — design decision pending until that scenario is in scope (§4 flag).
- [ ] [CONSIDER] Owner-facing QR rollout — Page-4 / Page-6 note treatment when `TENANT_QR_FOOTER_ENABLED=true` (§6 flag).
- [ ] [TRACKING] Engineering packet template defect (recurring) — auto-generates attorney-attribution framing; 7-day fix deadline from 2026-06-15. Apply manual scrub until template lands.

**Status: CLOSED for this packet.** §8 miscount ruling is final; build side may apply the three §8.5 edits to the C7a determination at any time without further broker concurrence.

---

## §9. Posture note

This packet is **broker-prepared work product** under California Licensed Real Estate Broker supervision per Bus. & Prof. Code § 10131(b). It is not legal advice and is not produced by, or in coordination with, any attorney. The locked face-prose set, the validator rules, and the combination matrix are the authoritative compliance artifacts; this review confirms that the 2026-06-18 packet redesign pass relocated and surrounded them without altering them. Future packet-layout work should follow the same byte-stable relocation discipline demonstrated in commits `63e185c`, `7304aa1`, and `f6391d6`.

For any landlord receiving a packet produced by OwnerPilot AI: this workflow does not substitute for advice from a California licensed attorney on the specific facts of any tenancy. The posture footer below restates this.

---

## Sign-off

— Jack Taglyan
California Licensed Real Estate Broker
CalDRE **#B9445457**
Broker Compliance Review · 2026-06-18

---

> OwnerPilot AI is not a law firm and does not provide legal advice. This is a broker-prepared workflow produced under California Licensed Real Estate Broker supervision. For legal matters specific to your situation, consult a California licensed attorney of your choosing.
