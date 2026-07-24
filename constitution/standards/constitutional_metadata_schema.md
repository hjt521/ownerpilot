---
constitutional_id: STD-003
object_type: standard
title: Constitutional Metadata Schema
status: Ratified
version: 1.0
canonical_owner: Governance
governing_authority: EA-000
ratification_authority: Founder
lifecycle_state: Ratified
created: 2026-07-24
updated: 2026-07-24
depends_on: [CON-001, EA-000, MAP-001]
required_by: [CBS-001, CIX-001, EA-010]
implements: [EA-000]
governed_by: [EA-000]
validated_by: [CBS-001, VAL-001]
supersedes: []
superseded_by: []
related_artifacts: [STD-002, MAP-001]
registry_tags: [metadata, front-matter, schema]
program_phase: P2.1
repository_path: constitution/standards/constitutional_metadata_schema.md
checksum_scope: file
---

# STD-003 — Constitutional Metadata Schema

**Every constitutional artifact is self-describing.** Each carries a YAML front-matter block conforming to this schema, so the Knowledge Library (EA-010), Constitutional Index (CIX-001), Knowledge Graph (CKG-001), Query Engine (CK-001), validation, and recovery bundles are all **generated from the same metadata** — never manually synchronized. No file proceeds without metadata.

## Field schema

| Field | Req | Meaning |
|---|---|---|
| `constitutional_id` | ● | permanent CRID (MAP-001 §1); never the filename; immutable |
| `object_type` | ● | taxonomy class (e.g. `enterprise_architecture`, `adr`, `standard`, `doctrine`, `process`, `registry`, `model`, `capability`, `infrastructure`, `baseline`, `validation`, `roadmap`, `mapping`, `dashboard`) |
| `title` | ● | human title |
| `status` | ● | free status (may mirror `lifecycle_state`) |
| `version` | ○ | semantic version of the artifact |
| `canonical_owner` | ● | owning domain (Governance / Intelligence / Assurance) |
| `governing_authority` | ○ | CRID that governs this artifact (usually equals `governed_by`) |
| `ratification_authority` | ● | who ratifies (normally `Founder`; `n/a` for descriptive) |
| `lifecycle_state` | ● | STD-002 state: Concept→Proposed→Architecture Draft→Founder Review→Ratified→Implemented→Operational→Superseded→Archived |
| `created` / `updated` | ○ | dates |
| `depends_on` | ● | CRIDs this artifact needs to exist/function |
| `required_by` | ○ | CRIDs that need this one |
| `implements` | ○ | CRIDs whose intent this realizes |
| `governed_by` | ● | CRID(s) that impose rules on this artifact |
| `validated_by` | ○ | CRID(s) that validate/audit it (e.g. VAL-001, CA-001) |
| `supersedes` / `superseded_by` | ○ | lineage CRIDs |
| `related_artifacts` | ○ | non-dependency cross-references |
| `registry_tags` | ○ | free tags for search/registries |
| `program_phase` | ○ | phase that produced it |
| `repository_path` | ○ | current path (advisory; CRID is identity, path may move) |
| `checksum_scope` | ○ | `file` / `subtree` / `schema` — what a checksum covers |

●=required, ○=optional. Relation fields are **CRID lists** (`[A, B]`); free-text is tolerated but only CRID tokens are reference-checked.

## The eight relations (Constitutional Dependency Rule, MAP-001 §4 / EA-000)
`depends_on · required_by · implements · governed_by · validated_by · supersedes · superseded_by · related_artifacts`. No implicit relationships — everything a graph edge depends on must be declared here.

## Enforcement
CBS-001 (`tools/cbs.mjs`) validates this schema and **fails CI** on: missing required field, unknown `object_type`, duplicate CRID, broken CRID reference, dependency cycle, or index drift. The schema is the single source; indexes/inventories/STATUS sections/recovery bundles are generated from it.
