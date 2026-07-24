---
constitutional_id: STD-002
object_type: standard
title: Constitutional Artifact Lifecycle
status: Ratified
canonical_owner: Governance
governing_authority: EA-000
ratification_authority: Founder
lifecycle_state: Ratified
created: 2026-07-24
updated: 2026-07-24
depends_on: [CON-001, EA-000]
required_by: []
implements: [EA-000]
governed_by: [EA-000]
validated_by: [CA-001]
supersedes: []
superseded_by: []
related_artifacts: []
registry_tags: [lifecycle]
program_phase: foundation
repository_path: constitution/standards/constitutional_artifact_lifecycle.md
checksum_scope: file
---

# Standard — Constitutional Artifact Lifecycle

**Status:** ADOPTED (Founder directive, 2026-07-24) · **Scope:** every constitutional artifact — EA documents, doctrines, standards, intelligence models, registries, capabilities, ADRs-as-decisions, and infrastructure proposals.

## Why
The repository is accumulating proposals (TM-001, CM-001, CD-001, Knowledge Graph, EA-012, Intelligence Model Registry). Without a declared state, a reader cannot tell an idea from an approved design from an operational capability. Every artifact must therefore carry exactly one lifecycle state.

## The lifecycle states (ordered)
1. **Concept** — an idea captured; no committed scope. Not authorized for design.
2. **Proposed** — specification recorded (Founder-identified or Founder-authorized to record). Not designed.
3. **Architecture Draft** — canonical architecture / mapping being authored; not yet reviewed.
4. **Founder Review** — architecture complete, awaiting Founder ratification.
5. **Ratified** — Founder-approved design; authorized to implement. Not yet built.
6. **Implemented** — built in the repository (and, where applicable, applied through the migration workflow), not yet in steady use.
7. **Operational** — in active use; monitored by validation/CA-001.
8. **Superseded** — replaced by a newer artifact (record `superseded_by`).
9. **Archived** — retired; retained for history/recovery only.

## Rules
- **Exactly one state per artifact,** declared in the artifact's front-matter (`status:`) and mirrored in `STATUS.md`.
- **No skipping the design gate:** nothing moves past *Proposed* into design without Founder authorization to begin; nothing reaches *Ratified* without Founder review.
- **AI never self-advances an artifact** past *Architecture Draft*. Founder Review → Ratified is a Founder-only transition; CA-001 may assure but not ratify.
- **State changes are recorded** — in the artifact and in `STATUS.md` — with date and authority. Transitions to *Superseded*/*Archived* name the successor.
- **`Proposed` ≠ commitment.** A recorded proposal binds nothing until ratified.

## Current artifact states (as of 2026-07-24)
| Artifact | State | Note |
|---|---|---|
| CA-001 Constitutional Auditor | **Operational** | ratified + merged `456d94e`; automation designed, not yet deployed |
| Constitution v1.1 (schema baseline) | **Operational** | `const_0001` applied; checksum `60ea83bc…` |
| Constitutional Intelligence Layer (doctrine) | **Ratified** (doctrine ADOPTED) | `doctrines/constitutional_intelligence_layer.md` |
| Constitutional Artifact Lifecycle (this standard) | **Ratified** (ADOPTED) | governs all artifacts |
| EA-012 Constitutional Intelligence Layer | **Proposed** | scope mandate recorded; architecture not begun |
| Intelligence Model Registry | **Proposed** | entry schema recorded; governed by EA-012 |
| TM-001 Trust Model | **Proposed** | design authorized, priority 6 |
| CM-001 Confidence Model | **Proposed** | design after TM-001 |
| CKG-001 Knowledge Graph (P5.5) | **Proposed** | governed-relationships-first |
| CD-001 | **Proposed** | draft PROPOSED only |
| ESL-005 (Monte Carlo 5A) | **Ratified** design, **draft not applied** | held behind resume gate |

`STATUS.md` is the canonical mirror; on any state change, update both.
