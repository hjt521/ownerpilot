# OwnerPilot — UD-100 Preparation Authority Governing Facts

**Date:** 2026-08-09  
**Founder:** Jack Taglyan  
**Repository baseline:** `00f53b6f02f88289341eb976d9f5bd449226cfa6`  
**Scope:** California UD-100 complaint-packet preparation only. This document does not govern 3-Day Notice preparation, LAHD filing, post-judgment writs, or broader litigation strategy.  
**Status:** FOUNDER-ADOPTED GOVERNING FACTUAL / PRODUCT-CONTROL BASELINE — MODIFIED OPTION C SELECTED AS TARGET ENTITY-TRACK RULE — SUBJECT TO THE EXPRESS COUNSEL GATES BELOW  
**Implementation authority:** None.  
**Production authority:** None.  
**Attorney validation:** Not supplied by this document.  

## 1. Purpose and authority

This document preserves the governing factual and product-control baseline derived from the August 9, 2026 independent UD-100 authority research, including the later v3 update adopting Modified Option C as the Founder-selected target entity-track product rule.

It is intentionally narrower than the research memoranda. The source materials mix:

- primary-law findings;
- legal interpretations;
- Founder operational experience;
- product recommendations;
- customer-copy proposals;
- unresolved counsel questions.

Only propositions appropriate to a durable OwnerPilot baseline are adopted here. Open or contestable legal conclusions remain expressly counsel-gated.

This document is an input to Architect reconciliation and later engineering directives. It does **not** independently authorize code changes, product activation, Production deployment, court filing, registration, compensation, or any other operative action.

## 2. Controlling distinctions

OwnerPilot must preserve the following distinctions in all UD-100 architecture, copy, workflows, and implementation:

1. **Document preparation is not legal representation.**
2. **Ministerial completion is not individualized legal advice.**
3. **Clerk filing / tender is analytically distinct from appearing or litigating in court.**
4. **A landlord's capacity to be a party is distinct from the rules governing who may represent that landlord in a court of record.**
5. **A threshold filing defect that may be curable is not the same thing as affirmative authority for a nonattorney to represent an entity.**
6. **A broker license does not itself create authority to practice law or eliminate Legal Document Assistant / Unlawful Detainer Assistant requirements.**
7. **Registration, where required, does not authorize legal advice.**
8. **OwnerPilot may preserve facts and prepare approved documents only within the legal and product authority actually established for the applicable track.**
9. **Customer capability, OwnerPilot assistance authority, and court-representation authority must be resolved separately.**

## 3. Verified California statutory baseline

### 3.1 Self-help service

California Business and Professions Code §6400(d) defines "self-help service" to include:

- completing legal documents in a ministerial manner when the documents are selected by a self-represented person and completed at that person's specific direction;
- providing general published factual legal information written or approved by an attorney;
- making published legal documents available; and
- filing or serving legal forms and documents at the specific direction of a self-represented person.

**Correction to the August 9 source memoranda:** §6400(d), not §6400(g), is the subsection that defines self-help service.

### 3.2 Advice prohibition

Business and Professions Code §6400(g) prohibits a legal document assistant from giving a consumer advice, explanation, opinion, or recommendation about possible legal rights, remedies, defenses, options, selection of forms, or strategies.

For OwnerPilot this creates a hard architectural boundary: a ministerial document-preparation path cannot quietly become an AI strategy-selection or legal-advice path merely because the interface is software-driven.

### 3.3 Compensation and registration

Business and Professions Code §6400 treats compensation broadly as money, property, or anything else of value. A nonexempt legal document assistant may not provide compensated self-help service without registration under the statutory scheme.

Business and Professions Code §6402 requires legal document assistants and unlawful detainer assistants to be registered with the applicable county clerk and satisfy the bonding requirement of §6405. Section 6408 requires specified registration information on solicitations, advertisements, websites, printed/electronic documents, and pleadings used by a registrant. Section 6410 imposes a written-contract regime and requires prominent disclosure that the assistant is not permitted to practice law or advise about legal rights, remedies, defenses, options, form selection, or strategies.

The precise classification of OwnerPilot's compensated UD-100 preparation service as LDA, UDA, both where legally applicable, or another permitted/exempt posture remains a counsel question where the statutory categories overlap or the service architecture changes.

### 3.4 Broker exemption is narrow

Business and Professions Code §6401(d) exempts a licensed real estate broker or salesperson from Chapter 5.5 only when the licensee acts pursuant to §10131(b) on an unlawful-detainer claim **and is a party to the unlawful-detainer action**.

Accordingly, OwnerPilot must not assume that a broker's ordinary agency or property-management relationship with a third-party landlord automatically supplies this exemption.

No product architecture may rely on a power of attorney, management agreement, or generic agency status as a substitute for an independently valid registration/exemption or attorney-representation posture.

## 4. Verified eviction-specific practice-of-law boundary

**People v. Landlords Professional Services (1989) 215 Cal.App.3d 1599** is a controlling California eviction-services authority for OwnerPilot's Phase C design.

The decision supports a distinction between clerical/self-help conduct and unauthorized practice of law. Ministerial conduct includes making forms available, filling forms at the client's specific direction, and filing/serving at the client's direction. Personalized advice, explanations of legal effect, advice about what is required to commence or maintain the proceeding, and individualized form/strategy guidance cross the line identified by the court.

### Governing product consequence

The UD-100 workflow must therefore remain structurally ministerial unless a separately authorized attorney-led architecture is adopted. In particular, the system must not:

- choose a cause of action for the user;
- recommend whether the user should file an unlawful detainer;
- select among legally consequential forms based on individualized legal judgment;
- explain what a pleading choice means for the user's specific legal rights;
- recommend litigation tactics or legal strategy;
- present AI-generated legal conclusions as a substitute for independent legal judgment.

A professional interface, broker credential, or high-confidence model output does not alter this boundary.

## 5. The ministerial line — target product behavior

The v3 research update correctly sharpens an important product principle: OwnerPilot should remove the administrative burden of the UD packet while leaving legally consequential elections and signatures with the customer.

Subject to the applicable registration/exemption and entity-representation gates, the target ministerial workflow may support the customer in:

- supplying facts about the landlord/entity, property, tenancy, notice, alleged breach, service, and requested relief;
- reviewing neutral descriptions of available Judicial Council fields/forms without OwnerPilot recommending a legal choice;
- making the customer's own substantive elections;
- reviewing the completed packet;
- signing the verification or other signature block that is legally appropriate for that customer and validated for the product track;
- deciding whether and how to submit the packet;
- directing permitted filing/service assistance where the applicable Chapter 5.5 posture has been satisfied;
- preserving proof-of-filing/service facts and downstream matter state.

OwnerPilot's target role is ministerial packet preparation and workflow support. OwnerPilot does not:

- make the customer's legal elections;
- sign court papers for the customer;
- appear or argue in court for the customer;
- respond to court orders or opposing papers for the customer;
- determine settlement, dismissal, or litigation strategy;
- guarantee that a court clerk will accept a packet;
- represent that clerk acceptance proves legal sufficiency or representation authority.

The v3 statement that all customer types may simply e-file or tender entity pleadings without counsel is **not adopted as a universal legal fact**. The exact entity submission/e-filing posture remains a counsel gate because California authority distinguishes a curable threshold representation defect from affirmative authorization to practice or represent an entity.

## 6. Natural-person landlord track

A natural person may represent themself in California Superior Court, subject to the ordinary procedural rules applicable to the matter.

For OwnerPilot, a natural-person UD-100 track is therefore potentially viable as a strictly bounded ministerial self-help / document-preparation workflow if all applicable registration, disclosure, compensation, and other legal requirements are satisfied.

The governing product design for this track is:

- user supplies and confirms the material facts;
- user makes legally consequential elections;
- OwnerPilot populates only approved locked or deterministically generated document content within the validated scope;
- no individualized legal advice or strategy selection;
- no OwnerPilot signature, representation, or autonomous commencement of litigation;
- any filing/service assistance must stay within the validated ministerial and registration posture;
- required registration/disclosure posture must be resolved before compensated launch.

The prior assumption that ordinary third-party-landlord UD-100 preparation could rely on the broker exemption without further registration analysis is **not controlling**.

## 7. Corporation and LLC representation baseline

### 7.1 Corporation

California's longstanding rule is that a corporation may be a party to litigation but cannot represent itself in a court of record through a nonattorney officer, director, or employee. See **Merco Construction Engineers, Inc. v. Municipal Court (1978) 21 Cal.3d 724**.

**CLD Construction, Inc. v. City of San Ramon (2004) 120 Cal.App.4th 1141** adds an important threshold-filing nuance: a corporate complaint filed without proper attorney representation is not necessarily an incurable jurisdictional nullity. The defect may be curable, and the court may permit the corporation to obtain counsel and correct the pleading defect.

CLD does **not** establish that a corporation has a general right to litigate through a nonattorney or that licensed counsel is legally unnecessary until the opposing party contests the case.

The durable rule is:

> A corporation cannot conduct its Superior Court case through a nonattorney representative. Threshold filing mechanics and curability are distinct from representation authority.

### 7.2 LLC

The August 9 research identified trial-court authorities applying the attorney-representation rule to LLCs and no published California appellate unlawful-detainer decision squarely resolving the precise LLC/UD formulation.

Accordingly, OwnerPilot adopts the following **conservative product policy**, not a claim that the appellate question is uniquely settled by this document:

> For product-design and risk-control purposes, treat an LLC landlord like a corporation with respect to representation in California Superior Court unless and until California counsel approves a different rule.

### 7.3 Founder operational evidence

The Founder reported direct operational experience tendering an LLC unlawful-detainer packet to the Los Angeles Superior Court clerk and obtaining a filed/conformed matter without counsel at the intake stage.

That experience is preserved as **Founder operational evidence**, not as a universal legal rule that every clerk must accept every entity filing or that acceptance validates representation capacity.

The source memoranda's broader statements that Los Angeles clerks "routinely" accept such filings, that most nonpayment UDs default, or that the representation doctrine becomes legally operative **only** upon contest are **not adopted as governing legal facts** absent stronger authority.

## 8. Founder-selected target entity architecture — Modified Option C

The Founder selects **Modified Option C — Ministerial Entity Packet Preparation with Authority Record and Disclosed Representation Boundary** as OwnerPilot's target-state corporation/LLC architecture.

This selection is a **product-control direction**, not legal validation or implementation authority.

### 8.1 Target workflow

Natural-person, corporation, and LLC customers should, to the greatest extent legally validated, use a materially common locked-prose / customer-directed packet-preparation experience.

For a corporation or LLC, the entity track adds a narrow entity-specific layer capturing:

- exact legal entity name;
- entity type;
- authorized signer identity;
- signer role/capacity;
- asserted basis of authority;
- the applicable verification/signature path once legally validated;
- timestamped customer acknowledgment of the entity-representation boundary;
- packet/source/control versions and audit evidence.

No operating-agreement or corporate-resolution upload is required merely because the customer is an entity unless Janna/counsel determines that such evidence is legally necessary or materially useful for the validated verification/control design. The v3 recommendation against automatic operating-agreement upload is adopted as the **default low-friction product posture**, subject to counsel override.

The customer supplies facts and makes substantive elections. OwnerPilot prepares the packet ministerially within the validated rules. The customer reviews and signs. The customer decides whether and how to submit the packet.

OwnerPilot may assist with ministerial filing/submission only after the separate Chapter 5.5 registration/exemption and entity-submission posture is validated and activated.

### 8.2 Representation boundary

OwnerPilot must clearly tell entity customers that preparing or submitting a packet is not the same thing as OwnerPilot or a nonattorney representative being authorized to represent the entity in court.

OwnerPilot must not promise that counsel is unnecessary through any particular stage unless Janna/counsel validates that exact statement. The practical event of a tenant answer, demurrer, motion, hearing, or other contested proceeding is a mandatory representation-review trigger, but it must not be described as the only possible point at which counsel can be required.

### 8.3 No attorney marketplace or on-platform routing

Modified Option C does not create an attorney marketplace, attorney matching, attorney referral fees, or an OwnerPilot-provided attorney service.

The v3 proposal to point customers to a State Bar lawyer-referral service is **not automatically adopted**, because OwnerPilot's existing controlling product baseline prohibits on-platform attorney routing/connection. The Architect and Janna may separately determine whether a neutral public-government resource link, shown only when the customer asks for outside legal-help information, is consistent with that baseline. Until separately approved, the existing rule controls: OwnerPilot may calmly suggest consulting an independent attorney outside the platform but does not select, connect, assign, or route the user to an attorney.

## 9. Customer-facing entity disclosure — concept adopted, exact prose counsel-gated

The v3 research correctly recommends a short, repeated, plain-English disclosure at the entity intake summary and pre-submission review, with timestamped acknowledgment.

That **disclosure architecture is adopted**.

The v3 proposed sentence — "You can complete and file this paperwork now without an attorney; you would only need to hire one if the tenant contests the case" — is **not adopted as final customer-facing legal copy** because it states the counsel boundary more categorically than the verified appellate authority supports.

The target disclosure must communicate, in calm plain English, at least these facts:

- the landlord is an LLC/corporation;
- OwnerPilot is preparing the packet from customer-supplied facts and selections;
- OwnerPilot is not representing the entity and does not determine legal sufficiency;
- California generally requires licensed counsel to represent a corporation in court and OwnerPilot conservatively applies that rule to LLCs;
- filing/tender and representation are distinct, but clerk acceptance does not establish a right to litigate through a nonattorney;
- if a response, motion, hearing, court order, or other event creates a counsel requirement, the entity must obtain independent licensed counsel;
- OwnerPilot does not provide or arrange attorneys.

Janna/counsel must approve the exact customer-facing wording before implementation or activation.

## 10. UDA/LDA posture — registration-first product gate

The August 9 research materially weakens the prior assumption that OwnerPilot can launch a compensated third-party-landlord UD-100 preparation workflow under a generic broker exemption and decide later whether registration is needed.

The Founder-selected product posture is now:

> **No compensated UD-100 preparation launch unless and until OwnerPilot's exact Chapter 5.5 registration/exemption posture has been resolved and every registration, bond, contract, disclosure, county, website, advertising, and pleading requirement determined to apply has been satisfied.**

For planning purposes, OwnerPilot should proceed on a **registration-first / exemption-not-assumed** basis for the ordinary third-party-landlord scenario.

This is a conservative product-control rule. It does not convert every unresolved classification question into a legal conclusion. Janna/counsel must determine the exact UDA/LDA registration architecture for the actual operating entity and service.

This gate does not require immediate registration merely to preserve, research, prototype, or test a non-Production/noncompensated architecture within existing authority.

## 11. Supersession and reconciliation consequences

The following prior positions are no longer safe to rely on without reconciliation:

1. A blanket "Path A — no UDA/LDA registration required" assumption for the typical compensated third-party-landlord UD-100 scenario.
2. Any prior wording implying that an LLC or corporation's "authorized signer" status alone means the entity may litigate its UD in propria persona.
3. Any architecture that uses the broker license, power of attorney, or property-management agency as an automatic substitute for a valid Chapter 5.5 exemption/registration or attorney representation.
4. Any AI flow that converts ministerial packet preparation into individualized legal form selection, advice, explanation, or strategy.
5. Any entity copy that guarantees clerk acceptance, states that an entity has an unrestricted right to file/e-file through a nonattorney, or says counsel is legally required **only** if the tenant contests.

The v3 research update is incorporated with the following explicit reconciliations:

- **Modified Option C:** adopted as the Founder-selected target entity architecture.
- **Same-footing packet preparation:** adopted as the desired product experience, subject to entity-specific verification/disclosure controls and legal validation.
- **No automatic operating-agreement upload:** adopted as the default product posture, subject to counsel override.
- **Registration-first:** adopted as the compensated-launch product gate.
- **Plain-English entity disclosure:** architecture adopted; exact v3 wording not adopted pending counsel.
- **§6400 citation:** corrected — subdivision (d) defines self-help service; subdivision (g) contains the advice/form-selection/strategy prohibition.
- **Corporation/LLC counsel timing:** v3's practical "if contested" trigger is preserved as a mandatory review trigger, not as a universal rule that counsel cannot be required earlier.
- **Clerk acceptance/default-rate assertions:** preserved only as research/Founder operational context, not governing legal facts.
- **State Bar referral-service link:** not adopted pending reconciliation with the controlling no-attorney-routing product rule.

The Architect must reconcile this document against:

- `docs/legal/california_nonpayment_product_control_specification_draft_2026-07-31.md`;
- `docs/legal/california_nonpayment_product_control_specification_revision_1_2026-07-31.md`;
- prior Phase C UD complaint-packet rulings and corrections;
- any existing product copy or implementation that assumes broader entity self-representation or broker authority.

No historical document should be silently deleted. Conflicts should be explicitly marked superseded, narrowed, clarified, or unresolved.

## 12. Counsel gates still open

The following remain counsel questions and are **not converted into legal conclusions by Founder adoption of this factual/product-control baseline**:

1. OwnerPilot's exact classification and registration obligations under Chapter 5.5 for the intended compensated UD-100 service.
2. Whether the operating entity should register as an LDA, UDA, both where legally appropriate, or use another counsel-approved structure.
3. Exact application of the §6401(d) broker-party exemption to broker-owned, broker-affiliated, assigned, or special-purpose ownership structures.
4. The precise permissible entity-track workflow for corporations and LLCs, including threshold filing, physical tender, e-filing, verification/signature mechanics, and the point(s) at which counsel must be required.
5. Whether an LLC managing member or corporate officer may sign each intended verification form in the exact OwnerPilot workflow and what factual authority record should be captured.
6. Whether operating-agreement, corporate-resolution, or similar authority-document capture is required, beneficial, or unnecessary.
7. Exact county-specific registration or operational requirements beyond the statewide statutory baseline.
8. Exact required consumer contract, website, advertising, pleading, UDA/LDA-assistance disclosure, and registration language if OwnerPilot operates as a registrant.
9. Exact customer-facing entity disclosure language.
10. Whether a neutral link to a State Bar or court legal-help resource, provided only on request, is consistent with OwnerPilot's no-attorney-routing rule.
11. Whether any additional State Bar, DRE, court, or appellate authority changes the conclusions above.
12. Long-term consequences of the current January 1, 2030 sunset of Chapter 5.5.
13. Effective-dated compliance with the January 1, 2027 version of CCP §1166 and associated Judicial Council form changes.

A written California counsel opinion on the as-built natural-person and Modified Option C entity workflows is preferred before compensated UD-100 launch.

## 13. Current form/version control

The Judicial Council's current UD-100, Complaint—Unlawful Detainer, is effective July 1, 2026.

Any UD-100 generator must bind to an effective-dated form/source registry and fail closed if the required form version or governing procedural source is stale, unavailable, or not validated for the applicable workflow.

CCP §1166 has a later operative version beginning January 1, 2027 that adds service-detail requirements to the complaint. That future-effective change must be treated as an effective-dated source/control update rather than silently applied to pre-effective matters.

Future statutory or Judicial Council changes do not silently update existing matters. They require source/version review and, where legally consequential, renewed legal/product validation.

## 14. Architect and implementation consequence

The Architect must now reconcile Modified Option C into the California Nonpayment Product Control Specification and all prior Phase C rulings, then obtain targeted Janna/counsel disposition on the open gates before authoring any implementation-authorizing Engineer directive.

The Architect's reconciliation must produce, at minimum:

- natural-person UD-100 track contract;
- corporation/LLC Modified Option C track contract;
- entity signer/authority fact model;
- ministerial-preparation boundary;
- business-intelligence versus legal-document-engine separation;
- Chapter 5.5 registration/disclosure gate;
- entity representation-review triggers;
- customer disclosure contract;
- effective-dated form/source controls;
- explicit supersession map for prior Phase C rulings;
- implementation stop conditions.

Engineering may prepare nonoperative prototypes only under separate authority. No Engineer may infer implementation authority from this governing-facts document.

## 15. Non-authorizations

This governing-facts document does **not** authorize:

- implementation or activation of a UD-100 generator;
- Production filing or court submission;
- autonomous filing or service;
- OwnerPilot legal representation;
- attorney-routing or an on-platform attorney service;
- compensated UD-100 preparation before the registration/exemption posture is resolved and applicable requirements are satisfied;
- entity-track activation;
- legal-strategy recommendations;
- form-selection advice;
- change to existing Production legal controls;
- modification of the 3-Day Notice, LAHD, BTRM, Supabase, or Vercel Production posture.

## 16. Provenance

Primary research inputs:

- `ownerpilot_broker_ud100_authority_writeup_2026-08-09.pdf`, revised August 9, 2026 (v2);
- `OwnerPilot — Broker UD-100 Preparation Authority Analysis`, revised August 9, 2026 (v3), incorporating Modified Option C, proposed ministerial-line foundation, and proposed customer-facing entity disclosure.

Primary authorities independently checked before repository incorporation include:

- Cal. Bus. & Prof. Code §§6400, 6401, 6402, 6405, 6408, 6410;
- Cal. Bus. & Prof. Code §10131;
- Cal. Code Civ. Proc. §1166, including the later January 1, 2027 operative version;
- People v. Landlords Professional Services (1989) 215 Cal.App.3d 1599;
- Merco Construction Engineers, Inc. v. Municipal Court (1978) 21 Cal.3d 724;
- CLD Construction, Inc. v. City of San Ramon (2004) 120 Cal.App.4th 1141;
- current Judicial Council UD-100 form metadata, effective July 1, 2026.

The source research remains provenance and is not itself canonical legal authority. Where this governing-facts document differs from the research memoranda, this document controls for OwnerPilot repository reconciliation unless later superseded by Founder disposition or validated legal authority.
