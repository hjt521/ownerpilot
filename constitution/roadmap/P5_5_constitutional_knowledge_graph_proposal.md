---
constitutional_id: CKG-001
governed_by: [EA-000]
lifecycle_state: Proposed
object_type: constitutional_infrastructure
title: Constitutional Knowledge Graph
status: PROPOSED
authority_source: Founder (placed at Phase II priority 5.5; design NOT yet authorized to begin)
canonical_owner: Constitutional Intelligence
ratification_authority: Founder
implementation_posture: governed-relationships-first; graph database is an optional later substrate, not a prerequisite
program_priority: 5.5 (immediately after the Capability Registry, before TM-001)
---

# P5.5 — Constitutional Knowledge Graph™ (PROPOSED)

> **Recorded, not designed.** The Founder placed the Knowledge Graph at Phase II priority 5.5 — "the platform needs relationships, not just artifacts." This file **preserves the Founder's specification**; canonical mapping, schema, and any traversal tooling are priority-5.5 work **not performed here**. **Not binding until Founder ratification of the completed canonical artifact.**

## Purpose
Give the constitution **governed relationships** between its objects, not just a catalog of artifacts. Today the repository holds books, doctrines, ADRs, EA docs, capabilities, organizations, and models as discrete items; the graph makes the *connections* between them first-class, queryable, and governed.

## Nodes to connect (Founder spec)
Books · Doctrines · ADRs · Enterprise Architecture · Capabilities · AI Organizations · Trust Models · Decision Models · Behavioral Models · Constitutional Auditor · Founder Decisions.

## Design stance (Founder)
**Does not require a graph database initially.** It **begins as governed relationships in the existing constitutional structures** — relationship rows/edges represented within the current `constitution` schema conventions (codes, FKs, `approved_by text` governance identities), under the same migration workflow and validation. A dedicated graph substrate is a *possible later* optimization, decided on evidence, not a precondition.

## Why 5.5 (sequencing rationale)
Placed **immediately after the Capability Registry** (P5) and **before TM-001** (P6): once capabilities, organizations, and the knowledge library exist as inventoried nodes, the graph can connect them — and TM-001 then has a **rich relationship fabric to reference** rather than isolated artifacts. Introducing it later would force Trust/Decision/Confidence models to invent ad-hoc cross-references.

## Constitutional posture (inherited from the Intelligence Layer directive)
The graph is **shared traceability infrastructure**, not a scoring system. Relationships are evidence-backed and explainable; edges carry governance provenance (who asserted the relationship, under what authority). No hidden inference of relationships; `Indeterminate`/absent when unasserted. CA-001 audits the graph's integrity like any other constitutional structure.

## Canonical placement intent (mapping is priority-5.5 work; NOT done here)
Audit + extend the existing `constitution` structures; represent nodes as the already-canonical objects (capabilities, ai_organizations, artifacts, ADRs-as-records, model registries) and add a governed **relationship/edge** representation only where no current structure expresses typed, provenance-bearing relationships. New table(s) only if edges cannot be represented without semantic distortion. Resolved during design, after P5.

## Status in program
PROPOSED · priority 5.5 · **governed-relationships-first, no graph DB assumed** · **no schema, no DB change, no design begun, no ratification** until the Founder authorizes design and later ratifies the completed canonical artifact.
