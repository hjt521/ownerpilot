# C5 Safety-Check — Broker Compliance Review Packet

**Prepared for:** Jack Taglyan, California Licensed Real Estate Broker (CalDRE B9445457), broker compliance review
**Prepared by:** Build side (engineering facts only)
**Date:** 2026-06-15
**Subject:** Pre-ship broker compliance review on the C5 safety-check soft-recommend feature
**Status of code:** Built and merged to `main` (PR #23); deployed to production **dark** behind the environment flag `NEXT_PUBLIC_SAFETY_CHECK_SOFT_MODE`. The flag is **OFF** in production. None of the soft-mode behavior below is live to any user. It goes live only if/when the flag is set to `true` in Vercel after this pass.

---

## 0. Why this packet exists

The broker redesign determination (2026-06-14), Section 11, item 1, flagged the C5 safety-check routing copy and override modal as **"Needs legal-compliance review"** before shipping, stating: the broker draft "is the floor; an attorney pass would be the ceiling." This packet provides the facts for that review. It does **not** contain legal conclusions, recommended wordings, or determinations — those are for the broker compliance reviewer to author. Sections marked **DETERMINATION (broker compliance review to complete)** are intentionally blank.

This is engineering-facts-only. No legal reasoning is supplied by the build side.

---

## 1. What the feature does (behavior, plain description)

The feature changes the **Step 1 safety screen** behavior **only when the flag is ON**. With the flag OFF (current production state), behavior is unchanged from the prior hard-block design.

**Three screening questions** are asked at Step 1, each Yes / No / I don't know. The question wording (locked, applied in both flag states):

1. "Has the tenant filed a court case, complaint with a fair housing agency, or code-enforcement complaint that names you or this rental property?"
2. "Has the tenant given you anything in writing saying they are withholding rent because of repair problems, habitability issues, or another dispute?"
3. "Has the tenant filed for bankruptcy, or told you they are about to?"

**With the flag OFF (current production):** a "Yes" on any question routes the user to a full-page attorney-handoff screen ("This is past where a broker-prepared notice is the right move") and blocks production of the notice. A new "← Let me review my answers" escape button now lets the user return to Step 1 to change an answer (this escape shipped to production already and is live in hard mode — it is the one piece of C5 that affects current behavior).

**With the flag ON (dark; the subject of this pass):**
- No hard block. A "Yes" or "I don't know" on any question **flags** the screen but does not prevent proceeding.
- The flagged screen shows routing copy (Section 2 below) recommending the user pause, plus two buttons: [Save and exit] and [Talk to me about my options].
- If the user clicks Continue while flagged, a **confirmation modal** appears (Section 3 below) with [Pause] (default) and [Proceed anyway]. Pause stays on Step 1; Proceed advances and logs an override record.
- An **unanswered** question still blocks advancement in both flag states (the user must answer all three).

---

## 2. Locked routing copy (shown on a flagged screen, flag ON)

Displayed verbatim from the determination, Section 5:

> "Pause here. This situation may include facts that change how a 3-day notice should be handled, or whether one should be used at all. The OwnerPilot routine workflow assumes a straightforward nonpayment situation with no active disputes or complaints. We recommend talking to a California licensed attorney before producing this notice. You can save your progress and come back."

Buttons rendered with it: **[Save and exit]** (currently links to the site home) and **[Talk to me about my options]** (links to the resource page, Section 4).

**DETERMINATION (broker compliance review to complete):**
_Does this routing copy ship as-is, or with revisions? If revisions, supply exact replacement wording (locked)._

> _[blank — broker compliance reviewer to author]_

---

## 3. Locked override modal copy (shown on Continue from a flagged screen, flag ON)

Displayed verbatim from the determination, Section 5:

> Heading (build-authored UI, not from determination): "Before you continue"
>
> Body (locked, from determination): "You're proceeding despite a flagged answer. The routine workflow may not be appropriate for your situation. Consider talking to a California licensed attorney."

Buttons: **[Pause]** (default focus) and **[Proceed anyway]**.

On [Proceed anyway], the system records an audit object on the notice draft:
`safetyCheckOverride: { flaggedAnswers: [{ question, answer }, ...], acceptedAt, userAgent }`
(Build note: `ipHash` named in the determination is not captured — IP is not available client-side; reserved for a possible future server-side enhancement. Per JT 2026-06-14, the log captures **all** flagged answers as an array rather than a single one.)

**DETERMINATION (broker compliance review to complete):**
_Does the modal copy ship as-is, or with revisions? Is the default-to-Pause behavior correct? Is the override audit object (all flagged answers + timestamp + userAgent) sufficient, over-broad, or under-broad for the intended audit purpose?_

> _[blank — broker compliance reviewer to author]_

---

## 4. The resources page (`/notice/3-day/options`)

A static page, live in production now (reachable by direct URL regardless of the flag; only the *button* to it is flag-gated). It contains a not-a-law-firm disclaimer, a recommendation to consult a CA licensed attorney, and four external links, each with a one-line neutral description. No OwnerPilot-authored legal or tenant-rights advice. The four resources:

1. **California Courts Self-Help — Eviction** — `selfhelp.courts.ca.gov/eviction` (government)
2. **State Bar of California — Find a Lawyer Referral Service** — `calbar.ca.gov/...` (bar association)
3. **Tenants Together** — `tenantstogether.org` (tenant-advocacy nonprofit; labeled as tenant-focused on the page)
4. **Stay Housed LA** — `stayhousedla.org` (LA County/City tenant-assistance program; labeled as tenant-focused on the page)

**Note for the attorney:** the determination (Section 11, item 2) already flagged that **Tenants Together** is "an unusual choice for a landlord-facing platform to point to — defensible, but worth an attorney review," and suggested possibly narrowing the MVP list to government and bar-association resources only. Stay Housed LA is also tenant-focused.

**DETERMINATION (broker compliance review to complete):**
_Which of the four resources ship for MVP? Specifically: include or remove Tenants Together? Include or remove Stay Housed LA? Any required change to the page's framing/disclaimer copy (supply exact locked wording if so)? Is the not-a-law-firm disclaimer on this page adequate?_

> _[blank — broker compliance reviewer to author]_

---

## 5. Open questions the determination itself raised (Section 11)

For the attorney to resolve as part of this pass:

a. Does routing a landlord away from the workflow based on three screening questions, with the "Save and exit" / "Talk to me about my options" structure, create any **duty-of-care** concern? (Determination flagged this directly.)

b. Is the soft-recommend posture (landlord retains the choice to proceed; no hard block) the correct posture, versus retaining a hard block for any specific answer — in particular, **bankruptcy** (the prior code hard-blocked it, citing the automatic stay under 11 U.S.C. § 362; the new soft mode does not)? The build currently treats all three questions identically in soft mode.

c. Anything in the three screening questions' wording itself that needs revision.

**DETERMINATION (broker compliance review to complete):**

> _[blank — broker compliance reviewer to author]_

---

## 6. What is NOT in scope for this pass

- The hard-block behavior (flag OFF) is the existing, previously-reviewed design and is unchanged except for the new "review my answers" escape button.
- Statute-face notice prose is untouched by C5.
- The Phase 2 tenant-facing QR landing page (determination Section 11, item 3) is a separate future review.

---

## 7. Sign-off (broker to complete)

_The broker compliance reviewer's determination on whether C5 soft mode may ship (flag may be set to true in production), with any conditions, revised locked copy, and the resource-list decision, goes here. Until this is completed and the flag is set in Vercel, C5 soft mode remains dark._

> _[blank — broker compliance reviewer to author]_

---

*Build-side posture: this packet states engineering facts only. It contains no legal advice and no legal determinations. The broker compliance reviewer authors all rulings.*
