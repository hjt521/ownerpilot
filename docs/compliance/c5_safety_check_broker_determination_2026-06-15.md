# C5 Safety-Check Soft Mode — Broker Determination

**File:** `c5_safety_check_broker_determination_2026-06-15.md`
**Date:** Monday, June 15, 2026
**Reviewer:** Jack Taglyan, California Licensed Real Estate Broker, CalDRE B9445457
**Role:** Broker Compliance Review
**Posture:** Broker-side compliance review under Bus. & Prof. Code § 10131(b). Not attorney sign-off. Not legal advice. Statute references verified against primary sources at [leginfo.legislature.ca.gov](https://leginfo.legislature.ca.gov/).

**Subject:** Pre-flag-flip determination on the C5 safety-check soft-recommend feature (engineering packet `c5_safety_check_attorney_review_packet_2026-06-15.md`).

---

## 0. Top-line ruling

**Soft mode (flag ON) is APPROVED to ship with the conditions below.**

The hard-block screen visible in the current production state (flag OFF) is **APPROVED FOR REMOVAL** from the routine workflow path as part of this flag flip. That screen, in its current form ("TALK TO AN ATTORNEY FIRST" eyebrow + "This is past where a broker-prepared notice is the right move" headline), is **Not Recommended** to remain on the live path even with the flag OFF. It is too aggressive for the soft-recommend posture this determination establishes, and the "this is past where..." phrasing is a quasi-legal conclusion the platform shouldn't be drawing about the user's situation.

The packet itself has a **posture defect that must be fixed before the file is checked into the repo or used as the review-of-record:** it is addressed to a reviewing attorney by name and SBN, which contradicts the broker-scope posture locked on 2026-06-09. See Section 1 below.

---

## 1. [MUST FIX] Packet attribution defect

The engineering packet at line 3 reads: "Prepared for: Janna Taglyan, JD (SBN 269639), reviewing attorney."

This contradicts the broker-scope posture from `broker_scope_internal_note_2026-06-09.md`, which prohibits attorney attribution in code, comments, commits, fixtures, and review documents. The 2026-06-09 inventory found 15 markdown files carrying this attribution and identified them for cleanup pending Jack's conversation with his wife.

**Required fix to the packet before it is used as the review-of-record:**

- Line 3 rewrite (locked): "Prepared for: Jack Taglyan, California Licensed Real Estate Broker (CalDRE B9445457), broker compliance review."
- All "attorney to complete" / "reviewing attorney" references → "broker compliance review to complete."
- Section 7 header: "Sign-off (broker to complete)" not "Sign-off (attorney to complete)."
- Build-side footer line 125 rewrite: "Build-side posture: this packet states engineering facts only. It contains no legal advice and no legal determinations. The broker compliance reviewer authors all rulings."

The substance of the packet is well-structured and the engineering facts are correct. The attribution is wrong and is the same drift we caught on 2026-06-09. This determination accepts the substantive content of the packet and reframes the review as broker compliance review.

---

## 2. The visible hard-block screen — Not Recommended to keep on path

### What's on the screen

The screenshot shows the current production hard-block screen reached when a user answers "Yes" to any of the three safety-check questions:

- Eyebrow: "TALK TO AN ATTORNEY FIRST" (gold caps).
- Headline: "This is past where a broker-prepared notice is the right move."
- Body: "Based on what you told us, your situation involves more than a routine non-payment. When a tenant has asserted a legal claim, disputed rent in writing, or filed for bankruptcy, serving a notice without legal guidance can create real problems."
- Body 2: "Talk to a California licensed attorney before serving any notice. You can read about why OwnerPilot keeps attorney services separate on our approach page."
- Escape: "← Let me review my answers" link at the top.

### Why this is Not Recommended

Three compliance concerns and one product concern, all pointing in the same direction:

1. **"This is past where a broker-prepared notice is the right move" is an affirmative legal determination about the user's situation.** The platform doesn't know whether a 3-day notice is the right move — that turns on facts only an attorney can assess. The platform can recommend a pause; it cannot conclude that the user's situation is "past" the right move for a broker-prepared notice. That sentence is the closest thing to UPL in the current product UI.

2. **The eyebrow "TALK TO AN ATTORNEY FIRST" treats every flagged answer the same.** A tenant who filed a code-enforcement complaint about a clogged drain three months ago and is currently not paying rent is in a very different posture from a tenant who filed for bankruptcy yesterday. The screen says the same thing to both. That's both legally imprecise and a product failure — it'll route landlords with totally manageable situations to abandon the workflow.

3. **The current default is hard-block.** Under the 2026-06-14 determination, the correct posture is soft-recommend with an audit-logged override path. Hard-block on a screening question with no override creates a posture where OwnerPilot is acting as a gatekeeper to legal services rather than a broker-prepared document tool. That's a stronger compliance representation than the platform should be making.

4. **Product concern: customer abandonment.** Jack flagged this directly. Landlords who hit this screen and leave are not landlords who consulted an attorney — most of them are landlords who served the notice without OwnerPilot, often less correctly than they would have with the workflow. The platform's goal is to produce compliant notices for routine situations; routing routine situations to attorney handoff defeats the purpose.

### Determination

**The hard-block screen at `/notice/3-day/safety-stop` (or equivalent route) is APPROVED FOR REMOVAL from the routine flagged-answer path.** Replace with the soft-recommend behavior described in Section 3 below, which is what the flag-ON state already implements.

If the build side wants to retain the screen as a destination reachable only from the soft-mode "Talk to me about my options" button (i.e., a screen the user has opted into seeing), that's acceptable **with revisions to the copy** — see Section 4 below.

---

## 3. Soft mode (flag ON) — APPROVED with conditions

The soft-mode behavior described in Section 1 of the engineering packet is **APPROVED** for the flag to be flipped to `true` in Vercel production, subject to the conditions below.

### 3.1 Routing copy on a flagged screen — APPROVED as locked in Section 2 of the packet

The locked routing copy from the 2026-06-14 determination is approved verbatim:

> "Pause here. This situation may include facts that change how a 3-day notice should be handled, or whether one should be used at all. The OwnerPilot routine workflow assumes a straightforward nonpayment situation with no active disputes or complaints. We recommend talking to a California licensed attorney before producing this notice. You can save your progress and come back."

This wording does the work that "This is past where a broker-prepared notice is the right move" was trying to do, but in a posture-appropriate way: it recommends rather than concludes; it offers the user agency to save and return rather than forcing exit; and it routes to neutral resources rather than to an attorney-handoff-only path.

### 3.2 Override modal — APPROVED with one revision

The locked modal copy from the 2026-06-14 determination is approved with one wording revision to soften "you're proceeding despite a flagged answer," which reads slightly accusatory.

**Revised modal copy (locked):**

> Heading: "Before you continue"
>
> Body: "One or more of your answers suggests this situation may be outside the routine workflow's scope. The 3-day notice may not be the right tool here, and serving it without legal guidance can create problems. We recommend pausing to talk to a California licensed attorney before proceeding. If you want to continue anyway, we'll log your decision."

Buttons: **[Pause]** (default focus) and **[Proceed anyway]**.

The reason for the softening: "despite a flagged answer" frames the user as overriding a system warning, which is technically accurate but reads as scolding. The revised wording explains *why* a pause is recommended and gives the user the agency to make the call. Substantively identical posture; better tone.

### 3.3 Override audit object — APPROVED with one addition

The audit object as built is approved:

```
safetyCheckOverride: {
  flaggedAnswers: [{ question, answer }, ...],
  acceptedAt,
  userAgent
}
```

The build note that `ipHash` is not captured client-side is accepted. The reason for capturing audit data is so that if a notice is later challenged and the user claims they were never warned, the platform can show the record. The `userAgent` + timestamp + flagged-answer record is sufficient for that purpose at this stage.

**One addition (locked):** add `modalCopyVersion: "v1"` to the audit object. This is so that if the modal copy is ever revised, the audit log captures which version of the warning the user actually saw. Future-proofs the audit trail.

```
safetyCheckOverride: {
  flaggedAnswers: [{ question, answer }, ...],
  acceptedAt,
  userAgent,
  modalCopyVersion: "v1"
}
```

### 3.4 Treatment of "I don't know" answers — APPROVED

The packet treats "I don't know" the same as "Yes" — both trigger the flagged-screen routing and the override modal. This is correct. A user who doesn't know whether their tenant has filed a code-enforcement complaint is in the same actionable posture as one who knows they have: they shouldn't proceed without checking. Approved as built.

### 3.5 Unanswered-question hard block — APPROVED

The packet retains a hard block on advancing if any of the three questions is unanswered. This is correct. The screening questions aren't optional, and a user who skipped one can't have meaningfully been screened. Approved as built.

---

## 4. Open question from the packet: bankruptcy and the automatic stay

The engineering packet flags this directly in Section 5(b): the prior hard-block design treated bankruptcy as a hard stop, citing the automatic stay under 11 U.S.C. § 362. The new soft mode treats bankruptcy identically to the other two flags.

This is the one place where soft mode creates a real compliance question that benefits from outside review. **My read as broker compliance reviewer:**

The automatic stay under 11 U.S.C. § 362 is a federal bankruptcy doctrine, not a state landlord-tenant statute. Serving a 3-day notice on a tenant in active bankruptcy can violate the stay and expose the landlord to sanctions, regardless of whether the underlying CA notice would otherwise be compliant. This is a meaningfully different risk profile from the other two screening questions, which surface state-law disputes that may or may not affect notice validity.

**My broker-side recommendation (Section 11 of the 2026-06-14 determination explicitly flagged that bankruptcy treatment "Needs legal-compliance review"):**

- For Questions 1 (court/agency/code-enforcement complaint) and 2 (written withholding), **soft-recommend with override is appropriate.** Approved as built.
- For Question 3 (bankruptcy filed or imminent), **soft-recommend may be too permissive.** A landlord who proceeds with a 3-day notice against a tenant in bankruptcy without first checking the bankruptcy court docket or talking to a bankruptcy attorney is exposed to stay-violation sanctions. The override audit log captures the decision but doesn't protect the landlord from the consequences.

**Two options for handling the bankruptcy question, both within broker scope:**

**Option A — Retain hard block on bankruptcy "Yes" only; soft-recommend on Questions 1 and 2 and on "I don't know" answers to Q3.** This treats bankruptcy as a federal compliance issue, not a state landlord-tenant judgment call. The hard block is justified by a specific federal statute (the automatic stay), not by the platform's opinion of the landlord's case. This is broker-scope-defensible because it cites a specific federal statute the broker can identify, not a legal conclusion about the user's situation.

**Option B — Soft-recommend on all three questions, with an enhanced modal for bankruptcy that explicitly cites the automatic stay.** The modal for a Q3 "Yes" would include an additional sentence: "Bankruptcy triggers an automatic stay under federal law (11 U.S.C. § 362). Serving a 3-day notice during the stay can expose you to sanctions in bankruptcy court. We strongly recommend talking to a bankruptcy attorney before proceeding." User can still override, but the modal carries explicit notice that they're proceeding against an identifiable federal statute.

**My recommendation: Option B.** The reasoning is consistency with the soft-mode posture the determination otherwise approves, plus an enhanced warning that names the specific federal statute at stake. Hard-block creates the same gatekeeper posture problem the rest of this determination is moving away from, even when the underlying concern is legitimate. Option B preserves the user's agency while ensuring the user cannot claim they weren't told.

**Locked enhanced modal copy for Q3 "Yes" only (Option B):**

> Heading: "Before you continue — bankruptcy situations require special handling"
>
> Body: "You indicated the tenant has filed for bankruptcy or is about to. Bankruptcy triggers an automatic stay under federal law (11 U.S.C. § 362). Serving a 3-day notice during the stay can expose you to sanctions in bankruptcy court — even if the notice would otherwise be valid under California law. We strongly recommend talking to a bankruptcy attorney before proceeding. If you want to continue anyway, we'll log your decision."

Buttons: **[Pause]** (default focus) and **[Proceed anyway]**.

The audit object captures `enhancedModalShown: true` when this version was the one displayed.

```
safetyCheckOverride: {
  flaggedAnswers: [{ question, answer }, ...],
  acceptedAt,
  userAgent,
  modalCopyVersion: "v1",
  enhancedModalShown: boolean  // true when Q3 "Yes" triggered the bankruptcy-specific modal
}
```

**Determination on the bankruptcy question: Option B APPROVED.** Build side to implement the enhanced modal for Q3 "Yes" answers and the additional audit field.

---

## 5. The resources page — APPROVED with revisions

The static page at `/notice/3-day/options` contains four external links. The 2026-06-14 determination flagged two of them (Tenants Together and Stay Housed LA) as tenant-advocacy resources that are "an unusual choice for a landlord-facing platform to point to."

### Determination

**Two resources APPROVED for MVP. Two resources Not Recommended for MVP — defer to a later phase with explicit policy review.**

**Approved for MVP:**

1. **California Courts Self-Help — Eviction** — `selfhelp.courts.ca.gov/eviction`. Government resource, neutral, covers both landlord and tenant perspectives. Approved.
2. **State Bar of California — Find a Lawyer Referral Service** — `calbar.ca.gov`. Bar association resource, neutral, this is the cleanest possible referral-out path. Approved.

**Not Recommended for MVP:**

3. **Tenants Together** — tenant-advocacy nonprofit. The page is tenant-focused and presents tenant defenses prominently. Pointing a landlord to this from a landlord-facing platform creates an unusual product posture and may confuse landlords about whose side OwnerPilot is on. Defer to a later phase if and when the platform develops a clearer policy on tenant-side resources.
4. **Stay Housed LA** — LA County/City tenant-assistance program. Same posture concern as Tenants Together — it's a tenant-rental-assistance program, not a neutral or landlord-focused resource. Defer.

The remaining two resources are both posture-neutral and broker-scope-defensible. They cover (a) navigation to court self-help materials and (b) navigation to an attorney referral service. Together they fulfill the "neutral resources" function the determination called for without requiring the platform to point landlords to tenant-side advocacy organizations.

### Page disclaimer copy (locked)

The page's existing not-a-law-firm disclaimer is approved with a slight reformulation to match the locked footer wording from the 2026-06-14 determination:

> "OwnerPilot AI is not a law firm and does not provide legal advice. The resources below are provided for informational purposes only. OwnerPilot does not endorse any specific resource and has no affiliation with the organizations listed. For legal matters specific to your situation, consult a California licensed attorney of your choosing."

**Build instruction:** Replace the current disclaimer wording with this locked version. Remove the Tenants Together and Stay Housed LA cards from the MVP build. Page renders with two resource cards: California Courts Self-Help and State Bar of California Find a Lawyer.

---

## 6. Screening question wording — APPROVED as locked

The three screening questions are approved as locked in Section 1 of the engineering packet (also locked in Section 5 of the 2026-06-14 determination):

1. "Has the tenant filed a court case, complaint with a fair housing agency, or code-enforcement complaint that names you or this rental property?"
2. "Has the tenant given you anything in writing saying they are withholding rent because of repair problems, habitability issues, or another dispute?"
3. "Has the tenant filed for bankruptcy, or told you they are about to?"

No revisions. These three questions cover the three most common factual patterns where a routine 3-day notice may not be the right tool: active litigation/regulatory complaint, written habitability dispute, and bankruptcy. The wording is precise enough to elicit a meaningful answer and broad enough to catch the relevant fact patterns. Approved.

---

## 7. Duty-of-care concern raised in Section 5(a) of the packet

The packet asks whether routing a landlord away from the workflow based on three screening questions, with the "Save and exit" / "Talk to me about my options" structure, creates a duty-of-care concern.

**Broker-side read:** The risk geometry here is that by *offering* a screening tool at all, the platform could be argued to have created an expectation that the screening is reliable, and a landlord who proceeded after a "No" answer and later got sued by a tenant could argue OwnerPilot's screen reassured them. The opposite risk also exists: a landlord routed away by a "Yes" answer who didn't actually have a serious problem could argue OwnerPilot interfered with their ability to serve a notice they were entitled to serve.

Both risks are reduced (not eliminated) by:

- The locked posture line: "OwnerPilot AI is not a law firm and does not provide legal advice."
- The recommend-not-conclude wording on the routing copy (Section 3.1 above) and the override modal (Section 3.2 above).
- The user's retained agency to proceed via the override path.
- The audit log capturing the screening answers and the override decision.

**This is a place where the 2026-06-14 determination explicitly flagged that broker-side review is the floor and an attorney pass would be the ceiling.** The broker-side determination here is that the soft-mode implementation, with the revisions in this file, is **the floor that may ship**. It does not claim to be the ceiling. If and when the platform engages an outside CA landlord-tenant attorney for a fuller pass on the safety-check architecture, that attorney's review supersedes this one.

**For the record:** broker-side scope can identify and verify primary-source statutory references and broker-prepared workflow standards. It cannot opine on duty-of-care doctrine under California tort law. Jack proceeds at his own broker-side discretion under § 10131(b); a fuller pass remains advisable.

---

## 8. Consolidated determination summary

| Item | Tag | Action |
|------|-----|--------|
| Packet attribution (line 3 + body) | Must Fix | Rewrite to broker compliance review framing before file becomes review-of-record. |
| Hard-block screen on flagged-answer path (current production) | Not Recommended | Remove from routine path as part of flag flip. |
| Hard-block screen as opt-in destination from "Talk to me about my options" | Not Recommended (current copy) | If retained, revise copy per Section 2 — drop "TALK TO AN ATTORNEY FIRST" eyebrow and "This is past..." headline. |
| Soft-mode routing copy on flagged screen | Approved | Ship as locked in 2026-06-14 determination Section 5. |
| Soft-mode override modal copy | Approved with revision | Ship locked revised wording from Section 3.2 above. |
| Override audit object | Approved with addition | Add `modalCopyVersion: "v1"` field. |
| Treatment of "I don't know" same as "Yes" | Approved | No change. |
| Unanswered-question hard block | Approved | No change. |
| Bankruptcy-specific enhanced modal (Q3 "Yes") | Approved (Option B) | Ship locked enhanced modal wording from Section 4. Add `enhancedModalShown` audit field. |
| Resources page — California Courts Self-Help | Approved | Ship. |
| Resources page — State Bar Find a Lawyer | Approved | Ship. |
| Resources page — Tenants Together | Not Recommended (MVP) | Remove from MVP build. |
| Resources page — Stay Housed LA | Not Recommended (MVP) | Remove from MVP build. |
| Resources page disclaimer copy | Approved with revision | Ship locked revised wording from Section 5. |
| Three screening questions | Approved | No change. |
| Flag-flip authorization (Vercel `NEXT_PUBLIC_SAFETY_CHECK_SOFT_MODE` → `true`) | Approved with conditions | Conditions: all Must Fix and Approved-with-revision items above are implemented and verified before the flag is flipped. |

---

## 9. Conditions on flag flip

The Vercel flag may be set to `true` in production **only after** all of the following are confirmed by build side:

1. Packet attribution rewritten per Section 1 of this file.
2. Hard-block screen at `/notice/3-day/safety-stop` (or equivalent) is removed from the routine flagged-answer path. The route may be retired entirely, or repurposed as the opt-in destination from "Talk to me about my options" — if repurposed, the copy is revised to drop the "TALK TO AN ATTORNEY FIRST" eyebrow and the "This is past..." headline.
3. Override modal copy updated to the locked revised wording in Section 3.2.
4. Audit object includes `modalCopyVersion: "v1"` and `enhancedModalShown` boolean.
5. Bankruptcy-specific enhanced modal implemented per Section 4, Option B.
6. Resources page cards reduced to the two MVP-approved resources; page disclaimer updated to locked wording in Section 5.
7. Smoke test on staging: a "No / No / No" answer set advances normally; a "Yes / No / No" answer set surfaces the soft-recommend routing screen and the base override modal; a "No / No / Yes" answer set surfaces the enhanced bankruptcy modal; an unanswered question blocks advancement; the override path advances and writes the audit object correctly.

When all seven conditions are confirmed, flag flip is authorized.

---

## 10. Posture note

This is broker-side compliance review under California Real Estate Broker scope (Bus. & Prof. Code § 10131(b)). OwnerPilot AI is not a law firm and does not provide legal advice. Statute references are verified against primary sources at [leginfo.legislature.ca.gov](https://leginfo.legislature.ca.gov/). For legal matters specific to a notice or case, consult a California licensed attorney of your choosing.

Primary sources cited:

- [Cal. Code Civ. Proc. § 1161](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CCP&sectionNum=1161.) — 3-day notice content.
- [Cal. Code Civ. Proc. § 1162](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CCP&sectionNum=1162.) — service methods.
- Cal. Bus. & Prof. Code § 10131(b) — California Real Estate Broker scope.
- 11 U.S.C. § 362 — federal bankruptcy automatic stay.

Related broker-side determinations:

- `broker_scope_internal_note_2026-06-09.md` — posture statement.
- `workspace_attribution_inventory_2026-06-09.md` — attorney-attribution inventory.
- `redesign_compliance_review_broker_determination_2026-06-14.md` — full redesign review (this determination implements Section 11, item 1).
- `c5_safety_check_attorney_review_packet_2026-06-15.md` — engineering packet under review (must be reattributed per Section 1 above).

---

— Jack Taglyan, California Licensed Real Estate Broker, CalDRE B9445457
Broker Compliance Review · 2026-06-15
