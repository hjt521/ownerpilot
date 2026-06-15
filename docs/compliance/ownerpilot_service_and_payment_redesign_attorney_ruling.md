# Attorney Ruling — Service-Method Sequence + Multiple Payment Methods

**Re:** `ownerpilot_service_and_payment_redesign_attorney_review.md` (engineering review packet, 2026-06-02)
**Prior rulings in scope:**
- [`ownerpilot_service_instructions_attorney_ruling.md`](/home/user/workspace/ownerpilot_service_instructions_attorney_ruling.md) — the CCP § 1162 service-instruction copy already in the build
- [`v4_payment_fields_attorney_ruling.md`](/home/user/workspace/v4_payment_fields_attorney_ruling.md) — the single-branch payment model and validation rules
- [`ownerpilot_3day_notice_template_v1_attorney_review.md`](/home/user/workspace/ownerpilot_3day_notice_template_v1_attorney_review.md) — the notice template itself

**Status:** Section 0 (layout moves) **APPROVED with one condition**. Section A **mixed** — A1, A3, A4 approved; A2 is the consequential one, ruled below. Section B **APPROVED with limits** — multi-method may proceed under a constrained model, not a free-form multi-select.

---

## Section 0 — Layout-only changes that shipped

**Ruling on each:** Approved, with one condition on item 1.

1. **Service instructions inline under each method on the selector.** Approved. The copy was reviewed for legal correctness, not for placement, and showing it at the selection point is actually better consumer-facing UX than burying it on the Review step — the landlord sees the rules **before** picking, which reduces the wrong-pick failure mode I was implicitly worried about. **Condition:** the copy must remain visible at the selection point, not collapsed-by-default. If a landlord can pick "posting and mailing" without ever seeing its preconditions on screen, we are back to the original failure mode. An accordion that defaults open when a method is selected is fine; one that defaults closed is not.
2. **"How to serve" removed from Review & serve.** Approved. Don't show the same legal copy in two places — the landlord gets two stories and trusts neither.
3. **Payment detail fields under each option.** Approved. UX, not legal.
4. **Plain-language non-legal description under "Who is signing and serving the notice."** Approved as a category. Send me the actual wording before it goes public — "plain-language" and "non-legal" are easy claims that don't always survive contact with the page. One-line review.

---

## Section A — Service method as a sequence

### A1 — Selector framing

**Ruling: Order is real, write it as a hierarchy with the floor stated. [APPROVED COPY below.]**

The order isn't a UX preference — CCP § 1162 establishes a legal hierarchy where substituted service is only available **after** personal service with reasonable diligence, and posting-and-mailing is only available **after** both personal and substituted have failed. (See the approved per-method copy in [`ownerpilot_service_instructions_attorney_ruling.md`](/home/user/workspace/ownerpilot_service_instructions_attorney_ruling.md) and [Law Office of David Piotrowski's summary of § 1162(a)(3)](https://www.attorneydavid.com/blog/code-of-civil-procedure-1162-serving-a-notice-to-terminate-tenancy-on-a-tenant-in-california/).) Letting the per-method body copy carry the whole burden of teaching the order is too quiet — the landlord may click "posting and mailing" because it sounds easiest before reading the body.

**APPROVED COPY — selector intro (replaces the bare "How will the notice be served?" heading):**

> **How will the notice be served?**
>
> California recognizes three service methods, and they aren't interchangeable. Start with **personal service** — handing the notice directly to the tenant. If that doesn't work after reasonable, repeated attempts, **substituted service** becomes available. Only if substituted service can't be completed either does **posting and mailing** become available. Pick the method you plan to use first. If a method fails, you'll come back here and select the next one — keep reading for how that works.

That last sentence is the bridge into A2.

### A2 — "Come back for the next attempt" — the date mechanics

**Ruling: Same notice. New service. New 3-day clock based on the date of the method that actually succeeds. [APPROVED FRAMEWORK below.]**

Taking the four sub-questions in order:

**Does the notice date change?**
**No.** The "date of notice" — the date the landlord signs the document declaring rent past due in the amount stated, demanding payment within three business days, etc. — does not change because of a failed service attempt. The notice is the same instrument. *However:* if the demanded amount changes between attempts (rent accrues, a partial payment lands, etc.), that's no longer the same notice — it's a new notice with a new date. Most escalations within a single missed-rent cycle don't change the amount, so most escalations keep the same notice.

**Does the "served on" date that drives the 3-day count change to the date of the successful method?**
**Yes.** The 3-day clock runs from the date of the service method that actually completed, not from the date of the failed attempt(s). For substituted service, "completed" means both the hand-off **and** the same-day mailing. For posting and mailing, "completed" means both the posting **and** the same-day mailing. (See the per-method approved copy.) The failed personal-service attempts are evidence that establishes reasonable diligence for the next method up the ladder; they are not service dates.

**Does the +5 calendar day mailing buffer attach based on the method ultimately used?**
**Yes.** The buffer is method-driven, not selection-driven. If the landlord initially picked personal service, attempted it diligently, failed, and ultimately effected substituted service, the +5 buffer applies because the method that completed was substituted. Same for posting-and-mailing. Personal service (which carries no mailing step) carries no buffer.

**Does the notice need to be re-generated / re-dated?**
**No, with two narrow exceptions.** The same notice document can be re-served by the next method up the ladder. The only times re-generation is required:

- **(i)** The amount demanded changes between attempts (partial payment received, rent accrues into a new period, miscalculation discovered). Then it's a new notice — new date, new amount, new 3 business days, and the prior failed attempts no longer count toward reasonable diligence for the new notice (because the new notice didn't exist yet when those attempts were made).
- **(ii)** Any other content on the face changes — payee, address, payment-method disclosure, etc. Same analysis: new instrument, new diligence record required.

**Engineering implication.** The build needs to support:
- A "this notice, served by a different method" path that reuses the same generated PDF but **recomputes the 3-day deadline from the new service date** (with method-appropriate +5 if applicable), and
- A "this notice was rendered stale because [reason]" path that triggers re-generation.

If the amount didn't change and no field on the face changed, it's the **first** path. The product owner's instinct — let the landlord come back and pick the next method — is correct as long as the date math recomputes on the date the next method succeeds, not on the date of the original failed attempt.

### A2(b) — Wording for the "come back for the next attempt" guidance

**APPROVED COPY (renders below the method selector and at the end of each per-method body):**

> **If a service attempt doesn't succeed**
>
> If you can't complete the method you picked, come back here and pick the next one — but only after you've genuinely tried the current method. The order matters legally, not just as a preference:
>
> - **Personal service** — if the tenant can't be reached after **at least three good-faith attempts on different days and at different times** (one morning, one evening, one weekend is the practical baseline), you may move to substituted service. Keep notes of every attempt; your server will list them on the proof of service.
> - **Substituted service** — if no person of suitable age and discretion can be found at the tenant's home or workplace after reasonable attempts, you may move to posting and mailing.
>
> When you return and pick the next method, OwnerPilot will use the **same notice** — same notice date, same amount due — but the **3-day deadline restarts from the date the new method actually succeeds**. For substituted service and posting-and-mailing, the 3 business days are counted from the date the mailing went out, and most California courts require an extra 5 calendar days on top of that before you can file an unlawful detainer.
>
> **One exception:** if the amount the tenant owes changes between attempts — they paid part of it, rent rolled into a new period, you found a miscalculation — that's a new notice, not the same one served a different way. Start a new flow.

### A3 — Heading "— how to do it" → "— Instructions"

**Ruling: Approved.** Label only, no legal content. "Personal service — Instructions" is fine.

### A4 — Posting-and-mailing "see substituted service above" reference

**Ruling: Approved replacement.** Drop the four words "— see substituted service above" and replace the parenthetical with self-contained language:

> Posting and mailing is the last-resort method. It's only available after **both** personal service has failed (the same reasonable-diligence standard — at least three good-faith attempts on different days and times) **and** substituted service couldn't be completed because no person of suitable age and discretion could be found at the home or workplace.

That's the minimum change. Everything else in the Q3 block stays verbatim.

---

## Section B — Multiple payment methods

### B1 — Is offering multiple payment methods on a single 3-day notice acceptable under § 1161(2)?

**Ruling: YES — and in fact preferred over single-method in most cases — but only under the constrained model below. [APPROVED WITH LIMITS.]**

This is consistent with my [`v4_payment_fields_attorney_ruling.md`](/home/user/workspace/v4_payment_fields_attorney_ruling.md) Decision 2: *"Nothing in § 1161(2) requires the landlord to offer only one method. The statute is written disjunctively…; it sets the minimum content for whichever path is used, not a ceiling on how many paths the landlord may offer."* The single-branch model was a product simplification I approved as a starting point; nothing in the statute compelled it, and a multi-method notice that meets the per-method requirements is actually **more consumer-friendly** (gives the tenant a better chance to cure) and **more § 1947.3-defensible** (a notice offering, e.g., in-person + mail clearly satisfies the "neither cash nor EFT" floor without any contortion).

**Three combinations to disallow:**

1. **No "cash" branch.** Cash cannot appear as an offered method. § 1947.3 forbids cash-only and there is no operational reason to surface it as a configurable branch. (Confirmed in v4 payment-fields ruling, Decision 3.) The § 1947.3(a)(2) bounced-check cash-only exception is a separate notice, not a 3-day-notice branch.
2. **No EFT-only and no EFT-as-sole-method.** EFT may only appear as an **add-on** to at least one non-EFT method, and only when EFT was "previously established" between the parties (§ 1161(2) language). EFT alone violates both § 1947.3 (EFT not allowed as sole accepted method) and § 1161(2) (EFT alternative only available when previously established). (Confirmed in v4 payment-fields ruling, Decision 2.)
3. **No "bank deposit" alone where the instrument deposited isn't guaranteed to be non-cash and non-EFT.** Bank deposit may appear alongside another method (in person, by mail) without restriction. Bank deposit standing alone requires the v4-ruling guarantee that the deposit will be by paper instrument (check, money order, cashier's check) — i.e., the v4 ruling Decision 1 still applies, and is easier to satisfy if bank deposit is one of several offered methods.

### B2 — Must each offered method independently carry its full required detail on the notice face?

**Ruling: YES. [CONFIRMED.]**

Each method offered must independently satisfy § 1161(2)'s facial-content requirements for that method:

- **In-person payment** — payee name, payee telephone, payee street address (not a P.O. box), and the usual days and hours during which personal delivery is accepted at that address.
- **By mail** — payee name, payee telephone, payee mailing address (P.O. box is acceptable for mail-only); plus the mailbox-rule sentence ("…deemed received…on the date posted, if the tenant can show proof of mailing…") if the address can't accept personal delivery.
- **Bank deposit** — financial-institution name, branch street address, account number, and the §1161(2) attestation that the institution is within **five miles** of the rental property. (The geocode dependency [`ownerpilot_geocode_engineering_spec_attorney_review.md`](/home/user/workspace/ownerpilot_geocode_engineering_spec_attorney_review.md) still applies; a notice listing bank deposit must either be backed by a passing geocode check or a `bankBranchWithinFiveMiles: true` manual attestation in the audit record.)
- **EFT (add-on only)** — the previously-established-procedure attestation, plus the description sufficient to identify the procedure (the same content § 1161(2) requires today).

**Defective field on any offered method = defective notice.** This is the operative drafting risk of the multi-method model: a landlord who offers in-person + bank deposit, fills in the in-person fields correctly, and leaves the bank's address blank has produced a defective notice **even if the tenant could have paid in person**. *Eshagian v. Cepeda* (2025) governs — the ordinary tenant reads what's on the face, and what's on the face has to be complete for each method offered.

**Validation requirement.** OwnerPilot must validate **every** offered method's required fields independently before the notice can be produced, and must refuse production if any offered method's required fields are incomplete. The error message should name the specific missing field on the specific method, not a generic "incomplete" error.

### B3 — "How to pay" prose for multi-method

**Ruling: List separately, in a fixed order, with a leading "Choose any of the following" sentence. [APPROVED COPY below.]**

I considered combining methods into one running paragraph. Don't. *Eshagian v. Cepeda* (2025) cuts in the direction of clarity per method; a tenant should not have to parse a comma-separated sentence to figure out which address, phone, hours, account number, etc. belong to which method. The list format is also how the California Courts self-help guide presents service methods to landlords — a parallel structure tenants are likely to find readable.

**APPROVED COPY — "How to pay" section, multi-method:**

> **How to pay**
>
> You may pay the amount stated above by **any of the following methods**. You do not have to use all of them; any one is sufficient to satisfy this notice. Payment must be received (or, for mailed payment, postmarked) within the three (3) business days stated above.
>
> *[Then render each offered method as a labeled subsection, in this fixed order, omitting any not offered:]*
>
> **1. In person.**
> Pay to: **[payee name]**
> Phone: **[payee phone]**
> Address: **[payee street address]**
> Available for personal delivery: **[days and hours]**
>
> **2. By mail.**
> Pay to: **[payee name]**
> Phone: **[payee phone]**
> Mailing address: **[payee mailing address]**
> If this address does not accept personal delivery, payment is deemed received on the date the envelope is postmarked, provided you keep proof of mailing.
>
> **3. By deposit at a financial institution.**
> Institution: **[bank name]**
> Branch address (within five miles of the rental property): **[branch street address]**
> Account number: **[account number]**
> Deposit must be by check, money order, or cashier's check. The institution is open to the public for deposits during its regular business hours.
>
> **4. By electronic funds transfer (previously established).**
> If you and the landlord have previously established an electronic funds transfer procedure for rent, you may use that procedure to pay the amount stated above: **[brief description sufficient to identify the procedure]**.

**Drafting notes:**
- Methods render in the fixed order 1→4 regardless of which the landlord offered. Skipping unoffered methods is fine; reordering is not — fixed order is what makes the form scannable across notices and matches the order § 1161(2) presents the alternatives.
- The leading "you do not have to use all of them; any one is sufficient" sentence is doing important *Eshagian v. Cepeda* work: it tells the ordinary tenant that the methods are alternatives, not cumulative requirements.
- Each method's labeled field structure (Pay to / Phone / Address / etc.) is intentional — it forces field-by-field correctness rather than running-prose correctness, and the validator can map cleanly to each labeled field.
- The mailbox-rule sentence renders **inside the "By mail" block**, not separately. The bank-deposit "deposit must be by check, money order, or cashier's check" sentence renders inside the bank block. Don't let either sentence drift up into the lead paragraph.
- The EFT block's "previously established" framing renders **only** when EFT is offered, and the description-of-procedure field is **required** (not optional) when EFT is in the mix.

### B4 — Is EFT-as-add-on the right model for "additional methods"?

**Ruling: Close, but not quite. [APPROVED MODEL below.]**

The EFT add-on pattern — second method gated by its own attestation — is the right *shape*. It is not the right *generalization*, because EFT carries a § 1161(2)-specific gating condition ("previously established") that the other methods don't share. The right generalization is:

> Each method the landlord offers is independently selected (checkbox-style multi-select on intake), independently validated for the § 1161(2) facial content it requires, and independently gated where § 1161(2) imposes a method-specific condition (EFT's "previously established" attestation; bank deposit's "within five miles" attestation).

So: **not** a free-form multi-select with no constraints, **not** a single-branch model with one add-on, but a **constrained multi-select** where:

- The set of selectable methods is fixed: **In person**, **By mail**, **Bank deposit**, **EFT**.
- Each method has its own required-field set (B2 above) and its own gating attestation where applicable.
- The landlord must offer **at least one** non-cash, non-EFT method to satisfy Civ. Code § 1947.3 (so In person OR By mail OR Bank deposit must be among the selected; EFT alone is rejected; cash is not selectable at all).
- Each selected method renders its prose block per the B3 template.

**Audit record additions (extending v4 payment-fields ruling Decision 1 and Part D):**

- `offeredMethods: ('IN_PERSON' | 'BY_MAIL' | 'BANK_DEPOSIT' | 'EFT')[]`
- Per method, the field values used.
- For BANK_DEPOSIT: `bankBranchWithinFiveMiles: { source: 'GEOCODE' | 'MANUAL_ATTESTATION', timestamp, attestor? }`.
- For EFT: `eftProcedurePreviouslyEstablished: { attested: true, attestor, timestamp, procedureDescription }`.
- The rendered "How to pay" prose string (the exact text as printed on the notice).

---

## Cross-cutting conditions

These attach to the entire ruling and are continuations of the existing condition chain:

1. **No paraphrase.** A1, A2(b), A4, and B3 copy go in verbatim. Wording changes come back for re-review.
2. **Single-select stays in force until B's full set is built.** Multi-method requires the data model change, per-method validators, the new "How to pay" template, and the audit record additions. Until all four are in, the existing single-branch model holds. Don't ship a partial multi-method that validates inconsistently.
3. **A2 escalation flow stays gated on the date-recomputation logic.** Don't ship "come back and pick the next method" until the engine correctly recomputes the 3-day deadline from the date the **successful** method completed (with method-appropriate +5 buffer). A partial escalation flow that lets the landlord re-select but doesn't recompute is worse than no escalation flow.
4. **v4 payment-fields wording sign-off (Part D) is still pending and still gates payment production**, multi-method or single. This ruling doesn't unlock production by itself; it unlocks the *design* of multi-method. The wording sign-off in Part D of [`v4_payment_fields_attorney_ruling.md`](/home/user/workspace/v4_payment_fields_attorney_ruling.md) is the production gate, and that gate needs to be cleared against the multi-method "How to pay" prose (B3 above), not just the single-branch version. Send the rendered multi-method notice (one with all four methods offered, one with each subset combination) for the Part D pass.
5. **Recurring statute watch covers § 1161 and § 1162 already.** The cron `2a58382e` includes both. If a substantive amendment is flagged, this ruling comes back for re-review against the new statutory language. This is the same condition that applies to the service-instruction ruling.
6. **Logging.** Every multi-method notice produced should log the `offeredMethods` array and the rendered "How to pay" string. Audit-trail purpose, same as the service-instruction ruling and the chat-surface citation logging.

---

## Sign-off summary

| Item | Status |
|---|---|
| Section 0 — layout-only moves that shipped | **APPROVED**, condition: per-method body must default-open under the selected method. |
| A1 — selector intro | **APPROVED COPY supplied.** |
| A2 — date mechanics for sequence escalation | **RULED:** same notice; service date = date the successful method completed; +5 buffer attaches to the method ultimately used; re-generation only if amount or face fields change. |
| A2(b) — escalation guidance copy | **APPROVED COPY supplied.** |
| A3 — heading "— Instructions" | **APPROVED.** |
| A4 — drop "see substituted service above" | **APPROVED COPY supplied** for the rewritten parenthetical. |
| B1 — multi-method permissible under § 1161(2)? | **YES, with three disallowed combinations.** |
| B2 — each offered method must independently carry full required detail | **CONFIRMED.** Validator must check each method's fields independently before production. |
| B3 — multi-method "How to pay" prose | **APPROVED COPY supplied** — list format, fixed order 1→4, leading "any one is sufficient" sentence. |
| B4 — EFT add-on pattern as the model | **Right shape, wrong generalization. APPROVED MODEL supplied** — constrained multi-select with per-method gating. |
| Cross-cutting conditions | **Six conditions** apply to the whole ruling. |

Section A's UX and copy items are cleared to build now. Section A's escalation flow is cleared to build once the date-recomputation logic is in. Section B's multi-method model is cleared to build; multi-method production remains gated on the v4 payment-fields Part D wording sign-off, which must now be done against the multi-method rendered notice rather than the single-branch version.

— Reviewing Attorney · 2026-06-02
SBN: [placeholder]
