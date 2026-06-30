# OwnerPilot AI — Resolve & Document Layer · Broker Ruling

**Date:** 2026-06-28
**Author:** Jack Taglyan / California Licensed Real Estate Broker / CalDRE B9445457
**Status:** LOCKED (with one §0 attorney-language fork — see §11)
**Phase:** Phase 1 — folded into the current Claude bundle
**Parents:**
- `marketing_copy_compliance_polish_broker_ruling_2026-06-28.md`
- `ownerpilot_ai_first_chat_rebuild_architecture_broker_ruling_2026-06-28.md`
- `ownerpilot_priority_roadmap_2026-06-28.md`

---

## 0. Disposition summary

| # | Item | Disposition |
|---|---|---|
| 1 | Feature name | **APPROVED** — "Resolve & Document" |
| 2 | Customer-facing card label | **APPROVED** — "Move-Out Agreement" |
| 3 | Primary document title | **APPROVED with edit** — see §3 |
| 4 | Mutual termination path | **BRANCH inside Move-Out Agreement** (single template, two flows) |
| 5 | Owner-only vs tenant-signed | **LOCKED** — see §5 |
| 6 | Broker-review-before-generation | **NO** — generate freely; broker-review is reserved for jurisdiction (Decision 2) |
| 7 | Field locks per document | **LOCKED** — see §6 |
| 8 | Counsel-route triggers | **LOCKED** — see §7 |
| 9 | Phase-1 release | **APPROVED** — folds into current Claude bundle |
| 10 | UD-case settlement language | **HARD BLOCKED** — see §8 |
| 11 | Reservation-of-rights clause | **§0 FORK** — attorney-drafted clause required before payment-plan ships — see §11 |

---

## 1. Core principle (LOCKED)

> Do not rely on a verbal agreement after a notice is served. Document what happened, what the parties agreed to, and what status OwnerPilot should record next.

This sentence is locked-prose (Tier B).

---

## 2. Customer-facing feature lane

- **Lane name:** Resolve & Document
- **Customer-facing card label:** Move-Out Agreement (when surfacing the highest-value doc); the lane itself is "Resolve & Document"
- **Workflow position:** Ask AI → Courtesy Reminder → Generate Notice → Serve & Track → **Resolve & Document** → RiskPath Records

The workflow string is locked-prose. The arrow ordering matters; never rearrange without a new ruling.

---

## 3. Document path catalog (LOCKED)

| Path | Document title | Owner-only or tenant-signed | Ship in v1? |
|---|---|---|---|
| 1 | Payment Received & Notice Closure Record | Owner record | ✅ |
| 2 | Post-Deadline Payment Acceptance & Notice Closure Record | Owner record + counsel route on continue-to-evict | ✅ |
| 3 | Post-Notice Payment Plan Agreement | Tenant-signed | ✅ pending §11 fork resolution |
| 4 | Move-Out Agreement / Mutual Agreement to Vacate and Surrender Possession | Tenant-signed | ✅ |
| 5 | (Mutual Lease Termination — BRANCH inside path 4, not separate) | — | ✅ as branch |
| 6 | Surrender of Possession & Key Return Record | Owner record (tenant-signed if tenant available) | ✅ |
| 7 | UD Settlement Intake Summary | Owner record + counsel route | ✅ as fact-organizer only — no settlement-agreement generation |

**Edit on path 4 title:** keep the dual title for the generated PDF but use **"Move-Out Agreement"** as the customer-facing label throughout the UI. The longer formal title appears on the PDF face only.

**Banned title:** "Stipulated Agreement to Vacate" — never use pre-UD-filing. "Stipulation" reads as court terminology.

**Mutual Lease Termination as branch:** Move-Out Agreement template has a toggle "This agreement also ends the lease entirely." When toggled, the generated PDF title becomes "Move-Out Agreement / Mutual Lease Termination & Surrender" and adds 2 clauses (lease-end date + mutual-release-from-future-rent). When off, default Move-Out Agreement template.

---

## 4. Independent-counsel routing triggers (LOCKED — HARD list)

OwnerPilot routes to `/route-to-counsel` and HALTS document generation when ANY of the following appears:

1. UD case already filed (any path)
2. Tenant claims repairs, habitability, retaliation, discrimination, harassment, or any affirmative defense
3. Tenant disputes the rent amount
4. Landlord accepted partial payment but wants to proceed toward eviction
5. Landlord accepted full payment after deadline but wants to proceed toward eviction
6. Agreement requested to include any of: release of claims, waiver of tenant rights, confidentiality, attorney fees, judgment, dismissal, sealing, court filing terms, no-admission clause
7. Tenant is in subsidized / Section 8 / HUD / mobilehome / commercial / foreclosure-related / or other excluded tenancy category
8. Corporate landlord / entity landlord (existing rule from prior ruling — extends here)
9. Any party is represented by counsel
10. User asks what they "should" do strategically rather than asking to document chosen terms

**Implementation:** triggers 1, 7, 8, 9 are hard pre-flight gates (intake question, branch out before any document fields). Triggers 2, 3, 6 are real-time field watchers (typing "habitability" / "release of claims" / "confidentiality" into free-text fields flags). Triggers 4, 5 are explicit yes/no questions ("Do you want to preserve the ability to evict despite accepting this payment?"). Trigger 10 is a chat-persona refusal pattern (already in the persona's refusal bank — extend with these specific phrasings).

When any trigger fires: stop, show counsel-route message (see §9), link to `/route-to-counsel`. Do NOT generate the document. Do NOT save partial fields. Do NOT proceed.

---

## 5. Owner-only vs tenant-signed (LOCKED)

| Path | Type | Why |
|---|---|---|
| Payment Received | Owner record | Tenant payment is the evidence; no tenant signature needed |
| Post-Deadline Payment Acceptance | Owner record | Same as above + counsel route on continue-to-evict |
| Payment Plan | Tenant-signed (both parties) | Schedule of future payments needs tenant agreement |
| Move-Out Agreement | Tenant-signed (both parties) | Mutual agreement to vacate; both signatures required for the document to function as written record |
| Mutual Lease Termination branch | Tenant-signed (both parties) | Same as Move-Out, plus lease-end |
| Surrender Record | Owner record by default; tenant signature added if tenant is present at key return | Often the tenant is gone; owner documents what happened |
| UD Settlement Intake | Owner record + counsel route | Internal fact organizer; not a draft agreement |

PDF labels accordingly:
- Owner records → footer: "Owner Record Only — Not a Tenant-Signed Agreement"
- Tenant-signed drafts → footer: "Draft for Landlord and Tenant Review"

Both labels are locked-prose.

---

## 6. Document field specs (LOCKED)

Each document has a fixed field list. Optional fields are explicitly marked. NO unmarked fields. NO free-form "additional terms" sections. If a user wants additional terms, counsel-route.

### 6.1 Payment Received & Notice Closure Record

**Required:** landlord name, tenant name(s), property address, notice date, service date, amount demanded, amount paid, date received, time received, payment method, "tenant remains in possession" confirmation, notice status closed, owner acknowledgment line, timestamp footer.

**Optional:** receipt/proof upload.

**Prohibited:** any release language, any waiver language.

### 6.2 Post-Deadline Payment Acceptance & Notice Closure Record

**Required:** all Payment Received fields PLUS an explicit "payment was accepted after the notice deadline of [date]" statement on the document face.

**Optional:** receipt/proof upload.

**Prohibited:** any release language, any waiver language.

**Trigger:** if owner answers "I want to preserve eviction option despite accepting this" → halt, counsel-route per §4 trigger 5.

### 6.3 Post-Notice Payment Plan Agreement — PENDING §11 FORK

**Required (base):** parties, property, neutral background note ("a 3-Day Notice was served on [date]"), amount paid so far, remaining balance, payment schedule (date / amount per installment), method, "tenant remains in possession" confirmation, "what happens if a payment is missed" — neutrally drafted, no rights-preservation by default, signature lines.

**Optional:** receipt upload.

**Conditional (per §11 fork):** "I want to preserve rights under the original notice" checkbox → adds attorney-drafted reservation-of-rights clause. See §11.

**Prohibited:** release, waiver, confidentiality, attorney-fees, no-admission language.

### 6.4 Move-Out Agreement (CORE only — locked per broker decision)

**Required:** parties, property, neutral background note ("a 3-Day Notice was served on [date]"), move-out date, move-out time, key return method, possession surrender confirmation, security deposit reservation note (neutral — "security deposit handling will follow CA Civil Code § 1950.5"), no-self-help / no-lockout reminder, signature lines for landlord + tenant, date lines.

**Optional:** payment terms (tenant pays $X by Y date) — NEUTRAL payment fields only, no credits/waivers; personal property note; forwarding address; mutual-lease-termination branch toggle (adds 2 clauses per §3 branch spec).

**Prohibited:** credits/waivers of past-due rent, release of claims, confidentiality, attorney fees, no-admission, judgment language, dismissal language, court-filing terms.

If a user tries to enter any prohibited content (free-text watching): halt, counsel-route per §4 trigger 6.

### 6.5 Surrender of Possession & Key Return Record

**Required:** tenant vacated date, possession confirmed date, method of confirmation, keys returned (Y/N), key return details if Y, owner acknowledgment, timestamp footer.

**Optional:** photos uploaded, personal property note, forwarding address, security deposit follow-up flag, tenant signature (added only if tenant is present and signs in person).

**Prohibited:** anything beyond record-keeping.

### 6.6 UD Settlement Intake Summary

**Required:** confirmation that UD case is filed, court/case number if known, desired terms (free-text — owner notes only, never published as a draft agreement), payment terms summary, move-out date if any, "I will consult independent counsel before signing or filing any agreement" acknowledgment.

**Prohibited:** any draft settlement agreement generation. This path is a fact organizer that lands the user at `/route-to-counsel`. NO PDF output beyond the intake summary itself. The summary footer must read: "Fact organizer only. Not a settlement agreement. Consult independent counsel before signing or filing any document related to this case." (locked-prose Tier B)

---

## 7. Disclaimers (LOCKED — Tier B locked-prose)

### 7.1 General Resolve & Document disclaimer (every R&D screen footer)

```
OwnerPilot helps document the terms you enter for your records.
OwnerPilot is not a law firm and does not provide legal advice. If
this agreement affects possession, payment rights, or a court case,
consult a California licensed attorney.
```

### 7.2 Payment Plan disclaimer (on the document face + UI)

```
Partial payment and payment-plan agreements can affect next steps
after a notice. If you want to preserve any eviction option or are
unsure how payment affects your notice, consult independent counsel.
```

### 7.3 Move-Out Agreement disclaimer (on the document face)

```
This agreement draft is for landlord and tenant review and signature.
OwnerPilot does not determine whether any agreement is legally valid
or sufficient for your specific situation.
```

### 7.4 Surrender Record disclaimer (on the document face)

```
This record is for owner documentation and organization. It does not
determine whether legal possession has been validly restored.
```

### 7.5 UD case disclaimer (UD Settlement Intake path)

```
Because a court case has already been filed, this may involve court
stipulation or settlement terms. OwnerPilot can help organize the
facts, but you should consult independent counsel before signing or
filing any agreement.
```

All five strings are Tier-B locked-prose. CI guard covers all five.

---

## 8. UD-case hard block

Once an Unlawful Detainer case is filed, OwnerPilot **never generates any settlement, stipulation, dismissal, or court-form document**. The UD Settlement Intake Summary is a fact organizer, not a draft. The user is routed to `/route-to-counsel` with the §7.5 disclaimer. This boundary holds until UD Phase 2 is approved in a separate ruling.

---

## 9. Counsel-route messaging (LOCKED)

When any §4 trigger fires, show this exact message (locked-prose):

```
This may involve legal defenses, court-related terms, or strategic
choices that go beyond document preparation. OwnerPilot is pausing
self-service for this path and routing you to consult independent
counsel.

[Find a California landlord-tenant attorney →]
```

Link target: `/route-to-counsel` (the page authorized in `decision2_backend_build_section0_flags_broker_ruling_2026-06-28.md` §5).

---

## 10. Copy policy enforcement

All R&D surfaces follow the `marketing_copy_compliance_polish_broker_ruling_2026-06-28.md` term substitutions:

- "designed around California statutory requirements" (never "legally compliant")
- "Timestamped" / "Captured" / "Saved" (never "Verified")
- "broker-prepared templates and broker-supervised workflows"
- "routes the user to consult independent counsel"
- Never "court-ready" / "enforceable" / "guarantee" / "future-proof"

Locked-prose CI guard already covers the banned-term list. New R&D strings get added to the manifest as Tier-B entries.

---

## 11. §0 FORK — Reservation-of-rights clause needs attorney drafting

**The fork.** The Payment Plan path's "I want to preserve rights under the original notice" toggle (the option the broker selected) requires reservation-of-rights language that holds up in California landlord-tenant practice. Whether accepting partial payment after notice service waives the original notice is a contested area of CA law (see *Highland Plastics, Inc. v. Enders* and related cases on tender + acceptance + waiver). The clause has to be drafted to navigate that doctrine.

**Why this is a §0 fork.** Broker scope under Bus. & Prof. Code § 10131(b) covers document preparation, not original drafting of a clause designed to navigate contested case law. Shipping a broker-authored reservation-of-rights clause exposes the platform and the broker to claims that we crossed into legal-advice territory.

**Disposition pending — TWO acceptable paths:**

**Path A (recommended): Phase 1 ships Payment Plan with NO reservation-of-rights toggle.** The base Payment Plan is neutral — schedule of payments, possession status, what happens if a payment is missed (drafted neutrally). Any owner who answers "yes" to "Do you want to preserve any eviction option under the original notice?" gets counsel-routed per §4 trigger 4. The toggle ships in a Phase 2 update once an attorney-drafted clause exists.

**Path B: Hold the entire Payment Plan path until the attorney clause is drafted.** Phase 1 ships Payment Received, Post-Deadline Payment Acceptance, Move-Out Agreement, Mutual Lease Termination branch, Surrender Record, and UD Settlement Intake. Payment Plan ships in Phase 2.

**Engineering must NOT ship the reservation-of-rights toggle until this fork resolves.** Default behavior pending resolution: Path A (Payment Plan ships without the toggle).

**To resolve this fork:** Jack (broker) commissions an attorney-drafted reservation-of-rights clause; broker reviews; clause is added to a new ruling that explicitly authorizes the toggle text. Until then, the toggle does not appear in the UI.

This is the only §0 fork in the R&D layer. Everything else is broker-scope and ships.

---

## 12. RiskPath integration

New RiskPath statuses (locked enums):

```
tenant_responded
payment_received
post_deadline_payment_accepted
payment_plan_active
move_out_agreement_drafted
move_out_agreement_signed
mutual_termination_drafted
mutual_termination_signed
move_out_pending
possession_returned
surrender_record_saved
security_deposit_followup_pending
notice_closed
ud_review_needed
counsel_recommended
```

Status transition rules — engineering owns implementation, but these constraints are locked:

- `notice_closed` is terminal (no transitions out except to `counsel_recommended`)
- `counsel_recommended` is terminal from the workflow standpoint (route to `/route-to-counsel`; further status changes require broker review)
- `ud_review_needed` is the only path into UD Settlement Intake — set when user answers "yes" to "Has a UD case already been filed?"

---

## 13. Marketing / homepage updates

The marketing prompt addendum is **approved with modifications**:

- "The notice does not end at service." section: **APPROVED** as locked-prose headline
- Workflow card order: Ask AI → Courtesy Reminder → Generate Notice → Serve & Track → **Resolve & Document** → RiskPath Records — LOCKED
- Four product cards (Serve & Track, Photo Proof of Posting, Move-Out Agreement, RiskPath Records): **APPROVED**
- Image prompts: **APPROVED** as-written
- "Verified" badge stays banned; "Timestamped" is the only permitted status pill

Homepage section additions get added to the `claude_code_master_prompt_ai_first_rebuild_2026-06-28.md` §F (UI structure) when the prompt is updated.

---

## 14. Acceptance criteria (do not ship R&D without these)

1. All seven document paths generate as separate PDFs in `/riskpath/<notice_id>/resolution_documents/`
2. None of the seven documents appears on the tenant service copy of the 3-Day Notice
3. None of the §4 hard counsel-route triggers can be bypassed by the UI
4. Reservation-of-rights toggle is NOT in the UI (per §11 fork; Path A default)
5. UD-case branch never generates a settlement agreement; only the intake summary fact organizer
6. All §7 disclaimers are Tier-B locked-prose with CI guard coverage
7. RiskPath enums match §12 exactly
8. The workflow string "Ask AI → Courtesy Reminder → Generate Notice → Serve & Track → Resolve & Document → RiskPath Records" appears verbatim on the homepage and Our Approach page
9. The §1 core principle string appears verbatim wherever R&D is introduced
10. Counsel-route messaging in §9 appears verbatim at every counsel-route exit

---

## 15. Out of scope for Phase 1

- Broker dashboard UI for resolution review (later)
- Tenant-side surfaces (texting tenants from OwnerPilot, tenant-facing R&D status pages) — owner-only in MVP
- E-signature integration on tenant-signed documents (Phase 1 ships PDF generation only; e-sign via DocuSign or similar is Phase 2)
- Reservation-of-rights toggle (Phase 2 pending §11 attorney drafting)
- UD settlement agreement generation (Phase 2 only after explicit Phase-2 broker ruling)

---

— Jack Taglyan / California Licensed Real Estate Broker / CalDRE B9445457 / Broker Compliance Review · 2026-06-28
