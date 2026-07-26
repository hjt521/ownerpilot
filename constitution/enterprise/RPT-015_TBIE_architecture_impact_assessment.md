---
constitutional_id: RPT-015
object_type: report
title: RP-007 (TBIE / CEE) Architecture Impact Assessment
status: Concept
version: 0.2
canonical_owner: Enterprise
governing_authority: EA-100
ratification_authority: n/a
lifecycle_state: Concept
created: 2026-07-25
updated: 2026-07-25
depends_on: [RP-007, BTRM-001]
required_by: []
implements: []
governed_by: [EA-100]
validated_by: [CBS-001]
supersedes: []
superseded_by: []
related_artifacts: [RP-007, BTRM-001, ENR-001, BAE-001, TM-001, CM-001, RIE-001, CS-001, POL-001, ICOA-001, RP-005, RP-006, RPT-012, RPT-013, RPT-014, ADR-015, DOC-003, EA-012]
registry_tags: [report, architecture-impact-assessment, tbie, cee, non-constitutional]
program_phase: research
repository_path: constitution/enterprise/RPT-015_TBIE_architecture_impact_assessment.md
checksum_scope: file
---

# RPT-015 — Architecture Impact Assessment: RP-007 (TBIE / CEE), v0.2

> **NON-CONSTITUTIONAL.** Revised against RP-007 v0.2, the Founder's engineering-ready revision of the same-day TBIE/CEE directive. This supersedes the v0.1 assessment: several concerns raised there were addressed directly in the revised directive's own text rather than requiring separate reconciliation. What remains is narrower and more concrete.

## 1. What the revised directive already resolved on its own

The v0.1 assessment's two largest concerns were (a) the recurring numeric-probability-vs-OCM-001 conflict, appearing a third time, and (b) the OPOS/OPIL-vs-EA-012 naming collision being compounded by a new placement. Both are now addressed directly in the directive text:

- **Numeric-probability conflict** — §3.2 prohibits any tenant score, composite behavioral rating, or "87 out of 100" assessment, and states internal quantitative measurements may never independently approve/reject/rank/trigger an action or override a human-review gate, and that critical concerns may not be averaged away. §12.1's numerical-prediction guardrails go further: a bounded probability may not become a score, adverse-action trigger, or "the sole reason for a recommendation," and the system must fall back to a qualitative forecast ("more likely than current alternatives," "insufficient evidence") where a defensible number isn't supportable, with false precision explicitly prohibited. This is, point for point, the disposition already ratified in **ADR-015**/**BTRM-001 §3.7.1**. No new reconciliation memorandum is needed; the directive already governs itself under the existing ruling rather than reopening it. Recommend closing this line of concern rather than raising it a fourth time in some future directive — the standing answer is now stated in three independent places (BTRM-001, ADR-015, and this directive), which should be sufficient going forward.
- **OPIL naming collision** — §19 explicitly instructs: do not silently resolve the existing OPIL nomenclature conflict, and use "OwnerPilot Intelligence Layer" as product-layer shorthand only pending its separate resolution. That is exactly the right interim posture (RPT-013's open finding is neither ignored nor quietly closed). No further action needed here beyond eventually actually resolving RPT-013's naming question, which remains open on its own.
- **Constitutional over-reach** — §19 also states plainly: don't create a new constitutional doctrine merely because the subsystem is significant, and create an RP only if implementation reveals a genuine constitutional question. §24 draws an explicit authorization boundary (research/architecture/schema/prototyping/testing/bounded integration planning only; no autonomous execution, no constitutional expansion unrelated to implementation). This already matches DOC-003/CA-001's posture without needing a new statement from this report.

## 2. What remains: schema extension vs. parallel schema

The one substantive open engineering question is whether TBIE/CEE's required data models (§9 Event Model, §10 Behavioral Observation Model, §11 Case Evolution Model) should be built as **extensions of ENR-001/BAE-001's already-shipped types**, or as a **parallel schema** built from zero. This matters because the two are not equivalent in scope:

- §9's Event Model asks for materially more than ENR-001's current `TimelineEvent` (id, matterId, occurredAt, eventType, participants, sourceItemIds, provenance, disputed, behavioralHint): property identifier, actor role, source type/reference, structured factual fields, legal/workflow significance, corroboration status, sensitivity classification, data-entry/extraction method and confidence, human verification status, superseded/corrected status, related-event links, retention rule, schema version.
- §10's Behavioral Observation Model asks for materially more than BAE-001's current `BehavioralObservation` (id, eventClass, dimension, subjectId, provenance, observedAt, magnitude): a narrative observation string, explicit time window, supporting/contradictory event id lists, trend direction, recency assessment, evidence sufficiency, confidence state, assumptions, limitations, generation/review dates, expiration/reassessment condition, human-review status.

This is not simply "TBIE is BAE-001/ENR-001 renamed," which was the v0.1 assessment's framing — ENR-001/BAE-001 were deliberately scoped narrow at Stage 1/2 (corroboration explicitly deferred to CM-001; no free-text commitment/behavioral inference, only pre-classified hints), and the richer fields the directive now asks for (corroboration status, sensitivity classification, extraction confidence, retention rules, narrative observation text, trend/recency assessment) were out of scope by design, not by oversight. Recommend the eventual Architecture Draft treat ENR-001's `TimelineEvent`/`ProvenanceLedger` and BAE-001's `BehavioralObservation` as the base layer to extend — reusing `sourceItemIds`, `provenance`, and `behavioralHint`/`CommitmentHint` conventions already established — rather than standing up a second, disconnected event/observation model. Concretely: §9/§10's new fields are additive (richer classification, retention, extraction metadata, narrative text, trend/expiry state), not a different shape, so extension is very likely the right call, but it is a genuine design decision for the Architecture Draft to make explicitly and document (per §20's ADR subject list, which already includes "event-sourced behavioral evidence" as a candidate ADR).

## 3. Case Evolution Engine

CEE is now fully specified (§4.2, §6, §11) rather than an addendum, and is architecturally required to stay distinguishable from TBIE in schema, reasoning, and logs (§4.2). This confirms the v0.1 finding that CEE has no existing owner in BTRM-001 — ICOA-001 (interests/constraints at a point in time) and RIE-001 (case-state-dependent options) come closest, but neither models the case's own state trajectory as a first-class, versioned object. CEE remains the one component of this whole directive that is genuinely new territory rather than an extension of existing architecture, and §20 already lists "separation of TBIE from CEE" as a candidate ADR subject, which is the right place to settle the CEE/ICOA-001/RIE-001 boundary formally.

## 4. Recommendation

1. No further reconciliation memorandum is needed for the numeric-probability question or the OPIL-naming question — the directive already governs itself correctly on both, citing/matching ADR-015 and deferring to RPT-013 respectively.
2. Treat this RP-007 v0.2 directive's Phase 1 (§21) — research, terminology, system boundaries, evidence taxonomy, event/observation/case-state schemas, privacy assessment, threat assessment, ADR proposals — as the next concrete piece of work, to be scoped as an **extension** of ENR-001/BAE-001's existing types rather than a parallel schema, with that decision itself recorded as an ADR per §20.
3. Scope CEE as a separate model from the outset (per the directive's own requirement), with its relationship to ICOA-001/RIE-001 settled via the "separation of TBIE from CEE" ADR candidate in §20.
4. Do not begin Phase 2+ implementation, and do not begin drafting the 20 architecture deliverables listed in RP-007 §19, until the Founder confirms this is the next priority relative to the still-pending BTRM-001 Stage 3-7 build order (CM-001 wiring, ICOA-001, RIE-001, CS-001/OCM-001, POL-001) — several of those stages are direct dependencies for TBIE/CEE's own required models (CM-001 for confidence, POL-001 for recency weighting, RIE-001/CS-001 for the Synthesizer/communication integration this directive assumes exist).

## 5. Status

Findings only, revised in place against RP-007 v0.2. RP-007 remains Concept. No Architecture Draft has begun. No CRID has been assigned to TBIE, CEE, or any named sub-model.
