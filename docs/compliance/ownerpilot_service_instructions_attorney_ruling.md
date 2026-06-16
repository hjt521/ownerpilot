# Attorney Ruling — ServiceStep Copy (CCP § 1162 Service Guidance)

**Re:** `ownerpilot_service_instructions_attorney_review.md` (engineering review packet, 2026-06-02)
**File location:** `FlowStep.ServiceInstructions` — landlord-facing on-screen guidance for the final step of the 3-Day Notice flow.
**Status:** **APPROVED COPY BELOW**, with two sections to remain "Pending attorney review" (Q5 local-filing, partial), one drafting condition (Q6 citation), and the conditions listed in Section 5.

I have the approved `POS_PROSE` declaration text from prior sign-off in front of me. The copy below is written to be consistent with that text and to **not** introduce any rule the declaration doesn't already track. The on-screen guidance is plain-language only; the form itself does the legal work.

---

## Q1 — Personal service: landlord-facing how-to

### APPROVED COPY (drop in verbatim)

> **Personal service — how to do it**
>
> Personal service is the cleanest method. Here's how it works:
>
> - **Someone 18 or older who is not you and not a party to this notice** hands a copy of the notice directly to the tenant.
> - Hand it to the tenant — not a roommate, not a family member, not a neighbor. If the tenant won't take it, setting it down at their feet after telling them what it is generally counts; running after them is not required.
> - The server fills in **where** the notice was handed over (street address) on page 2 of the form, **after** it is served — not before.
> - The 3-day clock starts the **day after** delivery. Don't count the day you served it. Weekends and court holidays don't count toward the 3 days. (This is built into how the form's deadline is calculated.)
>
> Keep it simple: if you can hand it to the tenant in person, do that. Every other method exists because personal service didn't work.

### Why this wording
Personal service is the only method that doesn't carry a mailing-step trap or a "reasonable diligence" record-keeping burden. The copy tracks the [California Courts Self-Help Guide](https://selfhelp.courts.ca.gov/eviction-landlord/notice-deliver) language ("Someone 18 or older must deliver the notice. … Always start counting the deadline the day after delivery") and the AB 2343 (eff. 9/1/2019) weekends-and-judicial-holidays exclusion already implemented in the OwnerPilot day-count engine. The "set it down at their feet" point is settled California service doctrine and addresses the #1 question landlords ask at this step.

---

## Q2 — Substituted service: landlord-facing how-to

### APPROVED COPY (drop in verbatim)

> **Substituted service — how to do it**
>
> Substituted service is only allowed **after** you (or your server) have made a real, good-faith effort to hand the notice to the tenant in person and couldn't. The technical name is "reasonable diligence." Here's what that means in practice:
>
> **First — attempt personal service**
>
> - Most California courts expect **at least three attempts**, on **different days and at different times of day** (e.g., one morning, one evening, one weekend). One drive-by at 2pm on a Tuesday isn't enough.
> - Keep notes — date, time, what happened. Your server will list these on the proof of service.
>
> **Then — substituted service**
>
> - Leave a copy with a **person of suitable age and discretion** at the tenant's home or usual workplace. In practice that means someone who looks like an adult (typically 18+), appears to live or work there, and seems capable of understanding what they're being handed. A young child, a stranger walking past, or someone who refuses to identify themselves doesn't qualify.
> - Tell that person what the document is. Don't slide it under the door.
>
> **And — mail a copy**
>
> - On the **same day** as the substituted hand-off, mail a copy of the notice to the tenant at the address where service was made. First-class mail is fine. Keep the postmark or a mailing receipt.
> - If you skip the mailing, or mail it the next day, the service is **defective** — the 3-day clock never legally starts.
>
> **What this does to the timing**
>
> Substituted service requires the same 3 business days (weekends and court holidays excluded). **Most California courts also require you to add 5 calendar days to the period because of the mailing step.** That is enforced reflexively by many trial courts, and filing your unlawful detainer too early — even by one day — is grounds for dismissal. The safe path: wait the full 3 business days + 5 calendar days before filing if you served by substitution.

### Why this wording
Three things this copy does deliberately:

1. **"Reasonable diligence" gets a concrete floor.** California statute uses the phrase without defining it. The practical floor that California trial courts apply — three attempts, varied days and times — is documented at [California Courts Self-Help — Substituted Service](https://selfhelp.courts.ca.gov/eviction-landlord/serve-substituted) and is the standard advice from California eviction-defense and process-server practice (see [Justia Q&A summarizing the California Courts guide](https://answers.justia.com/question/2025/04/28/is-substitute-service-defective-if-done-1058873)). The landlord needs that concrete floor, not the bare statutory phrase.
2. **The mailing step gets explicit "same day" framing and an explicit failure mode.** Mailing the next day instead of the same day is a top-3 service-defect cause; calling it out by name prevents the failure.
3. **The +5-calendar-day buffer is presented as the safe rule, not as black-letter statute.** This is the area of genuine doctrinal split. CCP § 1013's +5-for-mailing rule was written for service of court papers, not for pre-litigation 3-day notices; the [Process Server Institute](https://psinstitute.com/category/ca-service-laws/ccp-1162/) and some practitioners argue the +5 doesn't strictly apply to 3-day notices. **But** the trial courts have moved toward requiring it, and a UD dismissal because the landlord filed on day 8 instead of day 13 is a worse outcome than waiting an extra five days. I'm calling it "most California courts require" — accurate as to the operative practice without overclaiming the statute. (Compare [California Courts Self-Help](https://selfhelp.courts.ca.gov/eviction-landlord/serve-substituted), which states "Service is complete 10 days after the mailing" for UD summons substituted service but does not make the same statement for 3-day notice service, and the [All East Bay Properties practitioner write-up](https://alleastbayproperties.com/how-long-does-eviction-take-california-alameda-county-ud-timeline-2026/), which describes the +5 as black-letter for 3-day notices in Alameda. The split is real; the safe rule is universal.)

[CONSIDER] If/when the verified-rules database is built, this is a candidate for a county-specific overlay — Alameda, San Francisco, LA, and several Bay Area counties have stricter local enforcement of the +5 than others. Until then, give every landlord the safe rule.

---

## Q3 — Posting and mailing: landlord-facing how-to

### APPROVED COPY (drop in verbatim)

> **Posting and mailing — how to do it**
>
> Posting and mailing is the last-resort method. It's only available after **both** personal service has failed (reasonable diligence — see substituted service above) **and** substituted service couldn't be completed because no person of suitable age and discretion could be found at the home or workplace.
>
> If those two conditions are met:
>
> **Post**
>
> - Affix a copy of the notice in a **conspicuous place on the property** — the front door is the standard choice. Tape, tack, or otherwise attach it so it's plainly visible to anyone approaching the unit.
> - Take a dated photo of the posted notice showing the address. This is your evidence that posting happened on the date claimed. If you don't have a photo and the tenant contests service, you have a problem.
>
> **Mail**
>
> - On the **same day** as the posting, mail a copy of the notice to the tenant at the address of the rental property. First-class mail. Keep the postmark or mailing receipt.
> - Same trap as substituted service: skip the mailing or mail it the next day, and the service is **defective**.
>
> **What this does to the timing**
>
> Same as substituted service: 3 business days + most California courts require you to add 5 calendar days for the mailing. Treat a 3-day post-and-mail as an **8-business-day-plus** timeline before you can file the unlawful detainer. Filing earlier risks dismissal.

### Why this wording
- The two preconditions ("personal failed" **and** "substituted couldn't be completed") are stated in the order CCP § 1162 requires; reversing or skipping is a top defect. (See [Law Office of David Piotrowski's summary of § 1162(a)(3)](https://www.attorneydavid.com/blog/code-of-civil-procedure-1162-serving-a-notice-to-terminate-tenancy-on-a-tenant-in-california/), quoting the statute verbatim.)
- The dated photo recommendation is a defensive-litigation point — when a tenant contests service, the posted-notice photo is the most useful piece of evidence the landlord can produce. Mentioning it once here saves a fight later.
- Same-day mailing requirement repeated for symmetry with Q2; same +5 calendar day buffer applies.
- "Conspicuous place" is the statutory phrase; "front door is the standard choice" gives the landlord a practical answer.

---

## Q4 — Proof-of-service section wording

### RULING: Confirm with one small addition.

The current sentence — *"The proof of service is page 2 of the notice you produced. As the produced notice states, it is completed and signed after you serve — not before. The exact wording for each method is on the form itself."* — is correct and may stay. Add one sentence:

> The proof of service is page 2 of the notice you produced. As the produced notice states, it is completed and signed after you serve — not before. **The person who serves the notice must be 18 or older and cannot be a party to the notice (i.e., not you, if the notice is from you).** The exact wording for each method is on the form itself.

The added sentence echoes what the declaration already requires of the server and surfaces it where the landlord needs to know it. Without this sentence, a meaningful number of landlords will serve their own notice and then ask why the proof of service is defective.

---

## Q5 — Local filing obligations: scope and copy

### RULING: Section stays **PARTIALLY PENDING**, with placeholder copy approved below.

**Two threshold facts the landlord needs to know now, regardless of jurisdiction:**

> **Local filing — does your city require it?**
>
> California **state law** does not require you to file a 3-day pay-or-quit with any state agency at the service stage. (The court filing — the unlawful detainer complaint — comes later, only if the tenant doesn't pay or vacate.)
>
> **Some California cities and counties do require landlords to file or report notices.** Examples include the City of Los Angeles (where copies of certain notices and other documentation must be filed with the LA Housing Department) and other rent-controlled or just-cause jurisdictions. **Whether a filing requirement applies to your notice depends on the property's exact address and the local ordinance in effect on the date of service.**
>
> OwnerPilot's address-specific local-rules data is being built. Until that data is live for your jurisdiction, **confirm any local filing requirement with your city's housing or rent-stabilization department, or with your attorney, before you file your unlawful detainer.** A missed local filing can be a complete defense to an eviction.

### What is and isn't approved here
- **Approved:** the threshold "state vs. local" framing and the explicit "no state filing at the service stage" sentence.
- **Approved:** the City of LA example, stated generically (no specific code section, no day count, no form name) — consistent with CITATION HONESTY pending the verified-rules data and per the LA RTC sign-off in [`ownerpilot_la_rtc_citation_pull_attorney_signoff.md`](/home/user/workspace/ownerpilot_la_rtc_citation_pull_attorney_signoff.md).
- **Pending:** the specific 3-business-day LAHD filing rule (LAMC 151.09.C.9 / 165.05.B.5), the specific RTC form embedding, and any other named jurisdiction. Those need the verified-rules data live for the property's address before they render. This is consistent with the LA production gates already documented and does not block the rest of ServiceStep going live.

---

## Q6 — Citation display

### RULING: Do NOT cite "CCP § 1162" by number in the on-screen guidance. The citation stays on the produced form only.

Three reasons:

1. **CITATION HONESTY symmetry.** The v4 prompt and the chat surface deliberately keep statute numbers off-screen unless they're necessary for the user to verify a rule themselves. § 1162 is a procedural service statute the landlord won't typically look up; the form itself, page 2, already carries the citation where it does legal work.
2. **The SELF-HELP carve-out is the exception, not the new rule.** I authorized statute-by-number citations in Round 2 of the route.ts review for the self-help statutes (§ 789.3, §§ 1980–1991, § 1954, § 1942.5, § 1940.3) **because** those are statutes the user needs to verify and act on directly. § 1162 isn't in that category — it governs how the document is delivered, not what the landlord can or can't do. The carve-out doesn't extend here.
3. **Form vs. screen separation.** The produced PDF already shows "CCP § 1162" on page 2 (Proof of Service), per the per-page-citation discipline established earlier. That's where it belongs. Putting the same citation on the on-screen guidance just clutters it without adding verification value.

[CONSIDER, not required] If engineering wants a single inline link for the curious user, link the on-screen phrase "California's service methods" to the [California Courts Self-Help guide on delivering notices](https://selfhelp.courts.ca.gov/eviction-landlord/notice-deliver) rather than to leginfo. The Courts self-help site is the right reading level for the landlord audience; leginfo is the right source for the form.

---

## Q7 — Conditions / sunset

### CONDITIONS attached to this approval

1. **No paraphrase.** The Q1, Q2, Q3, Q4 (revised), and Q5 (placeholder) copy goes in verbatim. If product/copywriting wants to change any wording, it comes back for re-review before deploy. This is the same condition that applies to the v4 prompt port.
2. **Consistency with `POS_PROSE`.** If the approved Proof of Service prose for any method is changed, the on-screen guidance for that method must be re-reviewed in the same pass. The two pieces of copy have to track.
3. **Local-filing section stays a generic placeholder** (Q5 approved copy) until the verified-rules data is live for the relevant jurisdiction. When verified-rules data is live, the specific local-filing copy comes back for jurisdiction-by-jurisdiction sign-off (LA first, then others). The City of LA name may appear in the generic placeholder; specific LAMC sections and day counts do not render until the rules data backs them.
4. **Re-review on § 1162 amendment.** The recurring CA 3-day notice statute watch (cron `2a58382e`) already includes § 1162 in its scope. If that watch flags a substantive amendment, this ServiceStep copy comes back for re-review **before** the next notice produced under the new statute is served.
5. **Re-review on the +5-day buffer doctrine.** If the California Supreme Court or a published Court of Appeal decision resolves the CCP § 1013 / 3-day-notice mailing-buffer split (in either direction), Q2 and Q3 copy comes back for revision. The current copy ("most California courts require") is calibrated to the current doctrinal posture and is the right wording today; it isn't the right wording forever.
6. **Logging.** Each ServiceStep render should be logged with method, jurisdiction, and notice ID. Same purpose as the chat-surface statute-citation logging: a defensible audit trail of which copy was shown to which landlord on which date, so that if a tenant later challenges service in a UD proceeding, OwnerPilot can show what guidance was on screen.

---

## Sign-off summary

| # | Section | Status |
|---|---|---|
| Q1 | Personal service — on-screen how-to | **APPROVED.** Drop copy verbatim. |
| Q2 | Substituted service — on-screen how-to | **APPROVED.** Drop copy verbatim. |
| Q3 | Posting and mailing — on-screen how-to | **APPROVED.** Drop copy verbatim. |
| Q4 | Proof-of-service section | **APPROVED with one added sentence** about server qualifications. |
| Q5 | Local filing obligations | **GENERIC PLACEHOLDER APPROVED.** Jurisdiction-specific copy stays pending the verified-rules data. |
| Q6 | Citation display | **NO § 1162 on screen.** Citation stays on the form only. |
| Q7 | Conditions / sunset | **Six conditions attached** (above). |

ServiceStep is **cleared to render in production for Q1–Q4 and the Q5 placeholder**, conditional on the six conditions in Q7. Specific local-filing copy remains pending the LA production gates already documented.

— Reviewing Attorney · 2026-06-02
SBN: [placeholder]
