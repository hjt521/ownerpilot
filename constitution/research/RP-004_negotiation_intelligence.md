---
constitutional_id: RP-004
object_type: research_proposal
title: Negotiation Intelligence (Research Proposal)
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
related_artifacts: [BTRM-001, RIE-001, CS-001, ICOA-001, RP-001, ADR-014]
registry_tags: [research-proposal, non-constitutional, negotiation-intelligence]
program_phase: research
repository_path: constitution/research/RP-004_negotiation_intelligence.md
checksum_scope: file
---

# RP-004 — Negotiation Intelligence (Research Proposal)

> **NON-CONSTITUTIONAL.** Research Proposal per ADR-014. Not a ratified artifact.

## Idea

Deeper support for the back-and-forth of an actual negotiation between owner and tenant (or owner and vendor) — beyond a single recommended option, modeling likely counter-positions and how the communication strategy should adapt turn by turn.

## Overlap to resolve before any CRID is assigned
- **RIE-001** (BTRM-001) already generates resolution options with reliance assumptions and risk — a Negotiation Intelligence layer would need to justify what it adds beyond option generation (e.g., genuinely multi-turn adaptation) rather than duplicating RIE-001.
- **CS-001** (BTRM-001) already recommends structured, tone-aware communication per option — overlap must be checked before treating turn-by-turn negotiation support as new territory.
- **ICOA-001** (BTRM-001) already labels each party's interests/constraints as confirmed/likely/possible/unknown — must confirm this proposal does not reintroduce the "two simulated personas negotiating" pattern the BTRM-001 spec explicitly rejected (spec §0, §3.6) in favor of modeling only *documented* interests/constraints.

## Status

Captured 2026-07-25. No reconciliation memo authored yet. Not reconciled, not drafted, not reviewed, not ratified.
