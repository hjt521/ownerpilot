# OwnerPilot Phase C UD-100 Reconciliation Memorandum

**Status:** NONCANONICAL DRAFT — ARCHITECT / ARB RECONCILIATION — NO IMPLEMENTATION OR PRODUCTION AUTHORITY  
**Date:** 2026-08-09  
**Integrated governing baseline:** `main` at `b1cb7772df78598b4d8826842815afbf96e347e1`  
**Governing-facts PR:** #357 — squash-merged from exact reviewed head `5b98b7b9f471701284b80b9e41dc9ae92db73fd1`; resulting `main` commit `b1cb7772df78598b4d8826842815afbf96e347e1`

## 1. Executive disposition

**PROCEED WITH CONDITIONS.**

Founder-selected Modified Option C is reconciled as the target Phase C architecture:

> **Ministerial Entity Packet Preparation with Authority Verification and Disclosed Representation Boundary.**

This memorandum does not authorize runtime implementation, Preview activation, Production activation, paid Phase C, autonomous filing, direct e-filing, UDA/LDA registration, court representation, attorney routing, or any Production Supabase/Vercel change.

## 2. Governing hierarchy

1. Applicable controlling law.
2. Explicit Founder authority and product boundaries.
3. Janna-validated Phase C legal controls.
4. Reconciled OwnerPilot governing repository controls.
5. Founder-ratified product/governance research consolidation.
6. Architect specifications.
7. Engineer implementation.

No lower layer may manufacture or enlarge authority granted by a higher layer.

## 3. Controlling Phase C propositions

### 3.1 Separation of functions

The architecture must preserve:

- **preparation ≠ submission ≠ representation**;
- **customer/entity authority ≠ OwnerPilot service authority**;
- **decision intelligence ≠ filing engine**.

### 3.2 Natural-person track

A natural-person landlord may proceed through a self-directed ministerial workflow within approved product boundaries. The filing engine may populate, calculate, organize, validate factual completeness, surface factual inconsistencies, preview, and export after the customer makes the legal election to file.

Natural persons are not automatically forced into an attorney-required state merely because the matter becomes contested.

### 3.3 Corporation / LLC track

For current Phase C product-control purposes, LLCs use the same entity-track architecture as corporations, while preserving internally that the corporation rule has stronger published appellate footing and the LLC treatment includes conservative product policy.

Corporation/LLC status alone is not an initial packet-preparation hard stop. The product may support customer-directed initial packet preparation and customer-controlled submission within the approved ministerial architecture. OwnerPilot never represents the entity.

### 3.4 Attestation-first authority architecture

Ordinary entity cases do not require universal operating-agreement or corporate-resolution upload.

Default architecture:

`attestation first → documentary diligence by exception`

Ordinary entity intake must capture:

- exact plaintiff entity name;
- signer full name;
- signer title/relationship;
- signer category;
- affirmative authorization attestation;
- short factual basis for signing authority;
- applicable verification confirmation.

Documentary diligence is triggered by factual ambiguity or conflict, including Secretary of State inconsistency, prior signer conflict, suspended/forfeited status, unclear multi-manager authority, inadequate "other authorized person" basis, or disputed/inconsistent authority.

**Unresolved authority conflict is a hard stop.**

### 3.5 Verification architecture

Natural-person plaintiffs use the validated natural-person UD-100 verification architecture.

Entity plaintiffs use UD-100 plus the validated entity-appropriate verification mechanism. MC-030 with entity-specific verification text is the provisional default architecture, subject to implementation-time authoritative-source verification. If the Judicial Council or applicable court provides a dedicated replacement entity-verification form, the current authoritative form controls.

### 3.6 Decision-to-file handoff

The filing engine may not infer the decision to file from business reasoning.

Required one-way transition:

`Decision Intelligence → Customer Decision → Decision-to-File Confirmation → Ministerial Filing Engine`

The audit record must preserve `decision_to_file_confirmed` with actor, timestamp, plaintiff, filing path, customer-confirmed legal elections, and the relevant decision-object/version reference.

Once ministerial filing mode begins, the filing engine may not recommend a different cause of action, statutory theory, remedy, allegation strategy, checkbox, claim, or litigation theory. Reconsideration requires an intentional exit from filing mode back to decision intelligence.

### 3.7 Customer-controlled filing

The current approved posture is customer-controlled filing. The customer reviews the packet, confirms facts, signs, decides whether to file, decides when to file, and decides how to file.

OwnerPilot may provide neutral filing information. OwnerPilot does not sign for the customer and is not authorized by this architecture to autonomously submit, click-submit, pay filing fees, or integrate direct e-filing.

### 3.8 Representation boundary

OwnerPilot never appears, argues, signs as the entity, files responsive advocacy on the entity's behalf, becomes counsel, or represents itself as counsel.

The architecture must support a distinct contested-case event and a representation-boundary state. The exact final taxonomy of contested-stage triggers remains an implementation-verification item and must not be invented beyond validated controls.

### 3.9 Attorney boundary

The current Founder rule remains controlling. OwnerPilot does not provide, host, connect, assign, match, route, or maintain an attorney marketplace and must not imply attorney review is available through OwnerPilot.

Where appropriate, the product may calmly state that the user may consult an independent California-licensed attorney outside OwnerPilot.

### 3.10 Free limited beta

Phase C may progress toward a **FREE LIMITED BETA WITH DEFINED ELIGIBILITY GATES**.

The beta must be genuinely uncompensated. It may not require a UD preparation fee, premium filing tier, subscription prerequisite for UD filing, marked-up court/process-service cost, filing-related affiliate compensation, referral compensation, expedited fee, convenience fee, or UD-flow data monetization as consideration.

Free does not relax UPL/ministerial boundaries.

### 3.11 Paid Phase C

Paid Phase C remains a hard hold until applicable UDA/LDA compliance is completed and separately activated by the Founder. The broker exemption is not a generic exemption for ordinary third-party landlord customers.

## 4. Conflict and supersession matrix

| Prior proposition or assumption | Disposition | Reconciled control |
|---|---|---|
| Preparation, filing/submission, and representation are the same act | **SUPERSEDED** | Preserve three separate functions and permissions |
| Entity ownership/title alone creates all filing/litigation authority | **SUPERSEDED** | Role/title is factual input; authority uses attestation + approved verification |
| Universal operating-agreement/resolution upload is required | **REPLACED** | Attestation first; documentary diligence by exception |
| Corporation/LLC is an initial packet-preparation hard stop | **SUPERSEDED** | Entity may enter initial ministerial packet path under validated controls |
| Corporation and LLC require separate product tracks | **REPLACED for current product control** | Unified entity track; preserve authority nuance internally |
| Natural person must enter attorney-required state when contested | **CONTRADICTED** | Natural-person self-represented continuation may remain available |
| Autonomous AI may select legal forms/claims/remedies in filing mode | **CONTRADICTED** | Filing engine is deterministic and customer-election bound |
| Decision intelligence may silently become filing strategy | **CONTRADICTED** | Visible, auditable decision-to-file handoff |
| Generic no-UDA/LDA path permits paid third-party UD-100 service | **SUPERSEDED** | Paid Phase C hard-gated by applicable compliance |
| Broker license creates generic exemption | **SUPERSEDED** | Narrow broker-party scenario only if separately validated |
| Clerk acceptance proves legal sufficiency or representation authority | **CONTRADICTED** | Acceptance is factual event only |
| On-platform attorney route/referral is permitted | **SUPERSEDED / PROHIBITED** | Independent outside attorney consultation only; no routing |
| Direct/autonomous e-filing is approved | **STILL OPEN / NOT AUTHORIZED** | Customer-controlled filing is current posture |
| MC-030 is permanently controlling | **NARROWED** | Provisional default; revalidate current authoritative form at implementation |
| Suspended/forfeited/dissolved/foreign-unqualified entity capacity rules are fully closed | **STILL OPEN** | Preserve as implementation-verification hold |

## 5. Required explicit supersession language

### Entity authority supersession

Any prior OwnerPilot specification, memorandum, implementation assumption, product copy, or workflow that treats entity ownership, organizational title, broker license, power of attorney, management agreement, or a generic `authorized_signer` designation as independently establishing authority to sign, commence, prosecute, appear, argue, or represent a corporation or LLC is superseded. Those functions remain distinct and may be enabled only by applicable validated controls.

### Service-authority supersession

Any prior operative assumption that ordinary compensated third-party-landlord UD-100 preparation may proceed under a generic no-UDA/LDA path is superseded as a launch premise. Paid Phase C remains disabled until the applicable registration/exemption, bonding, contract, disclosure, operating, and local-rule posture is complete and separately activated by the Founder.

### Attorney-routing supersession

Any prior OwnerPilot attorney-assignment, referral, matching, counsel-route, or on-platform attorney-review concept is superseded by the controlling Founder rule prohibiting on-platform attorney service and navigation. Independent outside-attorney consultation may be recommended without routing.

## 6. Implementation-verification holds

The following are not architecture-choice blockers but must be resolved at their stated gate:

| Item | Classification |
|---|---|
| UDA vs. LDA vs. dual-registration classification for paid Phase C | **Pre-paid-launch blocker** |
| Exact county-registration footprint | **Pre-paid-launch blocker** |
| Current statutory bond/disclosure details | **Pre-paid-launch blocker** |
| Current UD-100 verification architecture | **Pre-Preview blocker for packet-generation slice** |
| Current MC-030 or authoritative replacement | **Pre-Preview blocker for entity verification** |
| LA Superior Court local packet requirements | **Pre-beta blocker for LA eligibility** |
| Suspended/forfeited/dissolved/canceled/foreign-unqualified entity capacity controls | **Pre-Preview blocker for entity activation** |
| Electronic verification/signature mechanics | **Pre-Preview blocker for signature workflow** |
| Direct e-filing automation | **Future Founder-gated capability; not Phase C beta prerequisite** |
| LLC appellate-authority monitoring | **Future monitoring item** |
| CalDRE ID reconciliation (`B9445457` vs `01871659`) | **Pre-paid-launch/compliance blocker if relied upon** |

## 7. Current canonical-status boundary

PR #357 is now integrated into `main` as the governing legal/product-control baseline at `b1cb7772df78598b4d8826842815afbf96e347e1`, from exact reviewed head `5b98b7b9f471701284b80b9e41dc9ae92db73fd1`.

This reconciliation memorandum remains a Draft Architect artifact in PR #358 until separate Founder disposition. It does not acquire implementation or Production authority from PR #357's merge.