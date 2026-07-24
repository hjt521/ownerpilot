---
constitutional_id: REG-CAP-001
object_type: registry
title: Constitutional Capability Registry
status: Architecture Draft
version: 1.0
canonical_owner: Governance
governing_authority: EA-000
ratification_authority: Founder
lifecycle_state: Architecture Draft
created: 2026-07-24
updated: 2026-07-24
depends_on: [EA-000, MAP-001, STD-003, CBS-001]
required_by: [CKG-001, IMR-001, CK-001]
implements: [EA-000]
governed_by: [EA-000]
validated_by: [CBS-001, CA-001]
supersedes: []
superseded_by: []
related_artifacts: [CA-001, CK-001, EA-010]
registry_tags: [capability-registry, semantic-center, P5]
program_phase: P5
repository_path: constitution/architecture/REG-CAP-001_capability_registry.md
checksum_scope: file
---

# REG-CAP-001 — Constitutional Capability Registry (Phase II P5)

**The canonical semantic registry of enterprise capabilities — the principal integration point between architecture, governance, runtime, and future intelligence.** Not merely another list: each capability is a **governed constitutional object**. This is the connective center of the enterprise:

```
Enterprise Architecture → Knowledge Library → Knowledge Graph → Intelligence Models
        ↘                                                              ↙
                     REG-CAP-001  Capability Registry
        ↗                                                              ↖
   AI Organizations  →  Runtime  →  OwnerPilot products
```

Lifecycle: **Architecture Draft** — built as P5, awaiting Founder ratification. Governed by EA-000; a Layer-2 infrastructure artifact. **No new intelligence models** are designed here (the registry is infrastructure — it honors the standing hold).

## What it registers (capability classes)
Constitutional capabilities · Enterprise capabilities · Runtime capabilities · AI capabilities · Human capabilities (where governed) · Future intelligence capabilities. Classes are declared now; slots are filled additively as capabilities are ratified.

## Capability object (governed) — 14 fields
Each capability carries STD-003 front-matter plus three capability-specific fields:

| Capability field | Source |
|---|---|
| Permanent Capability ID | `constitutional_id` (CAP-/coined; immutable) |
| Name | `title` |
| Purpose | summary/`title` |
| Owner | `canonical_owner` |
| Lifecycle | `lifecycle_state` (STD-002) |
| Dependencies | `depends_on` |
| Implementing artifacts | `implements` / `related_artifacts` |
| Governing Enterprise Architecture | `governed_by` (an EA CRID) |
| Governing ADRs | `related_artifacts` (ADR CRIDs) |
| Validation authority | `validated_by` (CBS-001 / CA-001) |
| Security classification | **`security_classification`** *(new capability field)* |
| Operational maturity | **`operational_maturity`** *(new; may mirror lifecycle)* |
| Related capabilities | `related_artifacts` (capability CRIDs) |
| Runtime bindings (when applicable) | **`runtime_bindings`** *(new; endpoints/services a capability is wired to)* |

The three new fields extend STD-003 additively (optional) — no material change to the schema (STD-004 respected).

## Capability ID scheme
Capabilities use the `CAP-` family or preserved coined IDs. **Immutable** (MAP-001 §1). Current coined capability IDs: `CA-001` (Auditor), `CK-001` (Query Engine).

## Currently registered capabilities (initial catalog)
| Capability ID | Name | Class | Owner | Lifecycle | Governing EA |
|---|---|---|---|---|---|
| CA-001 | Constitutional Auditor | Constitutional / Assurance | Assurance | Operational | (ADR-009) |
| CK-001 | Constitutional Query Engine | Constitutional / Runtime | Intelligence | Proposed | EA-000 / EA-012 |

Generated view: **`constitution/index/capability_index.json`** (CBS-001, from `object_type: capability`). *Reserved, not yet registered: enterprise/runtime/AI/human capability classes fill in as ratified; future intelligence capabilities remain behind the model hold.*

## Canonical placement — extend, do not duplicate
The authoritative **database** store for registered capabilities is the **existing live `constitution.capabilities` table** (introspected; 59-table schema). REG-CAP-001 **audits and extends** that table — it does **not** create a parallel registry (same rule CA-001 followed: capability → `constitution.capabilities`). The **repository** catalog (capability front-matter + generated `capability_index.json`) is the source-of-truth for governance; DB-row registration is a future reviewed, repository-first migration — **none applied here**.

## Why P5 is the semantic center
Everything now depends on capabilities: EAs describe them, the Knowledge Library catalogs them, the Knowledge Graph links them, Intelligence Models are capabilities, AI Organizations own them, Runtime binds them, and OwnerPilot products consume them. The registry is the single place those layers meet.

## Governance
Governed by EA-000; validated by CBS-001 (metadata/reference integrity) + CA-001; generated view kept current by CBS-001. Registering a capability is additive; a capability never becomes a second source of architectural truth. **Status:** Architecture Draft — awaiting Founder ratification.
