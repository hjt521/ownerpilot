---
constitutional_id: REC-001
operational_maturity: operational
security_classification: internal
capability_class: constitutional
object_type: infrastructure
title: Recovery Kit and Bundle
status: Ratified
canonical_owner: Governance
governing_authority: CON-001
ratification_authority: Founder
lifecycle_state: Ratified
created: 2026-07-24
updated: 2026-07-24
depends_on: [BASE-001, VAL-001, SYS-001]
required_by: []
implements: [CON-001]
governed_by: [CON-001]
validated_by: [CA-001]
supersedes: []
superseded_by: []
related_artifacts: []
registry_tags: [recovery]
program_phase: continuity
repository_path: constitution/recovery/RECOVERY.md
checksum_scope: file
---

# Constitutional Recovery Kit — RECOVERY.md

**Status:** ADOPTED (Founder directive, 2026-07-24) · **Purpose:** the canonical kit for rebuilding or re-grounding the OwnerPilot Constitutional platform if you migrate tools (e.g. away from an AI assistant), lose local state, or need to reconstruct the governance context from scratch.

> **Principle: the repository is the source of truth.** Recovery means re-establishing an agent/human from the repository — never re-deriving governance from memory. If a tool is lost, the constitution is not.

## First move in any recovery
1. Clone/refresh `hjt521/ownerpilot`, checkout `main`.
2. Read, in order: `constitution/STATUS.md` (canonical current state) → this file → `constitution/CONSTITUTION.md` (entry point) → `constitution/standards/constitutional_artifact_lifecycle.md` (what every artifact's state means).
3. Verify the schema baseline is intact (see Checksums below).
4. Re-establish the operating constraints (see Emergency Agent Prompt below).

## Kit contents (this folder)
- **RECOVERY.md** — this runbook.
- **repository_inventory_YYYY-MM-DD.md** — dated snapshot of every `constitution/` file (regenerate on each release; latest is authoritative).
- **STATUS.md snapshots** — point-in-time copies of `constitution/STATUS.md` at each release (optional; the live `STATUS.md` is canonical, snapshots aid forensic diffing).
- **Founder Ratifications** — canonical decision records live in `constitution/audit/` (e.g. `P1_founder_ratifications_2026-07-24.md`); the recovery index points to them.
- **Emergency Agent Prompt** — the minimal briefing (below) that re-establishes an AI assistant's operating rules.
- **Recovery Package** — the founder-authored recovery/handoff package (PDF) if archived here.
- **Release Archives** — pointers to each release's baseline SQL + manifest.
- **Checksums** — pointer to `constitution/baseline/constitution_checksum.sha256`.
- **Repository Inventory** — see the dated inventory file.

## Canonical anchors (do not duplicate — point here)
- **Current schema baseline:** `constitution/baseline/constitution_v1.1.sql` (v1.1) · Genesis frozen at `constitution/baseline/constitution_v1.0.sql` (v1.0).
- **Current checksum (v1.1 OVERALL):** `60ea83bc0916ce31ed1410f724770d4c0dd655a47d914a260bea7376a9275740` — full category checksums in `constitution/baseline/constitution_checksum.sha256`. Genesis v1.0 OVERALL: `8830f6b18d3f466b9876a136283592df9041fe2caee0a97d038e836429b71e36`.
- **Validation runner:** `constitution/validation/run_checks.*` (+ `security_posture_checks.sql`) — run against prod to confirm no drift from baseline.
- **Governance model:** `constitution/doctrines/governance_handbook.md`, `constitution/standards/development_standards.md`, `constitution/process/migration_workflow.md`.
- **Assurance:** `constitution/audit/CA-001_constitutional_auditor.md`.

## Checksums / integrity verification
On recovery, confirm production still matches the committed baseline: run `run_checks.sql` and compare the OVERALL checksum to `constitution_checksum.sha256`. A mismatch means the production `constitution` schema drifted from the repository — investigate before trusting either.

## Emergency Agent Prompt (minimal re-briefing)
> You are Engineering on OwnerPilot's Constitutional platform. The GitHub repository `hjt521/ownerpilot` (`/constitution`) is the single source of truth; `STATUS.md` is the canonical current state. Constitutional separation of powers holds: **Engineering implements, CA-001 assures, the Founder ratifies, the repository is canonical.** Repository-first, architecture-first, additive-by-default, semantic versioning. Never make an unreviewed production database change. Governance identities are logical (`approved_by text`). Every artifact carries one lifecycle state (Concept→Proposed→Architecture Draft→Founder Review→Ratified→Implemented→Operational→Superseded→Archived); AI never self-advances past Architecture Draft and never ratifies. Missing evidence → `Indeterminate`. Read STATUS.md and the artifact-lifecycle standard before acting.

## Recovery Bundle (per-release, self-restoring — ADOPTED direction 2026-07-24)
Every constitutional release SHALL produce a **Recovery Bundle** — a single ZIP that makes each release self-restoring. Contents:
```
Recovery Bundle (constitution_recovery_v<version>.zip)
├── constitution/            # the repository subtree at the release commit
├── STATUS.md                # canonical state at release
├── Repository Inventory     # dated inventory (recovery/repository_inventory_<date>.md)
├── Checksums                # constitution_checksum.sha256 (+ per-category)
├── RECOVERY.md              # this runbook
├── Emergency Agent Prompt   # the minimal re-briefing (below)
├── Release Notes            # what changed this release
├── Version Manifest         # constitution_v<version>_manifest.json
├── Generated Indexes        # constitution/index/*.json (CBS-001 output: artifact/ea/adr/registry/knowledge/… + dependency_graph + repository_inventory + metadata_coverage)
└── Dependency Graph         # constitution/index/dependency_graph.json (nodes = CRIDs, edges = declared relations)
```
The generated indexes are produced by **CBS-001** (`node constitution/tools/cbs.mjs build`) and are reproducible from repository metadata, so a bundle self-describes its entire artifact graph.
This becomes a step in the migration workflow's release phase (bundle produced + attached to the release). Rebuilding from any bundle reconstitutes the platform at that version without external state. **No secrets in the bundle** — it references credentials, never stores them. (Bundle automation is build-work, not yet implemented; this records the required output.)

## Maintenance
Refresh the dated repository inventory and (optionally) snapshot STATUS.md on every constitutional release (migration-workflow step 7), and produce the Recovery Bundle above. Keep this folder free of secrets — it references, it does not store credentials.
