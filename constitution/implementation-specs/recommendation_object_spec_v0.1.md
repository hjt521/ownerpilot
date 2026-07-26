# Recommendation Object — Implementation Specification v0.1

**Status: subordinate implementation specification, not a constitutional artifact.** No CRID, no CBS-001 registration, no Founder ratification required to evolve — per RPT-017 §1 and EA-102 §2.0's own precedent, this spec may change as long as it continues to satisfy the semantic invariants those two documents establish. It does not itself authorize any code, schema, or runtime change; it exists so that whenever Recommendation Object work does become authorized (inside a future ratified EA-101), there is one concrete shape to build against instead of RP-006's and RP-008's two divergent field lists.

**Versioning discipline (per ADR-017):** this document's own version (v0.1) numbers this spec only. It is independent of EA-102's document version (currently v0.2), of any future EA-101 document version, of BTRM-001's version, and of any adapter/source-schema version. None of these are interchangeable.

## 0. What this is

The canonical target shape for "a recommendation OwnerPilot produces," reconciling RP-006's 14-field proposal and RP-008's 18-field proposal per RPT-017 §1's finding that the disagreement between them is itself evidence a fixed field list was the wrong instrument at Concept stage. This spec defines the same thing EA-102 §2.0 defines for its Normalized Learning Contract — semantic invariants first, precise fields second — because Recommendation Object is a more central, longer-lived type than the Learning Contract and deserves the same discipline applied more carefully, not less.

## 1. Semantic invariants (binding on any future implementation)

Any concrete Recommendation Object schema must satisfy all of the following:

1. **Objective reference, not restatement.** The owner's objective is a reference into whatever produces it (today: caller-supplied context; per BTRM-001's own convention, never invented by the object itself).
2. **Evidence and unknowns are separate fields**, never merged into one narrative block. Evidence cites specific resolved items (ENR-001 provenance-classified events); unknowns/missing information are named as gaps, never silently omitted (same rule EA-102 §2.0 states for its own contract).
3. **Legal analysis, financial analysis, behavioral/negotiation input, and confidence are each kept in their own field**, cross-referencing their source component (Legal & Compliance context, a future Financial Intelligence Engine, BAE-001/TM-001, CM-001) rather than being flattened into prose. This is the same discipline BTRM-001 §3.2/§3.4 already requires between quality and confidence, extended to every dimension here.
4. **Confidence and predicted outcome are never combined into one value.** This repeats EA-102 §2.0's rule verbatim because Recommendation Object is exactly the kind of object where the two get conflated if not stated explicitly.
5. **Risks and alternative strategies are references to already-produced structures** (RIE-001's `materialRisks`, OCM-001's compared alternatives), not re-derived.
6. **A communication artifact reference**, not inlined communication text — CS-001 already owns communication structuring; Recommendation Object cites it.
7. **Execution steps and a review trigger are explicit, separate fields** — "what happens next" and "when should this be revisited" are different questions and must not share one field.
8. **An explainability reference is mandatory** — reuses BTRM-001's `ExplainabilityEnvelope` shape (evidenceCited, behaviorsIdentified, howRelianceDetermined, missingInformation, whatWouldChangeThis, whyPreferred), not a new explainability shape.
9. **A human-review-required flag, inherited, never independently computed** by Recommendation Object itself — it is inherited unchanged from whatever `ResolutionOption` or successor type produced the recommendation, per BTRM-001 §6/§11's standing rule.
10. **No field may be populated except from a resolved reference.** An unresolved or nonexistent referenced id contributes nothing — the same "no fabricated support" rule ICOA-001, RIE-001, and OCM-001 already enforce, applied here without exception.

## 2. Illustrative field mapping (non-binding, subject to change without amending this invariant list)

```text
RecommendationObject (illustrative shape, v0.1 -- not yet implemented, not yet authorized)
{
  id, matter_id,
  spec_version: "recommendation-object-v0.1",
  source_system, source_artifact_type, source_schema_version,   // per EA-102 §2.0's provenance invariant

  objectiveRef,                                                  // invariant 1
  evidenceCited: [],  unknowns: [],                              // invariant 2
  legalAnalysisRef, financialAnalysisRef,                        // invariant 3 (financialAnalysisRef may be null pending
                                                                  //   a Financial Intelligence Engine -- see RPT-017 §6)
  behavioralRef, negotiationRef,                                 // invariant 3
  confidenceRef,                                                 // invariant 4 (kept apart from predictedOutcomeRef)
  predictedOutcomeRef,                                           // invariant 4
  materialRisks: [], alternativeOptionRefs: [],                  // invariant 5
  communicationRef,                                              // invariant 6
  executionSteps: [], reviewTrigger,                              // invariant 7
  envelope,                                                       // invariant 8 (ExplainabilityEnvelope)
  humanReviewRequired,                                            // invariant 9, inherited
  recordedAt
}
```

## 3. Relationship to what already exists

This spec does not replace `ResolutionOption` (RIE-001), `OutcomeComparison` (OCM-001), or EA-102 §2.0's Normalized Learning Contract. All three remain the real, shipped or ratified types today. Recommendation Object is the future canonical unification those would migrate toward once EA-101 ratifies it as a real CRID — not a fourth parallel shape built independently of them. Until that ratification, this document is descriptive and non-binding.

## 4. What this spec does not decide

Whether Recommendation Object becomes its own CRID (e.g., a component of EA-101 the way ENR-001/BAE-001/etc. are components of BTRM-001) or remains a type defined entirely inside EA-101's own text is an EA-101 Architecture Draft decision, not this spec's. Nothing here should be read as pre-deciding that question.
