# OwnerPilot Group 1 Legal Review — Product Control Specification Revision 1 Reconciliation Memorandum

**File:** `docs/legal/group1_pcs_revision1_reconciliation_2026-07-31.md`
**Status:** VERIFIED — NONCANONICAL RECONCILIATION RECORD
**Date:** 2026-07-31

---

## I. Document control

**Status:** VERIFIED — NONCANONICAL RECONCILIATION RECORD. Architect review of this memorandum is complete. This document may serve as the verified noncanonical reconciliation input for preparation of the next noncanonical Product Control Specification artifact. No source document is amended by this memorandum. It creates no implementation, publication, canonical, jurisdiction, ECAP, legal-gate, or Production authority. See non-authority statement below.

**Prepared by:** Engineering (Claude/Cowork), at Founder direction, 2026-07-31.

**Inputs and exact repository paths (repository-fixed sources; not modified by this memorandum):**

1. `docs/legal/group1_legal_review_handoff_2026-07-31.md` — **VERIFIED — NONCANONICAL REVIEWED HANDOFF.** Architect verification of this handoff is complete (Section XV of that document). It remains noncanonical.
2. `docs/legal/california_nonpayment_product_control_specification_draft_2026-07-31.md` — **NONCANONICAL SOURCE RECOVERY.** The underlying draft specification. Production authority: none. Implementation authority: none. Canonical consequence: none.
3. `docs/legal/california_nonpayment_product_control_specification_revision_1_2026-07-31.md` — **NONCANONICAL SOURCE RECOVERY.** An amendment and conforming-revision layer to source (2), not a standalone replacement, per its own governing statement: "It is not a standalone replacement unless the two documents are later consolidated through a separately approved reconciliation."

**Revision 1's relationship to the base specification.** Revision 1 revises only the sections it names (Sections 1, 3, 4.7–4.9, 5, 6, 7, 8, 9, 11, 12, 14, 18, 20, 21, 22, and a new Section 23, plus a Conforming-Change Matrix and Updated Unresolved Items). Every base-specification section not named by Revision 1 — including Sections 2 (Authority Hierarchy), 10 (Demand-Control Specification), 13 (Service-Photo Design Controls), 15 (Recommendation Supersession), 16 (Resolve & Record), 17 (External Legal Review and Route-Out), 19 (Audit and Versioning), 24–27 — remain part of the operative noncanonical comparison baseline for this reconciliation, in their original base-specification form. This memorandum reads the base specification and Revision 1 together, with Revision 1 controlling wherever the two diverge on a named section, consistent with Revision 1's own drafting note: "Only the sections affected by the approved corrections are revised below. All other accepted provisions remain unchanged."

**No-authority statement.** This memorandum is a reconciliation record, not a legal opinion, not a final control specification, and not an amendment to any of the three source documents. It creates none of the following: **canonical authority; implementation authority; publication authority; legal-gate authority; jurisdiction activation; ECAP authority; or Production authority.** It does not modify, supersede, or consolidate the base specification, Revision 1, or the Group 1 handoff. Where this memorandum proposes conforming amendment language (Section X below), that language is a **proposal for Architect review and eventual Founder/Janna disposition** — it is not itself adopted, drafted into the source files, or authorized for implementation. Nothing in this document has been staged, committed, published, merged, implemented, or activated.

**Dependencies:** the three repository-fixed sources listed above; `CLAUDE.md` (project instructions; broker-only attribution rule, CalDRE 01871659); Founder direction, 2026-07-31, authorizing this reconciliation memorandum.

---

## II. Executive reconciliation result

The base specification, read together with Revision 1, **substantially reflects** the verified Group 1 handoff across most of Items 1 through 5 — particularly the owner-user operating model, the no-on-platform-attorney posture, the mandatory every-notice review invariant, the draft/release/action stage separation, the base-rent-only demand floor, the Serve & Track evidence-classification discipline, the Los Angeles inactive status, the payment-event/attribute separation, the six-outcome Resolve & Record taxonomy, the `counsel_route_trigger` restriction, and the rule that owner-reported outside consultation does not automatically clear a route-out.

**This is not, however, a fully reconciled specification**, and this memorandum does not reach an unqualified "fully reconciled" conclusion. Two controls added by the handoff's final corrections round have **no counterpart anywhere in the base specification or Revision 1** and require conforming amendment before the specification can be said to carry them: (1) the Track B rule that independent-attorney input does not automatically amend, supersede, or activate an adopted product control, and that such input must instead be reconciled through Architect review and Founder disposition (handoff Section IV-2); and (2) the granular entity-signing/representation distinction — separating supplying facts, document-preparation assistance, physical submission, signing, commencing/prosecuting, appearing, arguing, and representing, with the express rule that organizational role alone does not establish signing or representation authority (handoff Section IV-10). A third area — the specification's Authority Hierarchy (base Section 2), which ranks "Janna-validated product control" above "Founder-approved conservative product policy" — contains a **governance ambiguity**, not a proven conflict: the base hierarchy ranks adopted control types but does not expressly state that newly delivered attorney input automatically becomes an adopted "Janna-validated product control" for hierarchy purposes. This is an omitted Track B incorporation rule requiring conforming clarification, addressed at Section V item 1 and Section X-1 below; it is not evidence that the original hierarchy was invalid.

A fourth area, evidentiary rather than substantive, has been corrected in this revision: the handoff's citation to a "post-PR314 Preview E2E run" and the specification pair's citation to "PR #307" are **not a source conflict**. They are a later evidence update. PR #307 supplied the Serve & Track and RiskPath characterization suite; an initial isolated runtime effort against that suite exposed harness defects; PRs #312–#314 repaired the E2E harness; and a post-PR314 run (run 30609597370) successfully executed the characterized pathway, with 16 passed and 0 failed and deterministic cleanup confirmed. Revision 1 accurately described runtime execution as outstanding at the time Revision 1 was drafted, and the later verified Group 1 handoff accurately incorporated the subsequent closure once that run succeeded. No repository re-inspection is required solely to reconcile the "PR #307" and "post-PR314" labels — they identify two points on the same evidence timeline, not two competing claims. See C18, C22, and Section XI below.

**Launch-critical status.** The following remain launch-critical, consistent with the verified handoff: the LDA registration question (Section IV-VII below); the entity signing/representation boundary; Los Angeles City activation (all three of source repair, Janna validation, and Founder activation remain outstanding); and the fail-closed implementation of the mandatory every-notice review and server-party hard-stop, which are specified but not independently confirmed as implemented.

**Disabled portions.** Broad Resolve & Record agreement functions (releases, waiver, surrender/possession agreements, confidentiality, attorney-fee provisions, stipulated judgments, court-filed settlements), payment-path revival after return/refund/reversal/dishonor, Los Angeles activation, accepted-partial-payment workflow closure, and all currently-OFF feature flags remain disabled under both the handoff and the specification pair, with no conflict between them on this point. The conservative accepted-partial-payment workflow-closure rule remains the proposed specification baseline, but its feature flag remains off and it is not activated or implementation-authorized pending applicable validation and Founder authorization (see Section VIII item 7 below).

**Can the next noncanonical specification artifact be prepared now?** Yes, in part. Drafting the next noncanonical specification artifact is permitted before every legal, source, implementation, and Founder dependency closes — preparation and disablement-marking are not gated on full resolution. What remains gated is implementation and activation of any unresolved provision: no control identified in this memorandum may be implemented or activated until the applicable dependency in Sections VII, VIII, and IX is satisfied. The form of the next noncanonical specification artifact — a Revision 2 amendment layer, a corrected Revision 1 conforming memorandum, a consolidated noncanonical restatement, a replacement noncanonical draft, or another controlled reconciliation form — is a Founder decision (Section IX) and is not presumed by this memorandum.

---

## III. Source hierarchy and reconciliation method

The **base specification** (`..._draft_2026-07-31.md`) is the underlying noncanonical draft. It states its own governing status, authority hierarchy (Section 2), supported beta scope, fact dictionary, matter-state model, trigger architecture, and so on, in full.

**Revision 1** (`..._revision_1_2026-07-31.md`) is an amendment and conforming-revision layer. It revises only the sections it names. Where Revision 1 states a rule for a section it revises, Revision 1's text controls for that section. Where a base-specification section is not named by Revision 1, the base text remains part of the operative noncanonical comparison baseline for this reconciliation, unchanged, and this memorandum treats it as such for comparison purposes.

The **verified Group 1 handoff** (`group1_legal_review_handoff_2026-07-31.md`) is the later, Architect-verified legal/product-review input. It is later in time than both specification documents (all three are dated 2026-07-31, but the handoff's final corrections round — Track B, entity signing/representation, and the VERIFIED disposition — was completed after this reconciliation was commissioned). **Handoff verification does not itself rewrite the specification.** The handoff is an input to reconciliation, not a self-executing amendment; any specification change it implies must go through the conforming-amendment and Architect-review process described in this memorandum and in the handoff's own Section XIII.

**Repository code and tests** (e.g., the PR #307 / "post-PR314" Preview E2E characterization work, RESDOC §12 enums, `counsel_route_trigger` usage) may be cited in this memorandum **only as implementation evidence** — under the five-tier (or, per Revision 1 Section 12.2, the VERIFIED_IN_CODE / OPERATIONALLY_TESTED / SCAFFOLDING_ONLY / INFERRED / RUNTIME_VERIFICATION_REQUIRED) evidence-classification scheme — and never as legal or product-control authority in themselves. A capability being present in code does not establish that it is legally permitted, product-authorized, or activated; conversely, a capability being legally permitted or specified does not establish that it is implemented.

---

## IV. Full reconciliation matrix

Classification vocabulary used throughout: **Aligned**, **Aligned with clarification**, **Amendment required**, **Omission**, **Conflict**, **Unresolved legal dependency**, **Unresolved Founder decision**, **Implementation evidence insufficient**, **Disabled pending authorization**, **Source repair required**.

### A. Item 1 — Role boundary and review model

| ID | Group 1 handoff control | Base-spec provision | Revision 1 provision | Status | Conflict or gap | Proposed conforming treatment | Dependency | Activation state |
|---|---|---|---|---|---|---|---|---|
| A1 | Owner-user operating model (Sec. IV-1) | §1.3 Product-role boundaries | — (unchanged) | Aligned | None | None needed | None | Design-stage; not activated |
| A2 | No attorney representation/advocacy by OwnerPilot (Sec. IV, governing posture) | §1.3 "may not... represent" | — | Aligned | None | None needed | None | Design-stage |
| A3 | No in-product attorney service (Sec. IV-3) | §1.2, §17 | Rev1 §1.3 | Aligned | None | None needed | None | Design-stage |
| A4 | Neutral outside-resource route-out only (Sec. IV-3) | §17 | Rev1 §1.3, §18.2 | Aligned | None | None needed | None | Design-stage |
| A5 | No attorney matching/recommend/connect/assign/transmit (Sec. IV-3) | §17 | Rev1 §1.3 ("does not select, recommend, host, connect, assign, or transmit") | Aligned | None (near-verbatim) | None needed | None | Design-stage |
| A6 | Independent attorney input does not automatically amend or supersede product controls (Sec. IV-2, Track B correction) | §2 Authority Hierarchy ranks "Janna-validated product control" above "Founder-approved conservative product policy" | Not addressed | **Amendment required — governance ambiguity** | Base §2 ranks adopted control types in a bare precedence list, but does not expressly state that newly delivered attorney input automatically becomes an adopted "Janna-validated product control" for hierarchy purposes. This is an ambiguity and an omitted Track B incorporation rule, not proof that the original hierarchy is invalid | Amend base §2/§2.1 to add: a legal-review conclusion becomes a "Janna-validated product control" for hierarchy purposes only after it has completed the applicable reconciliation and Founder disposition required by the approved governance process (see Section X-1) | Architect + Founder | Unresolved governance ambiguity; conforming clarification pending |
| A7 | Track B reconciliation and Founder disposition for later attorney input (Sec. IV-2) | Not present | Not present | **Omission** | No Track B concept exists in either specification document; this is the incorporation rule A6 identifies as missing | Add a new subsection (proposed §2.2) defining Track B per Section X-1 below | Architect + Founder | Unresolved |
| A8 | Non-attorney factual/package review (Sec. IV-4) | §8 | Rev1 §8 | Aligned | None | None needed | None | Design-stage |
| A9 | Mandatory every-notice beta review (Sec. IV, controlling invariant) | §1.2 (review required); flag `FF_EVERY_NOTICE_REVIEW` listed as togglable | Rev1 §1.1, §8.1, §20 (replaces flag with fail-closed `BETA_INVARIANT_EVERY_NOTICE_REVIEW`) | Aligned | Base-only readers could mistake the review for a disableable flag; Revision 1 corrects this | Cite Revision 1 §1.1/§20 as controlling; no further amendment needed | None | Specified; implementation not independently confirmed |
| A10 | Fail-closed release eligibility (Sec. IV, Stage B) | §1.2 | Rev1 §7.2 (consolidated production-release invariant), §8.1 | Aligned | None | None needed | None | Specified; implementation not independently confirmed |
| A11 | Separation of internal draft generation / release eligibility / operative action (Sec. IV, three-stage framework) | Not separated in base matter-state model | Rev1 §1.2, §6 (revised matter-state model) | Aligned | Base alone is silent; Revision 1 fully supplies this | Cite Revision 1 §6 as controlling | None | Specified; implementation not independently confirmed |
| A12 | Owner confirmation boundaries (Sec. IV-1, Stage C) | §9 | Rev1 §9 | Aligned | None | None needed | None | Design-stage |
| A13 | Owner confirmation cannot resolve legal-representation questions (Sec. IV-10) | §9.2 lists what confirmation does not do, but omits representation/signing authority | Rev1 §9 adds fact/release/action separation but does not add representation language | **Omission** | Neither document states that owner confirmation cannot establish entity signing or representation authority | Amend §9.2 to add this item per Section X-2 below | Architect + Janna | Unresolved |
| A14 | Address-verification warning and owner confirmation (Sec. IV-8) | JUR-005, `FF_OWNER_JURISDICTION_FALLBACK` (OFF, "proposed only") | Rev1 §11 (LA-specific) | Aligned | None | None needed | None | Disabled pending authorization |
| A15 | Official court-form and self-filing boundaries (Sec. IV-6, IV-9) | Not addressed | Not addressed | **Omission** | Neither document distinguishes OwnerPilot's original templates from official Judicial Council/local forms, or addresses selection/completion/review boundaries for official forms | Add fact-dictionary and role-boundary language per Section X-3 below | Architect + Janna | Unresolved legal dependency |
| A16 | Unresolved LDA applicability (Sec. IV closing note) | §3.5 ("free-beta LDA applicability"), §24 | Rev1 Updated Unresolved Items ("Free-beta LDA applicability") | Aligned with clarification | Present as an open question but not framed as launch-critical/blocking | See A17 | Janna | Unresolved legal dependency |
| A17 | LDA issue remains launch-critical even in free beta (Sec. IV closing note; fee-absence relevant-but-not-dispositive) | §22.5 lists "free-beta LDA operating boundary" as "disabled pending legal validation" but does not use "launch-critical and blocking" language or address the fee-absence caveat | Not added | **Amendment required** | Spec treats LDA as one of many disabled/unresolved items, not expressly as launch-critical and blocking with the fee-absence caveat | Amend §22.5/§24 to add the exact launch-critical/blocking framing and the fee-absence-relevant-not-dispositive caveat, per Section X-4 below | Janna (primary-source research) | **Launch-critical and blocking** |
| A18 | Entity landlords generally (Sec. IV-10) | §3.4 ("whether entity owners are included"), §3.5 ("entity versus individual owner handling; entity registration or representation"), AUTH-003/AUTH-008 | Rev1 Updated Unresolved Items ("Entity-owner and signer-capacity boundaries") | Aligned with clarification | Concept present; granularity absent | See A19–A26 | Founder + Janna | Unresolved |
| A19 | Supplying facts (Sec. IV-10) | Implicit in AUTH-002/AUTH-005 | Not added | Aligned with clarification | Not separately enumerated as a distinct permitted category | Add explicit fact-dictionary note per Section X-2 | Janna | Permitted, pending validated workflow |
| A20 | Document-preparation assistance (Sec. IV-10) | Implicit in §1.3 "populate approved draft documents" | Not added | Aligned with clarification | Not tied specifically to entity landlords | Add per Section X-2 | Janna | Permitted, pending validated workflow |
| A21 | Physical submission of documents (Sec. IV-10) | Not addressed | Not addressed | **Omission** | Neither document distinguishes "physically submitting documents" as its own category | Add per Section X-2 | Janna | Unresolved |
| A22 | Pleading signature (Sec. IV-10) | AUTH-007/AUTH-008 (signer identity/capacity) touch this generally, not entity-specific | Not added | **Amendment required** | No express statement that signing authority is not inferred from organizational role | Add per Section X-2 | Janna | Unresolved legal dependency; launch-critical |
| A23 | Commencing or prosecuting the action (Sec. IV-10) | Not addressed | Not addressed | **Omission** | Not separately distinguished from filing | Add per Section X-2 | Janna | Unresolved legal dependency |
| A24 | Appearing (Sec. IV-10) | *Merco Constr. Engineers* cited generally in handoff, not in spec | Not added | **Omission** | Spec does not cite or address the entity-appearance rule at all | Add per Section X-2 | Janna | Unresolved legal dependency |
| A25 | Arguing (Sec. IV-10) | Not addressed | Not addressed | **Omission** | Same as A24 | Add per Section X-2 | Janna | Unresolved legal dependency |
| A26 | Otherwise representing the entity (Sec. IV-10) | Not addressed | Not addressed | **Omission** | Same as A24 | Add per Section X-2 | Janna | Unresolved legal dependency |
| A27 | Organizational role does not establish signing or representation authority (Sec. IV-10) | Not addressed | Not addressed | **Omission** | This is the handoff's central new rule; absent from both spec documents | Add per Section X-2 as an express non-inference rule (parallel to base §5.2's non-inference list) | Architect + Janna | **Launch-critical for affected entity workflows** |
| A28 | Broker/non-attorney public claims (Sec. IV-5, IV-11) | §18.1–18.3 | Rev1 §18.1–18.3 | Aligned | None | None needed | None | Disabled pending authorization (for the disabled-wording items) |
| A29 | No "lawyer reviewed" or equivalent public claim (Sec. XI) | §18.3 ("lawyer reviewed") | Rev1 §18.3 (carries forward; adds broker-specific disabled items) | Aligned | None | None needed | None | Prohibited |
| A30 | Court-form attribution wording (Sec. IV-6) | Not addressed | Not addressed | **Omission** | See A15 — same underlying gap | Combine with A15 remedy | Architect + Janna | Unresolved legal dependency |

### B. Item 2 — Demand amount and excluded charges

| ID | Group 1 handoff control | Base-spec provision | Revision 1 provision | Status | Conflict or gap | Proposed conforming treatment | Dependency | Activation state |
|---|---|---|---|---|---|---|---|---|
| B1 | Automated base-rent-only product floor (Sec. V) | §10.1 | — (unchanged) | Aligned | None (near-verbatim list match) | None needed | None | Disabled pending authorization (not yet implementation-authorized) |
| B2 | Exclusion of fees, utilities, penalties, damages, other non-rent items (Sec. V) | §10.2 | — | Aligned | Identical enumerated list | None needed | None | Same as B1 |
| B3 | Treatment of subsidies and third-party rent contributions (Sec. V) | PROP-009, PAY-014, TRG-SUB-001, §3.2/3.5 | Rev1 §4.9 PAY-ATR-010 | Aligned | Both treat as unresolved/route-out | None needed beyond existing Janna-validation flag | Janna | Unresolved legal dependency; disabled |
| B4 | Source hierarchy for rent amount (Sec. V) | RENT-004/005/006/007, §24 | Not separately revised | Aligned | Both flag as unresolved | None needed | Janna | Unresolved legal dependency |
| B5 | Disputed or uncertain demand facts (Sec. V) | RENT-008, TRG-RENT-002 | — | Aligned | None | None needed | None | Pause/route-out control, disabled pending authorization |
| B6 | Manual review and fail-closed handling (Sec. V) | §8.3 checklist; §10.4 calculation rules | Rev1 §7.2 (consolidated release invariant covers demand reconciliation) | Aligned | None | None needed | None | Specified; implementation not independently confirmed |
| B7 | No inference that legal permissibility equals implementation readiness (Sec. VI, applied to Item 2 by cross-reference) | Implicit via §1.1 (specification "does not itself authorize... code changes") and §22 evidence mapping | Rev1 §12.2 evidence-level framework (general, not Item-2-specific) | Aligned with clarification | No Item-2-specific statement of this principle exists | Add a short cross-reference in Demand-Control §10 pointing to the general evidence-classification rule | None (drafting clarity only) | N/A |

### C. Item 3 — Serve & Track

| ID | Group 1 handoff control | Base-spec provision | Revision 1 provision | Status | Conflict or gap | Proposed conforming treatment | Dependency | Activation state |
|---|---|---|---|---|---|---|---|---|
| C1 | Factual service-activity recording (Sec. VI) | §12.1, §12.4 | — | Aligned | None | None needed | None | Verified in code / operationally tested (per handoff and Rev1 §22.1–22.2) |
| C2 | Service method may not be selected or directed by OwnerPilot (Sec. VI) | §1.3 ("may not... determine service sufficiency"); implicit | — | Aligned | None | None needed | None | Design-stage |
| C3 | No legal-sufficiency determination (Sec. VI) | §12.1, §12.2 approved labels | Rev1 §8.2, §18.1 | Aligned | None | None needed | None | Design-stage |
| C4 | Service Activity Report terminology (Sec. VI) | §12.2 | — | Aligned | None | None needed | None | Verified in code |
| C5 | No overstatement as proof of service (Sec. VI, XI) | §12.3 prohibited labels ("Proof of Service," "Service Completed," "Legally Served," "Valid Service," "Filing-Ready Service Declaration") | — | Aligned | Handoff's "proof-of-service completion" ban is narrower phrasing of the same prohibited-label set | None needed | None | Prohibited |
| C6 | Server identity (Sec. VI) | SRV-009 (base); SRV-010 (Rev1) | Rev1 §4.7 SRV-010 | Aligned | None | None needed | None | Verified in code |
| C7 | Server-party status (Sec. VI, controlling control) | Not present in base fact dictionary | Rev1 SRV-011 (new fact), §5, §12.1 | Aligned | Base alone omits this entirely; Rev1 fully supplies it | Cite Rev1 as controlling | Janna (exact disallowed categories) | Disabled pending validation and implementation authorization (per Rev1 TRG-SRV-005) |
| C8 | Hard stop for party-server conditions (Sec. VI) | Not present in base | Rev1 §7.1 TRG-SRV-005 | Aligned with clarification | Handoff's hard-stop consequence text ("declaration progression, service-report finalization, clock-dependent progression, or other service-dependent workflow advancement") is broader than Rev1's TRG-SRV-005 consequence field ("declaration progression and service-dependent workflow advancement") | **Amendment required** — broaden TRG-SRV-005's consequence field to match the verified handoff's four-part formulation, per Section X-5 below | Architect | Disabled pending validation |
| C9 | Factual attestations (Sec. VI) | SRV-012 (base) | SRV-014 (Rev1) | Aligned | None | None needed | None | Verified in code (attestations); Janna validation required (content) |
| C10 | Server declarations (Sec. VI) | §12.5 declaration lifecycle | Rev1 SRV-019 | Aligned | None | None needed | None | Verified in code (states); runtime verification required (full lifecycle) |
| C11 | Service photographs (Sec. VI) | §13 (design status only; disabled) | Rev1 §12.3 ("Photo upload and preservation: VERIFIED_IN_CODE as absent from current identified flow — Implementation gap") | **Aligned with evidence-layer clarification** | Photograph-related scaffolding exists in fields, fixtures, or partial structures, but no complete rendered, wired, operationally tested upload-and-preservation workflow has been established. The handoff's "Scaffolding only" and Revision 1's "confirmed absent from current identified flow" describe different evidence layers of the same capability, not contradictory claims — see the layer classification at Section X-6 | See Section X-6 for the full evidence-layer table; no substantive source conflict requires resolution before drafting proceeds | Engineering (repository inspection may refine the scaffolding inventory, but this is not a substantive source conflict) | Disabled |
| C12 | GPS metadata (Sec. VI, by cross-reference to design controls) | §13 (GPS metadata, if available) | Not revised | Aligned with clarification | Handoff's Section VI does not separately discuss GPS; spec's §13 is more granular | Cross-reference §13 in any future handoff revision touching photographs | None | Design status only; disabled |
| C13 | Device timestamps (Sec. VI) | §13 (device-created timestamp) | — | Aligned with clarification | Same as C12 | Cross-reference §13 | None | Design status only; disabled |
| C14 | Auditable opt-out (Sec. VI, by cross-reference) | §13 ("Require owner-controlled metadata opt-out") | — | Aligned with clarification | Same as C12 | Cross-reference §13 | None | Design status only; disabled |
| C15 | Durable storage (Sec. VI) | §13 (design only) | Rev1 §12.3 ("Durable server-side service persistence: ... Implementation gap") | Aligned | Both treat as unimplemented | None needed | Engineering | Runtime verification required |
| C16 | Provenance (Sec. VI) | §13 | Rev1 §12.3 | Aligned | Both flag as unconfirmed | None needed | Engineering | Runtime verification required |
| C17 | Persistence (Sec. VI) | Implicit throughout §12, §19 | Rev1 §12.3 | Aligned | None | None needed | None | Runtime verification required |
| C18 | RiskPath linkage (Sec. VI, VIII) | §12.6 ("Absent or not verified"); §16.2 | Rev1 §12.3 ("RiskPath record linked to seeded synthetic chat session: OPERATIONALLY_TESTED only after isolated test execution... runtime outstanding") | Aligned — later evidence update, no source conflict | The handoff states RiskPath linkage "confirmed absent as of the post-PR314 Preview E2E run"; Rev1 frames the same finding as "runtime outstanding" pending isolated execution of the PR #307 suite. PR #307 supplied the characterization suite; PRs #312–#314 repaired harness defects the initial isolated runtime effort exposed; the post-PR314 run (run 30609597370, 16 passed / 0 failed, deterministic cleanup) is the successful execution of that same PR #307 suite. Rev1 accurately described the run as outstanding when Rev1 was drafted; the handoff accurately reports the subsequent closure. This is an operationally tested finding within the characterized lane (current wizard + Serve & Track, that runtime version) — it does not establish system-wide absence of RiskPath-related code or scaffolding elsewhere, and it does not establish the architecture of a future integrated workflow | No amendment needed; see Section XI for the full RiskPath evidence-status table | None — evidence chain is internally consistent | Operationally tested as absent in the characterized lane; complete future integration not established |
| C19 | Cross-device continuity (Sec. VI) | §12.6 ("Absent or not verified") | Rev1 §12.3, §22.3 (scaffolding only/absent) | Aligned | None | None needed | None | Runtime verification required |
| C20 | Version migration (Sec. VI, by cross-reference to persistence testing) | Not directly addressed in base §12 | Rev1 §21.7 (evidence-level tests), §23 (activation prerequisites reference "version-loss behavior") | Aligned with clarification | Handoff does not separately discuss version migration in Section VI; addressed only via the persistence characterization work cited elsewhere in the handoff | No amendment needed; cross-reference is sufficient | None | Runtime verification required |
| C21 | Implementation evidence levels (Sec. VI, five-tier classification) | Not present in base | Rev1 §12.2 (five-tier VERIFIED_IN_CODE / OPERATIONALLY_TESTED / SCAFFOLDING_ONLY / INFERRED / RUNTIME_VERIFICATION_REQUIRED scheme) | Aligned | Naming convention differs (handoff: title case; Rev1: SCREAMING_SNAKE_CASE) but the five tiers and their meanings match exactly | Recommend the next noncanonical specification artifact adopt one naming convention consistently | None (drafting clarity only) | N/A |
| C22 | Repository characterization limits ("post-PR314" vs. "PR #307") (Sec. VI, VIII) | Not addressed (base predates this characterization work) | Rev1 §22.2, §22.5, Conforming-Change Matrix — all cite "PR #307" | **Aligned — later evidence update, no source conflict** | The verified handoff repeatedly cites a "post-PR314 Preview E2E run" (Section VI, Section VIII) as the basis for Serve & Track and RiskPath findings; the base specification and Revision 1 consistently cite "PR #307." These identify two points on one evidence timeline, not competing claims: PR #307 supplied the characterization suite; the initial isolated runtime effort against that suite exposed harness defects; PRs #312–#314 repaired the E2E harness; and the post-PR314 run (run 30609597370) successfully executed the characterized pathway (16 passed, 0 failed, deterministic cleanup confirmed). Revision 1 accurately described runtime execution as outstanding at the time it was drafted; the later verified handoff accurately incorporated the subsequent closure | No amendment or engineering reconciliation is required solely to reconcile the "PR #307" and "post-PR314" labels; the next noncanonical specification artifact may simply cite the full evidence chain (PR #307 → PRs #312–#314 → run 30609597370) in one place for clarity | None | Operationally tested (characterized pathway executed successfully post-PR314) |
| C23 | Legal permission does not establish implementation or activation (Sec. VI, opening principle) | §1.1 (general); §22.4 ("Designed but not authorized") | Rev1 §12.2 (evidence-level discipline applies this principle specifically to Serve & Track) | Aligned | None | None needed | None | N/A (a governing principle, not an activation state) |

### D. Item 4 — Los Angeles City package

| ID | Group 1 handoff control | Base-spec provision | Revision 1 provision | Status | Conflict or gap | Proposed conforming treatment | Dependency | Activation state |
|---|---|---|---|---|---|---|---|---|
| D1 | LA City remains inactive (Sec. VII) | §11.5 | Rev1 §11, §23 | Aligned | None | None needed | None | Inactive |
| D2 | Proposed local facts are inactive (Sec. VII) | Not itemized in base fact dictionary | Rev1 §4.8 (LA-001 through LA-016, all status "Inactive") | Aligned | Base is silent; Rev1 fully supplies the fact set | Cite Rev1 §4.8 as controlling | None | Inactive |
| D3 | Address classification (Sec. IV-8, VII) | JUR-002/003/004, §11.5 | Rev1 §11 | Aligned | None | None needed | None | Proposed only; disabled |
| D4 | Listed or uncertain classification pause (Sec. VII) | TRG-JUR-001 | — | Aligned | None | None needed | None | Disabled |
| D5 | Local thresholds (FMR/bedroom count) (Sec. V, VII) | Not itemized in base | Rev1 LA-001 (bedroom count) | Aligned | Base is silent; Rev1 supplies bedroom-count fact; FMR gate itself is referenced elsewhere in handoff (FF-4) but not in either spec document by that name | Note FF-4 (FMR gate) as an existing repository control not yet mapped into the specification's fact dictionary; flag for source repair | Engineering | Design-basis only; not activated |
| D6 | Protected-reason screening (Sec. III, VII by cross-reference) | TRG-PROT-001/002/003 | — | Aligned | None | None needed | None | Disabled |
| D7 | Required language, disclosures, and attachments (Sec. VII) | §11.1, LOC-001/002/003 (base) | Rev1 LA-006 through LA-009 | Aligned | Rev1 supplies LA-specific detail the base only generalized | None needed | None | Inactive |
| D8 | Source repair (Sec. VII) | §11.4 (suspension/rollback conditions) | Rev1 §11 (activation prerequisites) | Aligned | None | None needed | Engineering | **Launch-critical**; required before activation |
| D9 | Primary-source validation (Sec. VII) | §24 | Rev1 Updated Unresolved Items | Aligned | None | None needed | Janna | Unresolved legal dependency |
| D10 | Targeted Janna validation (Sec. VII) | §3.5, §24 | Rev1 Updated Unresolved Items | Aligned | None | None needed | Janna | Unresolved legal dependency |
| D11 | Founder activation (Sec. VII) | §11.2 (FOUNDER_ACTIVATION_PENDING state) | Rev1 §23 | Aligned | None | None needed | Founder | Unresolved Founder decision |
| D12 | No jurisdiction activation by this reconciliation (Sec. VII, and this memorandum's own no-authority statement) | §27 | Rev1 Final Status Confirmation | Aligned | None | None needed | None | Not activated by any of the three sources or by this memorandum |

### E. Item 5 — Payment events and outcomes

| ID | Group 1 handoff control | Base-spec provision | Revision 1 provision | Status | Conflict or gap | Proposed conforming treatment | Dependency | Activation state |
|---|---|---|---|---|---|---|---|---|
| E1 | Payment event versus payment attribute distinction (Sec. VIII) | §14.1 (does not separate events from attributes) | Rev1 §4.9 (PAY-EVT-* vs. PAY-ATR-*), §14.1 | Aligned | Base alone conflates event and attribute; Rev1 fully corrects this, matching the handoff | Cite Rev1 §4.9/§14.1 as controlling | None | Disabled pending authorization (`FF_PAYMENT_EVENT_CAPTURE` OFF) |
| E2 | Tender, receipt, acceptance, rejection, return, and refund as distinct facts (Sec. VIII) | §14.1 event types include these | Rev1 §14.1 (explicit distinct-timestamp example) | Aligned | None | None needed | None | Same as E1 |
| E3 | Separate timestamps (Sec. VIII, implicit) | Not explicit in base | Rev1 §14.3 (occurrence, recorded, owner-confirmation, reviewer, evidence timestamps; "No later event may overwrite an earlier timestamp") | Aligned | Base is silent; Rev1 fully supplies this | Cite Rev1 §14.3 | None | Same as E1 |
| E4 | Payer identity as an attribute, not dispositive (Sec. VIII) | PAY-009 (base treats third-party payer as a distinct fact but does not label it an "attribute") | Rev1 PAY-ATR-002, PAY-ATR-004 (explicitly attributes) | Aligned | Rev1 corrects base's implicit event/attribute conflation for payer identity | Cite Rev1 as controlling | None | Same as E1 |
| E5 | Third-party payer treatment (Sec. VIII) | PAY-009, TRG language not specific | Rev1 PAY-ATR-004 | Aligned | None | None needed | None | Same as E1 |
| E6 | Allocation and conditions (Sec. VIII, V) | PAY-006, PAY-008 | Rev1 PAY-ATR-005/006/007/008 | Aligned | None | None needed | Janna (subsidized allocation) | Unresolved legal dependency (allocation edge cases) |
| E7 | Owner acceptance confirmation (Sec. VIII) | PAY-005, CONF-PAY | Rev1 §14.2, §9 | Aligned | None | None needed | None | Design-stage |
| E8 | Full accepted payment (Sec. VIII table) | §14.3 | Rev1 §6 (`current_notice_workflow_closed`), §14.2 | Aligned | None | None needed | None | Disabled pending authorization |
| E9 | Partial accepted payment (Sec. VIII table) | §14.3 | Rev1 §14.2, `FF_ACCEPTED_PARTIAL_CLOSES_WORKFLOW` | Aligned | None | None needed | Janna (per Rev1 Updated Unresolved Items: "Accepted partial-payment policy") | Unresolved legal dependency (policy validation); disabled |
| E10 | Partial rejected payment (Sec. VIII table) | §14.3 ("Rejected payment may be recorded without automatic closure") | — | Aligned | None | None needed | None | Design-stage |
| E11 | Accepted third-party payment (Sec. VIII table) | Not separately tabled in base | Rev1 (via event/attribute model — acceptance status/amount control, payer identity is an attribute) | Aligned | Base does not separately table this; Rev1's model supports it without a dedicated row | Consider adding an explicit worked example row to a future consolidated spec | None | Design-stage |
| E12 | Post-expiration payment (Sec. VIII table, "Returned/refunded post-expiration payment revival") | §14.4 | Rev1 (unchanged for this item) | Aligned | None | None needed | Janna | Disabled |
| E13 | Returned or refunded post-expiration payment (Sec. VIII table) | §14.4 ("revival after return... revival after refund") | — | Aligned | None | None needed | Janna | **Disabled; no tentative implementation authorized** |
| E14 | `current_notice_workflow_closed` (Sec. VIII) | §6.1 uses "current_notice_path_closed" (older name) | Rev1 §6 renames to `current_notice_workflow_closed` and defines it; directs replacement of all prior references | Aligned | Base's old name is superseded by Rev1; no live conflict once Rev1 is read as controlling | None needed; confirm no repository code still uses the old name (source repair item) | Engineering (naming audit) | Disabled pending authorization |
| E15 | No "cure," "waiver," "revival," or legal-conclusion inference (Sec. VIII) | §6.2, §14.4 | Rev1 §6, §14.2 | Aligned | Handoff's list (cure; waiver; notice invalidity; satisfaction; preservation of rights; loss of rights; enforceability; legal sufficiency) is a more granular enumeration than Rev1's catch-all ("or any other legal consequence") | None needed — handoff's enumeration is a permissible elaboration of Rev1's catch-all, not a conflict | None | N/A |
| E16 | Prior-path resumption remains disabled pending primary-source validation (Sec. VIII) | §14.4, `FF_PAYMENT_REVIVAL` OFF | Rev1 §20 (flag carried forward, OFF) | Aligned | None | None needed | Janna | Disabled |
| E17 | Recommendation supersession (Sec. VIII, IX) | §15 | Rev1 §6 ("Superseded by changed facts" label), §14.2 | Aligned | None | None needed | None | Design-stage |
| E18 | Factual closure state (Sec. VIII) | §6.1 | Rev1 §6 | Aligned | None | None needed | None | Disabled pending authorization |
| E19 | Six approved factual outcome taxonomy (Sec. VIII) | §16.1 (identical six outcomes, word for word) | — (unchanged) | Aligned | None | None needed | None | Approved taxonomy; disabled pending authorization for implementation |
| E20 | Implementation incompleteness of those outcomes (Sec. VIII) | §22.3 ("complete outcome workflows" absent) | Rev1 §22.3, §22.5 (scaffolding only / runtime verification required) | Aligned | None | None needed | Engineering | Runtime verification required |
| E21 | Resolve & Record scope (Sec. VIII) | §16 | — | Aligned | None | None needed | None | Design-stage |
| E22 | Broad consequential agreements disabled (Sec. VIII) | §22.5, `FF_SETTLEMENT_TOOLS` OFF, §3.3 mandatory route-outs | Rev1 §20 (flag carried forward) | Aligned | None | None needed | Janna | Disabled pending focused verification |
| E23 | Payment plans (Sec. VIII, RESDOC §11 fork by cross-reference) | Not directly addressed in either spec document | Not addressed | **Omission** | Neither spec document addresses the reservation-of-rights clause/toggle on the Payment Plan path that the handoff tracks at RESDOC §11 | Flag for a future conforming amendment once RESDOC §11's attorney-drafted clause is commissioned; no action needed now | Janna (clause drafting) | Open, tracked at source; not resolved by this memorandum |
| E24 | Releases (Sec. VIII) | §22.5, §3.3 | — | Aligned | None | None needed | Janna | Disabled |
| E25 | Waivers (Sec. VIII) | §22.5, §3.3 | — | Aligned | None | None needed | Janna | Disabled |
| E26 | Possession or surrender agreements (Sec. VIII) | §22.5, §3.3 | — | Aligned | None | None needed | Janna | Disabled |
| E27 | Confidentiality (Sec. VIII) | §22.5 | — | Aligned | None | None needed | Janna | Disabled |
| E28 | Attorney-fee terms (Sec. VIII) | §22.5 | — | Aligned | None | None needed | Janna | Disabled |
| E29 | Stipulated judgments (Sec. VIII) | §22.5, §3.3 | — | Aligned | None | None needed | Janna | Disabled |
| E30 | Court-filed settlements (Sec. VIII) | §22.5, §3.3 | — | Aligned | None | None needed | Janna | Disabled |
| E31 | Distinction between legal permission, product authorization, implementation evidence, and activation (Sec. VI, VIII, applied throughout) | §1.1, §22.4, §23 | Rev1 §12.2 | Aligned | None | None needed | None | N/A (governing principle) |
| E32 | `counsel_route_trigger` may not be reused for new controls (Sec. IX, X) | §7.2 (near-verbatim match) | — | Aligned | None | None needed | None | Existing production-consumed field; not available for new writes |
| E33 | Neutral route-out behavior (Sec. IV-3, VIII) | §17, §7.1 (route-out consequence layer) | Rev1 §1.3, §18.2 | Aligned | None | None needed | None | Design-stage |
| E34 | Owner-reported outside consultation does not automatically clear route-out (Sec. IV, controlling rule) | §17 (near-verbatim match: "must not... treat outside advice as automatically clearing a control") | — | Aligned | None | None needed | None | Design-stage |

---

## V. Conflicts requiring conforming amendment

Each area below was investigated against the actual source text rather than assumed to be a conflict; several of the fourteen candidate areas turned out to be aligned or only clarification-level, and are marked as such rather than forced into a conflict finding.

**1. Attorney-input governance.** Base §2 Authority Hierarchy: "The following precedence applies to all proposed controls: Applicable controlling law; Effective-dated, legally validated, Founder-activated local rule pack; **Janna-validated product control**; **Founder-approved conservative product policy**; Architect implementation specification; Owner-supplied facts; Non-attorney factual review; Technical derivation." Verified handoff Section IV-2: "C5 establishes the current approved product floor. Any later independent-attorney validation must be reconciled through the approved Track B process and incorporated only after the required Architect reconciliation and Founder disposition. Attorney input does not automatically amend, supersede, or activate a product control." **Mismatch:** the base hierarchy ranks adopted control types — it does not expressly state that newly delivered attorney input automatically becomes an adopted "Janna-validated product control" for hierarchy purposes. This is a **governance ambiguity and an omitted Track B incorporation rule**, not proof that the original precedence order is invalid or in direct conflict with the handoff. **Classification: Amendment required — governance ambiguity.** Proposed exact insertion (new §2.2, placed immediately after §2.1's precedence rules): "A legal-review conclusion becomes a 'Janna-validated product control' for hierarchy purposes only after it has completed the applicable reconciliation and Founder disposition required by the approved governance process." See Section X-1 for the full proposed subsection. **Change type:** amendment (insertion, not deletion — the precedence order itself is not wrong, it is incomplete). **Janna or Founder action required:** Founder disposition confirming the Track B process governs how a Janna validation event is incorporated; no Janna action required to adopt this procedural rule itself.

**2. Entity signing and representation.** Base §3.4/§3.5/§9.2 and AUTH-003/AUTH-008 acknowledge entity ownership and signer capacity as unresolved and Janna-pending, but neither document states the verified handoff's operative rule: "OwnerPilot must not infer authority to sign or represent the entity merely from the person's organizational role," nor does either separate supplying facts / document-prep assistance / physical submission / signing / commencing-prosecuting / appearing / arguing / representing into distinct categories. **Classification: Omission** (not a conflict — nothing in the spec text affirmatively contradicts the handoff; the granularity is simply absent). **Proposed exact insertion:** Section X-2. **Change type:** new control (addition to §9.2 and a new Fact Dictionary note). **Janna or Founder action required:** both — Janna to validate the underlying legal boundary; Founder to decide the beta eligibility scope for entity landlords (Section IX below).

**3. LDA launch-critical treatment.** Base §22.5 lists "free-beta LDA operating boundary" among many items "disabled pending legal validation," with no differentiation in urgency from, say, "conditional payment conclusions" or "restrictive endorsement." The verified handoff elevates this one specific item to "launch-critical and blocking... unless targeted primary-source research and Janna validation determine the free-beta model may proceed without registration or under a defined exemption," and adds the fee-absence-relevant-but-not-dispositive caveat. **Classification: Amendment required** (not a conflict — the spec does not say LDA is non-blocking, it simply does not single it out). **Proposed exact insertion:** Section X-4. **Change type:** amendment (elevation/clarification of existing item). **Janna action required:** yes, primary-source research specifically on Cal. Bus. & Prof. Code § 6400 et seq. as applied to a free-beta model.

**4. Base-rent-only demand floor.** Investigated at B1/B2 above. **Classification: Aligned.** No conforming amendment required; base §10.1/§10.2 and the handoff's Section V policy list match term for term.

**5. Public-copy restrictions.** Investigated at A28–A29 and throughout Section IV's "aligned" findings. **Classification: Aligned**, with one narrow gap: the handoff's Section XI bans a "Verified" status badge outright (citing RESDOC §13, "Timestamped" is the only permitted status pill) and separately bans any attorney credential or State Bar Number reference on a public/marketing surface (a CLAUDE.md-sourced rule). Neither prohibition appears verbatim in the base specification's §18.3 or Revision 1's §18.3 list. **Classification for this narrow gap: Omission.** **Proposed treatment:** add both items to §18.3's prohibited-language list (Section X-7). **Change type:** addition. No Janna or Founder action required — both rules are already settled elsewhere (RESDOC §13; CLAUDE.md broker-only attribution) and only need to be carried into the specification's copy-control list for completeness.

**6. Attorney route-out mechanics.** Investigated at A3–A5, E33–E34. **Classification: Aligned**, in places near-verbatim. No conforming amendment required.

**7. Implementation-evidence language.** Investigated at C21. **Classification: Aligned**, with a drafting-consistency (not substantive) note about naming convention. No conforming amendment required beyond the recommendation in C21.

**8. Serve & Track terminology and evidence characterization.** Investigated at C1–C23. **Classification: mixed** — most terminology is Aligned; the server-party hard-stop consequence wording is **Amendment required** (C8); the photograph evidence-tier description is **Aligned with evidence-layer clarification**, not a conflict (C11, X-6); and the PR314/PR307 citation is **Aligned — a later evidence update, not a source conflict** (C18, C22, Section XI).

**9. Los Angeles inactive status.** Investigated at D1–D12. **Classification: Aligned.** No conforming amendment required.

**10. Payment-event state model.** Investigated at E1–E20. **Classification: Aligned**, once Revision 1 (not the base document alone) is treated as controlling for this area.

**11. Post-expiration payment resumption.** Investigated at E12–E13, E16. **Classification: Aligned.** Both sources fully disable this pending primary-source verification, with no tentative implementation authorized in either.

**12. Broad Resolve & Record agreements.** Investigated at E22, E24–E30. **Classification: Aligned.** Both sources disable the same functional list.

**13. Six-outcome taxonomy versus actual implementation.** Investigated at E19–E20. **Classification: Aligned** on the taxonomy itself; **Implementation evidence insufficient** on completeness of implementation, consistent across all three sources — this is not a document conflict, it is a shared, honestly-stated implementation gap.

**14. `counsel_route_trigger` restrictions.** Investigated at E32. **Classification: Aligned**, near-verbatim match between handoff Section IX/X and base §7.2.

---

## VI. Aligned controls

**Substantively aligned** (no amendment needed, term-for-term or functionally identical): A1–A5, A8–A12, A14, A28–A29; B1–B2, B4–B6; C1–C7, C9–C10, C15–C17, C19, C21, C23; D1, D3–D4, D6–D12; E1–E10, E14–E19, E21–E22, E24–E34.

**Aligned but needing clearer cross-reference** (the concept exists in both, but the two documents do not point at each other, creating a risk that a future reader treats one as silent on the point): A16 (LDA — cross-reference handoff Section IV closing note with spec §3.5/§24); B7 (legal-permission-vs-implementation principle — cross-reference spec §1.1/§22.4 in the Demand-Control section); C11 (service photographs — cross-reference the handoff's "scaffolding only" description with Revision 1's "confirmed absent from current identified flow" as two evidence layers of one capability, per Section X-6); C12–C14, C20 (photograph metadata design controls and version migration — cross-reference spec §13 and §21.7 in any future handoff revision touching these topics); C18, C22 (PR #307 / post-PR314 evidence chain — the next noncanonical specification artifact should cite the full chain, PR #307 → PRs #312–#314 → run 30609597370, in one place rather than in two separately worded documents); D5 (FMR gate — cross-reference the handoff's FF-4 discussion with the specification's LA-001 bedroom-count fact); E11 (accepted third-party payment — no dedicated spec row, but fully supported by the general event/attribute model); E15 (legal-conclusion non-inference — handoff's granular list versus spec's catch-all).

**Aligned only at design level, not implementation level** (the rule or capability is settled as a matter of product design in both documents, but neither claims it is built, tested, or activated): A9–A11, A13 (once amended), A17 (once amended); C7–C8, C11, C15–C20; D5, D8; E1–E3, E9, E20, E22–E30 — in each case, both sources are consistent in stating design-only status, and this memorandum does not treat "design-level alignment" as equivalent to "implementation readiness."

---

## VII. Launch-critical unresolved dependencies

- **LDA applicability to the free limited beta.** Affected workflows: the entire California document-preparation beta (notice drafting, self-filing packet preparation). Must remain disabled for any workflow involving fee-bearing or registration-implicating preparation until targeted primary-source research and Janna validation clear it, per the verified handoff's exact framing (Section IV closing note, carried into this memorandum at A16–A17).
- **Entity signing and representation.** Affected workflows: any notice-preparation, self-filing, or Resolve & Record workflow where `landlord_type === "entity"`. Must remain disabled for signing, commencing/prosecuting, appearing, arguing, or representing the entity until Janna validation; supplying facts and document-preparation assistance may proceed within a separately validated workflow only (handoff Section IV-10; A18–A27 above).
- **Applicable official court-form and self-filing boundaries.** Affected workflows: any workflow that would include official Judicial Council or local court forms (UD-100, SUM-130, CM-010, LACIV-109/LASC CIV 312) in a preparation packet. Must remain disabled pending the LDA determination above and targeted Janna validation on form selection/completion boundaries (A15, A30).
- **Demand source hierarchy and subsidy treatment.** Affected workflows: any demand-amount workflow touching a subsidized tenancy, a conflicting lease/rent-change/ledger source, or unresolved tenant/agency share allocation. Must remain paused or routed out (B3–B4).
- **Los Angeles source repair and local validation.** Affected workflows: any LA City nonpayment notice. Must remain fully inactive until current-source repair, targeted Janna validation, and Founder activation are all three complete (D1, D8–D11).
- **Post-expiration payment treatment.** Affected workflows: any workflow proposing to resume a notice path after a returned or refunded post-expiration payment. Must remain fully disabled; no tentative or partial implementation is authorized (E12–E13, E16).
- **Public-copy terminology requiring professional validation.** Affected workflows: any surface using broker-supervision wording, attorney-approved-workflow wording, or the provisional "Factual and package review completed. Legal sufficiency not determined." label. Must remain limited to the exact approved phrasing pending validation (A28–A29; Section V item 5).
- **Server-party hard-stop implementation.** Affected workflows: declaration progression, service-report finalization, clock-dependent progression, and other service-dependent workflow advancement. The control is specified in both the handoff and Revision 1, but neither this memorandum nor either source document confirms it is implemented; treat as launch-critical for any release claiming this control is enforced (C7–C8).

---

## VIII. Targeted Janna validation package

Each item below is a genuine legal-review question. Business-strategy, implementation-architecture, and Founder product-policy questions are deliberately excluded and instead appear in Section IX.

1. **LDA applicability to the free limited beta.** Current product floor: LDA registration treated as launch-critical and blocking absent clearance. Proposed specification treatment: disabled by default (base §22.5); launch-critical framing to be added per Section X-4. Exact legal uncertainty: whether Cal. Bus. & Prof. Code § 6400 et seq. registration applies to a no-fee, free-beta document-preparation model, separately from the § 10131(b) broker exemption. Affected workflow: all self-filing and notice-preparation document generation. Consequence if unresolved: the beta cannot be activated for document-preparation output. Owner confirmation cannot resolve it: **No.**

2. **Entity signer and representation boundary.** Current product floor: no inference of signing/representation authority from organizational role; supplying facts and document-prep assistance only, within a separately validated workflow. Proposed specification treatment: new fact-dictionary distinction per Section X-2. Exact legal uncertainty: which organizational roles (member, officer, employee, trustee, agent) may physically submit documents or sign a pleading for an entity, and under what conditions *Merco Constr. Engineers* requires counsel appearance. Affected workflow: all entity-landlord workflows. Consequence if unresolved: entity-landlord workflows remain limited to fact-supply and document-prep assistance only. Owner confirmation cannot resolve it: **No.**

3. **Exact disallowed server-party categories.** Current product floor: hard stop where server-party status is unknown, disputed, conflicting, or unsupported. Proposed specification treatment: Rev1 SRV-011/TRG-SRV-005, pending validated categories. Exact legal uncertainty: which specific relationships (tenant, occupant, named recipient, and similar) are categorically disallowed under Cal. Code Civ. Proc. § 1162 and related authority. Affected workflow: Serve & Track declaration progression. Consequence if unresolved: hard stop remains in place for any ambiguous server-party status. Owner confirmation cannot resolve it: **No.**

4. **Demand source hierarchy.** Current product floor: base-rent-only automated path; source-hierarchy conflicts pause. Proposed specification treatment: base §10, unchanged. Exact legal uncertainty: which document or ledger source controls when the lease, a rent-change notice, and the ledger conflict. Affected workflow: automated demand calculation. Consequence if unresolved: conflicting-source matters remain paused. Owner confirmation cannot resolve it: **No.**

5. **Subsidized-rent treatment.** Current product floor: route-out on subsidy detection. Proposed specification treatment: base PROP-009/PAY-014/TRG-SUB-001, unchanged. Exact legal uncertainty: tenant-share versus agency-share demand treatment for subsidized tenancies. Affected workflow: demand calculation for subsidized tenancies. Consequence if unresolved: subsidized matters remain excluded from the automated path. Owner confirmation cannot resolve it: **No.**

6. **Los Angeles thresholds, RSO/JCO, RTCP, and filing mechanics.** Current product floor: LA City fully inactive. Proposed specification treatment: Rev1 §4.8, §11. Exact legal uncertainty: bedroom-count/FMR thresholds, RSO/JCO applicability and exemptions, RTCP/successor attachment requirements, LAHD filing deadlines and mechanics, business-day definition. Affected workflow: any future LA City nonpayment notice. Consequence if unresolved: LA City cannot activate. Owner confirmation cannot resolve it: **No.**

7. **Accepted-partial-payment consequence policy.** Current product floor: the conservative workflow-closure rule remains the proposed specification baseline, but its feature flag remains off and it is not activated or implementation-authorized pending applicable validation and Founder authorization. Proposed specification treatment: Rev1 §14.2, `FF_ACCEPTED_PARTIAL_CLOSES_WORKFLOW` (OFF). Exact legal uncertainty: whether this conservative closure policy is legally sound as a default, or whether a different default is legally compelled or advisable. Affected workflow: partial-payment handling. Consequence if unresolved: the conservative baseline remains the proposed default but stays unvalidated, unimplemented, and unactivated. Owner confirmation cannot resolve it: **No.** (This item keeps the proposed control baseline, legal validation, implementation status, and activation status expressly separate; none of the four is conflated with another.)

8. **Reversal, dishonor, return, refund, and revival.** Current product floor: fully disabled. Proposed specification treatment: base §14.4, Rev1 (unchanged). Exact legal uncertainty: whether and under what conditions a notice path may ever be legally resumed after such an event. Affected workflow: post-expiration payment handling. Consequence if unresolved: revival remains fully disabled. Owner confirmation cannot resolve it: **No.**

9. **Conditional and restrictive payment instruments.** Current product floor: route-out. Proposed specification treatment: base PAY-008, Rev1 PAY-ATR-006. Exact legal uncertainty: legal effect of restrictive endorsements and conditional tenders on the notice path. Affected workflow: payment processing. Consequence if unresolved: such payments remain routed out. Owner confirmation cannot resolve it: **No.**

10. **Service declaration content and defect consequences.** Current product floor: factual declaration only; no sufficiency determination. Proposed specification treatment: base §12.5, Rev1 §12.1. Exact legal uncertainty: what declaration content is legally required or advisable, and how service defects should be factually routed. Affected workflow: Serve & Track declaration lifecycle. Consequence if unresolved: declaration content remains provisional. Owner confirmation cannot resolve it: **No.**

11. **Broker-supervision and attorney-approved-workflow wording.** Current product floor: disabled pending validation. Proposed specification treatment: base/Rev1 §18.2/18.3. Exact legal uncertainty: whether any broker-supervision claim can be made without implying legal validation. Affected workflow: all public-facing review-status copy. Consequence if unresolved: only the provisional "Factual and package review completed. Legal sufficiency not determined." label may be used. Owner confirmation cannot resolve it: **No.**

12. **Official court-form preparation and self-filing boundary.** Current product floor: not resolved; original OwnerPilot templates only are settled. Proposed specification treatment: to be added per Section X-3. Exact legal uncertainty: whether and how OwnerPilot may select, complete, or review official Judicial Council/local forms without exceeding LDA or UPL boundaries. Affected workflow: self-filing packet preparation. Consequence if unresolved: official-form inclusion remains unauthorized. Owner confirmation cannot resolve it: **No.**

13. **Service-photo privacy, retention, authentication, and evidentiary controls.** Current product floor: design status only; disabled. Proposed specification treatment: base §13, unchanged. Exact legal uncertainty: retention period, deletion period, legal-hold treatment, privacy notices, third-party-identifying-information handling. Affected workflow: any future photo-evidence feature. Consequence if unresolved: photo feature remains fully disabled. Owner confirmation cannot resolve it: **No.**

---

## IX. Remaining Founder decisions

Separated from the legal-validation questions in Section VIII. Founder disposition is needed for:

- **Adoption of conforming specification language.** Whether to adopt the Section X amendment package (in whole, in part, or with edits), and which form the next noncanonical specification artifact should take — a Revision 2 amendment layer, a corrected Revision 1 conforming memorandum, a consolidated noncanonical restatement, a replacement noncanonical draft, or another controlled reconciliation form. This memorandum does not presume which form will be selected.
- **Business-policy choices more conservative than law strictly requires.** For example, the base-rent-only demand floor and the conservative partial-payment closure policy are stated as conservative product choices, not pure legal compulsions; Founder confirmation that these remain the chosen posture (rather than a narrower or broader one) is a business decision, not a legal-validation question.
- **Continued disablement of broad Resolve & Record functions.** Whether to keep releases, waiver, surrender/possession agreements, confidentiality, attorney-fee provisions, stipulated judgments, and court-filed settlements disabled indefinitely, or to sequence their future validation.
- **Beta eligibility scope for entity landlords.** Whether entity owners are included in the first beta at all (base §3.4 already flags this as Founder-only), and if so, at what functional scope (fact-supply only, versus document-prep assistance, versus a future expanded scope pending Janna validation).
- **Any future Los Angeles activation.** Timing and sequencing of LA City activation once source repair and Janna validation are complete — activation itself remains a Founder-only act under both the handoff and the specification (D11).
- **Later specification consolidation.** Whether and when to merge the base specification and Revision 1 (and, eventually, this memorandum's adopted amendments) into a single canonical or noncanonical document, per the base specification's own statement that its authority hierarchy applies "until reconciled and adopted."
- **Implementation authorization.** Separate from all legal and drafting questions above — no engineering implementation of any control identified in this memorandum is authorized by this memorandum, the handoff, or either specification document; that authorization remains a distinct, later Founder act.

---

## X. Proposed conforming-amendment package

The following proposed language is a **draft for Architect and Founder review**. It is not inserted into the recovered source files by this memorandum, and adopting it requires a separate, later editing action against the base specification within whichever form of the next noncanonical specification artifact the Founder selects (Revision 2 amendment layer, corrected Revision 1 conforming memorandum, consolidated noncanonical restatement, replacement noncanonical draft, or another controlled reconciliation form — see Section IX).

**X-1. Source section:** Base specification, Section 2 (Authority Hierarchy), new subsection 2.2.
**Current text or rule:** No provision addresses how a later independent-attorney validation event relates to an already-adopted product control; the bare precedence list in §2 ranks adopted control types without stating when newly delivered attorney input itself becomes an adopted "Janna-validated product control" for hierarchy purposes — a governance ambiguity, not a proven conflict (see Section V item 1, A6).
**Proposed replacement or insertion:**
> "2.2 Track B reconciliation for later independent-attorney input. A currently adopted product control (e.g., a Founder-approved conservative product policy) establishes the current approved product floor. Where independent-attorney input is obtained after a control has been adopted, that input does not automatically amend, supersede, or activate the control. It must instead be reconciled through the approved Track B process, and incorporated only after the required Architect reconciliation and a Founder disposition confirming the change. A legal-review conclusion becomes a 'Janna-validated product control' for hierarchy purposes only after it has completed the applicable reconciliation and Founder disposition required by the approved governance process. This subsection governs only whether and how attorney input changes an OwnerPilot product control; it does not limit an independent attorney's own professional-review authority within their scope of practice, and it does not apply to a first-instance Janna validation of a control that has not yet been adopted."
**Reason:** Closes the governance ambiguity identified at Section V item 1 and matches the verified handoff's Section IV-2 exactly.
**Dependency:** Architect review; Founder disposition.
**Activation consequence:** None — this is a governance/precedence clarification, not itself an activating change.

**X-2. Source section:** Base specification, Section 9.2 (Confirmation effect), and Section 4.1 (User and owner authority facts).
**Current text or rule:** §9.2 lists what owner confirmation does not establish (legal sufficiency, notice validity, cure of UPL/LDA issues, clearing a non-clearable trigger, attorney review, jurisdiction activation) but does not address entity representation. §4.1's AUTH-003/AUTH-008 note ownership type and signer capacity generally without an entity-specific non-inference rule.
**Proposed replacement or insertion (append to §9.2):**
> "Owner confirmation additionally does not establish that any person has authority to sign a pleading, commence or prosecute an action, appear, argue, or otherwise represent an entity landlord. Entity landlords may receive factual organization and document-preparation assistance within a separately validated workflow. An authorized member, officer, employee, trustee, or agent may be able to supply facts or physically submit documents, depending on the applicable rule. Whether a non-attorney may sign a pleading, commence or prosecute the action, appear, argue, or otherwise represent the entity remains separately controlled and may require counsel. OwnerPilot must not infer authority to sign or represent the entity merely from the person's organizational role."
**Proposed new fact-dictionary note (§4.1, following AUTH-008):**
> "AUTH-009 — Entity-signing/representation scope. Distinguishes, for entity landlords: (a) supplying facts; (b) receiving document-preparation assistance; (c) physically submitting documents; (d) signing pleadings; (e) commencing or prosecuting the action; (f) appearing at hearings; (g) arguing; and (h) otherwise representing the entity. Permitted by default: (a) and (b). Permitted only where the applicable rule allows it: (c). Not resolved by this specification; requires targeted Janna validation and Founder decision on beta eligibility scope: (d) through (h)."
**Reason:** Closes the omission identified at Section V item 2 and A18–A27, and matches the verified handoff's Section IV-10 exactly.
**Dependency:** Janna validation (legal boundary); Founder decision (beta eligibility scope, Section IX).
**Activation consequence:** None by itself — signing/representation functions for entity landlords remain unresolved and disabled pending the dependencies above.

**X-3. Source section:** New Section 4.11 (proposed), Official Court-Form and Self-Filing Boundary.
**Current text or rule:** Not addressed in either source document.
**Proposed insertion:**
> "OwnerPilot's own notice templates are original OwnerPilot IP and are never CAR (California Association of Realtors) forms. Official Judicial Council and local court forms (e.g., UD-100, SUM-130, CM-010, and LA-specific LACIV-109/LASC CIV 312) are public forms that may be included in a future validated self-filing preparation workflow. The existence of an official, public form does not itself resolve OwnerPilot's role boundary in preparing, selecting, or completing it. Preparation, selection, completion, and review boundaries for official forms remain subject to: free-beta LDA applicability; entity-versus-individual LDA registration; user-directed versus product-selected form behavior; and targeted Janna validation."
**Reason:** Closes the omission identified at Section V item 2 (cross-referenced) and A15/A30.
**Dependency:** Janna validation (LDA and form-selection boundary).
**Activation consequence:** None — official-form inclusion remains unauthorized until the dependency is cleared.

**X-4. Source section:** Base specification, Section 22.5 and Section 24.
**Current text or rule:** §22.5 lists "free-beta LDA operating boundary" among many items "disabled pending legal validation" without differentiated urgency; §24 lists "free-beta LDA applicability" as one of many items Janna must validate before production activation, without a launch-critical/blocking designation or the fee-absence caveat.
**Proposed replacement or insertion (append to §22.5 and §24):**
> "The free-beta LDA operating boundary is launch-critical and blocking for release activation of the California document-preparation beta, unless targeted primary-source research and Janna validation determine that the proposed free-beta operating model may proceed without registration under Cal. Bus. & Prof. Code § 6400 et seq., or under a defined exemption. The absence of user fees in the free-beta model is relevant to this determination but is not dispositive without verification."
**Reason:** Matches the verified handoff's Section IV closing note and Section IX/XIV framing exactly; closes the amendment gap identified at Section V item 3 and A17.
**Dependency:** Janna (primary-source research).
**Activation consequence:** The document-preparation beta cannot activate for any fee-bearing or registration-implicating output until this item clears.

**X-5. Source section:** Revision 1, Section 7.1, Trigger TRG-SRV-005, "Consequence" column.
**Current text or rule:** "Legally consequential hard stop for declaration progression and service-dependent workflow advancement."
**Proposed replacement:**
> "Legally consequential hard stop for declaration progression, service-report finalization, clock-dependent progression, and any other service-dependent workflow advancement."
**Reason:** Matches the verified handoff's Section VI server-party control wording exactly and closes the gap identified at C8.
**Dependency:** Architect review; no new legal validation required (this is a wording broadening of an already-adopted control, not a new legal question).
**Activation consequence:** None — the control remains disabled pending validation and implementation authorization regardless of this wording change.

**X-6. Source section:** Revision 1, Section 12.3, "Photo upload and preservation" row.
**Current text or rule:** "VERIFIED_IN_CODE as absent from current identified flow — Implementation gap."
**Corrected treatment: Aligned with evidence-layer clarification — no source conflict.** The handoff's "Scaffolding only" (Section VI: "A field/path exists in seed and test fixtures") and Revision 1's "confirmed absent from current identified flow" describe two different evidence layers of the same capability rather than contradictory claims: a field or fixture existing in the data model is not the same claim as a complete, rendered, wired, operationally tested upload-and-preservation workflow existing. Both are simultaneously true. The evidence-layer classification is:

| Component | Classification |
|---|---|
| Photo-related fields or fixtures | SCAFFOLDING_ONLY |
| Rendered upload control | Not established |
| Completed upload behavior | Not operationally tested |
| Durable storage | RUNTIME_VERIFICATION_REQUIRED |
| Provenance and metadata preservation | RUNTIME_VERIFICATION_REQUIRED |
| Public claim that photographs are supported | Disabled |

Repository inspection may still refine the scaffolding inventory (for example, confirming exactly which fields or fixtures exist), but this refinement is not a substantive source conflict between the handoff and Revision 1, and does not need to be resolved before the next noncanonical specification artifact is drafted.
**Reason:** Corrects the prior draft's treatment of these two evidence layers as contradictory, per the Architect's VERIFIED WITH CORRECTIONS disposition.
**Dependency:** None to resolve this evidence-layer question; engineering may still refine the scaffolding inventory as ordinary source-repair housekeeping.
**Activation consequence:** Photograph upload remains disabled regardless of the scaffolding inventory's exact contents.

**X-7. Source section:** Base specification and Revision 1, Section 18.3 (Prohibited language).
**Current text or rule:** Lists "lawyer reviewed," "legally approved," "legally compliant," "legally verified," "valid notice," "court-ready," "service-ready," "guaranteed," "stay protected," "attorney supervised," "attorney approved," "legal approval complete," "service legally completed."
**Proposed insertion (append to the list):**
> "'Verified' used as a status badge (the only permitted status pill is 'Timestamped,' and only where a timestamp capability is itself confirmed per the applicable evidence-classification record); any attorney credential or State Bar Number reference on a public or marketing surface."
**Reason:** Closes the narrow public-copy gap identified at Section V item 5; both prohibitions are already settled (RESDOC §13; CLAUDE.md broker-only attribution) and only need to be carried into the specification's own copy-control list.
**Dependency:** None (drafting completeness only).
**Activation consequence:** None — both prohibitions are already in force via their original source documents.

---

## XI. Implementation and evidence reconciliation

Using the classification scheme adopted by Revision 1 Section 12.2 (specified; repository-present [VERIFIED_IN_CODE]; locally tested; Preview-tested [OPERATIONALLY_TESTED]; Production-consumed; incomplete [SCAFFOLDING_ONLY]; absent; unknown/inferred), and cross-checked against the verified handoff's own five-tier classification (Section VI):

| Capability | Specified | Repository-present | Locally tested | Preview-tested | Production-consumed | Incomplete | Absent | Unknown |
|---|---|---|---|---|---|---|---|---|
| Mandatory every-notice review workflow | Yes (handoff, Rev1 §1.1/§8.1/§20) | Not confirmed | Not confirmed | Not confirmed | No | Possibly | Possibly | Implementation verification pending |
| Review record persistence and linkage | Yes | Not confirmed | Not confirmed | Not confirmed | No | Likely | Unclear | Runtime verification required |
| Serve & Track persistence (durable, server-side) | Yes (disabled pending) | Not established in the characterized lane; runtime and repository verification required | No | No | No | — | Not established in the characterized lane; runtime and repository verification required | — |
| Service photos | Yes (design status only) | Scaffolding-only fields/fixtures may exist (see X-6) | No | No | No | Handoff: scaffolding only | Rendered upload control and completed upload behavior: not established | No conflict — see X-6 evidence-layer table |
| GPS and device metadata | Yes (design status only) | Not confirmed | No | No | No | — | Not established in the characterized lane; runtime and repository verification required | Not independently confirmed |
| Server-party hard stop | Yes (Rev1 SRV-011/TRG-SRV-005) | Not confirmed | No | No | No | Possibly (fact model may exist) | Unclear | Implementation verification pending; Janna validation of exact categories also pending |
| Cross-device continuity | Yes (as a requirement) | Not confirmed | No | No | No | Possibly scaffolding | Not established in the characterized lane; runtime and repository verification required | Runtime verification required |
| RiskPath linkage | Yes (six-outcome taxonomy) | Partial (RESDOC §12 enums exist) | Not confirmed | Operationally tested as absent in the characterized post-PR314 lane (see C18, C22, and the RiskPath evidence table below) | No | Yes | Operationally tested as absent in that lane only; does not establish system-wide absence | See RiskPath evidence-status table below |
| Six outcome workflows | Yes (approved taxonomy) | Partial | Not confirmed | Not confirmed | No | Yes | Not fully | Complete workflows not confirmed |
| `current_notice_workflow_closed` | Yes (as a state, per Rev1 §6) | Not independently confirmed | No | No | No | Possibly | Unclear | Naming-migration audit needed (E14) |
| Los Angeles local pack | Yes (as a proposed, inactive pack) | Design-basis code exists (jurisdiction matrix, FF-4 gate, per handoff Section VII) | No | No | No | Yes | N/A — remains inactive by design | Not applicable; correctly inactive |
| Public-copy controls | Yes (both spec and handoff) | Not independently confirmed for full enforcement | Not confirmed | Not confirmed | Partially (some renamed provenance labels per CODEPROV) | Possibly | Unclear | Full enforcement across all surfaces not verified |
| Counsel route behavior (`counsel_route_trigger`) | Yes (restricted, not for new controls) | Yes — existing production-consumed field (base §7.2 explicitly states this) | N/A | N/A | **Yes** | No new use authorized | N/A | None — this is the one item where "Production-consumed" is affirmatively and consistently confirmed across all three sources |

**RiskPath evidence status (corrected framing).** In the controlled post-PR314 Preview characterization, the current wizard and Serve & Track lane remained unlinked to RiskPath. This is an operationally tested characterization of that lane and runtime version. It does not prove that no RiskPath-related code or scaffolding exists elsewhere, and it does not establish the architecture of a future integrated workflow.

| Capability | Evidence status |
|---|---|
| RiskPath-related schemas, enums, or structures | Repository-present / partial scaffolding (RESDOC §12 enums) |
| Wizard and Serve & Track linkage in the tested post-PR314 lane | Operationally tested as absent |
| Complete future RiskPath integration | Not implemented or not established |
| Six-outcome mapping | Not confirmed complete |

No item above is treated as implemented merely because it is permitted or described in the specification; where evidence is genuinely absent, not yet established, or characterized only within a specific tested lane, this table says so precisely rather than inferring completeness from permission or system-wide absence from a single characterization run.

---

## XII. Disabled-control register

| Control/workflow | Disabling condition | Dependency to clear | Authorized decision-maker | Code exists? | Feature flag exists? | Can runtime enforce disabled state? |
|---|---|---|---|---|---|---|
| LA City nonpayment control package | Not activated | Source repair + Janna validation + Founder activation (all three) | Founder | Design-basis code exists (jurisdiction matrix, FF-4 gate) | `FF_LA_LOCAL_PACK` (OFF) | Not independently confirmed |
| Owner-confirmed jurisdiction fallback | Proposed only | Founder/Janna activation | Founder + Janna | `resolveLaAddress.ts` infrastructure exists (design basis) | `FF_OWNER_JURISDICTION_FALLBACK` (OFF) | Not independently confirmed |
| Payment-path revival (reversal/dishonor/return/refund) | Fully disabled | Primary-source Janna validation | Janna, then Founder | Not confirmed | `FF_PAYMENT_REVIVAL` (OFF) | Not independently confirmed |
| Broad Resolve & Record agreement functions (releases, waivers, surrender/possession, confidentiality, attorney-fee terms, stipulated judgments, court-filed settlements) | Disabled pending focused verification | UPL boundaries; waiver/release consequences; surrender/possession treatment; stipulated judgments; court-filed settlements; template validation (all Janna) | Janna, then Founder | Historical design-time drafting exists (Janna's maximum reviewed scope), not first-release-authorized | `FF_SETTLEMENT_TOOLS` (OFF) | Not independently confirmed |
| Service photographs | Design status only | Retention/deletion/legal-hold/privacy/evidentiary validation (Janna) | Janna, then Founder | Partial — scaffolding-only fields/fixtures may exist; rendered upload control and completed upload behavior not established (see C11/X-6; no source conflict) | `FF_SERVICE_PHOTOS` (OFF) | Not independently confirmed |
| Durable server-side service persistence | Not established in the characterized lane; runtime and repository verification required | Engineering implementation + runtime verification | Founder (implementation authorization) | Not established in the characterized lane; runtime and repository verification required | `FF_DURABLE_SERVICE_PERSISTENCE` (OFF) | Runtime enforcement not established; capability status requires current repository and runtime verification |
| RiskPath service linkage | Operationally tested as absent in the characterized post-PR314 wizard/Serve & Track lane; does not establish system-wide absence or the architecture of a future integrated workflow | Engineering implementation + mapping to six-outcome taxonomy | Founder (implementation authorization) | Partial (RESDOC §12 enums) | `FF_RISKPATH_SERVICE_LINKAGE` (OFF) | Runtime enforcement not established; capability status requires current repository and runtime verification |
| Server-party control (hard stop) | Specified, not confirmed implemented | Janna validation of exact disallowed categories + engineering implementation | Janna, then Founder | Not confirmed | `FF_SERVER_PARTY_CONTROL` (OFF, per Rev1 §20) | Not independently confirmed |
| Server declarations (full lifecycle) | Design-stage | Janna validation of declaration content | Janna, then Founder | Partial (states exist per handoff) | `FF_SERVER_DECLARATIONS` (OFF) | Not independently confirmed |
| Broker-supervision public wording | Disabled pending validation | Janna validation of wording | Janna, then Founder | N/A (copy-only) | `FF_PUBLIC_BROKER_WORDING` (OFF) | Not independently confirmed |
| Attorney-workflow public wording | Disabled pending validation | Janna validation of wording | Janna, then Founder | N/A (copy-only) | `FF_PUBLIC_ATTORNEY_WORKFLOW_WORDING` (OFF) | Not independently confirmed |
| Payment-event capture | Disabled by default | Founder implementation authorization | Founder | Not confirmed | `FF_PAYMENT_EVENT_CAPTURE` (OFF) | Not independently confirmed |
| Accepted-partial-payment workflow closure | Disabled by default | Janna validation of the conservative policy + Founder authorization | Janna, then Founder | Not confirmed | `FF_ACCEPTED_PARTIAL_CLOSES_WORKFLOW` (OFF) | Not independently confirmed |
| Resolve & Record (six outcomes) | Disabled by default | Founder implementation authorization | Founder | Partial (RESDOC §12 enums) | `FF_RESOLVE_RECORD` (OFF) | Not independently confirmed |
| Entity landlord signing/representation functions | Unresolved; permitted scope limited to fact-supply and document-prep assistance only | Janna validation + Founder beta-eligibility decision | Janna, then Founder | Not confirmed | No dedicated flag identified in either spec document | Not independently confirmed |
| Official court-form inclusion in self-filing packets | Not authorized | LDA determination + Janna form-selection validation | Janna, then Founder | Not confirmed | No dedicated flag identified | Not independently confirmed |
| Free-beta LDA-implicated document preparation | Launch-critical; disabled absent clearance | Primary-source research + Janna validation | Janna, then Founder | N/A | `FF_BETA_MODE` gates overall beta activation | Not independently confirmed |
| `counsel_route_trigger` new writes/uses | Unavailable for new controls | Separate semantic review and authorization | Architect + Founder | Yes — existing production-consumed field | N/A (existing field, not a new flag) | Confirmed — field is production-consumed today; new writes require separate review |

---

## XIII. Recommended next sequence

1. Incorporate the Architect corrections to this memorandum.
2. Fix the memorandum as the verified noncanonical reconciliation record.
3. Prepare the proposed revised noncanonical specification or next amendment layer using the verified reconciliation.
4. Mark every unresolved legal, source, implementation, and Founder dependency explicitly and keep affected controls disabled.
5. Conduct targeted source repair and Janna validation.
6. Obtain remaining Founder product dispositions.
7. Perform Architect verification of the revised specification.
8. Prepare narrow implementation plans only for separately authorized controls.
9. Obtain separate Founder implementation authorization.
10. No jurisdiction or Production activation until all applicable gates are satisfied.

**Drafting versus implementation.** Steps 1–3 do not require every legal, source, implementation, and Founder dependency in Sections VII–IX to close first — drafting the next noncanonical specification artifact is expressly permitted before all dependencies close, provided step 4 is followed: every unresolved dependency is marked explicitly and the affected controls remain disabled in the drafted text. What remains prohibited at every step of this sequence is implementing or activating any unresolved provision. No control identified in this memorandum may be implemented or activated until its specific dependency (Sections VII, VIII, IX, and XII) is satisfied and the gates in steps 5–10 are cleared in order.

Engineering source-repair items remaining useful (though no longer blocking drafting of the next artifact, per the correction above): confirming the exact scaffolding inventory for service photographs (X-6); any repository naming migration from `current_notice_path_closed` to `current_notice_workflow_closed` (E14); and, at Founder's option, consolidating the PR #307 → PRs #312–#314 → run 30609597370 evidence chain into a single citation in a future specification artifact (C18, C22).

---

## XIV. Formal disposition request

This memorandum requests one of the following dispositions from the Architect:

- Verified for targeted legal and Founder review
- Verified with corrections
- Returned for targeted recovery
- Prohibited from further use

This memorandum does not request, and does not itself constitute, canonical adoption, implementation authorization, publication authorization, legal-gate authorization, jurisdiction activation, ECAP authorization, or Production authorization.

---

## XV. Architect review block

**Disposition (select one):**

- [x] Verified for targeted legal and Founder review
- [ ] Verified with corrections
- [ ] Returned for targeted recovery
- [ ] Prohibited from further use

**Date:** 2026-07-31

**Reviewer:** OwnerPilot Architect

**Corrections or conditions:**

The Architect corrections concerning temporal E2E evidence, service-photo evidence layers, durable persistence, RiskPath characterization, Authority Hierarchy ambiguity, partial-payment disablement, and downstream sequencing have been incorporated.

_______________________________________________

_______________________________________________

---

*Prepared by engineering (Claude/Cowork) at Founder direction, 2026-07-31. Not a legal opinion. Not a final legal-control specification. Not a production authorization. Does not modify, supersede, or consolidate any of the three reconciled source documents.*
