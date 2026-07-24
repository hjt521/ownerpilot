---
constitutional_id: EA-000
object_type: enterprise_architecture
title: Constitutional Meta-Architecture
status: Proposed
lifecycle_state: Proposed
authority_source: Founder (2026-07-24 — directed introducing EA-000 as the map of the Constitution; architecture NOT yet authorized to begin)
canonical_owner: Constitutional Governance
ratification_authority: Founder
governs: [all constitutional artifact types and their relationships]
program_priority: elevate during P2 (Canonical Architecture Mapping is its evidence base); ratify early — it is the frame the other artifacts hang on
---

# EA-000 — Constitutional Meta-Architecture™ (PROPOSED)

> **Recorded, not designed.** The Founder directed pausing new domain EAs to introduce **EA-000**: not an architecture of a feature, but the architecture of the Constitution itself — its table of contents and dependency map. This file records the **required scope**; the map itself is **Architecture-Draft work not performed here** and not authorized to begin until the Founder says so. EA-000 is meta-governance: it governs how all other constitutional artifacts relate.

## Purpose
Be the single architectural map of the Constitution — what kinds of artifacts exist, in what order they are created, which may reference which, which are normative vs descriptive, which require Founder ratification, and what the overall dependency graph is. It reduces the risk of the repository drifting as it grows.

## Artifact hierarchy (Founder-specified)
```
Founder
├── Engineering Constitution (CONSTITUTION.md)
├── Constitutional Doctrines
├── Enterprise Architecture (EA-000…EA-0NN)
├── Standards
├── ADRs
├── Capability Registry
├── Intelligence Model Registry (IMR-001)
├── Knowledge Library (EA-010 / CKL)
├── Knowledge Graph (CKG-001, P5.5)
├── Recovery
└── Validation
```

## Questions EA-000 must answer (required scope)
1. What kinds of constitutional artifacts exist (the taxonomy).
2. What order they are created in (the creation sequence / precedence).
3. Which artifacts may reference which others (the reference/citation rules).
4. Which artifacts require Founder ratification (vs. engineering-adopted).
5. Which artifacts are **normative** (binding) vs **descriptive** (informational).
6. The **dependency graph** of the Constitution (what depends on / is governed by what).

## Normative rules to be ratified into EA-000 (drafted by MAP-001, Phase II P2)
The Canonical Architecture Mapping (`MAP-001`, `architecture/canonical_architecture_mapping.md`) is EA-000's evidence base. On EA-000 ratification, these become normative:

**A. CRID — Constitutional Reference ID (permanent identifier).** Every artifact carries an immutable CRID. **The CRID is not the filename** — files and paths may move; the CRID never changes and is never reused. On supersession a new CRID is issued and the old marked `Superseded by`. CRIDs are the identifier used by the Knowledge Library, Knowledge Graph, Constitutional Index, Query Engine, validation, recovery bundles, and future APIs. Coined mnemonic IDs (CA-001, CK-001, TM-001, EA-000, IMR-001, CIX-001, CKG-001, …) and family-sequential IDs (CON-, EA-, ADR-, STD-, DOC-, PROC-, REG-, MODEL-, CAP-, INFRA-, BASE-, VAL-, MIG-, SYS-, BOOK-, VOL-) are equally valid. Full scheme + registry in MAP-001 §1–§2.

**B. Constitutional Dependency Rule.** Every artifact explicitly declares seven relations: **Depends On · Required By · Supersedes · Superseded By · Implements · Governed By · Validated By.** These are the backbone of the Knowledge Graph and the substrate for impact analysis, validation, and navigation. Declared in front-matter; every relation must resolve to a real CRID (cross-reference validation). Instantiated for all current artifacts in MAP-001 §4.

**C.** Reference rules, creation-order (precedence) rules, duplicate-detection rules, required ratification paths, and cross-reference validation — as specified in MAP-001 §5.

## Relationship to neighbouring work
- **P2 Canonical Architecture Mapping** produces the inventory EA-000 organizes — EA-000 is the *frame*, P2 the *contents*; sequence EA-000's ratification alongside/after P2.
- **Artifact Lifecycle standard** supplies each artifact's *state*; EA-000 supplies each artifact's *place and relationships*.
- **Constitutional Index** (proposed) is the machine-readable serialization of EA-000's dependency graph.
- **P5.5 Knowledge Graph** is the runtime/queryable realization of these relationships; **CK-001** (proposed) queries them.

## Normative vs descriptive (design target)
EA-000 must classify every artifact type as normative (imposes obligations — e.g. standards, ratified ADRs, EAs) or descriptive (records state — e.g. STATUS.md, inventories, reports). This distinction drives what CA-001 audits for compliance vs merely for accuracy.

## Status in program
**Proposed** (lifecycle: Proposed) · scope mandate recorded · **no architecture, no schema, no DB change, no ratification** until the Founder authorizes EA-000 design and later ratifies the completed map. Recommended as an early ratification because it frames every other artifact.
