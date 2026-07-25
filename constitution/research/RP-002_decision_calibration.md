---
constitutional_id: RP-002
object_type: research_proposal
title: Decision Calibration (Research Proposal — proposed name "DCM")
status: Concept
version: 0.1
canonical_owner: Enterprise
governing_authority: EA-100
ratification_authority: n/a
lifecycle_state: Concept
created: 2026-07-25
updated: 2026-07-25
depends_on: [EA-100, RP-001]
required_by: []
implements: []
governed_by: [EA-100]
validated_by: [CBS-001]
supersedes: []
superseded_by: []
related_artifacts: [BTRM-001, TM-001, CM-001, RIE-001, OCM-001, RP-001, ADR-014]
registry_tags: [research-proposal, non-constitutional, decision-calibration]
program_phase: research
repository_path: constitution/research/RP-002_decision_calibration.md
checksum_scope: file
---

# RP-002 — Decision Calibration (Research Proposal)

> **NON-CONSTITUTIONAL.** This is a Research Proposal (ADR-014), not a ratified artifact and not "DCM-001." The name "DCM-001" was suggested informally but **no CRID in that family is assigned or reserved** — assigning one requires the pipeline below to run first. This capture exists specifically because the idea was raised without first checking it against BTRM-001, and Engineering flagged that gap (2026-07-25).

## Idea (as proposed)

A "Decision Calibration Model" that would score how well a recommended decision is calibrated to the evidence and stakes involved — informally, "should we be more or less confident acting on this recommendation than the recommendation itself implies."

## Explicit overlap check required before any reconciliation memo is written

This idea sits very close to territory BTRM-001 already ratified (ADR-013) and specified in detail:

- **CM-001 (Confidence Model)** already measures "how certain are we that this analysis is correct," independent of the subject — which is most of what "calibration" usually means.
- **TM-001 (Trust & Reliance Model)** already produces claim-specific reliance levels, explicitly *not* a single fused score, which is the opposite of what a naive "calibration score" would produce — any DCM-shaped artifact must not re-introduce a fused score BTRM-001 deliberately avoided (spec §3.3, §6).
- **OCM-001 (Outcome Comparison Model)** already reports qualitative support bands (Strongly supported / Supported / Uncertain / Weakly supported / Insufficient evidence) rather than fabricated probabilities — a "calibration" model must not reintroduce numeric probabilities BTRM-001 explicitly prohibited (spec §3.7, §15).

**A reconciliation memo has not been written.** Until one is, the working hypothesis is that "Decision Calibration" is likely *already covered* by TM-001 + CM-001 + OCM-001 working together, and may not warrant a new CRID at all — but that conclusion itself needs the reconciliation step, not an assumption recorded here.

## Path to graduation (if it survives reconciliation)

Reconciliation memo (checking the three overlaps above) → if a genuine gap remains, Architecture Draft → self-critique → independent architecture-review-board challenge → ADR → Founder ratification. No CRID (e.g. "DCM-001") is assigned before that pipeline completes.

## Status

Captured 2026-07-25. No reconciliation memo authored yet. Not reconciled, not drafted, not reviewed, not ratified.
