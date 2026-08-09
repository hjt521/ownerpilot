# OwnerPilot — Phase C UD-100 Governing Legal / Product-Control Baseline

**Date:** 2026-08-09  
**Founder:** Jack Taglyan  
**Repository baseline at workstream start:** `00f53b6f02f88289341eb976d9f5bd449226cfa6`  
**Scope:** California Phase C UD-100 complaint-packet preparation and customer-controlled submission only. This document does not govern 3-Day Notice preparation, LAHD filing, post-judgment writs, or broader litigation representation.  
**Status:** FOUNDER-ADOPTED / ATTORNEY-VALIDATED PHASE C LEGAL-CONTROL BASELINE — SUBJECT TO THE EXPRESS HELD ITEMS BELOW  
**Implementation authority:** None.  
**Production authority:** None.  
**Paid activation authority:** None until applicable UDA/LDA compliance is complete.  
**Autonomous filing authority:** None.  

## 1. Purpose and authority hierarchy

This document reconciles three August 9, 2026 sources into one durable OwnerPilot repository baseline:

1. the independent UD-100 authority research and v3 analysis;
2. the Founder-selected Modified Option C product direction and ratified broker-ruling consolidation; and
3. Janna's completed targeted California legal review, `OwnerPilot — Phase C UD-100 Legal Control Handoff — Modified Option C — Ratified Legal Review Package`.

Where the research memorandum or broker-ruling consolidation conflicts with Janna's legal-control handoff, Janna's validated legal control governs unless a later Founder disposition or controlling legal authority supersedes it.

Where any of those materials conflict with an explicit Founder product/governance rule, the Founder rule governs product authority unless it would require conduct prohibited by controlling law.

The following hierarchy therefore applies:

**controlling law → Founder authority boundary → Janna-validated Phase C legal control → this reconciliation baseline → independent research / broker-ruling analysis → Architect specification → Engineer implementation.**

This document authorizes Architect reconciliation and specification drafting only. It does not authorize code modification, canonical Production activation, court filing, autonomous filing, Supabase/Vercel Production changes, or paid launch.

## 2. Controlling Phase C doctrine

OwnerPilot must preserve three separate functions:

1. **Preparation of the unlawful-detainer filing packet**
2. **Ministerial/customer-controlled submission of that packet**
3. **Representation of the plaintiff in Superior Court**

These functions must never be conflated.

The controlling architecture is:

> **Decision intelligence may recommend what the owner might want to do. The UD filing engine may only build what the owner has chosen to file.**

OwnerPilot may help a landlord reason about the business problem before the filing handoff. Once the landlord confirms a decision to file and confirms the legally consequential elections, OwnerPilot enters a ministerial filing mode that may populate, validate, organize, preview, and export the customer's chosen filing packet, but may not make a new legal election or strategy decision for the customer.

## 3. Verified California statutory baseline

### 3.1 Self-help service

California Business and Professions Code §6400(d) defines "self-help service" to include:

- ministerial completion of legal documents selected by a person representing themself and completed at that person's specific direction;
- qualifying general published factual information;
- making published legal documents available; and
- filing and serving legal forms and documents at the specific direction of a person representing themself.

**Citation correction preserved:** §6400(d), not §6400(g), is the subsection defining self-help service.

### 3.2 Advice prohibition

Business and Professions Code §6400(g) prohibits a legal document assistant from giving advice, explanation, opinion, or recommendation about possible legal rights, remedies, defenses, options, selection of forms, or strategies.

For Phase C this creates a hard implementation boundary. The ministerial filing engine must not:

- choose a cause of action;
- choose a notice theory;
- choose a remedy;
- optimize allegations;
- recommend which checkbox creates a stronger case;
- predict that a court will accept a legal theory;
- reintroduce business/legal-strategy recommendations after ministerial mode begins.

### 3.3 Compensation and registration

A compensated OwnerPilot workflow that prepares California unlawful-detainer papers falls within the applicable California UDA/LDA regulatory framework unless a specific exemption applies.

Registration does not expand substantive authority and does not permit legal advice.

**Paid Phase C activation is a hard gate:** no paid UD filing workflow may launch until the applicable registration/classification, bonding, written-customer-agreement, disclosure, preparer-identification, advertising, continuing-education, and prohibited-acts controls are complete.

### 3.4 Broker exemption is narrow

Business and Professions Code §6401(d) is party-specific. OwnerPilot may not rely on ordinary broker supervision or property-management agency as a universal exemption for third-party landlord customers.

No power of attorney, management agreement, or generic agency relationship may be used as an automatic substitute for a valid Chapter 5.5 registration/exemption or for attorney representation where representation is required.

## 4. Eviction-specific practice-of-law boundary

`People v. Landlords Professional Services` remains the key California eviction-services authority for the ministerial/advice distinction.

The Phase C product consequence is structural:

- OwnerPilot may gather customer facts;
- OwnerPilot may provide qualifying neutral/general process information;
- OwnerPilot may populate approved documents from customer-confirmed facts and selections;
- OwnerPilot may perform factual/completeness checks;
- OwnerPilot may organize and export the packet;
- OwnerPilot may provide neutral filing/submission logistics;
- OwnerPilot may not use the filing engine to advise the customer which legal claim, remedy, form election, allegation, or litigation strategy to select.

A professional interface, broker credential, AI model, or high model confidence does not alter this boundary.

## 5. Modified Option C — ratified target architecture

**Modified Option C is APPROVED as the target Phase C UD-100 architecture.**

Natural-person, corporation, and LLC customers may use a materially common ministerial packet-preparation workflow, with plaintiff-type-specific verification, authority, disclosure, and downstream representation controls.

### 5.1 Natural-person track

A natural-person landlord may proceed self-represented subject to ordinary court procedure.

OwnerPilot's natural-person Phase C track may:

- capture and confirm customer facts;
- capture customer-chosen legal elections;
- populate approved current forms;
- perform factual/completeness checks;
- generate the packet for review/signature;
- provide neutral customer-controlled submission information;
- preserve the audit trail.

OwnerPilot does not impose an attorney requirement merely because a natural-person case becomes contested.

### 5.2 Corporation / LLC entity track

For Phase C product-control purposes:

> **LLC = corporation for the entity-track architecture.**

This is a conservative product rule for LLCs; the corporation rule rests on published appellate authority, while the precise LLC/UD formulation remains a monitoring item because no squarely controlling published appellate UD decision was identified.

Entity ownership alone is **not** a filing hard stop under the ratified Phase C legal-control package.

The entity track may:

- identify the exact plaintiff entity;
- identify the person acting for the entity;
- capture signer title/category and asserted authority;
- capture a short factual basis for signing authority;
- request supporting authority documentation when warranted;
- collect customer-supplied facts and customer-selected filing elections;
- populate the approved UD filing packet;
- route to the validated entity verification architecture;
- perform factual/completeness checks;
- require customer confirmation;
- generate the packet for customer review/signature;
- allow the customer to decide whether and how to submit it;
- provide neutral ministerial submission information;
- preserve the complete authority and packet audit trail.

OwnerPilot may not:

- represent the corporation or LLC in court;
- appear at hearings;
- argue for the entity;
- sign for the plaintiff;
- provide litigation strategy inside the filing engine;
- promise that a court will accept the filing;
- promise that any representation defect will always be curable;
- provide, arrange, match, or assign attorneys.

### 5.3 Filing versus representation

The legal-control package adopts the distinction between initial packet preparation/submission and court representation.

`CLD Construction` supports treating absence of counsel at threshold corporate filing as a potentially curable representation defect rather than an automatic jurisdictional nullity. That does **not** authorize OwnerPilot to promise cure, acceptance, deadline preservation, or a right for a nonattorney to litigate for an entity.

The entity workflow must therefore preserve separate states for:

**packet preparation → customer review/signature → customer-controlled submission → post-filing status → contested-case detection / representation boundary.**

If an entity matter becomes contested, OwnerPilot must surface the validated counsel-requirement notice and must not purport to represent or litigate for the entity.

## 6. Entity signer authority — attestation first, documentary diligence by exception

Universal operating-agreement/corporate-resolution upload is **rejected as a default requirement**.

Ordinary entity intake must capture:

1. exact legal plaintiff entity name;
2. signer full name;
3. signer title or relationship;
4. signer category (managing member, manager, officer, partner, or other authorized person);
5. affirmative statement that the signer is authorized to verify for the entity;
6. short factual basis for authority; and
7. confirmation under the applicable verification.

Supporting authority documentation should be requested only when a validated factual trigger exists, including:

- public entity records conflict with entered entity identity or role;
- prior OwnerPilot records show a conflicting signer;
- the entity appears suspended, forfeited, or otherwise presents an unresolved capacity issue;
- multi-manager governance creates uncertainty;
- an "other authorized person" role lacks a sufficient factual basis; or
- authority is disputed, inconsistent, or unclear.

Unresolved signer-authority conflict is a hard stop.

## 7. Secretary of State / entity-status handling

OwnerPilot may perform a factual California Secretary of State lookup and record observations such as entity name, public status, and listed information.

Observation is not legal conclusion.

The system may not silently convert a public status observation into a conclusion about capacity to sue unless a validated legal-control rule authorizes that consequence.

Suspended, forfeited, canceled, dissolved, foreign-unqualified, or otherwise unclear entity-capacity states remain a separate held legal-control work item.

## 8. Verification architecture

### 8.1 Natural person

Use the current UD-100 natural-person verification architecture where applicable.

### 8.2 Corporation / LLC / partnership

Janna approved with conditions an entity-appropriate declaration architecture, with **MC-030 — Declaration** as the current default candidate and OwnerPilot-generated entity-specific verification language.

Before activation, the Architect/Engineer must reverify against current official sources:

- the July 1, 2026 UD-100 verification wording;
- current MC-030 structure;
- the current Judicial Council forms library;
- applicable Los Angeles Superior Court local requirements; and
- whether a newer dedicated entity-verification form exists.

If a dedicated current Judicial Council entity-verification form exists, it supersedes MC-030 as the default.

Automatic attachment based solely on the customer's confirmed plaintiff type is treated as ministerial routing, not legal-strategy selection, provided the form rule has been validated and activated.

## 9. Business-intelligence / filing-engine separation

This is a central Phase C architectural rule.

### 9.1 Decision Intelligence state

Before filing-mode handoff, OwnerPilot may, within the separately approved owner-user business-decision framework:

- compare eviction economics with settlement economics;
- calculate cost of delay;
- analyze continued nonpayment;
- suggest payment-plan structures;
- analyze negotiation leverage;
- recommend communication strategies;
- compare settlement/business outcomes; and
- help the owner decide whether filing is the preferred business action.

These functions must remain distinct from legal form selection or individualized litigation-strategy advice.

### 9.2 Decision Confirmation state

A visible, auditable transition is required before Phase C enters the ministerial filing engine.

The customer must affirmatively confirm, in substance:

- the customer has decided to file an unlawful-detainer case;
- the customer has selected the filing path / legally consequential elections required by the validated workflow; and
- the facts and selections are accurate.

Required audit event:

`decision_to_file_confirmed`

At minimum preserve timestamp, actor, selected filing path/elections, and the governing decision-object/version reference.

### 9.3 Ministerial Filing Engine state

Once ministerial filing mode begins, OwnerPilot may populate, attach, calculate, validate factual completeness, identify missing facts, reconcile factual inconsistencies, generate, organize, preview, and export.

It may not recommend a new legal election, change legal strategy, optimize the case, substitute a legal claim, or suggest a stronger legal theory.

If the user wants to reconsider strategy, the user must expressly leave ministerial filing mode and return to the separately governed decision-review state.

## 10. Customer review, signature, and submission

The customer:

- reviews the packet;
- confirms the facts;
- signs the applicable verification/filing documents; and
- decides whether, when, and how to submit.

OwnerPilot does not sign for the customer.

The currently approved Phase C posture is **customer-controlled filing**. Separate Founder/legal approval is required before OwnerPilot may autonomously transmit through an e-filing provider, click-submit without a final customer action, pay fees automatically, or choose filing options in a filing portal.

## 11. Ratified customer disclosures

### 11.1 Entity customer disclosure

Janna approved the following Phase C entity-track copy:

> **OwnerPilot prepared this filing packet from the facts and selections you provided. You review, sign, and decide whether to file it.**
>
> **If the landlord is a corporation or LLC, you may file the case without an attorney. If the tenant contests the case, the entity will generally need a licensed attorney to continue in court.**
>
> **OwnerPilot does not provide or arrange attorneys.**

This is a Janna-ratified product disclosure. It must not be expanded into a guarantee that every clerk must accept the packet, every representation defect will be cured, every deadline will be preserved, or the customer may personally litigate for an entity.

### 11.2 Natural-person disclosure

Janna approved:

> **OwnerPilot prepared this filing packet from the facts and selections you provided. You review, sign, and decide whether to file it.**
>
> **You may proceed with your case without an attorney. If your case becomes complicated or you want legal advice, you can consult a licensed attorney.**
>
> **OwnerPilot does not provide or arrange attorneys.**

### 11.3 Attorney-routing boundary remains controlling

The Perplexity broker-ruling consolidation proposed pointing customers to the California State Bar lawyer-referral service on request.

That proposal is **not adopted by this reconciliation** because the controlling Founder product rule is that OwnerPilot does not provide, host, connect, assign, match, or route users to attorneys through the platform.

OwnerPilot may use the Janna-approved neutral language that a user can consult an independent California-licensed attorney outside OwnerPilot. It may not implement an attorney directory, matching service, referral fee, request-attorney-review flow, or a representation that attorney review is available through OwnerPilot.

Any future decision to provide a neutral external public-resource link must be separately reconciled against that Founder rule before implementation.

## 12. Free limited beta

The Phase C legal-control package approves a **FREE LIMITED BETA WITH DEFINED ELIGIBILITY GATES**, subject to the existing OwnerPilot beta governance and the following additional Phase C requirements.

Before registration, the UD filing workflow must be genuinely uncompensated.

OwnerPilot must not receive direct or indirect economic consideration tied to the UD filing assistance, including:

- filing-workflow fee;
- premium/advanced filing fee;
- subscription-gated UD filing access;
- paid case upgrades;
- marked-up court/process-service fees;
- referral or affiliate compensation;
- expedited-processing fees; or
- sale/monetization of UD-flow data as consideration for the service.

Legitimate beta use of data for product validation, support, debugging, safety, and product improvement remains subject to applicable privacy controls.

Free status does **not** relax the ministerial/UPL boundary.

## 13. Paid-launch compliance gate

Before any compensated Phase C workflow activates, complete and document the applicable:

1. UDA/LDA classification;
2. county registration footprint;
3. surety bond;
4. written customer agreement;
5. statutory disclosure requirements;
6. registration-number/expiration disclosures;
7. UD preparer disclosure;
8. advertising requirements;
9. continuing-education obligations;
10. prohibited-acts controls;
11. current form verification; and
12. current local filing-rule verification.

**Paid Phase C activation remains prohibited until complete.**

## 14. Required state architecture

The Architect should reconcile Phase C into the following conceptual states:

1. **Decision Intelligence**
2. **Decision Confirmation**
3. **Ministerial Filing Engine**
4. **Customer Review and Signature**
5. **Customer-Controlled Filing**
6. **Post-Filing Classification**

For natural persons, self-represented continuation remains available subject to the approved workflow.

For corporations/LLCs, contested-case detection must trigger the validated entity representation warning and must never become OwnerPilot representation.

## 15. Eligibility / hard-stop controls

Packet generation may proceed only when applicable validated controls are satisfied, including:

- customer identity confirmed;
- plaintiff type confirmed;
- customer authority confirmed;
- required verification available;
- required filing facts complete;
- filing decision and customer elections confirmed before ministerial mode;
- no unresolved factual conflict;
- current form versions available;
- applicable local packet rules current; and
- if paid, required UDA/LDA compliance active.

Hard-stop conditions include:

- unresolved plaintiff identity;
- entity-name conflict not resolved;
- disputed or unclear signer authority after required follow-up;
- unresolved entity capacity issue under a validated control;
- customer has not made the filing decision;
- filing engine would have to select a legal claim/remedy/strategy;
- required form version is stale;
- required verification architecture is unavailable; or
- paid workflow lacks required compliance.

## 16. Audit requirements

At minimum preserve versioned events equivalent to:

- `plaintiff_type_confirmed`
- `entity_name_confirmed`
- `entity_status_checked`
- `signer_identity_confirmed`
- `signer_authority_attested`
- `authority_document_requested`
- `authority_document_received`
- `filing_decision_confirmed`
- `ministerial_mode_entered`
- `filing_elections_confirmed`
- `packet_generated`
- `packet_reviewed`
- `verification_signed`
- `filing_authorized_by_customer`
- `packet_exported`
- `filing_submitted`
- `tenant_contest_detected`
- `entity_counsel_notice_displayed`
- `natural_person_pro_se_status`
- `form_version_recorded`
- `local_rule_version_recorded`

Each audit event should preserve actor, timestamp, relevant source data/reference, affected artifact version, previous state, and resulting state.

## 17. Items closed by Janna's targeted legal review

The following are no longer merely open research questions for Phase C architecture:

- Modified Option C target architecture — **APPROVED**
- entity initial packet preparation — **APPROVED**
- entity ministerial/customer-controlled filing architecture — **APPROVED**
- filing vs representation separation — **APPROVED**
- CLD curable-defect posture — **APPROVED**, without guarantee of cure
- corporation/LLC unified product track — **APPROVED** as conservative product policy
- attestation-first entity signer authority — **APPROVED**
- exception-based authority-document requests — **APPROVED**
- universal operating-agreement upload — **REJECTED as default**
- business-intelligence / ministerial-engine separation — **APPROVED**
- visible decision-to-file handoff — **REQUIRED**
- paid UDA/LDA compliance gate — **APPROVED / HARD GATE**
- narrow broker-exemption interpretation — **APPROVED**
- entity disclosure — **APPROVED**
- natural-person disclosure — **APPROVED**
- free pre-registration beta — **APPROVED WITH CONDITIONS**

## 18. Held / implementation-verification items

The following remain unresolved or require current-source confirmation before activation:

1. whether the final paid registration configuration is UDA only, LDA only, or both;
2. precise county-registration footprint;
3. current bond thresholds and entity/assistant-count treatment;
4. exact implementation-time UD-100 / entity-verification architecture, including whether MC-030 remains the correct default;
5. Los Angeles Superior Court local packet requirements;
6. suspended/forfeited/canceled/dissolved/foreign-unqualified entity capacity rules;
7. electronic verification/signature mechanics;
8. e-filing automation/direct transmission;
9. continued monitoring for published appellate LLC representation authority;
10. CalDRE identity reconciliation (`B9445457` versus `01871659`) before external-facing broker attestation/copy that depends on the canonical license identifier.

These held items may not be silently inferred by Engineering.

## 19. Supersession / reconciliation consequences

The following prior positions may no longer be relied on as controlling without conforming reconciliation:

1. a blanket "Path A — no UDA/LDA registration required" assumption for compensated ordinary third-party-landlord UD preparation;
2. any statement implying an LLC/corporation authorized signer may litigate the entity's UD in propria persona;
3. any architecture using broker supervision, POA, or property-management agency as a universal substitute for Chapter 5.5 compliance or required representation;
4. any filing flow that itself selects or recommends legal claims, remedies, forms, or litigation strategy;
5. any entity hard stop based solely on the absence of counsel at initial packet preparation/submission;
6. any universal operating-agreement/corporate-resolution upload requirement for ordinary entity cases.

The Architect must reconcile this baseline against:

- `docs/legal/california_nonpayment_product_control_specification_draft_2026-07-31.md`;
- `docs/legal/california_nonpayment_product_control_specification_revision_1_2026-07-31.md`;
- `docs/legal/group1_legal_review_handoff_2026-07-31.md`;
- `docs/legal/group1_pcs_revision1_reconciliation_2026-07-31.md`;
- prior Phase C complaint-packet/broker rulings and corrections;
- existing public/product copy;
- current RiskPath / matter-state architecture; and
- any code that assumes broader or narrower entity filing authority.

Historical artifacts should not be deleted. Conflicts should be explicitly marked confirmed, narrowed, superseded, or held.

## 20. Architect next action

The OwnerPilot Architect is authorized to draft the **Phase C UD-100 Product Control Specification** and reconciliation package.

At minimum it should define:

- plaintiff-type state model;
- entity authority schema;
- factual SOS lookup/observation logic;
- entity-status gates;
- verification-form router;
- natural-person/entity packet architecture;
- Decision Intelligence state;
- decision-to-file transition;
- Ministerial Filing Engine state;
- one-way filing-session gate;
- customer review/signature state;
- customer-controlled submission state;
- contested-case detection;
- entity representation warning;
- natural-person self-represented continuation;
- UDA/LDA paid-compliance gate;
- free-beta compensation controls;
- approved customer copy;
- audit/lineage requirements;
- current-form source registry;
- feature flags for unresolved controls; and
- test/acceptance matrix.

The Architect should then author the bounded Integration/Engineer directive. The legal handoff itself does not give the Engineer implementation authority.

## 21. Non-authorizations

This baseline does **not** authorize:

- implementation or activation of Phase C;
- Production court filing or submission;
- autonomous filing or e-filing;
- automatic fee payment;
- OwnerPilot signature for a customer;
- OwnerPilot court representation;
- autonomous legal strategy or form-selection advice;
- provision, arrangement, matching, assignment, or referral of attorneys through OwnerPilot;
- paid Phase C activation before applicable UDA/LDA compliance;
- any Production Supabase/Vercel/legal-control change;
- modification of the 3-Day Notice, LAHD, or BTRM posture merely by virtue of this document.

## 22. Provenance and verification notes

### Attorney-validated legal source

- `OwnerPilot — Phase C UD-100 Legal Control Handoff — Modified Option C — Ratified Legal Review Package`, Janna, California-licensed attorney, August 9, 2026.
- Targeted Phase C legal interview: COMPLETE.
- Modified Option C: APPROVED.
- Architecture specification: AUTHORIZED FOR DRAFTING.
- Free limited beta legal posture: APPROVED WITH CONDITIONS.
- Paid activation: NOT AUTHORIZED UNTIL UDA/LDA COMPLIANCE.
- Autonomous filing or representation: NOT AUTHORIZED.

### Founder-ratified product/governance consolidation

- `OwnerPilot Phase C UD-100 — Ratified Broker Rulings`, August 9, 2026.
- Used as a Founder/product-governance consolidation, not as attorney validation.
- Where it conflicts with Janna or a controlling Founder product boundary, it does not independently override them.

### Primary authority re-checks performed during repository reconciliation

The repository reconciliation independently rechecked, among other things:

- Cal. Bus. & Prof. Code §6400: §6400(d) defines self-help service; §6400(g) prohibits advice/form-selection/strategy recommendations;
- the current Judicial Council UD-100 metadata: effective July 1, 2026;
- current Judicial Council MC-030 metadata;
- `CLD Construction, Inc. v. City of San Ramon` on the curable-defect treatment of an uncounseled corporate complaint.

The legal-control package, not the independent research memorandum alone, is the controlling Phase C legal input for Architect reconciliation unless later superseded.