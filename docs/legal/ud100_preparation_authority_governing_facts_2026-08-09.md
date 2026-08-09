# OwnerPilot — UD-100 Preparation Authority Governing Facts

**Date:** 2026-08-09  
**Founder:** Jack Taglyan  
**Repository baseline:** `00f53b6f02f88289341eb976d9f5bd449226cfa6`  
**Scope:** California UD-100 complaint-packet preparation only. This document does not govern 3-Day Notice preparation, LAHD filing, post-judgment writs, or broader litigation strategy.  
**Status:** FOUNDER-ADOPTED GOVERNING FACTUAL / PRODUCT-CONTROL BASELINE — SUBJECT TO THE EXPRESS COUNSEL GATES BELOW  
**Implementation authority:** None.  
**Production authority:** None.  
**Attorney validation:** Not supplied by this document.  

## 1. Purpose and authority

This document preserves the governing factual and product-control baseline derived from the August 9, 2026 independent research memorandum, reconciled against primary California statutory and case authorities before repository adoption.

It is intentionally narrower than the source memorandum. The source memorandum mixes:

- primary-law findings;
- legal interpretations;
- Founder operational experience;
- product recommendations;
- unresolved counsel questions.

Only propositions appropriate to a durable OwnerPilot baseline are adopted here. Open or contestable legal conclusions remain expressly counsel-gated.

This document is an input to Architect reconciliation and later engineering directives. It does **not** independently authorize code changes, Product activation, Production deployment, court filing, migration work, or any other operative action.

## 2. Controlling distinctions

OwnerPilot must preserve the following distinctions in all UD-100 architecture, copy, workflows, and implementation:

1. **Document preparation is not legal representation.**
2. **Ministerial completion is not individualized legal advice.**
3. **Clerk filing / tender is not the same act as appearing or litigating in court.**
4. **A landlord's capacity to be a party is distinct from the rules governing who may represent that landlord in a court of record.**
5. **A broker license does not itself create authority to practice law or eliminate Legal Document Assistant / Unlawful Detainer Assistant requirements.**
6. **Registration, where required, does not authorize legal advice.**
7. **OwnerPilot may preserve facts and prepare approved documents only within the legal and product authority actually established for the applicable track.**

## 3. Verified California statutory baseline

### 3.1 Self-help service

California Business and Professions Code §6400(d) defines "self-help service" to include:

- completing legal documents in a ministerial manner when the documents are selected by a self-represented person and completed at that person's specific direction;
- providing general published factual legal information written or approved by an attorney;
- making published legal documents available; and
- filing or serving legal forms and documents at the specific direction of a self-represented person.

**Correction to the August 9 source memorandum:** §6400(d), not §6400(g), is the subsection that defines self-help service.

### 3.2 Advice prohibition

Business and Professions Code §6400(g) prohibits a legal document assistant from giving a consumer advice, explanation, opinion, or recommendation about possible legal rights, remedies, defenses, options, selection of forms, or strategies.

For OwnerPilot this creates a hard architectural boundary: a compliant ministerial document-preparation path cannot quietly become an AI strategy-selection or legal-advice path merely because the interface is software-driven.

### 3.3 Compensation and registration

Business and Professions Code §6400 treats compensation broadly as money, property, or anything else of value. A nonexempt legal document assistant may not provide compensated self-help service without registration under the statutory scheme.

Business and Professions Code §6402 requires legal document assistants and unlawful detainer assistants to be registered with the applicable county clerk and satisfy the bonding requirement. Business and Professions Code §6408 requires specified registration information to appear on documents, pleadings, advertising, websites, and other materials used by a registrant.

The precise classification of OwnerPilot's compensated UD-100 preparation service as LDA, UDA, or another permitted/exempt posture remains a counsel question where the statutory categories overlap or the service architecture changes.

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

## 5. Natural-person landlord track

A natural person may represent themself in California Superior Court, subject to the ordinary procedural rules applicable to the matter.

For OwnerPilot, a natural-person UD-100 track is therefore potentially viable as a strictly bounded ministerial self-help / document-preparation workflow if all applicable registration, disclosure, compensation, and other legal requirements are satisfied.

The governing product design for this track is:

- user supplies and confirms the material facts;
- user makes legally consequential elections;
- OwnerPilot populates only approved locked or deterministically generated document content within the validated scope;
- no individualized legal advice or strategy selection;
- no autonomous filing, signature, commencement of litigation, or representation;
- required registration/disclosure posture must be resolved before compensated launch.

The prior assumption that ordinary third-party-landlord UD-100 preparation could rely on the broker exemption without further registration analysis is **not controlling**.

## 6. Corporation track

California's longstanding rule is that a corporation may be a party to litigation but cannot represent itself in a court of record through a nonattorney officer, director, or employee. See **Merco Construction Engineers, Inc. v. Municipal Court (1978) 21 Cal.3d 724** and **CLD Construction, Inc. v. City of San Ramon (2004) 120 Cal.App.4th 1141**.

### Important threshold-filing nuance

CLD Construction confirms that the lack of counsel at the threshold filing of a corporate complaint is not necessarily an incurable jurisdictional nullity. The defect may be curable, and the court retains authority to require the corporation to obtain counsel.

Therefore OwnerPilot must not collapse the issue into either of these inaccurate extremes:

- "a corporation can freely litigate a UD pro se"; or
- "a nonattorney corporate officer can never tender or sign any initial filing-related document under any circumstances."

The durable rule is narrower:

> A corporation cannot conduct its Superior Court case through a nonattorney representative. Threshold filing mechanics and curability are distinct from representation authority.

### Governing product consequence

Until counsel approves a more specific entity workflow, OwnerPilot may research and design a ministerial corporate packet-preparation path, but it must not represent that a corporation may prosecute a contested Superior Court unlawful-detainer case without licensed counsel.

Any entity-track workflow must disclose the counsel requirement before the matter reaches a stage at which representation becomes necessary and must fail closed rather than purport to supply representation.

## 7. LLC track

The August 9 research identified trial-court authorities applying the attorney-representation rule to LLCs and no published California appellate unlawful-detainer decision squarely resolving the precise LLC/UD formulation.

Accordingly, OwnerPilot adopts the following **conservative product policy**, not a claim that the appellate question is uniquely settled by this document:

> For product-design and risk-control purposes, treat an LLC landlord like a corporation with respect to representation in California Superior Court unless and until California counsel approves a different rule.

This means OwnerPilot may separately analyze ministerial packet preparation and threshold filing mechanics, but it must not tell a nonattorney managing member that the member may litigate a contested UD on the LLC's behalf.

## 8. Filing is distinct from representation

The Founder reported direct operational experience tendering an LLC unlawful-detainer packet to the Los Angeles Superior Court clerk and obtaining a filed/conformed matter without counsel at the intake stage.

That experience is preserved as **Founder operational evidence**, not as a universal legal rule that every clerk must accept every entity filing or that acceptance validates representation capacity.

The legal baseline is instead:

- filing/tender at the clerk is analytically distinct from appearing, arguing, or litigating for the entity;
- clerk acceptance does not itself establish that a nonattorney may represent the entity in subsequent court proceedings;
- a court may later require counsel and may address a representation defect;
- OwnerPilot must not market clerk acceptance as proof of legal sufficiency or representation authority.

The source memorandum's broader factual statements that Los Angeles clerks "routinely" accept such filings and that most nonpayment UDs default are **not adopted as governing legal facts** absent a separately documented empirical or official source.

## 9. Governing entity-track product posture pending counsel

The August 9 memorandum proposed three entity-track options. This repository baseline does not select among them as an operative product authorization.

The Architect may reconcile and present for Founder/counsel disposition:

- **Option A — attorney-handoff-only:** packet preparation stops before finalization absent designated counsel;
- **Option B — ministerial-file-with-disclosed-limit:** bounded packet generation/tender workflow with explicit notice that the entity cannot be represented in court by a nonattorney if counsel is required;
- **Option C — Option B plus authority-record capture:** add managing-member/officer identity and appropriate entity authority documentation to strengthen the factual audit trail.

No option becomes executable merely because it appears here.

## 10. UDA/LDA posture is a launch gate, not a deferred cleanup item

The August 9 research materially weakens the prior assumption that OwnerPilot can launch a compensated third-party-landlord UD-100 preparation workflow under a generic broker exemption and decide later whether registration is needed.

The governing rule is now:

> Before OwnerPilot charges for or otherwise receives compensation for a UD-100 preparation workflow, the operating entity's exact LDA/UDA registration, exemption, disclosure, contract, bonding, county-registration, and role-classification posture must be resolved and documented for the actual product design.

This is a legal/product launch gate.

It does not require OwnerPilot to register immediately merely to preserve, research, prototype, or test a non-Production/noncompensated architecture within existing authority.

## 11. Supersession and reconciliation consequences

The following prior positions are no longer safe to rely on without reconciliation:

1. A blanket "Path A — no UDA/LDA registration required" assumption for the typical compensated third-party-landlord UD-100 scenario.
2. Any prior wording implying that an LLC or corporation's "authorized signer" status alone means the entity may litigate its UD in propria persona.
3. Any architecture that uses the broker license, power of attorney, or property-management agency as an automatic substitute for a valid Chapter 5.5 exemption/registration or attorney representation.
4. Any AI flow that converts ministerial packet preparation into individualized legal form selection, advice, explanation, or strategy.

The Architect must reconcile this document against:

- `docs/legal/california_nonpayment_product_control_specification_draft_2026-07-31.md`;
- `docs/legal/california_nonpayment_product_control_specification_revision_1_2026-07-31.md`;
- prior Phase C UD complaint-packet rulings and corrections;
- any existing product copy or implementation that assumes broader entity self-representation or broker authority.

No historical document should be silently deleted. Conflicts should be explicitly marked superseded, narrowed, or unresolved.

## 12. Counsel gates still open

The following remain counsel questions and are **not converted into legal conclusions by Founder adoption of this factual baseline**:

1. OwnerPilot's exact classification and registration obligations under Chapter 5.5 for the intended compensated UD-100 service.
2. Whether the operating entity should register as an LDA, UDA, both where legally appropriate, or use another counsel-approved structure.
3. Exact application of the §6401(d) broker-party exemption to broker-owned, broker-affiliated, assigned, or special-purpose ownership structures.
4. The precise permissible entity-track workflow for corporations and LLCs, including verification/signature mechanics and the point at which counsel must be required.
5. Any county-specific registration or operational requirements beyond the statewide statutory baseline.
6. Exact required consumer contract, website, advertising, pleading, and disclosure language if OwnerPilot operates as a registrant.
7. Whether any additional State Bar, DRE, court, or appellate authority changes the conclusions above.
8. Long-term consequences of the current January 1, 2030 sunset of Chapter 5.5.

A written California counsel opinion on the as-built natural-person and selected entity workflows is preferred before compensated UD-100 launch.

## 13. Current form/version control

The Judicial Council's current UD-100, Complaint—Unlawful Detainer, is effective July 1, 2026.

Any UD-100 generator must bind to an effective-dated form/source registry and fail closed if the required form version or governing procedural source is stale, unavailable, or not validated for the applicable workflow.

Future statutory or Judicial Council changes do not silently update existing matters. They require source/version review and, where legally consequential, renewed legal/product validation.

## 14. Non-authorizations

This governing-facts document does **not** authorize:

- implementation or activation of a UD-100 generator;
- Production filing or court submission;
- autonomous filing or service;
- OwnerPilot legal representation;
- attorney-routing or an on-platform attorney service;
- compensated UD-100 preparation before the registration/exemption posture is resolved;
- entity-track activation;
- legal-strategy recommendations;
- form-selection advice;
- change to existing Production legal controls;
- modification of the 3-Day Notice, LAHD, BTRM, Supabase, or Vercel production posture.

## 15. Provenance

Primary research input:

- `ownerpilot_broker_ud100_authority_writeup_2026-08-09.pdf`, revised August 9, 2026.

Primary authorities independently checked before repository adoption include:

- Cal. Bus. & Prof. Code §§6400, 6401, 6402, 6405, 6408, 6410;
- Cal. Bus. & Prof. Code §10131;
- People v. Landlords Professional Services (1989) 215 Cal.App.3d 1599;
- Merco Construction Engineers, Inc. v. Municipal Court (1978) 21 Cal.3d 724;
- CLD Construction, Inc. v. City of San Ramon (2004) 120 Cal.App.4th 1141;
- current Judicial Council UD-100 form metadata, effective July 1, 2026.

The source memorandum remains research provenance and is not itself canonical authority. Where this governing-facts document differs from the source memorandum, this document controls for OwnerPilot repository reconciliation unless later superseded by Founder disposition or validated legal authority.
