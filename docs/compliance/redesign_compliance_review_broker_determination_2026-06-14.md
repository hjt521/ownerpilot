# Compliance Review — 3-Day Notice Workflow Redesign

**File:** `redesign_compliance_review_broker_determination_2026-06-14.md`
**Date:** Sunday, June 14, 2026
**Reviewer:** Jack Taglyan, California Licensed Real Estate Broker, CalDRE B9445457
**Role:** Broker Compliance Review
**Posture:** Broker-side compliance review under Bus. & Prof. Code § 10131(b). Not attorney sign-off. Not legal advice. Statute citations verified against primary sources at [leginfo.legislature.ca.gov](https://leginfo.legislature.ca.gov/).

---

## 0. Top-line read

The redesign direction is **defensible from a compliance standpoint** with specific revisions, most of which are wording rather than structural. The biggest compliance concerns I'm flagging are: (a) the right-side panel currently reads as a compliance guarantee and must be softened, (b) the safety-check screening questions are useful but their routing logic needs an explicit fail-state copy that doesn't tell the tenant or the landlord what to do legally, (c) the QR code on the tenant-facing copy carries enough UPL surface area that I'm recommending **excluding it from the MVP** and revisiting in a Phase 2 with hard guardrails, and (d) the four-step header names are mostly fine but two of them should be sharpened.

Every item below is tagged **Approved / Approved with revision / Needs legal-compliance review / Not recommended.** Where I recommend changes, the revised wording is locked verbatim.

---

## 1. Step-header names (Question 1)

### Step 1 — "Quick Safety Check"

**Approved with revision.**

The word "Safety" reads tenant-protective rather than landlord-workflow-facing, which is fine, but "Quick" undersells what the screen actually does — it identifies situations where the routine broker-prepared workflow is **not appropriate** and the landlord should slow down. I'd rather call this what it is.

**Revised header (locked):** **"Before we start — a few quick checks"**
**Revised subhead (locked):** "A few quick questions to confirm a routine 3-day notice is the right tool for this situation. If anything here applies, the routine workflow pauses and we point you to a better next step."

The reason this matters: if a tenant later challenges service or the notice itself and points to the "Safety Check" header as evidence that OwnerPilot screens for tenant-protective issues, the platform should have a defensible posture that the screen is a **workflow-fit screen**, not a **legal-rights screen**. The revised header makes that explicit.

### Step 2 — "Property, Tenant & Rent"

**Approved.**

This is clean and describes exactly what the step collects. No revision needed.

### Step 3 — "Landlord, Payment & Signer"

**Approved with revision.**

Three nouns is fine but "Payment" is ambiguous (payment by whom?). The field set is actually about *how rent is paid back to the landlord* and *who signs the notice*. I'd tighten:

**Revised header (locked):** **"Landlord, Payee & Signer"**
**Revised subhead (locked):** "Who the notice is from, where rent is paid, and who signs."

"Payee" is the correct legal term under [CCP § 1161(2)](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CCP&sectionNum=1161.) — the notice must name "the person to whom payment is to be made." Using "Payee" in the header sets up the field set correctly and avoids implying tenant payment terms are being collected.

### Step 4 — "Review & Produce"

**Approved.**

Clear, accurate, no compliance issue.

---

## 2. Moving landlord/payee/payment/signing into Step 3 (Question 2)

**Approved.**

There is no statutory requirement under [CCP § 1161(2)](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CCP&sectionNum=1161.) or [§ 1162](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CCP&sectionNum=1162.) that dictates the **order** in which the landlord collects the facts. The statute prescribes what must appear on the **face of the produced notice**, not the intake sequence. Splitting "Property, Tenant & Rent" from "Landlord, Payee & Signer" is a UX choice within the broker's discretion.

Two compliance conditions on the split:

- **[MUST FIX]** The Step 4 review screen must render the landlord, payee, and signer information **back to the user** before produce, so the user has one screen where the full notice is reviewed in context. Splitting the intake is fine; splitting the review is not. The user must see the whole notice on one screen at Step 4.
- **[SHOULD FIX]** If a landlord enters Step 3 and later goes back to edit Step 2 (e.g., to add a rent period), the engine must recompute Total demanded and re-render Step 3 fields that depend on Step 2 data (none today, but worth a regression check).

The LLC management-type intake from FIX 1 (shipped 2026-06-10) is part of the Step 3 entity branch and must continue to render there with its conditional banner. Do not strip the LLC intake when reordering steps.

---

## 3. Separating Proof of Service and Service Log into post-generation tools (Question 3)

**Approved.**

This is the correct structure under California law. The notice generation step produces a **notice** (a demand document) under § 1161(2). Service of that notice is a **separate legal act** under § 1162, performed *after* the notice exists. Documenting service via a Proof of Service is a **third separate act**, typically performed after the successful service attempt.

These are three sequential, separate legal events. Bundling them in one wizard is a UX choice, not a legal requirement. Separating them more cleanly actually improves the platform's posture:

- The notice generator produces a document the landlord can serve themselves or hand to a process server.
- Serve & Track records what actually happened during service attempts — the operative legal record under § 1162.
- Proof of Service generation pulls from the Serve & Track log and produces page 2 of the served packet.

This separation aligns with the 2026-06-12 broker determination on service-method-capture relocation (`service_method_capture_relocation_broker_determination_2026-06-12.md`), which already moved service-method selection out of the produce wizard and into Serve & Track.

Two compliance conditions on the separation:

- **[MUST FIX]** The produced notice packet (Tenant Service Copy + Owner Record Copy) must include a clear callout pointing the landlord to the Serve & Track tool. Suggested locked copy on the Owner Record Copy footer: "Next step: serving this notice correctly. Visit your OwnerPilot dashboard → Serve & Track to log service attempts and produce a Proof of Service." This is workflow guidance, not legal advice.
- **[MUST FIX]** The notice produced at Step 4 must not include a pre-filled Proof of Service page that suggests service has already occurred or will occur on a specific date. If a PoS template is included in the packet (page 2), it must be **blank** for the landlord to complete after serving, with a header that reads "Proof of Service — Complete this after service. Do not sign or date before service is performed." This is already how the produced packet is built per the A1 Part D countersign 2026-06-04; the separation in this redesign preserves it.

---

## 4. Reducing helper text and using "Learn more" disclosures (Question 4)

**Approved with conditions.**

Tightening the helper prose is reasonable. The compliance constraint is that certain pieces of language **must remain visible by default** because they are either statutorily required (rare) or function as warnings whose effectiveness depends on the user actually reading them (most cases). Everything else can move to a "Learn more" disclosure.

### Must remain visible (do not collapse)

- **Base-rent-only disclaimer above the rent-period table.** Locked wording: "Enter base rent only — not late fees, utilities, or other charges. California law requires this notice to demand only rent." This must stay visible because the user is about to type numbers, and the constraint shapes what they type. Moving this behind a "Learn more" risks the landlord entering late fees or utilities and triggering a § 1161(2) defect.
- **Days-counted helper near the deadline preview.** Locked wording: "The count skips the day of service, Saturdays, Sundays, and California judicial holidays — so the deadline can land more than three calendar days after service. These are the same dates that will print on the notice." This must stay visible because the deadline date is the most likely source of user confusion and the most common reason landlords incorrectly believe service has expired.
- **Posture line on the produce gate.** Locked wording: "OwnerPilot AI is not a law firm and does not provide legal advice. This is a broker-prepared notice produced under California Licensed Real Estate Broker supervision. For legal matters, consult a California licensed attorney of your choosing." This is the UPL posture line and must be readable on the same screen as the produce button. (Note: this is the only place attorney language appears, and it appears as a *referral-out* phrase. That's acceptable — and arguably necessary — even in a no-attorney-attribution product.)
- **LLC manager-managed + non-manager signer warning banner.** From FIX 1 (2026-06-10). When triggered, this is a producibility blocker and must render full-width above the produce button. Do not collapse, do not hide behind "Learn more."
- **Safety-check trigger messaging on Step 1.** When a Step 1 question is answered "yes" or "unsure," the routing copy must render visibly on the screen, not behind a disclosure. See Question 5 below for exact copy.
- **EFT-alone validator error and the within-5-miles bank-deposit attestation.** Validator errors are always visible; attestations are always visible at the moment they apply.

### May be collapsed to "Learn more"

- The longer explanatory paragraphs above tenant/landlord/payee sections (current "Who is the notice directed to?", "Who is the landlord on this notice?", "California law requires the notice to name the person to receive payment..." paragraphs).
- The reasonable-diligence service-sequence pedagogy on Serve & Track (the bullet list explaining personal → substituted → posting-and-mailing order). On Serve & Track only — not in the produce wizard, where method is no longer captured.
- The "Why does the notice ask for this?" framing around bank account number and EFT attestation.

### Right-side summary panel

The right-side panel is doing useful work as a running summary of what the produced notice will say. Keep it as a **fact mirror** (echoing what the user has entered) rather than a **status indicator** ("California Compliant" — see Question 8 below).

---

## 5. Reviewing the shorter proposed structure (Question 5)

I'll go field-by-field and flag the items that can't be shortened, hidden, or moved.

### Step 1 — Before we start — a few quick checks

**Approved with revision.**

The three screening questions are reasonable. Each one identifies a fact pattern where a routine pay-or-quit notice is the wrong tool or carries elevated legal risk. The compliance issue is **what happens after a "yes" or "unsure" answer**. The current proposal says "the workflow should pause or route the user out." That direction is correct but the language presented to the user must not give legal advice or imply OwnerPilot is assessing the landlord's case.

**Revised question wording (locked):**

1. "Has the tenant filed a court case, complaint with a fair housing agency, or code-enforcement complaint that names you or this rental property?"
2. "Has the tenant given you anything in writing saying they are withholding rent because of repair problems, habitability issues, or another dispute?"
3. "Has the tenant filed for bankruptcy, or told you they are about to?"

Each question gets three answer choices: **Yes / No / I don't know.**

**Revised routing copy on "Yes" or "I don't know" (locked):**

> "Pause here. This situation may include facts that change how a 3-day notice should be handled, or whether one should be used at all. The OwnerPilot routine workflow assumes a straightforward nonpayment situation with no active disputes or complaints. We recommend talking to a California licensed attorney before producing this notice. You can save your progress and come back."
>
> [Save and exit] [Talk to me about my options — opens neutral resource list]

The "Talk to me about my options" CTA opens a **static page of public resources**: California Courts self-help center, Stay Housed LA (or county equivalent), Tenants Together, the State Bar of California's lawyer referral service. No OwnerPilot-authored advice. No tenant-rights guidance authored by us. Pure navigation to government and established nonprofit resources.

**[MUST FIX]** The routing copy must not tell the landlord they cannot proceed. It must tell them **we recommend they pause** and provide the resources. The landlord retains the choice to continue if they want — we are a broker-prepared document tool, not a gatekeeper. If they choose to proceed, log the override (`safetyCheckOverride: { question, answer, acceptedAt, userAgent, ipHash }`) and surface a confirmation modal: "You're proceeding despite a flagged answer. The routine workflow may not be appropriate for your situation. Consider talking to a California licensed attorney." Modal has [Proceed] and [Pause] buttons. Default is Pause.

**[SHOULD FIX]** Save Step 1 answers to the notice draft (`safetyCheckAnswers: { q1, q2, q3, acceptedAt }`) so the audit trail captures what the landlord said before producing.

### Step 2 — Property, Tenant & Rent

**Approved with revision.**

Visible inputs as listed are correct. Two additions:

- **[MUST FIX]** "Unit if applicable" — add as a separate optional field below property street address. § 1161(2) does not require a unit number, but for multi-unit properties the unit is a material part of the property description and omitting it creates ambiguity. Helper text: "If your property has a unit number, apartment letter, or suite designation, enter it here."
- **[MUST FIX]** Base-rent-only **disclaimer above the rent-period table**, replacing the standalone checkbox (per the 2026-06-13 Step 2 rearrange ruling). Combined attestation moves to the produce gate at Step 4.

The current proposal includes "checkbox confirming this is base rent only and does not include late fees, utilities, damages, repair costs, or other non-rent charges." This is consistent with the 2026-06-13 ruling, **but the better implementation is the above-table disclaimer + a produce-gate combined attestation, not a per-section checkbox.** Keep the language; change the mechanic.

### Step 3 — Landlord, Payee & Signer

**Approved with revision.**

The proposed field list is mostly correct. Revisions:

- **[MUST FIX]** "Payment method" should be the **multi-select** rebuild from the 2026-06-13 prompt (In person / By mail / Bank deposit / EFT, with the three locked disallowed combinations enforced by validator). Single-select payment-method radio is the interim scaffold, not the target shape.
- **[MUST FIX]** "Notice date" and "Intended service date" must be **separate fields** with the day-count engine producing the deadline preview from intended service date. This is already how the engine works per the 2026-06-10 day-count verification. Do not collapse to one date.
- **[MUST FIX]** Signer "role/capacity" must be a constrained dropdown, not a free-text field. Acceptable values (locked): "Owner" / "Manager (member-managed LLC)" / "Manager (manager-managed LLC)" / "General partner" / "Trustee" / "Authorized agent (e.g., property manager)" / "Officer of corporation." The constrained list is what wires into the FIX 1 LLC management-type warning logic.
- **[MUST FIX]** Owner mailing address field per the 2026-06-13 ruling. This is the address the landlord uses for correspondence; payee street address prefills from it.
- **[CONSIDER]** Move "Notice date" and "Intended service date" to the **top** of Step 3, not the bottom. The landlord knows what day they're signing the notice before they know how they want to be paid. Reordering improves cognitive flow without changing fields.

### Step 4 — Review & Produce

**Approved with revision.**

Visible outputs are correct. Three additions:

- **[MUST FIX]** Final review must render the **full notice as it will be produced**, not just a summary card. The user must be able to read the actual face copy on screen before clicking Produce. This is the most important compliance safeguard against typos in payee name, address, or amount that create § 1161(2) defects under *Eshagian v. Cepeda* (2025).
- **[MUST FIX]** Combined produce-gate attestation per Section 4 below (Question 4). Locked wording from 2026-06-13: "By producing this notice, I confirm: the amounts entered are base rent only (no late fees, utilities, or other charges); the tenants and landlord(s) named are correct; and the signer is authorized."
- **[MUST FIX]** Posture line visible on the same screen as the Produce button (see Question 4 above).

The "produce tenant service copy / owner record copy / optional full packet" structure is correct. The tenant service copy is the document the landlord serves; the owner record copy is the landlord's archival copy; the full packet additionally includes a blank Proof of Service template for the landlord to complete after serving.

---

## 6. Compliance warnings that must stay visible (Question 6)

**The following must be visible on the screen where they apply — not behind "Learn more," not in a tooltip, not in a footnote:**

1. **Base-rent-only disclaimer** (above the rent-period table on Step 2).
2. **Days-counted helper** (near the deadline preview on Step 3 or Step 4 wherever the preview renders).
3. **LLC manager-managed + non-manager signer warning banner** (Step 3 entity branch, when triggered).
4. **Safety-check routing copy** (Step 1, when a "yes" or "I don't know" answer triggers it).
5. **Posture line** (Step 4 produce gate; locked wording above).
6. **Combined produce-gate attestation** (Step 4 produce gate).
7. **EFT-alone validator error** (Step 3 payment methods, when triggered).
8. **Within-5-miles bank-deposit attestation** (Step 3 payment methods, when bank deposit is selected).
9. **EFT previously-established attestation** (Step 3 payment methods, when EFT is selected).
10. **Amount-change validator modal** (Serve & Track, when applicable — outside this redesign but worth listing).

The following are warnings I'd recommend **adding** to the workflow even though they're not in the current proposal:

11. **[SHOULD FIX]** At the top of Step 2, a short banner: "This workflow produces a 3-day notice for nonpayment of rent only. It is not the right tool for lease violations, nuisance, or month-to-month terminations." Helps users who landed in the wrong wizard. Locked wording.

12. **[SHOULD FIX]** On the Step 3 entity branch, a one-line note above the entity-name field: "Use the legal name as it appears in your Secretary of State filing or trust document." Reduces the rate of notice defects from informal entity naming.

---

## 7. Footer/disclaimer language without attorney references (Question 7)

The current draft direction:

> "OwnerPilot AI is not a law firm and does not provide legal advice. This is a broker-prepared notice workflow produced under California Licensed Real Estate Broker supervision."

**Approved with revision.**

This is close, but it omits the **referral-out** clause that lets the user know where to go if they need legal help. Omitting that clause is itself a UPL-adjacent posture problem: it can read as "we've got this covered, don't go to a lawyer." That's the opposite of the message you want. The referral-out clause is the safest version of the line and is also industry-standard.

**Revised footer/disclaimer (locked):**

> "OwnerPilot AI is not a law firm and does not provide legal advice. This is a broker-prepared workflow produced under California Licensed Real Estate Broker supervision. For legal matters specific to your situation, consult a California licensed attorney of your choosing."

This is the same locked wording used in the broker-scope internal note from 2026-06-09. It contains exactly one attorney reference — as a *referral-out* — and that's the right place for it. Removing the referral-out clause to satisfy a "no attorney references anywhere" goal would worsen the platform's compliance posture, not improve it.

**Where this footer should appear (locked):**

- Site-wide footer on every page.
- Step 1 (Before we start — a few quick checks) immediately below the heading.
- Step 4 produce gate immediately above the Produce button.
- On the produced notice packet's **Owner Record Copy** footer (not on the Tenant Service Copy, which should remain a clean legal document without OwnerPilot promotional or disclaimer text on its face — the tenant copy gets the locked TENANT SERVICE COPY label and the QR footer per Phase-2 decisions, per 2026-06-11).

---

## 8. Right-side summary panel: "California Compliant" (Question 8)

**Not recommended — must change.**

The current panel reads:

> California Compliant
> Broker-prepared workflow based on California Code of Civil Procedure § 1161(2).

The phrase "California Compliant" is an **affirmative compliance representation**. The platform cannot guarantee that any specific produced notice will be held compliant by a California court — that turns on the facts of the case, the service circumstances, the tenant's defenses, and ultimately a judge. Putting "California Compliant" on every screen is an overstatement and creates a representation that could be used against the platform in a tenant defense or a regulatory inquiry.

This is the single most important wording change in this review.

**Revised panel content (locked):**

> **California 3-Day Notice Workflow**
> Built around California Code of Civil Procedure § 1161(2) and § 1162. Broker-prepared. Not legal advice.

Three lines, plain, accurate. "Built around" is true (the workflow is structured around those sections). "Broker-prepared" is true (you're the licensed broker). "Not legal advice" carries the posture forward.

**Why not "California-Focused Workflow" or "Broker-Prepared Workflow"?** Both are acceptable as alternatives if the locked version above feels too long for the panel. "California-Focused" is slightly weaker on accuracy than "Built around CCP § 1161(2)" but is still defensible. "Broker-Prepared Workflow" alone is too thin — it doesn't tell the user what makes the workflow specific to California. I prefer the three-line locked version, but if space is tight, "California-Focused Workflow / Broker-Prepared / Not legal advice" works.

**[MUST FIX]** Remove "California Compliant" from every surface where it currently appears (the screenshots from 2026-06-13 show it in the right-side panel on at least two screens). Replace with the locked panel content. Do not retain "California Compliant" anywhere — not in marketing pages, not in tooltips, not in metadata.

---

## 9. QR code on tenant-facing copy (Question 9)

**Tenant-facing QR code: Not recommended for MVP. Owner-facing QR code: Approved with conditions.**

I'm going to split this answer because the two QR codes carry very different compliance profiles.

### Owner-facing QR code (on the Owner Record Copy)

**Approved with conditions.**

This QR points the landlord back to their own OwnerPilot dashboard → Serve & Track. It's a navigation aid for the user who is already a landlord-customer of the platform. No tenant interaction, no UPL exposure, no representation issue. Approved.

Conditions:

- **[MUST FIX]** The QR must link to an authenticated route. If a scan from a stolen Owner Record Copy lands on a public route, treat as a security issue. The Serve & Track endpoint already requires authentication, so this is a verification step, not new work.
- **[SHOULD FIX]** A short caption next to the QR on the Owner Record Copy: "Owner: scan to log service attempts and create a Proof of Service in OwnerPilot." Plain, navigational.
- **[MUST FIX]** No QR on the Tenant Service Copy that links to anything owner-facing. The TENANT SERVICE COPY label (approved 2026-06-11) and the Phase-2 QR footer block are governed by the tenant face additions broker determination from 2026-06-11; that determination conditioned the tenant-facing QR on Phase 2 with five gating conditions still unmet.

### Tenant-facing QR code (on the Tenant Service Copy)

**Not recommended for MVP. Defer to Phase 2 with the five gating conditions from the 2026-06-11 determination satisfied.**

The compliance geometry here is delicate. A QR code on a tenant-served legal document carries implications:

1. **Who is publishing the QR?** OwnerPilot is. The QR is on a document the landlord serves, but the QR itself is OwnerPilot's authored content.
2. **What does the QR communicate?** That OwnerPilot has resources for the tenant.
3. **Is OwnerPilot communicating with the tenant?** Yes, indirectly through the served document.
4. **Does that create a tenant-facing relationship?** Potentially — depending on what the QR target page says.

The 2026-06-11 broker determination on tenant-face additions split tenant-QR destinations into three versions:
- **Version A (broker-scope OK):** Navigation to public government/nonprofit resources (CA Courts self-help, Stay Housed LA, leginfo).
- **Version B (UPL-adjacent, DECLINED):** OwnerPilot-authored tenant-rights guidance.
- **Version C (UPL, DECLINED):** Personalized case-specific guidance.

Only Version A is compliance-cleared, and even Version A carries Phase-2 gating conditions that haven't been satisfied yet (per the 2026-06-11 determination):

1. Static page that links only to public government/nonprofit resources, no OwnerPilot-authored advice content.
2. Explicit disclaimer on the landing page that OwnerPilot does not represent the tenant and is not providing legal advice.
3. No personalized data on the landing page — the tenant must not see their own notice details, the landlord's name, or any case data from the scan.
4. Logged consent that the tenant scanned voluntarily (which is implicit in the scan action but should be reflected in the landing page copy).
5. Quarterly audit of the resource links to confirm they remain accurate and active.

Until those five conditions are operationally met, the tenant-facing QR should not ship.

**Recommended MVP posture:** Ship the TENANT SERVICE COPY label (Phase 1, approved 2026-06-11). Do not ship the tenant-facing QR. Do not include a placeholder QR — the 2026-06-11 determination explicitly declined "(d) Placeholder QR Phase 1 — DECLINED (no dead QR on served notice)." A dead or placeholder QR on a served legal document is worse than no QR at all.

**If the tenant-facing QR is eventually shipped in Phase 2 (Version A only), the locked disclaimer text next to it:**

> "Tenant: this QR opens a list of California tenant resources from the courts and nonprofits. OwnerPilot is not your lawyer and does not represent you. For legal advice, contact a California licensed attorney or your local legal-aid office."

That's the minimum acceptable disclaimer if and when the gating conditions are met.

### Owner-facing QR code disclaimer/caption

Locked caption next to the owner QR on the Owner Record Copy:

> "Owner: scan to log service attempts and create a Proof of Service in OwnerPilot. Sign-in required."

---

## 10. Consolidated final recommendation (Question 10)

Pulling everything together. Items are tagged: **Approved / Approved with revision / Needs legal-compliance review / Not recommended.** Revised wording is locked verbatim where given.

### Step names

| Step | Tag | Locked wording |
|------|-----|----------------|
| Step 1 header | Approved with revision | "Before we start — a few quick checks" |
| Step 1 subhead | Approved with revision | "A few quick questions to confirm a routine 3-day notice is the right tool for this situation. If anything here applies, the routine workflow pauses and we point you to a better next step." |
| Step 2 header | Approved | "Property, Tenant & Rent" |
| Step 3 header | Approved with revision | "Landlord, Payee & Signer" |
| Step 3 subhead | Approved with revision | "Who the notice is from, where rent is paid, and who signs." |
| Step 4 header | Approved | "Review & Produce" |

### Field placement

| Field group | Tag | Notes |
|-------------|-----|-------|
| Property + Tenant + Rent in Step 2 | Approved | Per 2026-06-13 rearrange ruling, with unit field added. |
| Landlord + Payee + Signer in Step 3 | Approved | LLC management intake stays in entity branch (FIX 1). |
| Signer role/capacity as constrained dropdown | Approved with revision | Constrained list, not free-text. |
| Notice date + Intended service date both in Step 3 | Approved | Separate fields, top of Step 3 recommended. |
| Multi-select payment methods in Step 3 | Approved | Per 2026-06-13 prompt, four checkboxes. |
| Bank-deposit fields conditional on bank-deposit selection | Approved | With within-5-miles attestation. |
| Review of full notice on Step 4 before produce | Approved | Must render actual face copy, not just summary. |
| Proof of Service in separate post-generation tool | Approved | Per 2026-06-12 ruling. |
| Service Log in separate post-generation tool | Approved | Per 2026-06-12 ruling. |

### Warnings that must remain visible

All ten items in Section 6 above are tagged **Approved — must stay visible.** The two added warnings (workflow-fit banner at top of Step 2, entity-name format note on entity branch) are tagged **Approved with revision — add to build.**

### Text that may be collapsed to "Learn more"

| Content | Tag |
|---------|-----|
| Long tenant/landlord/payee section paragraphs | Approved (collapse) |
| Reasonable-diligence pedagogy on Serve & Track | Approved (collapse, on Serve & Track only) |
| "Why does the notice ask for this?" explainers | Approved (collapse) |

### Footer/disclaimer language

| Surface | Tag | Locked wording |
|---------|-----|----------------|
| Site-wide footer | Approved with revision | "OwnerPilot AI is not a law firm and does not provide legal advice. This is a broker-prepared workflow produced under California Licensed Real Estate Broker supervision. For legal matters specific to your situation, consult a California licensed attorney of your choosing." |
| Step 4 produce gate posture line | Approved with revision | Same as above, full string. |
| Tenant Service Copy face | Approved | No footer text — clean legal document. TENANT SERVICE COPY label only. |
| Owner Record Copy footer | Approved | Same site-wide footer wording + the Serve & Track next-step CTA. |

### Right-side summary panel

| Surface | Tag | Locked wording |
|---------|-----|----------------|
| Right-side summary panel header | Not recommended (current) | Remove "California Compliant." |
| Right-side summary panel revised | Approved with revision | "California 3-Day Notice Workflow / Built around California Code of Civil Procedure § 1161(2) and § 1162. Broker-prepared. Not legal advice." |
| Alternative shorter version | Approved with revision | If space-constrained: "California-Focused Workflow / Broker-Prepared / Not legal advice." |

### QR code usage

| QR | Tag | Notes |
|----|-----|-------|
| Owner-facing QR on Owner Record Copy | Approved with conditions | Authenticated route; locked caption; Phase 1 OK. |
| Tenant-facing QR on Tenant Service Copy | Not recommended for MVP | Defer to Phase 2; five gating conditions from 2026-06-11 must be met first. |
| Placeholder QR on Tenant Service Copy | Not recommended | No dead QR on served legal documents. |
| Tenant QR Version A (public resources only) | Approved with conditions (Phase 2) | Locked disclaimer required when shipped. |
| Tenant QR Version B (OwnerPilot tenant-rights guidance) | Not recommended | UPL exposure. |
| Tenant QR Version C (personalized case data) | Not recommended | UPL exposure + data exposure. |

### Acceptable broker-scope phrases

| Phrase | Tag |
|--------|-----|
| "broker-prepared" | Approved |
| "California Licensed Real Estate Broker supervision" | Approved |
| "Operated by a California-licensed real estate broker" | Approved |
| "Statute references verified against primary sources" | Approved |
| "California Compliant" | Not recommended |
| "California-Focused Workflow" | Approved with revision |
| "Built around CCP § 1161(2) and § 1162" | Approved |
| "Attorney-reviewed" / "Lawyer-approved" | Not recommended |
| "Consult a California licensed attorney of your choosing" (referral-out) | Approved |

---

## 11. What still needs separate review

Three items in the redesign that I'm flagging as **Needs legal-compliance review** before they ship — not because I'm declining them, but because they're outside broker-scope and benefit from a real attorney looking at them:

1. **Safety-check routing copy and the override modal.** The wording I drafted in Section 5 above is defensible, but routing a landlord away from the workflow based on three screening questions is the kind of thing a tenant-side attorney could probe in cross-examination. A real CA landlord-tenant attorney should review the exact wording before it ships, and confirm the "Save and exit" / "Talk to me about my options" structure doesn't create a duty-of-care issue. My draft is the floor; an attorney pass would be the ceiling.

2. **The neutral resources list opened by "Talk to me about my options."** Curating which external resources OwnerPilot points users to is a content decision with compliance implications. CA Courts self-help and Stay Housed LA are safe. State Bar lawyer referral is safe. Tenants Together is tenant-advocacy and would be an unusual choice for a landlord-facing platform to point to — defensible, but worth an attorney review on whether to include it. I'd narrow the list to government and bar-association resources for the MVP.

3. **The Phase 2 tenant-facing QR landing page (if and when it ships).** The page content is the highest-UPL-exposure surface in the platform. Every word on that page should be reviewed by a CA attorney before it goes live. The 2026-06-11 determination gated Phase 2 on five conditions; I'd add a sixth: explicit attorney sign-off on the landing-page copy.

---

## 12. Posture note

This is broker-side compliance review under California Real Estate Broker scope (Bus. & Prof. Code § 10131(b)). OwnerPilot AI is not a law firm and does not provide legal advice. Statute references are verified against primary sources at [leginfo.legislature.ca.gov](https://leginfo.legislature.ca.gov/). For legal matters specific to a notice or case, consult a California licensed attorney of your choosing.

Primary sources cited:

- [Cal. Code Civ. Proc. § 1161](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CCP&sectionNum=1161.) — 3-day notice content (§ 1161(2) pay-or-quit; § 1161(2)(C) weekends and judicial holidays excluded from 3-day count, AB 2343 eff. 9/1/2019).
- [Cal. Code Civ. Proc. § 1162](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CCP&sectionNum=1162.) — service methods (personal / substituted / posting-and-mailing).
- [Cal. Code Civ. Proc. § 1167](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CCP&sectionNum=1167.) — tenant response deadline to UD summons (10 court days, AB 2347 eff. 1/1/2025).
- *Eshagian v. Cepeda* (2025) — commencement and expiration dates required on the face; per-method facial content must be independently complete.
- Cal. Bus. & Prof. Code § 10131(b) — California Real Estate Broker scope.

Related broker-side determinations (in repo):

- `broker_scope_internal_note_2026-06-09.md` — canonical posture statement.
- `ownerpilot_service_and_payment_redesign_attorney_ruling.md` — multi-method permissibility, disallowed combinations.
- `service_method_capture_relocation_broker_determination_2026-06-12.md` — method capture moved to Serve & Track.
- `tenant_face_additions_review_packet_2026-06-11_broker_determination.md` — TENANT SERVICE COPY label, tenant QR Phase 2 conditions.
- `corporate_landlord_attorney_ruling_round_3_2026-06-05.md` — LLC entity branch and signer-authority rules.
- `claude_prompt_step2_rearrange_plus_payment_and_serve_2026-06-13.md` — three-change consolidated prompt.

---

— Jack Taglyan, California Licensed Real Estate Broker, CalDRE B9445457
Broker Compliance Review · 2026-06-14
