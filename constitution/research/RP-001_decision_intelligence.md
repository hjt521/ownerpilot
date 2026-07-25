---
constitutional_id: RP-001
object_type: research_proposal
title: Decision Intelligence (Research Proposal)
status: Concept
version: 0.1
canonical_owner: Enterprise
governing_authority: EA-100
ratification_authority: n/a
lifecycle_state: Concept
created: 2026-07-25
updated: 2026-07-25
depends_on: [EA-100]
required_by: []
implements: []
governed_by: [EA-100]
validated_by: [CBS-001]
supersedes: []
superseded_by: []
related_artifacts: [BTRM-001, TM-001, CM-001, RP-002, RP-003, RP-004, ADR-014]
registry_tags: [research-proposal, non-constitutional, decision-intelligence]
program_phase: research
repository_path: constitution/research/RP-001_decision_intelligence.md
checksum_scope: file
---

# RP-001 — Decision Intelligence (Research Proposal)

> **NON-CONSTITUTIONAL.** This is a Research Proposal (ADR-014) — a capture of a promising idea, not a ratified or Proposed constitutional artifact. It asserts nothing about the platform's actual architecture. It may never graduate, and if it does, only through the full pipeline: Reconciliation → Architecture Draft → self-critique → independent review-board challenge → ADR → Founder ratification (the path BTRM-001 took).

## Idea

An umbrella research direction: once OwnerPilot can describe *what happened* (BAE-001) and *how much reliance is justified* (TM-001) and *how confident the analysis is* (CM-001) — the natural next question is *what should the platform recommend, and how well-calibrated is that recommendation to the actual decision at hand?* "Decision Intelligence" is the working name for that broader direction; RP-002 through RP-004 are more specific facets of it.

## Why this is captured, not proposed

BTRM-001 already ratified a full pipeline covering exactly this territory: ENR-001 (evidence) → BAE-001 (behavior) → TM-001/CM-001 (reliance/confidence) → ICOA-001 (interests) → RIE-001 (resolution options) → OCM-001 (outcome comparison) → CS-001 (communication) → POL-001 (learning). Before any new "Decision Intelligence" constitutional artifact is proposed, it must be checked against what BTRM-001 already covers — most of what "decision intelligence" would want is RIE-001 + OCM-001's job. This RP exists so the idea isn't lost while that reconciliation happens, not to pre-empt it.

## Overlap to resolve before any CRID is assigned
- **RIE-001** (Resolution Intelligence Engine) — already generates resolution options with explicit reasoning.
- **OCM-001** (Outcome Comparison Model) — already compares options qualitatively.
- **TM-001 / CM-001** — already separate reliance vs. confidence measures that any "decision calibration" concept would otherwise re-invent.

## Status

Captured 2026-07-25. No reconciliation memo authored yet. Not reconciled, not drafted, not reviewed, not ratified.
