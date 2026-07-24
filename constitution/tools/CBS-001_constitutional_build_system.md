---
constitutional_id: CBS-001
operational_maturity: implemented
security_classification: internal
capability_class: constitutional
object_type: infrastructure
title: Constitutional Build System
status: Implemented
version: 1.0
canonical_owner: Governance
governing_authority: EA-000
ratification_authority: Founder
lifecycle_state: Implemented
created: 2026-07-24
updated: 2026-07-24
depends_on: [STD-003, MAP-001]
required_by: [CIX-001, EA-010, SYS-001, REC-001]
implements: [EA-000, STD-003]
governed_by: [EA-000]
validated_by: [CA-001]
supersedes: []
superseded_by: []
related_artifacts: [CIX-001]
registry_tags: [build-system, generator, metadata, tooling]
program_phase: P4-foundation
repository_path: constitution/tools/cbs.mjs
checksum_scope: file
---

# CBS-001 — Constitutional Build System

**The single governed pipeline that compiles canonical metadata into every derived artifact.** Instead of many independent generators, one build system (`constitution/tools/cbs.mjs`, zero-dependency Node) reads artifact front-matter (the canonical source, STD-003) and produces: the Constitutional Index (CIX-001), dependency graph, repository inventory, coverage/validation report, and STATUS statistics. This is what makes the COS an operating system whose documentation, indexes, and governance artifacts are **compiled — not hand-synchronized**.

## Commands
- `node constitution/tools/cbs.mjs check` — validate only; exit 1 on any error (CI gate).
- `node constitution/tools/cbs.mjs build` — validate, then write `constitution/index/*.json`.
- `node constitution/tools/cbs.mjs status` — print the generated STATUS stats block.

## Validation (fails the build)
Duplicate CRID · broken CRID reference · dependency cycle · unknown `object_type` (warn) · missing required metadata (warn). Errors block generation; warnings are reported.

## Generated outputs (never hand-edited)
`artifact_index.json`, `ea_index.json`, `adr_index.json`, `standard_index.json`, `doctrine_index.json`, `registry_index.json`, `knowledge_index.json` (EA-010 library view), `recovery_index.json`, `validation_index.json`, `roadmap_index.json`, `dependency_graph.json`, `repository_inventory.json`, `metadata_coverage.json`.

## Principles
Repository-first · metadata-first · generated-not-synchronized · reproducible (same inputs → identical outputs) · additive · no production/runtime effect (reads `.md`, writes JSON under `constitution/index/`). CBS-001 never ratifies — it compiles; ratification stays with the Founder.

## Governance
Governed by EA-000; implements STD-003 (metadata schema) and the CRID/dependency rules of MAP-001. Wired into `validation/` (the `check` command is the metadata-drift CI gate) and the release process (build + Recovery Bundle).
