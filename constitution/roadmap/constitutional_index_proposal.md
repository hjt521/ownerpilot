---
constitutional_id: CIX-001
object_type: constitutional_infrastructure
title: Constitutional Index
status: Proposed
lifecycle_state: Proposed
authority_source: Founder (2026-07-24 — directed introducing a machine-readable index; build NOT yet authorized)
canonical_owner: Constitutional Governance
ratification_authority: Founder
governed_by: EA-000 Constitutional Meta-Architecture
program_priority: build alongside/after P2 Canonical Architecture Mapping; serializes EA-000's dependency graph
---

# CIX-001 — Constitutional Index (PROPOSED)

> **Recorded, not designed.** The Founder directed introducing a **machine-readable inventory** of the Constitution — not an architecture doc, not a roadmap, but structured data keyed on canonical IDs. This file records the specification. Build is **not authorized** here.

## Purpose
A machine-readable index of every constitutional artifact, referencing **canonical IDs rather than file names**, so search, validation, dependency analysis, and future tooling (CK-001, CA-001 automation, the Knowledge Graph) operate on stable identifiers instead of brittle paths.

## Proposed layout (Founder spec)
```
constitution/index/
  artifact_index.json     # every artifact: id, type, title, path, lifecycle_state, authority
  capability_index.json   # capabilities (canonical IDs)
  ea_index.json           # Enterprise Architecture docs (EA-000, EA-010, EA-011, EA-012…)
  adr_index.json          # ADRs (ADR-001…)
  doctrine_index.json     # doctrines
  registry_index.json     # registries (IMR-001…)
```

## Design principles
- **ID-first:** entries key on `constitutional_id`; file paths are attributes, not identity — a file can move without breaking references.
- **Derived, not authored:** the index should be **generated** from artifact front-matter (each artifact already declares `constitutional_id`, `object_type`, `status`/`lifecycle_state`, `authority_source`), so it can never silently diverge; a validation check fails if the index and the front-matter disagree.
- **Dependency-bearing:** captures each artifact's `governed_by` / references, serializing EA-000's dependency graph into queryable data.
- **Validation-wired:** `validation/run_checks` gains an index-integrity check (every artifact indexed exactly once; no orphan/dangling IDs; lifecycle states match).

## Relationships
Serializes **EA-000**'s hierarchy + dependency graph · consumed by **CK-001** (query engine) · nodes align with the **P5.5 Knowledge Graph** · maintained per release (added to the migration-workflow doc-refresh step and the Recovery Bundle).

## Status in program
**Proposed** (lifecycle: Proposed) · layout + principles recorded · **no files generated, no tooling built, no ratification** until EA-000 direction and Founder authorization. Generation should follow EA-000 so the index reflects a ratified taxonomy.
