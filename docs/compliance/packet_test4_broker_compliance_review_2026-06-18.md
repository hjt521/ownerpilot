# Broker Compliance Review — `OwnerPilot_3-Day-Notice_…_test-4.pdf`

**File:** `packet_test4_broker_compliance_review_2026-06-18.md`
**Reviewed by:** Jack Taglyan, California Licensed Real Estate Broker (CalDRE B9445457)
**Date:** 2026-06-18
**Authority:** [`broker_blanket_authorization_2026-06-15.md`](broker_blanket_authorization_2026-06-15.md) — sole compliance authority.
**Subject artifact:** `OwnerPilot_3-Day-Notice_kjhlk-kljkl-Et-Al_1045-Sierra-Star-Pkwy_2026-06-18-test-4.pdf` (7-page packet, owner-uploaded 2026-06-18)
**Posture:** Broker-prepared workflow under California Licensed Real Estate Broker supervision per Bus. & Prof. Code § 10131(b). Not legal advice.

---

## §1. Account-number question — direct answer

**No, you should not mask the account number, and the existing determination is binding on that point.**

This was already decided. [`Part_E_account_number_exposure_attorney_ruling_2026-06-04.md`](Part_E_account_number_exposure_attorney_ruling_2026-06-04.md) (broker-ratified under [`broker_blanket_authorization_2026-06-15.md`](broker_blanket_authorization_2026-06-15.md)) ruled the full account number must render verbatim on the face of the notice, and [`Part_E_closure_addendum_2026-06-04.md`](Part_E_closure_addendum_2026-06-04.md) closed the question. The reasoning, in short:

- Cal. Code Civ. Proc. § 1161(2) requires the bank-deposit pay-option disclosure to identify **"a financial institution within five miles of the rental property, the address of that institution, *and the account number into which the rental payment may be deposited*"**. The statute names the account number as a face-of-notice element. A masked or truncated number (`*****6789`) is not the account number — it is a redaction of it.
- On an unlawful-detainer facial-sufficiency challenge under the *Eshagian v. Cepeda* (2025) line, opposing counsel will argue a masked number does not satisfy § 1161(2) because the tenant cannot actually use it to make the bank deposit the statute requires the landlord to offer. That is a fatal defect — the notice gets quashed and the landlord re-serves and re-files.
- The privacy concern (posting on a door) is real, but the statute resolves the trade-off in favor of disclosure. A landlord who is not comfortable putting an account number on a posted notice has two compliant alternatives, both already wired in the multi-select architecture:
  1. **Do not offer bank deposit on this notice.** It is one of four optional methods. Drop it; In Person + By Mail remain available and satisfy § 1947.3.
  2. **Use a dedicated rent-collection account.** Open a separate Chase account used only for inbound rent. Then the disclosed account number is the dedicated account, not your operating account, and the exposure is contained to that account's rent flow.

**Ruling, restated for this packet:** the full account number on page 2 (and page 3, the owner record) renders as designed. No mask. No truncation. No change to the renderer.

The build-side follow-up — surfacing the privacy trade-off at the produce-wizard step *before* the landlord picks the bank-deposit method — is authored as a separate determination: [`bank_deposit_disclosure_copy_ratification_broker_determination_2026-06-18.md`](bank_deposit_disclosure_copy_ratification_broker_determination_2026-06-18.md).

---

## §2. Face-of-notice red-flag scan (Tenant Service Copy — page 2)

The page-2 face was checked against § 1161(2), § 1162, and every locked face constant in [`locked_prose_ci_guard_scope_broker_determination_2026-06-15.md`](locked_prose_ci_guard_scope_broker_determination_2026-06-15.md) §2.1. Findings, sorted by severity:

### §2.1 [MUST FIX — UD-fatal] Bank name is lowercase `chase`

The `BANK` row renders `chase` (lowercase). This is a data-quality bug, not a face-prose bug, but on a § 1161(2) facial-sufficiency challenge it is a real argument: the statute requires the notice to identify *the financial institution*. "chase" is not the registered name of a financial institution; JPMorgan Chase Bank, N.A. is. Opposing counsel will not win on this alone, but they don't need to — they pile it on top of any other defect. Two fixes:

- **Short-term:** the produce wizard should auto-Title-Case or upper-case the bank name on render, with an editable confirmation step.
- **Best practice:** the canonical disclosure is `JPMorgan Chase Bank, N.A.` (or `Chase Bank` as the consumer-facing trade name). Build side should add a known-bank name normalization table for the top ~10 banks. This is a [SHOULD FIX] for the wizard but a **[MUST FIX] for *this* notice before it goes out the door** — edit the bank name to `Chase Bank` or `JPMorgan Chase Bank, N.A.` before printing.

### §2.2 [MUST FIX — data quality] Tenant names are placeholder/test garbage

`kjhlk kljkl, ,jn knkl, lkjlk kljlk, gfghfgf hgf` — these are keyboard mashes, and one of them has a leading comma (`,jn knkl`). Two issues:

- A real notice with these names is unservable. The tenant cannot be identified.
- The leading comma on `,jn knkl` indicates the renderer is not trimming or validating the tenant-name string. A real tenant whose first name starts with `,` does not exist. Build side: add a name-character whitelist + trim on the tenant-name field. [SHOULD FIX] for the wizard.

If this is a test render: no action required, ignore. If this is intended for a real service: **do not serve.**

### §2.3 [SHOULD FIX] Telephone rendered as raw digits `3232514490`

§ 1161(2) requires "the name, telephone number, and street address of the person to whom rent payment shall be made." It does not specify a format. `(323) 251-4490` is the conventional form and is what a tenant will recognize as a phone number. The current rendering is technically compliant but visually substandard — and on a posted notice that anyone passes, a tenant who is unsure whether this is a phone number or an account number is a tenant who will not call to cure. Build side: phone-format the `TELEPHONE` row on render. Not blocking for this packet.

### §2.4 [CONSIDER] `PAYABLE TO: Jack Taglyan` is a natural-person payee with no entity behind it

The notice names Jack Taglyan personally as the payee. That is fine if Jack is the actual owner of record on the lease. If the property is owned by an LLC or held in trust, the corporate-landlord determinations (the broker-ratified corporate-landlord determinations) require the entity to be the payee, with Jack named as the authorized agent. Confirm the lease names Jack personally; if it names an LLC, the payee block needs to render the LLC, and the signature block needs `Jack Taglyan, as authorized agent for [LLC]`. Test data, probably not an issue, but on the record.

### §2.5 [PASS] § 1161(2) face-of-notice elements

All required elements present, locked-prose intact:

- ✅ Premises identified (1045 Sierra Star Pkwy, Mammoth Lakes, CA 93546)
- ✅ Tenants identified (placeholder, but structure correct)
- ✅ Amount demanded itemized; base-rent-only disclaimer present
- ✅ Period of rent demanded (May 1 – June 30, 2026)
- ✅ Compliance period rendered with commencement and expiration on face (*Eshagian* doctrine — commences June 22, 2026, expires June 24, 2026)
- ✅ Weekends + judicial holidays exclusion language present
- ✅ Forfeiture-election language present and in the correct location
- ✅ Locked sentence: `mailboxRuleSentence` — verbatim, citing § 1161(2)
- ✅ Locked sentence: `bankPaperInstrumentSentence` — verbatim
- ✅ Locked sentence: `fiveMileSentence` — verbatim, citing § 1161(2)
- ✅ Locked sentence: `eftElectionSentence` — verbatim, citing § 1161(2)
- ✅ Locked labels `payableToLabel`, `telephoneLabel`, `inPersonOrMailLabel`, `personalDeliveryLabel` — all verbatim
- ✅ Signature and dated line present
- ✅ "TENANT SERVICE COPY" badge top-right; statute citation in page footer

### §2.6 [PASS] Compliance-period math

`Dated: June 18, 2026`. The 3-day period commences June 22, 2026 (the period after service; the wizard set intended-service-date June 19). June 22 is a Monday, June 24 a Wednesday. Excluding weekends, three court days from commencement is June 22, 23, 24. Juneteenth (June 19, Friday) is correctly outside the count window. The math is right.

### §2.7 [PASS] Page-2 face is byte-stable for matrix row 4 (`in_person + mail + bank_deposit`)

This packet exercises the in-person + mail + bank-deposit branch — `inPersonOrMailLabel` heads the address row, `personalDeliveryLabel` heads the schedule, bank block follows. No use of the new `inPersonOnlyLabel` or in-person-without-mail sentences — this notice is on the pre-migration mail-inclusive code path, not the multi-select-only path. Consistent with the byte-diff harness in the C7a in-person layout determination §8 (mail-inclusive branches must render byte-identically before and after the slice).

---

## §3. Non-face issues (cover sheet, POS, owner pages)

### §3.1 [SHOULD FIX] Cover sheet — "RiskPath QR coming soon" placeholder

Pages 4, 6, and 7 render an `OwnerPilot RiskPath™ Connected Form` block with a dashed QR placeholder labeled "RiskPath QR coming soon."

- **Placeholder QR was determined "not recommended ever"** in the QR Code Decisions standing posture. Even on owner-only pages, a permanent "coming soon" placeholder is not acceptable — it reads as a half-shipped product, and on a UD challenge an opposing attorney may screenshot it to argue the packet is not production-grade. Either ship the owner-facing QR (which is approved per the QR decisions) or remove the placeholder block entirely until it ships. **Do not print and post with the placeholder visible.**
- These pages are owner-only and never get served, so this is not a UD-defensibility issue for *this* notice. But it is a brand and credibility issue, and on the owner-record pages it suggests features that don't exist. [SHOULD FIX] before the next packet generation.

### §3.2 [PASS] Proof of Service (page 5) tracks § 1162

All three statutory service methods rendered correctly with the right blanks: personal, substituted (with diligence prerequisite recited), posting-and-mailing (with both-prerequisites recited). Penalty-of-perjury attestation present. Footer cites § 1162.

### §3.3 [PASS] Owner Record Copy (page 3) has the right "DO NOT SERVE" treatment

Watermark visible, header badge present, footer says "Owner Record Copy - Do Not Serve." Tenant-facing identity preserved (exact copy of the served notice for the file).

### §3.4 [CONSIDER] Owner Record Details (page 4) shows `SERVICE ATTEMPTS LOGGED: 0`

Correct on a freshly-produced packet. Noted as expected behavior.

---

## §4. Net call — is this packet servable?

**Not yet — two MUST-FIX blockers before service:**

1. **Bank name** must render as `Chase Bank` (or `JPMorgan Chase Bank, N.A.`), not `chase`.
2. **Tenant names** must be real names from the lease, not the placeholder mash currently rendered. If this is a test render only, ignore this item.

Everything else is either a downstream wizard/UX improvement (phone formatting, bank-name normalization, placeholder QR removal, account-number privacy trade-off surfacing) or a confirmation item (entity-vs-natural-person payee). The locked face prose is intact, the compliance-period math is right, and the § 1162 Proof of Service is well-formed.

**On the account number specifically: ruling stands at "render full number." The privacy concern raised is legitimate but does not survive § 1161(2)'s explicit account-number requirement. The compliant privacy answers are (a) drop bank deposit on this notice, or (b) use a dedicated rent-collection account.**

---

## §5. Build-side follow-up

Spinning these out as separate items so they don't get lost:

- [ ] **[MUST FIX]** Bank-name normalization on the produce wizard — Title Case or full legal name, with a known-bank lookup table for the top ~10 banks.
- [ ] **[MUST FIX]** Tenant-name input validation — character whitelist, trim leading/trailing punctuation, minimum length, keyboard-mash detection (length × unique-char ratio).
- [ ] **[SHOULD FIX]** Phone-number formatting on render — `(XXX) XXX-XXXX` US format.
- [ ] **[SHOULD FIX]** Remove the "RiskPath QR coming soon" placeholder from owner pages until the owner-facing QR ships. The placeholder is worse than a clean blank.
- [ ] **[SHOULD FIX]** Produce-wizard privacy disclosure for bank-deposit method — authored separately at [`bank_deposit_disclosure_copy_ratification_broker_determination_2026-06-18.md`](bank_deposit_disclosure_copy_ratification_broker_determination_2026-06-18.md). Build side wires the verbatim copy per that determination.
- [ ] **[CONSIDER]** Entity-vs-natural-person payee — add a wizard check that confirms the payee on the notice matches the owner of record on the lease (LLC, trust, or individual). Tie into corporate-landlord determinations.

---

## §6. Statutory anchor (orientation only — not legal advice)

Cal. Code Civ. Proc. § 1161(2), available at [leginfo § 1161](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CCP&sectionNum=1161.).
Cal. Code Civ. Proc. § 1162, available at [leginfo § 1162](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CCP&sectionNum=1162.).

---

## §7. Sign-off

**Two MUST-FIX blockers before service** (bank-name casing, tenant-name validity). Locked face prose intact, compliance math right, POS well-formed. Account-number ruling unchanged. Build-side follow-up items filed.

— Jack Taglyan
California Licensed Real Estate Broker
CalDRE **B9445457**
Broker Compliance Review · 2026-06-18

---

> OwnerPilot AI is not a law firm and does not provide legal advice. This is a broker-prepared workflow produced under California Licensed Real Estate Broker supervision. For legal matters specific to your situation, consult a California licensed attorney of your choosing.
