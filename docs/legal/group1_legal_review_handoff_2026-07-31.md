# OwnerPilot Group 1 Legal Review — Consolidated Handoff Package

**File:** `docs/legal/group1_legal_review_handoff_2026-07-31.md`
**Date:** 2026-07-31
**Prepared by:** Engineering (Claude/Cowork), at Founder direction
**Governing workstream:** Group 1 Legal Review — five items (UPL/LDA and role boundary; demand amount and excluded charges; service evidence and reporting; Los Angeles City nonpayment control package; payment-event treatment)
**Feeds:** Reconciliation against the California Nonpayment Product Control Specification, Revision 1. A noncanonical draft specification and a Revision 1 exist; neither is automatically canonical or implementation-authorizing merely because it has been drafted (Section XIII).

---

## I. Document control

**Status:** VERIFIED — NONCANONICAL REVIEWED HANDOFF. Architect verification of this handoff is complete. This document remains a **noncanonical** reviewed handoff: it is an input for reconciliation against the California Nonpayment Product Control Specification, Revision 1, and it creates no implementation authority, publication authority, legal-gate authority, jurisdiction activation, ECAP authority, or Production authority. See non-authority statement below.

**Date:** 2026-07-31

**Revision note.** This revision directly modifies the affected sections of this handoff in place, in response to the Architect's final disposition of **VERIFIED WITH TWO FINAL CORRECTIONS**, superseding the prior round of corrections made in response to the VERIFIED WITH CORRECTIONS disposition, which itself superseded an earlier round of corrections made in response to a prior disposition of RETURNED FOR TARGETED RECOVERY. No separate response section is appended; the two final corrections (attorney-input governance in Section IV-2, and entity signing/representation in Section IV-10) are folded directly into the affected sections below, all already-accepted corrections from prior rounds are preserved, and the internal consistency of the whole document has been re-checked against them. Architect verification is now complete; this handoff is not awaiting further Architect confirmation. Per Section XIV, this document may now serve as the verified, noncanonical Group 1 input for reconciliation against Product Control Specification Revision 1.

**Governing workstream:** Group 1 Legal Review, five items enumerated above, as directed by the Founder (Jack Taglyan, California Licensed Real Estate Broker, CalDRE 01871659) on 2026-07-31.

**Intended reviewers:**
- Architect (primary reviewer — verifies this handoff against the controlling record and returns one of the dispositions in Section XV)
- Independent attorney ("Janna") — for the specific targeted-validation items identified throughout this handoff (Sections VII, VIII, XII, XIII); this is not a standing on-platform or on-team review role and does not alter the no-on-platform-attorney posture in Section IV
- Founder / broker compliance authority (for any ruling on unresolved items surfaced in Sections V, IX, and XII)
- Downstream engineering (as the eventual consumer of the reconciled California Nonpayment Product Control Specification)

**Non-authority statement.** This document is a structured handoff and reconciliation record. It is **not** a legal opinion, **not** a final legal-control specification, **not** a constitutional amendment, **not** a production authorization, and **not** an implementation approval. It organizes and cross-references existing approved dispositions and Founder-stated positions; it does not itself create new legal authority, and it does not authorize any code change, deployment, or publication. This revision, specifically, creates none of the following: constitutional authority; canonical authority; implementation authority; publication authority; legal-gate authority; jurisdiction activation; ECAP authority; or Production authority. Where this document states a disposition, that disposition is only as authoritative as the source ruling or Founder instruction it cites — this document does not upgrade a conditional or informal position into a final one merely by restating it in a table. **Nothing in this document has been staged, committed, published, merged, implemented, or activated, and this revision does not authorize any of those actions.**

**Dependencies (source material reviewed in preparing this handoff):**
- `docs/compliance/broker_blanket_authorization_2026-06-15.md`
- `docs/compliance/persona_correction_ud_filing_pro_per_authority_2026-07-05.md`
- `docs/compliance/codebase_provenance_attorney_review_signoff_rename_2026-07-05.md`
- `docs/compliance/codebase_prose_correction_reviewing_attorney_of_record_2026-07-05.md`
- `docs/compliance/c5_safety_check_broker_determination_2026-06-15.md`
- `docs/compliance/c7a_filestate_broker_ruling_response_2026-06-18.md`
- `docs/compliance/resolve_and_document_layer_broker_ruling_2026-06-28.md`
- `docs/compliance/ruling5_resolve_document_removal_attestation_2026-07-22.md`
- `docs/compliance/service_method_capture_relocation_broker_determination_2026-06-12.md`
- `docs/compliance/ownerpilot_service_and_payment_redesign_attorney_ruling.md`
- `docs/compliance/lahd_city_matrix_phase1_finalization_broker_ruling_response_2026-06-19.md`
- `docs/compliance/g1_status_rollup_broker_countersign_and_ff4_produce_hook_authorization_2026-07-03.md` (FF-4 FMR gate ordering; unrelated "G1" = "Gate 1," not this Group 1 workstream — noted to avoid confusion)
- `docs/compliance/w2_notice_pathway_gate_attestation_2026-07-03.md`
- `docs/compliance/decision2_carve_out_from_phase2d_release_broker_ruling_2026-06-29.md`
- `docs/compliance/EFT_not_sole_attorney_ruling_2026-06-04.md`
- `docs/legal/consolidated_review_attorney_ruling_2026-06-05.md`
- `docs/legal/step4_helper_disposition_attorney_ruling_2026-06-05.md`
- `CLAUDE.md` (project instructions; current broker-only attribution rule and CalDRE 01871659 credential)
- The California Nonpayment Product Control Specification (base draft) and its Revision 1 — both exist as noncanonical drafts; this handoff must be reconciled against Revision 1 (Section XIII); neither is treated here as canonical or implementation-authorizing
- The most recent post-PR314 controlled Preview E2E characterization run referenced in Section VIII
- Founder's direct instructions given in the 2026-07-31 session, including the Architect's RETURNED FOR TARGETED RECOVERY disposition, VERIFIED WITH CORRECTIONS disposition, and final VERIFIED WITH TWO FINAL CORRECTIONS disposition (this round), and the corrections each required (cited throughout as "Founder direction, 2026-07-31" where no standalone prior ruling could be located)

**Supersession rule.** This document does not supersede any cited source ruling. Where this document's summary of a source ruling and the source ruling's own text appear to diverge, **the source ruling controls** until a new dated ruling or Founder instruction, naming this document, resolves the divergence. This document is superseded in whole or in part by: (a) the Architect verification disposition in Section XV, (b) any Founder ruling issued after 2026-07-31 that names this document, or (c) the California Nonpayment Product Control Specification once it is reconciled and adopted as canonical.

---

## II. Executive disposition

| Item | Subject | Status |
|---|---|---|
| 1 | UPL/LDA and role boundary | **Substantially resolved for specification drafting; unresolved LDA, broker-copy, entity-representation, and consequential drafting boundaries remain.** The LDA registration question is launch-critical and blocking for release activation of the California document-preparation beta pending targeted primary-source research and Janna validation. The entity signing/representation boundary is separately launch-critical for affected entity workflows pending targeted Janna validation. See Section IV. |
| 2 | Demand amount and excluded charges | **Substantially resolved under a conservative base-rent-only policy; source hierarchy and subsidy controls unresolved.** See Section V. |
| 3 | Service evidence, signatures, declarations, defects, photographs, storage, reporting | **Legal scope substantially resolved; functioning factual-capture lane verified; persistence, photographs, provenance, server-party control, and RiskPath implementation remain distinct.** See Section VI. |
| 4 | Los Angeles City nonpayment control package | **Approved for continued specification and source repair; not activated or cleared for Production.** See Section VII. |
| 5 | Payment-event treatment | **Core conservative workflow controls resolved; revival, restrictive instruments, broad waiver/cure conclusions, and broad agreement functions disabled.** See Section VIII. |

None of the five items is represented as unconditionally closed or as authorizing implementation. Item 1 retains an LDA/broker-copy/consequential-drafting boundary question. Item 2 retains an unresolved source-hierarchy and subsidy-control question. Item 3 retains distinct, unverified implementation questions (persistence, photographs, provenance, server-party control, RiskPath). Item 4 is not activated. Item 5 retains a disabled revival feature and disabled broad agreement functions. All are carried into Section IX and Section XII.

---

## III. Classification framework

Every disposition in this document is tagged with one or more of the following classifications. A disposition may carry more than one tag (e.g., a rule can be both a "conservative product policy" and "permitted with conditions").

| Tag | Meaning |
|---|---|
| **Legal requirement** | Directly compelled by a statute, regulation, or binding case law cited in the record. |
| **Conservative product policy** | A choice OwnerPilot has made that is more restrictive than what the law strictly requires, adopted for risk-management reasons. |
| **Business choice** | A product or scope decision with no independent legal compulsion in either direction. |
| **Unresolved legal risk** | A question with real legal consequence that has not been conclusively answered in the record. |
| **Implementation design** | An engineering/architecture decision that carries out an already-settled policy or requirement. |
| **Requires independent attorney consultation** | A determination that the record itself defers to outside counsel, or that this handoff defers for the same reason. |
| **Prohibited** | An action, representation, or piece of language that the record affirmatively bars. |
| **Permitted with conditions** | An action that is allowed only when stated conditions are satisfied; absent those conditions, the action is not authorized. |
| **Disabled pending verification** | A function that is not authorized for first release and requires focused verification before any authorization is considered. |

---

## IV. Item 1 — UPL/LDA and role boundary

**Governing posture (context for all twelve sub-decisions below).** OwnerPilot AI operates under the sole compliance authority of Jack Taglyan, California Licensed Real Estate Broker, CalDRE 01871659, acting under Cal. Bus. & Prof. Code § 10131(b) (`broker_blanket_authorization_2026-06-15.md`, hereafter **BBA**). No attorney is presently engaged to review, sign off on, or supervise OwnerPilot AI's product, workflow, or document outputs on a standing basis. The owner (or an authorized owner-side user) operates the workflow; OwnerPilot does not act as legal representative, advocate, or autonomous decision-maker on the owner's behalf. OwnerPilot may provide suggestions, recommendations, options, negotiation guidance, proposed terms, factual organization, warnings, and owner-directed drafting — the current, narrower first-release scope of permitted drafting is stated in Section VIII, which also states what remains disabled.

**Four-way operational distinction (per controlling constraint 4).** This handoff preserves, as a clean operating framework, four distinct tracks rather than treating them as one undifferentiated "review" concept: (1) **design-time attorney validation** — historically, certain foundational product determinations were developed with independent attorney input, as reflected in the `docs/legal/` record; that fact is preserved here as background only; (2) **runtime independent attorney consultation outside OwnerPilot** — available to any user via referral to their own counsel, never on-platform (Section IV-3); (3) **runtime non-attorney factual review** — broker or system checks of factual criteria (Section IV-4); and (4) **owner confirmation** — the owner's own affirmative decision, at the specific stage identified in the framework immediately below. These four tracks are independent of one another; a determination under one track does not substitute for another.

**Mandatory every-notice beta review (controlling invariant).** Separately from, and in addition to, the risk-triggered review posture in sub-decision 2 below: **every beta notice matter requires trained non-attorney factual and package review before it becomes eligible for release.** This requirement is **fail-closed, mandatory, not optional, and not independently disableable by the user.** Risk-trigger review (sub-decision 2) may add further controls, pauses, or route-outs on top of this floor; it may not substitute for or replace the mandatory every-notice review. A notice matter that has not completed this review is not release-eligible, regardless of whether any risk trigger fired.

**Draft-generation / release-eligibility / operative-action stages (controlling invariant).** This handoff distinguishes three separate stages rather than one undifferentiated "confirmation" concept:

- **Stage A — Internal draft generation.** OwnerPilot may generate an internal draft (of a notice or other document) before any owner release confirmation, where permitted by the Product Control Specification. Internal draft generation is not itself a release, a filing, a service, or any other operative act.
- **Stage B — Release eligibility.** A draft becomes eligible for release to the owner only after it has completed the mandatory every-notice factual and package review above. Owner confirmation of release is required before a document is released to the owner.
- **Stage C — Operative owner action.** Separate, specific owner confirmation or owner action is required before or in connection with any operative decision — including use, signing, sending, service, filing, acceptance, rejection, withdrawal, settlement, or other operative step. Stage C confirmations are checkpoint-specific and are not satisfied by the Stage B release confirmation alone.

This handoff does not state that one universal confirmation occurs before every internal draft is generated, and does not conflate internal draft creation (Stage A) with release (Stage B) or with operative use (Stage C).

**Route-out cannot be cleared by reported outside advice (controlling rule).** A route-out requiring outside legal judgment cannot be cleared inside OwnerPilot merely because the owner later reports receiving outside advice. The current workflow remains paused or routed out. A later supported workflow may begin only from updated owner-supplied facts, evidence, and a new eligibility assessment. Consistent with this rule, OwnerPilot must **not**: verify outside legal advice; certify an attorney's conclusion; store privileged communications without a separately approved feature; or convert outside consultation into an automatic gate-clearing event.

### 1. Owner-user model

| Field | Value |
|---|---|
| Disposition | The owner (or an authorized owner-side user) operates every step of the workflow; OwnerPilot prepares documents and organizes facts, it does not act on the owner's behalf as a representative or agent. |
| Classification | Legal requirement (no non-attorney may hold itself out as representing a party) + conservative product policy (reinforced beyond the statutory floor). |
| Product consequence | OwnerPilot generates, drafts, and organizes at the owner's direction, across the three stages defined above (Stage A draft generation; Stage B release; Stage C operative action). The owner directs and controls the workflow. No silent/automatic filing, no autonomous negotiation. |
| Prohibited language | "OwnerPilot will handle this for you," "OwnerPilot is negotiating on your behalf," "let us represent you." |
| Required warning/confirmation | Stage B release confirmation before any document reaches the owner; separate Stage C confirmation before any operative action (signing, sending, service, filing, acceptance, rejection, withdrawal, settlement). No single universal confirmation is asserted to occur before every internal draft (Stage A). |
| Authority/source | BBA §1 (sole compliance authority; no attorney engagement); `resolve_and_document_layer_broker_ruling_2026-06-28.md` (owner-only vs. tenant-signed document matrix, §5); Founder direction, 2026-07-31 (three-stage framework). |
| Unresolved dependency | None identified. |

### 2. Risk-triggered review posture

| Field | Value |
|---|---|
| Disposition | A defined set of screening questions and free-text watchers trigger a pause-and-recommend (or hard-stop, for the bankruptcy case) posture rather than silent pass-through. This is **additional to**, and does not replace, the mandatory every-notice review invariant stated above. |
| Classification | Conservative product policy, with one legal-requirement component (bankruptcy automatic stay, 11 U.S.C. § 362). |
| Product consequence | Soft-recommend routing screen + override modal for two of three screening questions; enhanced modal citing 11 U.S.C. § 362 for the bankruptcy question; both routes are logged. Ten "route to independent counsel" triggers exist in the Resolve & Document layer (Section X). None of this substitutes for the mandatory every-notice factual and package review, which applies regardless of whether any risk trigger fires. |
| Prohibited language | Any wording that concludes the user's situation ("this is past where a broker-prepared notice is the right move") rather than recommending a pause. |
| Required warning/confirmation | Override modal, logged with `modalCopyVersion` and (bankruptcy case) `enhancedModalShown`. |
| Authority/source | `c5_safety_check_broker_determination_2026-06-15.md` (hereafter **C5**) §§2–4; `resolve_and_document_layer_broker_ruling_2026-06-28.md` (hereafter **RESDOC**) §4. |
| Unresolved dependency | C5 establishes the current approved product floor. Any later independent-attorney validation must be reconciled through the approved Track B process and incorporated only after the required Architect reconciliation and Founder disposition. Attorney input does not automatically amend, supersede, or activate a product control. That outside pass has not occurred as of this handoff. Independent attorneys retain their own professional-review authority within their legal scope of practice; this rule governs only whether and how their input changes an OwnerPilot product control, not their capacity to advise a client. |

### 3. No on-platform attorney service

| Field | Value |
|---|---|
| Disposition | OwnerPilot does not provide, host, connect, assign, or offer attorneys on the platform. **OwnerPilot may provide neutral public resources in an approved route-out context. It does not select, recommend, match, connect, assign, or transmit a matter to an attorney.** |
| Classification | Legal requirement (UPL avoidance) + business choice (no attorney-marketplace feature). |
| Product consequence | `/route-to-counsel` and the resources page link out to neutral, publicly available resources (State Bar of California Find-a-Lawyer referral service; California Courts Self-Help) only — OwnerPilot surfaces these as public information, it does not itself select, recommend, match, connect, assign, or transmit a matter to any attorney. Two tenant-advocacy resources (Tenants Together, Stay Housed LA) were explicitly rejected for the landlord-facing MVP as posture-inappropriate, not because they are attorneys. Optional independent-attorney wording may appear only in these defined route-out contexts (Section XI) — it must not appear as routine defensive copy elsewhere. |
| Prohibited language | "Request attorney review," "connect with an attorney through OwnerPilot," "our attorneys," any phrase implying attorney availability, review, approval, or supervision through the platform. |
| Required warning/confirmation | Standing posture footer: "OwnerPilot AI is not a law firm and does not provide legal advice… For legal matters specific to your situation, consult a California licensed attorney of your choosing." |
| Authority/source | BBA §4.2; C5 §5. |
| Unresolved dependency | None identified for the "no on-platform attorney" rule itself. |

### 4. Non-attorney factual review

| Field | Value |
|---|---|
| Disposition | Where a human review step exists at runtime (e.g., a flagged answer, a jurisdiction determination, an FMR-threshold block, the mandatory every-notice review, server-party status reconciliation), that review is a non-attorney factual/compliance check, not a legal opinion on the user's situation. |
| Classification | Conservative product policy; implementation design. |
| Product consequence | Review steps produce factual outcomes ("does this amount exceed the Fair Market Rent for this bedroom count," "is this address inside the verified City-of-LA boundary," "is the server-party status resolved") rather than legal conclusions ("your eviction is valid," "this service was legally effective"). Non-attorney review may reconcile factual discrepancies; it may not decide an unresolved legal category (Section VI). |
| Prohibited language | Any output framed as a legal sufficiency determination; "Factual review completed" used as a standalone, unqualified phrase (Section XI). |
| Required warning/confirmation | None beyond the standing posture footer, unless the specific factual review also triggers a counsel-route (Section IV-2, IV-3). |
| Authority/source | `ff4_fmr_gate_quantity_reconciliation_broker_ruling_2026-07-03.md` (referenced in `g1_status_rollup_broker_countersign_and_ff4_produce_hook_authorization_2026-07-03.md` §2); `lahd_city_matrix_phase1_finalization_broker_ruling_response_2026-06-19.md` (hereafter **LAHD-FIN**). |
| Unresolved dependency | None identified. |

### 5. Broker-supervised factual review only if wording avoids legal validation

| Field | Value |
|---|---|
| Disposition | Where the broker (or broker-authorized process) reviews product output, that review must be worded to avoid implying legal validation, legal sufficiency, or attorney-equivalent review. |
| Classification | Conservative product policy; permitted with conditions. |
| Product consequence | Gate-state labels and provenance comments renamed from "attorney review"/"attorney sign-off" to "broker review"/"broker sign-off" (see sub-decision 12); RESDOC §0 item 6 explicitly reserves broker-review-before-generation for jurisdiction determinations only, not general document generation. The specific permitted and prohibited public-copy phrases are controlled in Section XI. |
| Prohibited language | "Broker-certified," "broker-approved as legally valid," "Broker-reviewed" or "Broker-supervised workflow" used as standalone approval language, "Prepared through an attorney-approved workflow," "Factual review completed — broker supervised" (Section XI). |
| Required warning/confirmation | None beyond standing posture footer. |
| Authority/source | `codebase_provenance_attorney_review_signoff_rename_2026-07-05.md` (hereafter **CODEPROV**); RESDOC §0 item 6. |
| Unresolved dependency | No single unified standard document consolidates a bright-line test for "wording that avoids legal validation" across all product surfaces; the rule currently exists as a pattern applied case-by-case. Flagged in Section XII. |

### 6. California court official form clarification

| Field | Value |
|---|---|
| Disposition | A distinction is drawn between (a) OwnerPilot's own notice templates, which are original OwnerPilot IP and never CAR (California Association of Realtors) forms (per `CLAUDE.md` legal rules), and (b) official Judicial Council and local court forms (UD-100, SUM-130, CM-010, and LA-specific LACIV-109 / LASC CIV 312), which are public forms. Official Judicial Council and local forms **may be included in a future validated self-filing preparation workflow.** This section does **not** categorically state that such forms may be prepared under broker scope without attorney gate-keeping — the exact preparation, selection, completion, and review boundaries remain subject to: free-beta LDA applicability; entity-versus-individual LDA registration; user-directed versus product-selected form behavior; and targeted Janna validation. **The existence of an official, public form does not itself resolve OwnerPilot's role boundary in preparing, selecting, or completing it.** |
| Classification | Unresolved legal risk (form preparation/selection role boundary, pending LDA and Janna validation) + business choice (original-IP-only rule for OwnerPilot's own notice templates, which is settled). |
| Product consequence | OwnerPilot's own notice templates remain original-drafted, never sourced from CAR — that much is settled. Whether and how official Judicial Council/local forms are selected, completed, and reviewed within a validated self-filing workflow is not yet resolved and is not authorized for first release pending the validations above. |
| Prohibited language | Implying that OwnerPilot's own templates are, or are equivalent to, official CAR or court forms; implying that inclusion of an official form in the product resolves any LDA or role-boundary question. |
| Required warning/confirmation | None specific beyond standing posture footer. |
| Authority/source | `persona_correction_ud_filing_pro_per_authority_2026-07-05.md` (hereafter **PERSONA-PROPER**); `CLAUDE.md` §Legal. |
| Unresolved dependency | Free-beta LDA applicability; entity-versus-individual LDA registration; user-directed versus product-selected form behavior; targeted Janna validation. See the LDA registration question at the close of this section, Section IX, Section XII. |

### 7. Early human review default with later opt-out concept

| Field | Value |
|---|---|
| Disposition | The current default posture is a mandatory soft-recommend touchpoint (pause-and-review screen or modal) at defined risk triggers, with a logged override ("Proceed anyway") available to the user rather than a hard block. This sits on top of, and does not substitute for, the mandatory every-notice review invariant above. |
| Classification | Conservative product policy; permitted with conditions. |
| Product consequence | Every flagged-answer path presents the recommend-not-conclude screen first; the user may opt out of *that specific pause* by proceeding, and that choice is durably logged. The user cannot opt out of the mandatory every-notice factual and package review itself. |
| Prohibited language | Presenting the override as a "waiver" or implying the user has released OwnerPilot or the broker from anything by proceeding. |
| Required warning/confirmation | Override modal per sub-decision 2, with `modalCopyVersion` logged. |
| Authority/source | C5 §§3.2–3.3; Founder direction, 2026-07-31 (mandatory-review invariant). |
| Unresolved dependency | None identified for the mechanism itself. |

### 8. Address verification warning plus owner confirmation

| Field | Value |
|---|---|
| Disposition | Where an address (payee address, property jurisdiction address) is used to gate a legal or compliance consequence, the product carries a warning against relying on an unverified address plus a required owner confirmation before that address is used to drive a downstream determination. |
| Classification | Conservative product policy; permitted with conditions. |
| Product consequence | General principle applies wherever address data feeds a compliance gate. The Los Angeles City-specific application of this principle — owner confirmation resolving an unverifiable LA City address classification — is **proposed, not Production-active** (Section VII). |
| Prohibited language | Presenting an unverified or owner-asserted address as system-verified. |
| Required warning/confirmation | Owner confirmation of the address before it is used to complete a jurisdiction or payee determination. |
| Authority/source | Founder direction, 2026-07-31, applied to the existing `resolveLaAddress.ts` / `cityOfLaZipsAuthoritative.snapshot.json` infrastructure for the LA-specific application (Section VII). |
| Unresolved dependency | The LA-specific application is not yet activated (Section VII). |

### 9. Self-filing path

| Field | Value |
|---|---|
| Disposition | California landlords (natural persons) may file unlawful detainer complaints and supporting packet forms in Superior Court in pro per, without an attorney; no statute conditions UD filing on attorney involvement, and the court clerk does not verify attorney status at the filing counter. |
| Classification | Legal requirement (Cal. Code Civ. Proc. § 1161 et seq.; foundational pro per right; *Merco Constr. Engineers, Inc. v. Municipal Court* (1978) 21 Cal.3d 724 governs the entity-representation exception, addressed separately in sub-decision 10). |
| Product consequence | The persona must never tell a landlord an attorney is required to file. **OwnerPilot may prepare a self-filing document-preparation packet for owner review within an activated and validated workflow. This does not establish legal sufficiency, filing eligibility, or court acceptance.** This is subject to the Legal Document Assistant registration question noted at the close of this section (Section IX, Section XII). |
| Prohibited language | "Must be reviewed by an attorney," "must be filed by an attorney," "must have an attorney," "requires an attorney," "you need an attorney to file," "you need a lawyer to file," "only an attorney can file," "only a lawyer can file" — all runtime-BLOCKED phrases. Also do not use: "filing-ready" (packet/document); "broker-supervised packet"; "broker-approved packet"; or any language implying broker validation of legality. |
| Required warning/confirmation | None beyond standing posture footer; permitted phrases ("may be advisable," "consider consulting," "an attorney can help with," "may be worth consulting") remain allowed. |
| Authority/source | PERSONA-PROPER (full ruling). |
| Unresolved dependency | See the Legal Document Assistant (LDA) registration question noted at the close of this section. |

### 10. Entity-representation limitations

| Field | Value |
|---|---|
| Disposition | Entity landlords may receive factual organization and document-preparation assistance within a separately validated workflow. An authorized member, officer, employee, trustee, or agent may be able to supply facts or physically submit documents, depending on the applicable rule. Whether a non-attorney may sign a pleading, commence or prosecute the action, appear, argue, or otherwise represent the entity must remain separately controlled and may require counsel. OwnerPilot must not infer authority to sign or represent the entity merely from the person's organizational role. |
| Classification | Unresolved legal risk (entity signing and representation authority) + legal requirement component (*Merco Constr. Engineers, Inc. v. Municipal Court* (1978) 21 Cal.3d 724, entities generally must appear through counsel at contested hearings) + conservative product policy (no inference of signing/representation authority from organizational role alone). **Launch-critical for affected entity workflows** and **requires targeted Janna validation.** |
| Product consequence | The entity-legal-name helper on the notice-preparation flow requires the entity's full registered legal name (not a shorthand/DBA), scoped to `landlord_type === "entity"`. Document preparation proceeds for entity landlords for the purpose of factual organization and document preparation only. OwnerPilot separately distinguishes, and must not collapse into one another: (a) supplying facts; (b) receiving document-preparation assistance; (c) physically submitting documents; (d) signing pleadings; (e) commencing or prosecuting the action; (f) appearing at hearings; (g) arguing; and (h) otherwise representing the entity. Permitted product assistance for entity landlords is limited to (a) and (b), and to (c) only where the applicable rule allows a non-attorney to physically submit documents; (d) through (h) remain separately controlled and are not resolved by this handoff. Owner confirmation cannot resolve the underlying legal-representation question — it is not a substitute for the required validation. |
| Prohibited language | "Corporate-landlord support is coming soon" (stale, superseded); "consult counsel for the three-day notice" as applied to a supported entity flow; any language stating or implying that an authorized member, officer, employee, trustee, or agent may sign a pleading, commence or prosecute the action, appear, argue, or otherwise represent the entity merely because of their organizational role. |
| Required warning/confirmation | Entity-legal-name helper: "Using a shorthand or DBA on a three-day notice can be challenged in an unlawful-detainer action." Additional warning required, pending Janna validation, wherever an entity workflow approaches signing, commencing/prosecuting, appearing, arguing, or otherwise representing the entity. |
| Authority/source | `step4_helper_disposition_attorney_ruling_2026-06-05.md`; PERSONA-PROPER; *Merco Constr. Engineers, Inc. v. Municipal Court* (1978) 21 Cal.3d 724; Founder direction, 2026-07-31 (entity signing/representation correction). |
| Unresolved dependency | **Unresolved legal boundary; launch-critical for affected entity workflows; requires targeted Janna validation.** Whether, and under what conditions, a non-attorney member, officer, employee, trustee, or agent may sign a pleading, commence or prosecute an action, appear, argue, or otherwise represent the entity is not resolved by this handoff. Carried into Section IX and Section XII. |

### 11. Public-claims restrictions

| Field | Value |
|---|---|
| Disposition | Public and marketing surfaces may not claim, imply, or market capabilities the product has not shipped, and may not carry attorney credentials or SBN references anywhere on a public or marketing surface — broker-only attribution. |
| Classification | Legal requirement (false-advertising/consumer-protection exposure for unshipped-capability claims) + conservative product policy (broker-only attribution beyond what any statute independently compels). |
| Product consequence | Homepage/landing marketing for unshipped Resolve & Document / Move-Out Agreement interactive surfaces was removed (disposition (c), "pending product ship"). Serve & Track's verified capabilities (Section VI) may be described; its unverified capabilities (photographs, durable storage, provenance, persistence, RiskPath linkage, notes, cross-device recovery, end-to-end preservation) must not be described as shipped. |
| Prohibited language | "Verified" badge (banned); "court-ready"; "legally sufficient"; "guaranteed compliance"; "Prepared through an attorney-approved workflow"; "Factual review completed — broker supervised"; "Broker-reviewed" or "Broker-supervised workflow" as standalone approval language; "Factual review completed" as a standalone, unqualified phrase; any attorney credential or SBN reference on a public/marketing surface. See Section XI for the complete list and the one narrowly-permitted provisional phrase. |
| Required warning/confirmation | None beyond standing posture footer and the marketing-copy term-substitution table (`marketing_copy_compliance_polish_broker_ruling_2026-06-28.md`, referenced in RESDOC §10). |
| Authority/source | `ruling5_resolve_document_removal_attestation_2026-07-22.md`; `CLAUDE.md` §Legal (broker-only attribution; `marketing_tranche1_broker_ruling_2026-07-14a_addendum.md` §4A and §0 governance, cited but not independently re-read in this handoff). |
| Unresolved dependency | None identified. |

### 12. Removed messaging line

| Field | Value |
|---|---|
| Disposition | The production hard-block screen's eyebrow ("TALK TO AN ATTORNEY FIRST") and headline ("This is past where a broker-prepared notice is the right move") were removed from the routine flagged-answer path as an affirmative legal conclusion the platform should not draw about a user's situation. |
| Classification | Prohibited (as previously worded); conservative product policy (as replaced). |
| Product consequence | Replaced with recommend-not-conclude routing copy: "Pause here. This situation may include facts that change how a 3-day notice should be handled, or whether one should be used at all… We recommend talking to a California licensed attorney before producing this notice." |
| Prohibited language | The removed eyebrow and headline themselves, and any equivalent language that draws a conclusion about whether a notice is "the right move" for the user's specific situation. |
| Required warning/confirmation | Soft-recommend routing screen + override modal (sub-decisions 2, 7). |
| Authority/source | C5 §2. |
| Unresolved dependency | None identified for the removal itself. |

**Still-unresolved consolidated Item 1 questions (not silently closed):**

1. **Bright-line test for "broker-supervised factual review only if wording avoids legal validation" / broker-copy boundary.** As noted under sub-decision 5, the rule exists as an applied pattern across several rulings rather than as one general standard a future reviewer could check new copy against. Carried into Section XII.
2. **Legal Document Assistant (LDA) registration question — launch-critical and blocking.** Whether OwnerPilot's or the broker's preparation of UD packets and related documents for compensation implicates registration requirements under Cal. Bus. & Prof. Code § 6400 et seq. (Legal Document Assistants), separately from and in addition to the broker exemption analysis under § 10131(b), was not located as resolved in the reviewed record. **This question is launch-critical and blocking for release activation of the California document-preparation beta, unless targeted primary-source research and Janna validation determine that the proposed free-beta operating model may proceed without registration or under a defined exemption.** The absence of user fees in the current free-beta model may be relevant to that determination but is **not dispositive without verification** — it does not by itself resolve the registration question. This is flagged rather than assumed resolved in either direction. Carried into Section IX, Section XII, Section XIII, and the formal disposition in Section XIV.
3. **Consequential drafting boundary.** The boundary between the narrower, currently-cleared owner-directed drafting (Section VIII) and the broader settlement/agreement-generation functions that remain disabled pending verification (Section VIII) is fundamentally a role-boundary question. It is tracked jointly here and in Section VIII/Section IX, and is not resolved by this handoff.

---

## V. Item 2 — Demand amount and excluded charges

**Controlling conservative automated policy (Founder direction, 2026-07-31).** The automated demand path may include only unpaid base rent that is:

- already due;
- tied to identified rental periods;
- supported by the lease or validated rent-change documentation;
- consistent with ledger and payment history;
- undisputed;
- adjusted for payments, credits, concessions, subsidies, and agreed changes.

**The automated path excludes:**

- late fees;
- utilities;
- repairs;
- returned-payment fees;
- parking;
- penalties;
- legal fees;
- administrative fees;
- every other non-base-rent amount.

**Classification: Substantially resolved for specification drafting under a conservative base-rent-only policy; unresolved source-hierarchy and subsidized-housing controls remain disabled.**

This policy is stated here as Founder direction for this handoff and must be reconciled against Product Control Specification Revision 1 (Section XIII) and against any historical excluded-charges rulings not independently located during this handoff's preparation (e.g., `v4_payment_fields_attorney_ruling.md`, referenced repeatedly in the reviewed record but not itself located and independently re-read here).

**Preserved unresolved matters (not resolved by the base-rent-only policy above):**

- source hierarchy (which document or ledger source controls when the lease, a rent-change notice, and the ledger conflict);
- subsidized-rent treatment;
- tenant share;
- agency share;
- allocation uncertainty;
- defined edge cases not yet enumerated.

**Related, adjacent gates (do not substitute for the above).** The amount-reconciliation gate (FF-3: compares `amount_of_rent_owed` against `SUM(rent_periods.balance)`, three outcomes — match / no ledger baseline / mismatch) and the Fair Market Rent threshold gate (FF-4: hard-blocks LA City nonpayment notices where the demanded amount does not exceed FMR for the unit's bedroom count) are payment-method and ledger-consistency/FMR-floor controls, respectively (both referenced in `g1_status_rollup_broker_countersign_and_ff4_produce_hook_authorization_2026-07-03.md` §§2.1–2.2). Neither gate is an implementation of, or a substitute for, the base-rent-only exclusion policy above; no engineer, reviewer, or downstream document may treat either gate as an implicit statement of which charges are excludable.

---

## VI. Item 3 — Service evidence, signatures, declarations, defects, photographs, storage, and reporting

**Status: Legal scope substantially resolved; functioning factual-capture lane verified; persistence, photographs, provenance, server-party control, and RiskPath implementation remain distinct.**

**Design-time legal permission is distinct from implementation evidence.** Design-time legal permission for a factual documentation feature does not establish that the feature is implemented, operationally tested, activated, or approved for public claims. This distinction applies consistently throughout this section — and, where relevant, to Section VIII — to: declarations; photographs; metadata; timestamps; reports; storage; RiskPath linkage; and consequential agreements. A feature being legally permissible to build is not evidence that it has been built, tested, or verified; the implementation-evidence classification below is the controlling evidentiary record, not the legal-permission analysis above it.

**Permitted (approved/resolved, legal scope):**

- Factual service-activity recording and organization (attempt date, method, server identity, suitable-age/not-a-party attestations, outcome).
- Service Activity Reports assembled from the attempt record.
- Risk-triggered server declarations, consistent with Section IV-2, and subject to the mandatory every-notice review invariant (Section IV).
- Service photographs, subject to the implementation-evidence classification below.
- Non-attorney factual review of service-evidence completeness — may reconcile factual discrepancies, may not decide an unresolved legal category (server-party status subsection, below).

**Prohibited:**

- OwnerPilot selecting the service method for the user.
- OwnerPilot directing the sequence in which service methods are attempted, beyond presenting the statutorily-ordered hierarchy as informational content (personal → substituted → posting-and-mailing, per `ownerpilot_service_and_payment_redesign_attorney_ruling.md` §A1).
- OwnerPilot determining statutory compliance of a completed service.
- OwnerPilot representing legal sufficiency of a proof of service.

**Serve & Track — what it is.** Serve & Track is a **functioning, live factual-capture and reporting capability.** It is not wholly incomplete, and it must not be described as shipping functions that are not yet verified. The following have been **verified in code and characterized successfully in controlled Preview E2E testing** (this workstream's `beta-pathway-characterization.spec.ts` and related Preview E2E runs): service dates; service attempts; mailing; server identity; server attestations; printable service logs and reports.

**Implementation-evidence classification.** Every capability associated with Serve & Track is classified into exactly one of the following tiers, and only the first two tiers may be described as shipped without qualification:

| Tier | Meaning |
|---|---|
| Verified in code | Confirmed present and correct by direct code inspection. |
| Operationally tested | Confirmed by a controlled Preview E2E run exercising the actual behavior. |
| Scaffolding only | Data model, field, or enum exists, but the end-to-end behavior it implies has not been confirmed. |
| Inferred | Believed likely to exist or work based on adjacent evidence, without direct verification. |
| Runtime verification required | Not confirmed by any of the above; must be verified in a running environment before it may be described as shipped. |

| Capability | Tier | Basis |
|---|---|---|
| Service dates | Verified in code; operationally tested | SVCMETHOD (full ruling) + Preview E2E characterization |
| Service attempts | Verified in code; operationally tested | Same |
| Mailing | Verified in code; operationally tested | Same |
| Server identity | Verified in code; operationally tested | Same |
| Server attestations | Verified in code; operationally tested | Same |
| Printable service logs and reports | Verified in code; operationally tested | Same |
| Photograph upload | Scaffolding only | A field/path exists in seed and test fixtures; the complete, tested upload path was not independently confirmed in this handoff's preparation |
| Durable photograph storage | Runtime verification required | Not confirmed; previously flagged as an open marketing/implementation question (RULING5) |
| Authoritative timestamp and provenance preservation | Runtime verification required | Not confirmed |
| Durable server-side service-record persistence | Runtime verification required | Not confirmed beyond ordinary transactional row persistence already implied by existing seed/test infrastructure |
| RiskPath linkage | Scaffolding only | The RiskPath status enum exists (RESDOC §12); Serve & Track's wiring into it is not confirmed complete — and is confirmed **absent** as of the post-PR314 Preview E2E run (Section VIII) |
| Rendered notes input | Inferred; runtime verification required | Not independently confirmed |
| Durable cross-device service-record recovery | Runtime verification required | Not confirmed |
| End-to-end evidence preservation | Runtime verification required | Not confirmed as a complete chain |

**Do not characterize Serve & Track as wholly incomplete.** It is a functioning capability for the verified items above. **Do not state that the "runtime verification required" or "scaffolding only" items are shipped.** Both statements are corrections to prior drafts of this handoff, which overstated durable evidence preservation as either fully open or fully resolved at different points; this table is the controlling, reconciled statement.

**Server-party status (controlling control — applies to Item 3 and all relevant matrices).** Actual server identity is required for any served notice, and the server-party relationship (e.g., owner, owner's agent, registered process server, other) must be captured as part of the service record. Where server-party status is **unknown, disputed, conflicting, unsupported, or falls into a disallowed category**, that status creates a **hard stop** for **declaration progression, service-report finalization, clock-dependent progression, or other service-dependent workflow advancement**. Non-attorney factual review may reconcile factual discrepancies (e.g., a name typo, a mismatched date); it **may not determine an unresolved legal category** (e.g., whether a given relationship qualifies a person to serve under Cal. Code Civ. Proc. § 1162), and **legal sufficiency is not determined** by that review. **No declaration or other service-dependent workflow advancement occurs until server-party status is resolved under an approved control.**

**Required product wording/controls:**

- Serve & Track copy may describe, without qualification, the capabilities verified in code and operationally tested: service dates, service attempts, mailing, server identity, server attestations, and printable service logs/reports.
- Serve & Track copy must **not** claim, imply, or market photograph upload, durable photograph storage, authoritative timestamp/provenance preservation, durable server-side persistence, RiskPath linkage, rendered notes input, durable cross-device recovery, or end-to-end evidence preservation as shipped or verified, until each is independently reclassified per the table above.
- The server-party hard-stop control must be implemented before any service-dependent advancement copy or feature ships without qualification.

---

## VII. Item 4 — Los Angeles City nonpayment control package

**Status: Approved for continued specification and source repair; not activated or cleared for Production.**

Los Angeles City is the **proposed** first locally-activated rule pack. It is **inactive**. Activation requires all three of: (a) **current-source repair** — the jurisdiction matrix, FMR gate, and related source modules as they exist today require repair work before they can be relied upon; (b) **targeted independent-attorney (Janna) validation** on the specific unresolved controls listed below; and (c) **Founder activation**, to be issued as its own dated ruling. None of the three has occurred as of this handoff.

**Design basis for continued specification work (not asserted as Production-ready):**

- The jurisdiction-matrix architecture, fail-closed "CONFIRM" behavior for ambiguous rows, and the "both gates required" fail-closed dual-flag pattern (`isLaProductionUnblocked() && LAHD_FILING_PROMPT_ENABLED`) described in `lahd_city_matrix_phase1_finalization_broker_ruling_response_2026-06-19.md` (hereafter **LAHD-FIN**) remain the design basis for this rule pack, but are stated here as design basis only, not as an activation record.
- The FF-4 Fair Market Rent gate's four-option remediation pattern on block (correct amount, change just-cause, wait for accrual, contact LAHD directly) and the no-silent-override rule (`g1_status_rollup_broker_countersign_and_ff4_produce_hook_authorization_2026-07-03.md` §2.2) are likewise design basis only.

**Preserved unresolved controls (must be resolved before activation):**

- FMR thresholds;
- bedroom-count treatment;
- RSO/JCO applicability and exemptions;
- RTCP or successor attachments;
- language and translation versions;
- LAHD filing mechanics;
- three-business-day timing;
- business-day definition;
- subsidized tenant share;
- agency share;
- form versions;
- amendment and defect treatment.

**Owner-confirmed jurisdiction fallback.** The concept of owner confirmation resolving an unverifiable LA City address classification is **proposed, not Production-active.** It has not been separately verified, ratified, or activated as a standalone control, notwithstanding the existing `resolveLaAddress.ts` / `cityOfLaZipsAuthoritative.snapshot.json` infrastructure in the codebase, which is design basis only at this stage.

**Do not describe LA City as resolved for activation.** This section states a continued-specification-and-repair posture only.

---

## VIII. Item 5 — Payment-event treatment

**Status: Core conservative workflow controls resolved; revival, restrictive instruments, broad waiver/cure conclusions, and broad agreement functions disabled.**

**Governing source:** This section states the controlling approved payment-event decisions, per Founder direction (2026-07-31), read together with `resolve_and_document_layer_broker_ruling_2026-06-28.md` (RESDOC) for the surrounding document-generation framework. The first-release-authorized scope of drafting is whatever is specifically authorized by the Product Control Specification Revision 1 (Section XIII); this section does not itself expand that scope.

**Controlling payment-event decisions:**

| Event state | Factual record / product state | Owner confirmation | Attorney review | Notice-path status |
|---|---|---|---|---|
| **Accepted full payment** | Payment Received & Notice Closure Record; product state `current_notice_workflow_closed`. | Required for the Stage C operative acceptance action (Section IV). | Not required. | Closes OwnerPilot's current nonpayment notice workflow (`current_notice_workflow_closed`). |
| **Accepted partial payment** | Recorded, with a clear warning that acceptance closes OwnerPilot's current nonpayment notice workflow under the conservative beta policy; product state `current_notice_workflow_closed`. | Required for the Stage C operative acceptance action, and separately before any continuation into a next workflow. | Not automatically required. | Closes OwnerPilot's current nonpayment notice workflow (`current_notice_workflow_closed`) under the conservative beta policy. |
| **Rejected partial payment** | May be recorded as its own factual outcome. | Required for the Stage C operative rejection action. | Not required. OwnerPilot does not decide whether the rejection was lawful or legally effective. | May leave the current notice path open; rejection does not, by itself, produce `current_notice_workflow_closed`. |
| **Third-party payment** (tendered by someone other than the named tenant) | Payer identity alone does **not** automatically require attorney review; third-party status is a **payment attribute**, not the controlling event consequence. Acceptance status and amount (not payer identity) determine the conservative workflow consequence — the applicable rule is whichever of the corresponding accepted-full or accepted-partial rule matches the amount and acceptance status. A full third-party tender does **not** close the OwnerPilot workflow merely because it was tendered: the owner must separately report and confirm acceptance before `current_notice_workflow_closed` may be recorded. | Same as the corresponding accepted-full/accepted-partial rule, once the owner reports and confirms acceptance. | Not required solely because of payer identity; OwnerPilot draws no independent legal conclusion based on who tendered payment. | Same as the corresponding rule, once acceptance is owner-confirmed; unresolved allocation, disputed payer authority, subsidy involvement, restrictive endorsements, conditional terms, or disputed payment effect cause a pause or route-out rather than automatic closure. |
| **Returned/refunded post-expiration payment revival** | May be recorded as a factual event. | Not applicable — the revival feature itself is disabled. | Not applicable. | **Disabled.** Resumption of a prior notice path after a returned/refunded post-expiration payment remains **disabled pending primary-source verification.** No tentative, partial, or conditional implementation is authorized. |

**Payment events remain analytically distinct.** A payment's lifecycle is tracked through distinct events — offered; received; accepted; rejected; deposited; allocated; reversed; dishonored — and these are not collapsed into one another. Acceptance status and amount, not any single event in isolation (and not payer identity), determine the conservative workflow consequence in the table above. Third-party identity does not override the unresolved allocation controls in Section V (source hierarchy, subsidized-rent treatment, tenant share, agency share, allocation uncertainty). Unclear allocation, disputed payer authority, subsidy involvement, restrictive endorsements, conditional terms, or disputed payment effect each independently cause a pause or route-out rather than an automatic `current_notice_workflow_closed` determination.

**Explicit instruction honored — `current_notice_workflow_closed` is a factual product state only.** This state does **not** independently establish: cure; waiver; notice invalidity; satisfaction; preservation of rights; loss of rights; enforceability; or legal sufficiency. Any such legal conclusion, where relevant to a specific matter, is for the owner and, where appropriate, independent counsel to reach outside the product — OwnerPilot does not reach it.

**Broad settlement and agreement functions — disabled pending focused verification.** A prior draft of this handoff described an expanded owner-directed drafting scope covering releases, waiver language, possession/surrender agreements, confidentiality provisions, attorney-fee provisions, stipulated judgments, and court-filed settlements. That expanded scope traced to the maximum scope independent counsel ("Janna") had reviewed historically for design purposes. **Janna's maximum reviewed scope may inform later product design, but it is not equivalent to current first-release implementation authorization.** Broad settlement and consequential agreement-generation functions **remain disabled** pending focused verification concerning: UPL boundaries; waiver and release consequences; surrender and possession treatment; stipulated judgments; court-filed settlements; and consequential template validation.

**Only the narrower drafting scope described in Product Control Specification Revision 1 may be considered for later implementation authorization. This handoff does not establish that those functions are currently implemented or available.** This section identifies what may be considered for authorization, not what is currently built or running.

**Separately tracked, not resolved by this correction.** RESDOC §11's proposed reservation-of-rights clause/toggle on the Payment Plan path remains open pending an attorney-drafted clause, and is additionally subject to the broad-agreement-function disablement above; it is not authorized for first release. **The no-toggle design is the controlling source-level default. Runtime implementation status has not been verified in this handoff.** This is a source-record disposition (RESDOC §11 itself specifies no toggle absent the attorney-drafted clause); whether the running product actually implements that no-toggle default requires repository inspection or runtime verification, which this handoff does not certify.

**Move-out / mutual termination.** Tracked as its own RiskPath status; a Move-Out or Mutual Lease Termination document is a possession/surrender agreement within the meaning of the disabled broad-agreement-functions list above, and is therefore also disabled pending the same verification.

**Founder-approved minimum factual outcomes — controlling taxonomy, distinct from implementation status.** The Founder has directed that the following six factual-status outcomes are the **controlling first-release taxonomy** for this workstream: Payment reported; Payment status requires review; Owner withdrew the current notice path; Possession change reported; Service issue requires review; Attorney referral. These are factual status records only and do not independently represent legal conclusions about cure, waiver, sufficiency, or possession/enforceability. **"Attorney referral" in this taxonomy is only a factual, owner-reported status** (i.e., the owner has recorded that they referred the matter to, or are seeking, outside counsel) — **it is not a platform referral action.** Consistent with Section IV-3, OwnerPilot provides no attorney service and does not itself select, recommend, match, connect, assign, or transmit the matter to any attorney; recording this status does not change that. This taxonomy's **approval** is distinct from its **implementation**:

| Layer | Status |
|---|---|
| Approved taxonomy (the six outcomes) | Approved, controlling. |
| Repository scaffolding | Partial — related enums/fields exist (RESDOC §12: `tenant_responded`, `payment_received`, `post_deadline_payment_accepted`, `payment_plan_active`, `move_out_agreement_drafted/signed`, `mutual_termination_drafted/signed`, `move_out_pending`, `possession_returned`, `surrender_record_saved`, `security_deposit_followup_pending`, `notice_closed`, `ud_review_needed`, `counsel_recommended`) but are not a direct, confirmed implementation of the six-outcome taxonomy. |
| Implemented recording behavior | Not confirmed complete for all six outcomes. |
| Durable persistence | Not confirmed. |
| RiskPath linkage | Confirmed **absent** as of the post-PR314 Preview E2E run, below. |
| Audit lineage | Not confirmed. |
| Complete tested owner-facing workflows | Not confirmed for all six outcomes. |

Any RiskPath implementation work maps the existing RESDOC §12 enum values onto the six controlling outcomes above; it does not introduce a parallel or conflicting taxonomy. Mapping work has not yet been authored.

**Post-PR314 Preview E2E run — what it did and did not establish.** The most recent controlled Preview E2E characterization run in this workstream (per Founder direction, 2026-07-31): characterized the current intake wizard and the Serve & Track lane, consistent with Section VI's evidence classification; **confirmed the current absence of RiskPath linkage**; **did not** establish completion of Resolve & Record; and **did not** establish durable persistence or complete owner-facing workflows for all six controlling outcomes. This run is evidence for Section VI's Serve & Track findings; it is **not** evidence that Resolve & Record is complete.

**Calm/practical/non-alarmist warnings.** Payment-event product surfaces carry a standing disclaimer ("OwnerPilot helps document the terms you enter for your records… not a law firm… consult a California licensed attorney") rather than an alarmist framing.

---

## IX. Cross-item conflict and dependency matrix

| Item | Issue | Controlling disposition | Classification | Affected feature | Required control | Unresolved dependency | Implementation readiness | Authority status |
|---|---|---|---|---|---|---|---|---|
| 1 | "Wording avoids legal validation" / broker-copy boundary has no bright-line test | Applied pattern across C5, RESDOC, CODEPROV | Conservative product policy | All broker-review-labeled surfaces and public copy | Case-by-case review continues until a general standard exists | Yes | Not implementation-blocking | Pattern-approved, not consolidated |
| 1 | LDA registration question | Not located | Unresolved legal risk | Free-beta document-preparation scope (self-filing packets, official form inclusion) | Targeted primary-source research and Janna validation required; absence of user fees is relevant but not dispositive without verification | Yes | **Launch-critical and blocking** for release activation of the California document-preparation beta, unless the free-beta model is validated as proceeding without registration or under a defined exemption | Unresolved |
| 1 | Mandatory every-notice review not yet confirmed as fail-closed in code | Founder direction, 2026-07-31 | Conservative product policy; implementation design | Release-eligibility gate (Stage B) | Implement and verify as fail-closed, non-disableable | Yes | **Blocking** for any release-eligibility claim | Controlling invariant stated; implementation verification pending |
| 1 | Entity signing and representation authority unresolved | Founder direction, 2026-07-31 | Unresolved legal risk; legal requirement component (*Merco Constr. Engineers*) | Entity-landlord document preparation and filing workflows | Separately distinguish supplying facts, document-prep assistance, physical submission, signing, commencing/prosecuting, appearing, arguing, and representing; no inference of authority from organizational role alone; targeted Janna validation required | Yes | **Launch-critical and blocking** for affected entity workflows | Unresolved |
| 2 | Source hierarchy and subsidized-housing controls unresolved | Not located | Unresolved legal risk | Notice demand-amount composition (subsidized tenancies) | Hold — do not silently resolve source-hierarchy conflicts or subsidy allocation | Yes | **Blocking** for any feature touching subsidized tenancies or conflicting source documents | Unresolved |
| 3 | Photograph/timestamp/persistence/provenance/RiskPath/notes/cross-device/end-to-end preservation not verified | Not confirmed (Section VI classification) | Implementation design; unresolved legal risk (evidentiary reliance) | Serve & Track evidence surfaces | Runtime verification required per item before any is described as shipped | Yes | **Blocking** for marketing or product claims describing these as complete | Scaffolding/inferred/runtime-verification-required, per item |
| 3 | Server-party status hard stop not yet confirmed implemented | Founder direction, 2026-07-31 | Conservative product policy; implementation design | Declaration progression; service-dependent advancement | Implement hard stop for unknown/disputed/conflicting/unsupported/disallowed server-party status | Yes | **Blocking** for declaration/service-dependent advancement copy or features | Control stated; implementation verification pending |
| 4 | LA City not activated | Founder direction, 2026-07-31 | Business choice + conservative product policy | LA City nonpayment control package | Current-source repair + targeted Janna validation + Founder activation, all three required | Yes | **Blocking** for any Production activation of LA City | Design basis only; not activated |
| 5 | Broad settlement/agreement functions disabled | Founder direction, 2026-07-31 | Disabled pending verification; requires independent attorney consultation | Resolve & Document broad drafting surfaces | Focused verification (UPL boundaries; waiver/release consequences; surrender/possession treatment; stipulated judgments; court-filed settlements; template validation) before any authorization | Yes | **Blocking** for releases, waiver language, surrender/possession agreements, confidentiality, attorney-fee provisions, stipulated judgments, court-filed settlements | Disabled |
| 5 | Returned/refunded post-expiration payment revival disabled | Founder direction, 2026-07-31 | Disabled pending verification | Notice-path resumption after a returned/refunded post-expiration payment | Primary-source verification required before any implementation, tentative or otherwise | Yes | **Blocking**, fully disabled | Disabled |
| 5 | Resolve & Record implementation gap (taxonomy approved, implementation not confirmed) | Founder direction, 2026-07-31 (taxonomy); post-PR314 Preview E2E run (implementation gap) | Implementation design | RiskPath / Resolve & Record | Mapping and implementation work required; RiskPath linkage confirmed absent | Yes | **Blocking** for any "Resolve & Record complete" or "RiskPath-linked" claim | Taxonomy controlling; implementation not confirmed |
| 5 | Reservation-of-rights clause (RESDOC §11 fork) | RESDOC §11 — no-toggle design is the controlling source-level default until an attorney-drafted clause exists | Requires independent attorney consultation; disabled pending verification | Payment Plan document path | Toggle must not ship until clause is commissioned, drafted, ruled on, and clears the broad-agreement-function verification above; runtime implementation of the no-toggle default requires repository inspection or runtime verification | Yes | Not blocking as a source-record disposition; runtime implementation status not verified in this handoff | Open, tracked at source; implementation unverified |
| X | `counsel_route_trigger` unavailable for new controls | Founder direction, 2026-07-31 | Implementation design; prohibited (as to unauthorized writes) | Any feature proposing to read or write `counsel_route_trigger` | Separate semantic review and authorization required before any new use | Yes | **Blocking** for any new use in this handoff | Existing production-consumed field; not neutral; not available here |
| Spec | Reconciliation against Product Control Specification Revision 1 required | Founder direction, 2026-07-31 | Business choice; implementation design | All items | Reconcile this handoff against Revision 1; neither document is canonical until reconciled and adopted | Yes | Blocking for canonical status, not for continued drafting | Noncanonical drafts exist |

---

## X. Product consequences

**Chat behavior.** The persona must never state or imply that an attorney is required to file a UD or that OwnerPilot connects users to attorneys; permitted phrasing recommends consulting counsel case-by-case (Section IV-9, IV-3). Runtime output gate blocks the specific phrasings enumerated in Section IV and Section XI.

**Intake gates.** Three screening questions (litigation/complaint, written habitability dispute, bankruptcy) drive soft-recommend or enhanced-modal routing (Section IV-2), on top of the mandatory every-notice review (Section IV). FF-3 amount reconciliation and FF-4 FMR gates are design-basis controls for LA City nonpayment cases, not yet activated (Section VII).

**Notice preparation.** Service method is captured at Serve & Track, not at produce time (Section VI). Multi-method payment offerings on the notice face remain a payment-mechanics rule distinct from, and not a substitute for, the base-rent-only exclusion policy in Item 2 (Section V).

**Serve & Track.** A functioning, live factual-capture and reporting capability for the verified items in Section VI (service dates, service attempts, mailing, server identity, server attestations, printable logs/reports). Photographs, durable storage, provenance, persistence, RiskPath linkage, notes, cross-device recovery, and end-to-end preservation are tracked separately as scaffolding, inferred, or runtime-verification-required items (Section VI) and must not be described as shipped.

**Resolve & Record (Resolve & Document).** The six-outcome taxonomy is approved and controlling (Section VIII); its implementation (recording behavior, durable persistence, RiskPath linkage, audit lineage, complete owner-facing workflows) is not confirmed complete. Broad settlement and agreement-generation functions (releases, waiver, surrender/possession agreements, confidentiality, attorney-fee provisions, stipulated judgments, court-filed settlements) are **disabled** pending focused verification (Section VIII). **Only the narrower drafting scope described in Product Control Specification Revision 1 may be considered for later implementation authorization; this handoff does not establish that those functions are currently implemented or available.**

**RiskPath.** The six-item outcome set is the controlling taxonomy; linkage to Serve & Track and to the existing RESDOC §12 enum is confirmed **absent** as of the most recent Preview E2E run and requires implementation and mapping work (Section VIII, Section IX).

**Human review.** Two distinct layers: (1) the **mandatory every-notice factual and package review**, fail-closed and non-optional (Section IV); and (2) additional **risk-triggered review** (Section IV-2), which adds controls but does not substitute for (1). Both are non-attorney factual review; broker review is reserved for jurisdiction determinations, not general document generation (Section IV-4, IV-5).

**Owner confirmation.** Three distinct stages — internal draft generation (Stage A, may precede confirmation); release to the owner (Stage B, requires confirmation after the mandatory review); and operative action such as signing, sending, service, filing, acceptance, rejection, withdrawal, or settlement (Stage C, requires its own separate confirmation) (Section IV).

**Public-facing claims.** Broker-only attribution; no unshipped-capability marketing; the specific permitted and prohibited phrases are controlled in Section XI, including the provisional phrase "Factual and package review completed. Legal sufficiency not determined." in place of the standalone "Factual review completed."

**Data/persistence requirements.** Only the Section VI "verified in code" / "operationally tested" items may be described as confirmed. All other data/persistence questions (durable photograph storage, provenance, durable server-side persistence, cross-device recovery, end-to-end preservation) remain runtime-verification-required.

**`counsel_route_trigger` control.** `counsel_route_trigger` is an existing, production-consumed field. It requires separate semantic review before any new use. It is **not** a neutral risk-observation field, and it is **unavailable for new controls in this handoff** — no newly identified risk in this document authorizes a write to it. Any proposed use requires its own separate review and authorization (Section IX, Section XI).

**Attorney-routing language.** Standardized counsel-route messaging and standing posture footer apply across all surfaces; no on-platform attorney service exists anywhere in the product (Section IV-3). OwnerPilot may surface neutral public resources in an approved route-out context; it does not select, recommend, match, connect, assign, or transmit a matter to an attorney. Optional independent-attorney wording may appear only in these defined route-out contexts; it must not appear as routine defensive copy elsewhere (Section XI).

---

## XI. Prohibited representations and actions

**Scope of this prohibition.** Prohibited phrases below may **not** render as approved user-facing or public-facing claims. They **may** appear internally only where necessary for testing, denylist enforcement, migration, compliance documentation, or historical traceability, and must not be exposed as approved copy. This is narrower than an absolute ban on the phrases appearing anywhere in the codebase (e.g., a denylist unit test necessarily contains the banned string; a migration note describing why a phrase was removed necessarily quotes it) — the operative rule is that none of the following may be **approved, rendered, or exposed as user-facing or public-facing copy**:

- "Lawyer reviewed"
- "Attorney approved"
- "Attorney supervised"
- "Request attorney review" (as a feature or button label implying on-platform attorney access)
- "Court-ready"
- "Legally sufficient"
- "Guaranteed compliance"
- Any autonomous legal conclusions or legal decision-making by OwnerPilot on the user's behalf
- Any autonomous negotiation by OwnerPilot on the user's behalf, including independently initiating negotiations, transmitting offers without authorization, or accepting terms on the owner's behalf (Section VIII)
- Any silent legal override of a compliance gate (e.g., silently proceeding past an unresolved jurisdiction classification, silently bypassing the FF-4 FMR block, silently advancing past an unresolved server-party status)
- Any Resolve & Record outcome not among the six controlling factual outcomes (Section VIII) — in particular, no independent representation that `current_notice_workflow_closed` or any other recorded outcome resolves cure, waiver, sufficiency, possession, or enforceability
- "Verified" as a status badge (banned; "Timestamped" is the only permitted status pill per RESDOC §13, and only where a timestamp capability is itself confirmed per Section VI)
- Any attorney credential or State Bar Number reference on a public or marketing surface (Section IV-11)
- "Prepared through an attorney-approved workflow"
- "Factual review completed — broker supervised"
- "Broker-reviewed" or "Broker-supervised workflow" used as standalone approval language
- **"Factual review completed" used as a standalone, unqualified phrase.** Where copy of this kind is needed at all, the only currently permitted provisional phrasing is: **"Factual and package review completed. Legal sufficiency not determined."**
- Writing to `counsel_route_trigger` on the basis of any risk signal newly identified in this handoff, without separate semantic review and authorization (Section IX, Section X)
- Independent-attorney referral wording appearing as routine defensive copy outside the defined route-out contexts (Section IV-3, Section X)

---

## XII. Open issues requiring targeted recovery or validation

1. **Missing Item 2 source-hierarchy and subsidy-control details.** The base-rent-only policy is stated (Section V); source hierarchy, subsidized-rent treatment, tenant share, agency share, allocation uncertainty, and defined edge cases are not.
2. **Primary-source verification of the returned/refunded post-expiration payment revival rule.** The feature is fully disabled pending this verification (Section VIII); no tentative implementation is authorized.
3. **Bright-line test for "broker-supervised factual review only if wording avoids legal validation" / broker-copy boundary.** No general standard exists yet across all broker-review-labeled and public-copy surfaces (Section IV-5, Section IV closing note, Section IX, Section XI).
4. **Legal Document Assistant (LDA) registration question — launch-critical and blocking.** Not located as resolved in the reviewed record. Blocking for release activation of the California document-preparation beta unless targeted primary-source research and Janna validation determine the free-beta operating model may proceed without registration or under a defined exemption; the absence of user fees is relevant but not dispositive without verification (Section IV closing note, Section IX, Section XIII, Section XIV).
5. **Mandatory every-notice review — implementation verification.** The invariant is controlling (Section IV); whether it is implemented in code as fail-closed and non-disableable has not been independently confirmed in this handoff's preparation.
6. **LA City activation.** Requires current-source repair, targeted Janna validation, and Founder activation — none of which has occurred (Section VII).
7. **Owner-confirmed jurisdiction fallback for LA City.** Proposed, not Production-active (Section VII, Section IV-8).
8. **Server-party status hard-stop control — implementation verification.** The control is stated (Section VI); whether it is implemented has not been independently confirmed.
9. **Serve & Track runtime-verification items.** Photograph upload; durable photograph storage; authoritative timestamp/provenance preservation; durable server-side persistence; RiskPath linkage; rendered notes input; durable cross-device recovery; end-to-end evidence preservation (Section VI).
10. **Broad settlement and agreement functions.** Disabled pending focused verification on UPL boundaries; waiver and release consequences; surrender and possession treatment; stipulated judgments; court-filed settlements; consequential template validation (Section VIII).
11. **Reservation-of-rights clause (RESDOC §11 fork).** Remains open pending an attorney-drafted clause and the broad-agreement-function verification above. The no-toggle design is the controlling source-level default; runtime implementation status requires repository inspection or runtime verification, not yet performed (Section VIII, Section IX).
12. **Resolve & Record implementation gap.** Taxonomy approved; recording behavior, durable persistence, RiskPath linkage, audit lineage, and complete owner-facing workflows are not confirmed (Section VIII).
13. **`counsel_route_trigger` semantic review.** Required before any new use proposed by this or any future handoff (Section IX, Section X, Section XI).
14. **Reconciliation against Product Control Specification Revision 1.** This handoff must be reconciled against Revision 1; neither this handoff nor Revision 1 is canonical or implementation-authorizing on its own (Section XIII).
15. **Entity signing and representation authority — launch-critical and blocking for affected entity workflows.** Whether a non-attorney member, officer, employee, trustee, or agent may sign a pleading, commence or prosecute an action, appear, argue, or otherwise represent the entity is unresolved. Requires targeted Janna validation; owner confirmation cannot resolve this legal-representation question; organizational role alone does not establish signing or representation authority (Section IV-10, Section IX).

---

## XIII. Required downstream actions (in order)

1. Reconcile this verified handoff against Product Control Specification Revision 1.
2. Complete launch-critical source repair.
3. Obtain targeted Janna validation.
4. Resolve genuinely remaining Founder decisions.
5. Verify the revised Product Control Specification.
6. Prepare narrow implementation plans.
7. Obtain separate Founder implementation authorization.
8. No Production activation until all applicable gates are satisfied.

(Launch-critical source repair and targeted Janna validation, above, notably include: the LDA registration question, Section IV/IX/XII; the entity signing/representation boundary, Section IV-10/IX/XII; LA City jurisdiction-matrix and FMR-gate source modules and unresolved controls, Section VII; and broad settlement/agreement functions, Section VIII.)

---

## XIV. Formal handoff disposition

**Verified.** The Group 1 handoff has completed Architect verification and may serve as the verified, noncanonical Group 1 input for reconciliation against Product Control Specification Revision 1. No further Group 1 handoff recovery is required.

- **Item 1 — UPL/LDA and role boundary:** Substantially resolved for specification drafting; unresolved LDA, broker-copy, entity-representation, and consequential drafting boundaries remain. The LDA registration question is launch-critical and blocking for release activation of the California document-preparation beta unless targeted primary-source research and Janna validation determine the free-beta model may proceed without registration or under a defined exemption; absence of user fees is relevant but not dispositive without verification. The entity signing/representation boundary is separately launch-critical for affected entity workflows pending targeted Janna validation (Section IV).
- **Item 2 — Demand amount and excluded charges:** Substantially resolved under a conservative base-rent-only policy; source hierarchy and subsidy controls unresolved (Section V).
- **Item 3 — Service evidence and reporting:** Legal scope substantially resolved; functioning factual-capture lane verified; persistence, photographs, provenance, server-party control, and RiskPath implementation remain distinct (Section VI).
- **Item 4 — Los Angeles City nonpayment control package:** Approved for continued specification and source repair; not activated or cleared for Production (Section VII).
- **Item 5 — Payment-event treatment:** Core conservative workflow controls resolved; revival, restrictive instruments, broad waiver/cure conclusions, and broad agreement functions disabled (Section VIII).

**This document does not authorize implementation, publication, merge, Production activation, any legal claim, or any expansion of launch scope.** It creates no constitutional authority, canonical authority, implementation authority, publication authority, legal-gate authority, jurisdiction activation, ECAP authority, or Production authority. It is a handoff for Architect verification and a direct input to the reconciliation against the California Nonpayment Product Control Specification, Revision 1, nothing more. Nothing in this document has been staged, committed, published, merged, implemented, or activated.

---

## XV. Architect verification block

**Disposition (select one):**

- [x] Verified
- [ ] Verified with corrections
- [ ] Returned for targeted recovery
- [ ] Prohibited from further use

**Corrections (if any):**

The two final corrections concerning attorney-input governance and entity signing/representation have been incorporated. The document is verified as a noncanonical reviewed handoff for reconciliation against Product Control Specification Revision 1.

**Date:** 2026-07-31

**Reviewer:** OwnerPilot Architect

---

*Prepared by engineering (Claude/Cowork) at Founder direction, 2026-07-31. Not a legal opinion. Not a final legal-control specification. Not a production authorization.*
