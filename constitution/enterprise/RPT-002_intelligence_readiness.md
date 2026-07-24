---
constitutional_id: RPT-002
object_type: report
title: Enterprise Intelligence Readiness (substrate only — no models)
status: Operational
version: 1.0
canonical_owner: Enterprise
governing_authority: EA-100
ratification_authority: n/a
lifecycle_state: Operational
created: 2026-07-24
updated: 2026-07-24
depends_on: [EA-100, REG-CAP-001, EA-010]
required_by: []
implements: [EA-100]
governed_by: [EA-100]
validated_by: [CBS-001, CA-001]
supersedes: []
superseded_by: []
related_artifacts: [EA-012, DOC-001, IMR-001, CKG-001]
registry_tags: [intelligence, readiness, extension-points]
program_phase: enterprise-F
repository_path: constitution/enterprise/RPT-002_intelligence_readiness.md
checksum_scope: file
---

# RPT-002 — Enterprise Intelligence Readiness

**Substrate preparation only. TM-001 and CM-001 are NOT begun** — they remain Proposed and undesigned (standing hold). This describes the extension points so future intelligence models inherit the common platform rather than reinventing it.

## Extension points (defined, not implemented)
- **Intelligence extension points:** every enterprise capability (ECAP-*) is already a governed object in REG-CAP-001 — a model attaches to a capability by referencing its CRID, never by embedding logic in it.
- **Shared evidence interface:** the STD-003 evidence vocabulary + the eight-relation dependency model (MAP-001) are the shared evidence substrate; models consume evidence classes, never raw ad-hoc scores.
- **Assessment interface:** an assessment references `subject` (a capability/actor CRID), `context`, `evidence_items`, `confidence`, and `assessor` — the common shape TM-001/CM-001 will adopt (per DOC-001, the Intelligence Layer doctrine).
- **Capability hooks:** capabilities expose `runtime_bindings` + `data_ownership` in metadata; a model binds to these declared surfaces.
- **Registry integration:** REG-CAP-001 (`capability_index.json`) is the lookup a model uses to discover what it can assess.
- **Knowledge Graph integration:** CKG-001 (Proposed) will link models ↔ capabilities ↔ evidence using the same CRID edges CBS-001 already emits (`dependency_graph.json`).

## Guarantee
Because these interfaces exist as metadata now, adding TM-001/CM-001 later requires **no constitutional redesign** (STD-004): the models plug into EA-012 (Intelligence Layer) and reference the ready substrate. This report is descriptive; it builds no model.
