# Service-method capture relocation — broker determination

**File:** `service_method_capture_relocation_broker_determination_2026-06-12.md`
**Date:** Friday, June 12, 2026
**Reviewer:** Jack Taglyan, California Real Estate Broker, CalDRE license #B9445457
**Role:** Broker Compliance Review
**Posture:** Broker-side compliance review under Bus. & Prof. Code § 10131(b). Not attorney sign-off. Not legal advice. Citations to primary California sources are verified against [leginfo.legislature.ca.gov](https://leginfo.legislature.ca.gov/).

---

## 1. The proposal under review

> "The intended service method is no longer captured pre-production. The wizard collects signing date and intended service date only; the produce gate computes face dates using the engine's method-independent rule. The service method is recorded at serve time on Serve & Track, where each attempt's method is the operative record (B1 shape unchanged). The per-method guidance and escalation copy continue to render on Serve & Track at method selection (Condition 6 logging point moves there accordingly)."

In plain English: remove the "How will the notice be served?" radio from the produce wizard (currently Step 3 of 4, "Who is signing"). The wizard collects signer identity, signing date, and intended service date. Method is picked on Serve & Track when the landlord logs the first attempt, and that selection is the operative record for the proof of service, the 3-day clock, and any +5 buffer.

## 2. Determination: **APPROVED.**

This is a clean refactor. No face-of-notice content changes. No locked-constant changes. No statute-citation changes. The change improves legal posture rather than weakening it.

## 3. Why this is correct under California law

### 3.1 Nothing on the face of the produced notice depends on the method choice

Cal. Code Civ. Proc. § 1161(2) prescribes what the 3-day notice must say on its face: amount due, the period covered, the name/telephone number/usual street address of the person to whom payment is to be made, days/hours for personal delivery, optional bank/EFT election, and an itemization disclaimer for base rent only. See [CCP § 1161](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CCP&sectionNum=1161.).

**None of those facial elements are method-dependent.** The signer identity (Step 3), the dated line, and the intended-service-date-derived deadline dates are computed identically regardless of whether the landlord later hands the notice over personally, leaves it with someone of suitable age, or posts-and-mails.

### 3.2 The face's deadline dates are method-independent by statute

AB 2343 (eff. 9/1/2019), now codified at § 1161(2)(C), excludes weekends and California judicial holidays from the 3-day count, counted from the date the notice is **served**. The exclusion rule does not vary by method. The deadline preview in the wizard already renders the same dates regardless of which radio is selected — that confirms the engine treats method as orthogonal to face dates, which is the legally correct treatment.

### 3.3 The operative legal record of method is the proof of service, not the wizard

Cal. Code Civ. Proc. § 1162 governs how a 3-day notice may be served — personal delivery, substituted service (with suitable-age recipient and mailing), or posting and mailing — and how that service is documented. See [CCP § 1162](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CCP&sectionNum=1162.).

The operative legal record of which method was used is **the proof of service the landlord completes after serving**, not a pre-production radio click. The current produce-time radio is a UX hint about which body copy to surface; it is not the legal record. Moving the capture point to Serve & Track aligns the data model with the statutory structure: method follows the attempt, not the intent.

### 3.4 The earlier service-sequence ruling already established method-driven, not selection-driven, mechanics

The 2026-06-02 service-and-payment redesign ruling (A2 in [`ownerpilot_service_and_payment_redesign_attorney_ruling.md`](/home/user/workspace/ownerpilot_service_and_payment_redesign_attorney_ruling.md)) established that:

- The 3-day clock restarts from the date the **successful** method completes, not from any pre-selected method.
- The +5 calendar day buffer attaches to the method **ultimately used**, not the one selected.
- Failed attempts are evidence of reasonable diligence; they are not service dates.

That ruling already treated produce-time method selection as a UX scaffold, not a legal binding. This proposal closes the loop by removing the scaffold entirely. It is consistent with — and arguably required by — the A2 mechanics already approved.

### 3.5 Eshagian v. Cepeda (2025) clarity doctrine is not implicated

Under *Eshagian v. Cepeda* (2025), the commencement and expiration dates must appear on the face of the notice. They do, and they continue to. Whether the landlord later serves personally or by post-and-mail does not retroactively change those facial dates — and the +5 calendar buffer for post-and-mail is a **filing-readiness** consideration that the landlord (or counsel) handles before filing an unlawful detainer, not something that prints on the notice face. Removing the radio from the wizard does not weaken *Eshagian* compliance because the radio never drove face dates.

## 4. Conditions on approval (all already met by the proposal as written)

- [x] **Face dates remain identical regardless of method.** Confirmed by the existing engine behavior and by the proposal's "method-independent rule" language.
- [x] **B1 attempt-record shape unchanged.** Stated in the proposal. The serve-time record continues to carry method, attempt date, server name, server address, suitable-age and not-a-party attestations, and outcome.
- [x] **Per-method guidance and escalation copy still render at method selection.** Stated in the proposal. The pedagogical content (personal → substituted → post-and-mail order, escalation preconditions, +5 buffer education) follows the picker to Serve & Track. The 2026-06-02 A2 "default-open per-method body copy" condition continues to apply at the new location.
- [x] **Condition 6 logging point moves to Serve & Track.** Stated in the proposal. Whatever telemetry was anchored to pre-production method selection moves with the picker.

## 5. Three things to double-check during the build (not blockers, just lookouts)

### 5.1 [SHOULD FIX] Recompute on attempt success — confirm wiring stays intact

The A2 ruling requires the 3-day deadline to recompute from the date the **successful** method completes. Today, that recompute is presumably keyed off the Serve & Track attempt-completed event, not off the produce-wizard radio. Confirm during the build that removing the wizard radio does not accidentally remove the recompute trigger from any downstream code path. The recompute must continue to fire when an attempt is logged as "Service was completed."

### 5.2 [SHOULD FIX] PoS (page 2) method capture still required at serve time

The proof of service on page 2 of the produced packet has method-specific wording. That capture happens after serve, as it must. Confirm the PoS render path reads the method off the successful attempt record, not off any wizard field that no longer exists.

### 5.3 [CONSIDER] Wizard copy near the deadline preview

With the method radio gone, the deadline-preview helper text ("The count skips the day of service, Saturdays, Sundays, and California judicial holidays — so the deadline can land more than three calendar days after service. These are the same dates that will print on the notice.") becomes the only on-screen pre-production teaching about the 3-day count. It is correct as written and works fine standalone. No copy change required. But if the build side wants to add a one-line nudge along the lines of "You'll pick your service method on the next screen, after the notice is produced," that's permissible and helps user expectations. Optional.

## 6. What this changes downstream — none of the locked surfaces

For the build side's reference, this refactor does **not** touch:

- `SYSTEM_PROMPT` v4.1 (hash-locked).
- `CLASSIFIER_PROMPT` (hash-locked at commit `c7a4469`).
- `INPUT_REFUSAL` / `OUTPUT_REFUSAL` / `GENERIC_DECLINE`.
- The 13 v4 HOW TO PAY prose constants (`V4_WORDING_SIGNED_OFF = true`).
- A1 Part D face-of-notice text (build-locked).
- `mailboxRuleSentence` in `lib/produce/renderNotice.ts` (cites § 1161(2)).
- `POS_PROSE.faceCitation` and `FORM_META.posFooterCitation` (cite § 1162).

It changes:

- The Step 3 wizard layout (remove the "How will the notice be served?" radio).
- Wherever the wizard previously persisted `intendedServiceMethod` into the produce payload, that field becomes either (a) dropped entirely, or (b) retained as an optional analytics field with no downstream legal consequence. Either is fine; (a) is cleaner.
- The Serve & Track method picker continues to do what it already does in the screenshots — surface per-method instructions on selection. No change to that surface other than that this is now the **first** time the user is asked to pick a method, not the second.
- The Condition 6 logging point moves from produce-wizard-mount to serve-track-method-change.

## 7. Posture note

This is broker-side compliance review under California Real Estate Broker scope (Bus. & Prof. Code § 10131(b)). OwnerPilot AI is not a law firm and does not provide legal advice. Statute references are verified against primary sources at [leginfo.legislature.ca.gov](https://leginfo.legislature.ca.gov/). For legal matters arising from a specific notice or case, the landlord should consult a California licensed attorney of their choosing.

---

— Jack Taglyan, California Real Estate Broker, CalDRE license #B9445457
Broker Compliance Review · 2026-06-12

Primary sources cited:
- [Cal. Code Civ. Proc. § 1161](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CCP&sectionNum=1161.)
- [Cal. Code Civ. Proc. § 1162](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CCP&sectionNum=1162.)
- AB 2343 (2018), codified at CCP § 1161(2)(C) — weekends and judicial holidays excluded from 3-day count
- *Eshagian v. Cepeda* (2025) — commencement and expiration dates required on the face
