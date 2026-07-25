---
constitutional_id: RP-003
object_type: research_proposal
title: Portfolio Memory (Research Proposal)
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
related_artifacts: [BTRM-001, POL-001, ECAP-004, RP-001, ADR-014]
registry_tags: [research-proposal, non-constitutional, portfolio-memory]
program_phase: research
repository_path: constitution/research/RP-003_portfolio_memory.md
checksum_scope: file
---

# RP-003 — Portfolio Memory (Research Proposal)

> **NON-CONSTITUTIONAL.** Research Proposal per ADR-014. Not a ratified artifact.

## Idea

A cross-matter memory layer: does this owner's portfolio, across multiple properties/tenants over time, show patterns (e.g. a recurring dispute type, a recurring resolution strategy that works) that a single-matter view can't see? Distinct from a per-person "score" (explicitly prohibited by BTRM-001 §11/TM-001) — this would be portfolio-level, not person-level, pattern surfacing.

## Overlap to resolve before any CRID is assigned
- **POL-001** (Post-Outcome Learning, BTRM-001) already does recency-and-relevance-weighted feedback per matter — Portfolio Memory would need to explain what it adds *across* matters that POL-001 doesn't already do within one.
- **ECAP-004 (RiskPath)** already models risk across a matter's lifecycle; overlap with any cross-portfolio view needs checking before this is treated as new territory.
- Must independently confirm this does not become a disguised per-tenant reputation score — BTRM-001's prohibition on personality labeling and permanent scores (§11) would apply with equal force here if the memory layer ever touches identifiable individuals rather than aggregate portfolio patterns.

## Status

Captured 2026-07-25. No reconciliation memo authored yet. Not reconciled, not drafted, not reviewed, not ratified.
