---
constitutional_id: IMR-001
object_type: constitutional_registry
title: Intelligence Model Registry
status: Proposed
lifecycle_state: Proposed
authority_source: Founder (2026-07-24 — directed the registry be introduced; design NOT yet authorized to begin)
canonical_owner: Constitutional Intelligence
ratification_authority: Founder
governed_by: EA-012 Constitutional Intelligence Layer
program_priority: build alongside the Capability Registry (P5) / EA-012; ahead of TM-001 (P6)
---

# IMR-001 — Intelligence Model Registry (PROPOSED)

> **Recorded, not designed.** The Founder directed introducing an Intelligence Model Registry to prevent intelligence models from proliferating informally. This file **preserves the Founder's specification** (the entry schema below). Canonical mapping and schema are **priority work not performed here**; governed by EA-012. **Not binding until ratification.**

## Purpose
A canonical registry of **intelligence models** — not "AI models" in the infrastructure sense, but the reasoning capabilities (Behavioral, Trust, Confidence, Negotiation, Decision, Pricing, Compliance, Constitutional Auditor, future). It is the authoritative index so no model exists informally or unversioned.

## Scope of entries (examples)
Behavioral Intelligence · TM-001 Trust · CM-001 Confidence · Negotiation Intelligence · Decision Intelligence · Pricing Intelligence · Compliance Intelligence · Constitutional Auditor (CA-001) · future models.

## Entry schema (Founder-specified fields)
Each registry entry records:
- `canonical_id`
- `owner`
- `purpose`
- `evidence_inputs`
- `outputs`
- `evaluation_suite`
- `governing_ea` (e.g. EA-012)
- `governing_doctrine` (e.g. Constitutional Intelligence Layer)
- `constitutional_constraints`
- `maturity` (maps to the artifact-lifecycle state)
- `current_version`
- `superseded_by`

## Canonical placement intent (mapping is later work; NOT done here)
Audit + extend the existing `constitution` registries — likely an extension of / relationship to `intelligence_model_registry` (if present) or `capabilities`, **not** a parallel table. A new table only if no current structure represents a versioned, evidence-typed, EA-governed model index without semantic distortion. Resolved during EA-012 / Capability-Registry work.

## Relationships
Registered under EA-012 (architecture) · each entry's `maturity` follows the artifact-lifecycle standard · entries are nodes in the P5.5 Knowledge Graph (connected to their governing EA, doctrine, evaluation suite, and audit history) · CA-001 audits registry integrity.

## Status in program
**Proposed** (lifecycle: Proposed) · entry schema recorded · **no schema, no DB change, no ratification** until EA-012 direction and Founder ratification.
