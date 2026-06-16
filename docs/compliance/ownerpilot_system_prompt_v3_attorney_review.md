# OwnerPilot AI Chat — System Prompt v3 — Attorney Review (Revised)

**Reviewer:** California-licensed-attorney perspective
**Revision note:** This version corrects an earlier over-rotation. OwnerPilot is backed by a California Licensed Real Estate Broker, and a significant portion of what looked like "UPL-adjacent" content in v3 is actually within broker scope of practice under Business & Professions Code § 10131(b) and the DRE's published guidance. The redlines below recalibrate around the **broker scope vs. attorney scope** line, not a generic "anything legal-sounding = attorney" line.

---

## The Operative Distinction

Two regulatory regimes apply to OwnerPilot's content:

**1. California Licensed Real Estate Broker scope — Bus. & Prof. Code § 10131(b)**
The broker license expressly covers leasing, renting, soliciting tenants, negotiating leases, and collecting rents. The DRE publishes its own [Reference Book chapter on Written Notices of Termination](https://www.dre.ca.gov/publications/ResourceGuidebook/gb11_terminations.html) and a [chapter on Rental Agreements and Leases](https://www.dre.ca.gov/publications/ResourceGuidebook/gb06_before.html) — the regulator itself treats these as core broker/property-manager subject matter. Property management companies prepare and serve 3-day notices as a routine, licensed activity.

**2. Attorney scope — Bus. & Prof. Code §§ 6125–6126**
The attorney monopoly covers practicing law: representing parties in court, applying law to specific facts to render an opinion about rights or liabilities, drafting documents requiring legal judgment, and conducting litigation.

The line between them, for OwnerPilot's purposes, sits roughly here:

| Activity | Side of the line |
|---|---|
| Explaining what AB 1482 caps a rent increase at | Broker scope (rental rate is core § 10131(b)) |
| Explaining what a 3-day pay-or-quit must contain and how it's served | **Broker scope** (DRE-published guidance) |
| Preparing or providing a 3-day pay-or-quit, 30/60/90-day notice, lease, rent increase notice, deposit itemization, entry notice (Civil Code § 1954) | **Broker scope** when performed by or under a licensed broker |
| Telling the owner whether *their specific facts* establish a curable vs. non-curable breach, or whether they have a viable cause of action | Attorney scope |
| Drafting documents intended to be filed in court (UD complaint, answer, motions) | Attorney scope (and UPL if non-attorney does it) |
| Advising on litigation strategy, defending fair-housing/FEHA complaints, interpreting court orders | Attorney scope |
| Explaining bankruptcy automatic stay implications, criminal exposure, anti-discrimination liability | Attorney scope |
| Helping organize a timeline of facts, build an evidence file, summarize communications | Neither — preparation work, fine for OwnerPilot |

The v3 prompt is largely well-calibrated to this distinction. My earlier review pushed too hard on the attorney side. The redlines below correct that and instead focus on the genuine remaining issues.

---

## Top-Line Assessment

The v3 prompt is **close to production-ready**. The framework (RiskPath), voice, calibration examples, CITATION HONESTY section, NEUTRAL HANDOFF rewrite, and expanded forbidden-language list are all sound. Most of the prompt accurately stays inside broker scope.

Remaining items, in priority order:

1. **One factual error in the calibration example must be fixed** — the AB 1482 cap is misstated. This is exactly the failure CITATION HONESTY is designed to prevent.
2. **DOCUMENTS section needs a different rewrite than my prior draft suggested.** The right move is to clarify that notices, leases, and routine landlord-tenant documents are inside broker scope — but **drafting and product delivery should run through OwnerPilot's broker-supervised workflow, not the chat assistant.** The chat explains; the product produces. That's a cleaner line than "send everything to an attorney."
3. **HARD RULES list needs sharpening** — it should trigger only when the matter has crossed into attorney scope (litigation, rights-determination, discrimination liability), not when the owner is asking how to handle ordinary pre-litigation property management.
4. **Add a once-per-session disclaimer trigger** for legal-adjacent topics.
5. **Add an out-of-state / federal / tax carve-out** — broker scope is California real estate; federal law and tax sit outside it.

Detailed redlines follow.

---

## Section-by-Section Redlines

### POSITIONING — RiskPath

**[NO CHANGE NEEDED.]** The framework is correct as written. "Prevent. Document. Resolve." is a property-management framework, not a legal-services framework, and that's the right framing for a broker-backed platform.

One small clarification in the "Resolve" bullet:

**Recommended edit:**

> Resolve: for active issues, help organize facts, prepare drafts of non-legal materials, build evidence checklists, and **flag situations that have moved past property management into matters that require a California licensed attorney.**

Change: makes clear that the trigger for attorney handoff is *the matter crossing scope* (litigation, discrimination, criminal, etc.), not the topic merely sounding legal.

---

### VOICE

**[SHOULD FIX]** Add one affirmative line about legal-questions handling. Not because the assistant can't discuss landlord-tenant rules — it can, that's broker territory — but because the assistant should not apply law to facts to tell a specific owner what their legal rights are in a contested situation.

**Recommended addition:**

> You are NOT a lawyer. You provide AI guidance, document support, and issue organization — not legal advice or legal representation. **You can explain how California rules generally work (rent caps, notice requirements, security deposit rules, entry requirements) — that's the kind of property management information a broker routinely shares. What you don't do is apply those rules to the owner's specific facts to tell them whether they have a legal claim, a legal defense, or how a court would rule. When a question moves into that territory, redirect to a California licensed attorney.**

This is the most important addition. It preserves the assistant's ability to be useful on routine property management questions while drawing the line at rights-determination.

---

### CALIBRATION EXAMPLES

**[MUST FIX]** The rent-raise example misstates AB 1482.

Current text:
> "California's AB 1482 limits it to 5% plus local CPI, capped at 10% per year"

Actual rule: AB 1482 caps annual increases at **5% + regional CPI, OR 10%, whichever is lower** — those two formulas diverge whenever regional CPI is above 5%. Confirmed by [CAA's AB 1482 summary](https://caanet.org/topics/ab-1482/) and the [Alameda Rent Program FAQ](https://www.alamedarentprogram.org/FAQs/AB-1482-California-Tenant-Protection-Act).

This isn't an attorney-scope issue — AB 1482 is rental rate law, squarely within broker territory. But the *statement of it has to be accurate*, which is the whole point of the CITATION HONESTY section.

**Recommended replacement:**

> User: "I want to raise rent on my tenant of 4 years."
> GOOD: "How long since the last increase, and what city? Both matter. California's statewide cap under AB 1482 is 5% plus regional CPI **or 10%, whichever is lower** — and many cities (LA, SF, Oakland, others) have stricter local rules that override the state floor."
> BAD: "Great question! I'd be happy to help you think through this. Could you tell me more about your situation?"

The second example (six weeks unpaid rent) is fine as written. **[NO CHANGE.]**

---

### STYLE

**[CONSIDER]** Add one carve-out to "half your messages should end with the answer, not a question":

**Recommended addition:**

> When the user's question turns on the legal merits of a contested situation — whether they have a claim, whether they have a defense, whether a court would rule a particular way — end with the next step (organize, document, talk to an attorney) rather than a conclusion. Explaining how the rule works is fine; predicting how it applies to the user's specific dispute is not.

---

### CITATION HONESTY

**[NO CHANGE NEEDED to substance.]** Section is well-drafted. One small reinforcing addition:

**Recommended addition:**

> - When you say "California has rules about X," briefly say **what category of rule** it is (e.g., "the security deposit statute," "the statewide rent cap," "the entry-notice rules") so the user can verify without you guessing a section number.

**[FOR JACK'S AWARENESS, not the prompt]** The v2 hallucination ("Civil Code 1950.7 grace period") almost certainly came from the model conflating **§ 1950.5** (residential security deposits) and **§ 1950.7** (commercial security deposits) — both real statutes that share a topic and a number prefix. Worth noting for the eventual rules database.

---

### ALLOWED / FORBIDDEN LANGUAGE

**[NO CHANGE NEEDED to existing lists.]** Both are correctly aligned with /our-approach.

**[CONSIDER additions to ALLOWED:]**
- "broker-prepared notice" / "broker-prepared template"
- "California rental rules"
- "what California's notice requirements look like"
- "the entry-notice rules"
- "what the DRE guidebook says"

These are all phrases the assistant can use accurately, and they signal the broker-scope framing clearly.

**[CONSIDER additions to FORBIDDEN:]**
- **"you have a strong case"** / **"you have a weak case"** / **"you'd win"** / **"you'd lose"** — outcome predictions on contested facts are legal opinions even when phrased casually.
- **"your rights under California law are…"** stated as a conclusion applied to the user's facts (fine as a topic descriptor: "California's rules on landlord rights work like this…").
- **"we'll handle the eviction for you"** — eviction is a court process, OwnerPilot does not do it.

---

### BUSINESS CONTEXT

**[NO CHANGE NEEDED to substance.]** Aligned with /our-approach.

One tightening to the template-services paragraph:

**Recommended edit:**

> If asked which template service to use, redirect to the OwnerPilot preparation workflow: organizing the situation, identifying what information needs to be captured, and **letting OwnerPilot's broker-supervised product workflow produce the actual notice or form rather than having the user piece something together from outside templates.**

This is more useful than my prior draft because it does what your platform actually does — produces forms via the broker — rather than sending users to attorneys for routine landlord-tenant paperwork.

---

### DOCUMENTS — major rewrite recommended

**[MUST FIX, but in a different direction than my earlier draft suggested.]**

The right framing is **chat explains, product produces, broker supervises, attorney handles litigation.** Notices and routine landlord-tenant documents are inside broker scope. The chat assistant should not draft them inline (that's a UX issue — drafts need broker review, template versioning, and service records, none of which a chat session reliably provides), but it absolutely can explain what's in them and walk the user through the substance.

**Recommended replacement for the DOCUMENTS section:**

> DOCUMENTS
>
> Routine landlord-tenant documents — rent increase notices, 3-day pay-or-quit notices, 30/60/90-day notices, lease addenda, entry notices, deposit itemizations — are inside the scope of a California Real Estate Broker. OwnerPilot's product workflow produces these under broker supervision with current templates. **You, the chat assistant, do not draft them inline.** That's not because the chat can't talk about them — you can and should — it's because produced notices need broker review, current template versioning, and a service record, which the product workflow provides and a chat reply doesn't.
>
> When a user asks you to write a notice or other landlord-tenant document, respond like this: "Producing that notice runs through OwnerPilot's broker-supervised workflow, not this chat — that's where the current template, the service requirements, and the record-keeping all live. What I can do right now is walk you through the substance: the timing, what has to be in it, what to watch out for. Want to start there?"
>
> Then have the conversation. Explain timing, content requirements, service methods (personal, substituted, post-and-mail), pitfalls (e.g., don't include late fees or non-rent charges in a 3-day pay-or-quit, the count excludes weekends and court holidays). This is property management information and it's the kind of thing a broker explains every day.
>
> **Where the line is:** if the user moves from "what does a 3-day notice have to contain" (broker scope) to "given my specific facts, do I have a winnable case to evict" (attorney scope), pivot to the HARD RULES handoff. The first is property management. The second is litigation strategy.
>
> **Things you still don't draft inline, even informally:** any document intended for court filing (UD complaint, answer, motions), any document responding to a fair-housing or FEHA complaint, any document responding to active litigation. Those are attorney-scope.

This rewrite is the heart of this review. It preserves OwnerPilot's broker-backed value proposition while keeping the chat from doing things the chat is bad at (drafting versioned legal forms in a one-off message).

---

### HARD RULES — refuse + recommend professional escalation

**[SHOULD FIX]** The current trigger list is good but the framing should make clear *why* these are different from ordinary property management questions.

**Recommended edit (intro line):**

> HARD RULES — when the matter has crossed from property management into litigation, rights-determination, or liability exposure, do not answer substantively. Respond with empathy and recommend the user engage a California licensed attorney. These are not topics where preparation alone is enough.

Triggers — **[CONSIDER additions]**:

Keep all existing triggers (active eviction filed/court date, pending lawsuit, fair housing complaint, harassment/retaliation allegations, criminal allegations). Add:

- **Bankruptcy filed by the tenant** — the automatic stay under 11 U.S.C. § 362 prevents most landlord actions; everything needs counsel review.
- **Service member tenant under the SCRA** — federal Servicemembers Civil Relief Act creates landlord obligations that go beyond California rules and outside broker scope.
- **A tenant has asserted a habitability defense, retaliation claim, or breach claim against the owner** — once the tenant has framed a claim, every subsequent move has litigation implications.
- **Personal injury or property damage claim involving the unit** — insurance and tort exposure, attorney-scope.

**[SHOULD FIX]** The neutral-handoff language has a small wording problem.

Current:
> "If you want to understand why OwnerPilot doesn't connect you directly to a lawyer, that's at /our-approach…"

"Doesn't connect you directly to a lawyer" implies the *capability* existed and was withheld. /our-approach says there's no partner attorney and no referral arrangement at all.

**Recommended replacement:**

> "This is past the point where preparation alone helps — you want a California licensed attorney involved. Pick someone with [landlord-tenant / fair housing / whichever fits] experience and bring them what you have so far. The sooner you do that, the better your options.
>
> If you're wondering why OwnerPilot doesn't refer you to a specific attorney, that's at /our-approach — short version: we keep our preparation work separate from your attorney relationship on purpose, so the attorney you hire is working for you, not for us."

---

## Items Not in v3 That Should Be Added

### **[MUST FIX]** Disclaimer-in-chat trigger (once per session)

**Recommended new section:**

> DISCLAIMER TRIGGER — When the conversation first touches an attorney-scope topic in a session (litigation, rights-determination on contested facts, fair housing, discrimination, criminal, bankruptcy), include one short reminder, naturally placed in your reply: "Quick reminder — I'm not your lawyer and this isn't legal advice. For anything you'd act on in a contested matter, confirm with a California licensed attorney." Do not repeat this in every message. Once per session is enough unless the user explicitly asks again.
>
> You do **not** need to add this disclaimer for ordinary property management questions (rent caps, notice content, deposit rules, entry rules). Those are broker-scope and the disclaimer in those contexts is noise.

The carve-out is important — without it, the model will sprinkle "I'm not your lawyer" onto every rent-increase question, which is both annoying and undermines the broker-backed value proposition.

---

### **[SHOULD FIX]** Out-of-state and non-California-law guardrail

The "Always assume California law applies" line is fine 95% of the time. But owners sometimes ask about out-of-state property, federal law (FHA, ADA, SCRA), or tax (1031, depreciation recapture, prop tax). Those sit outside both California broker scope and California attorney scope as practiced by OwnerPilot's founder.

**Recommended addition (one bullet in STYLE):**

> If the user's question involves out-of-state property, federal law (Fair Housing Act, ADA, SCRA, IRS), or tax strategy, say so and recommend the appropriate professional (out-of-state counsel, a CPA, a 1031 intermediary). California broker knowledge does not extrapolate to other jurisdictions, and California real estate guidance does not cover federal tax planning.

---

## Operational Note (Not a Prompt Change)

**Logging:** whatever telemetry Jack is keeping on chat outputs, **log every message in which the model cites a specific statute, code section, or AB/SB number**. That's the corpus to spot-check for CITATION HONESTY drift after deploy. This is more important than any prompt change because prompts decay; logs don't.

---

## Summary of Required Changes Before Deployment

**Must fix (blocking):**

1. **CALIBRATION EXAMPLES** — correct the AB 1482 formulation ("5% + CPI **or** 10%, whichever is lower").
2. **DOCUMENTS section** — adopt the rewrite above. Key shift: notices and routine forms are inside broker scope and produced by the OwnerPilot product workflow; the chat explains substance but doesn't produce inline drafts. Court filings and active-litigation documents remain attorney-scope.
3. **NEW SECTION** — DISCLAIMER TRIGGER, with the carve-out so it doesn't fire on routine property management questions.

**Should fix (quality/risk):**

4. **VOICE** — add the "you can explain how rules generally work, but don't apply them to specific facts to predict outcomes" paragraph.
5. **HARD RULES handoff wording** — "doesn't connect you directly to a lawyer" → "doesn't refer you to a specific attorney."
6. **HARD RULES list** — add bankruptcy, SCRA, tenant-asserted claims, personal injury/property damage claims.
7. **STYLE** — out-of-state / federal / tax carve-out.

**Consider (polish):**

8. **POSITIONING / RiskPath "Resolve"** bullet — narrow trigger language to "matters that have moved past property management."
9. **FORBIDDEN LANGUAGE** — add outcome predictions ("strong case," "you'd win," "we'll handle the eviction for you").
10. **ALLOWED LANGUAGE** — add broker-scope-signaling phrases ("broker-prepared notice," "DRE guidebook," "California rental rules").
11. **CITATION HONESTY** — add the category-of-rule reinforcing bullet.

---

## Bottom Line

The v3 prompt is closer to ready than I initially indicated. The single most important conceptual fix is in the DOCUMENTS section: it's not "send everything legal-sounding to an attorney" — it's "the chat explains, the broker-supervised product produces, the attorney takes over at the litigation line." That's the framing that matches what OwnerPilot actually is and what California law actually permits a broker-backed platform to do.

If items 1–3 land (the must-fix block) and items 4–7 are at least considered, I'm comfortable with v3 going to production.

— Reviewing Attorney
