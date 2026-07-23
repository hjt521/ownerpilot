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

## Maintenance
Refresh the dated repository inventory and (optionally) snapshot STATUS.md on every constitutional release (migration-workflow step 7). Keep this folder free of secrets — it references, it does not store credentials.
