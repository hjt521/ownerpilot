---
constitutional_id: BASE-001
object_type: baseline
title: Constitution Schema Baseline
status: Operational
canonical_owner: Governance
governing_authority: CON-001
ratification_authority: Founder
lifecycle_state: Operational
created: 2026-07-24
updated: 2026-07-24
depends_on: []
required_by: [VAL-001, REC-001]
implements: [ADR-001]
governed_by: [CON-001]
validated_by: [VAL-001]
supersedes: []
superseded_by: []
related_artifacts: []
registry_tags: [baseline,genesis]
program_phase: foundation
repository_path: constitution/baseline/CONSTITUTION_BASELINE_v1.md
checksum_scope: file
---

# CONSTITUTION BASELINE v1.0 — "Genesis"

> **The Genesis Block of the OwnerPilot Constitutional Operating System.** The first official constitutional release. Immutable. This document + its manifest + checksum define the canonical state of the `constitution` schema as of Constitution v1.0.

- **Release:** v1.0 (Genesis) · **Export date:** 2026-07-22 · **Git commit:** `8fa17cb` (`main`)
- **Environment:** Supabase project `txpetdrfsmqnyooydmas` · **PostgreSQL 17.6** (aarch64-linux)
- **Overall constitutional checksum:** `8830f6b18d3f466b9876a136283592df9041fe2caee0a97d038e836429b71e36`

## 1 · What v1.0 contains

| Category | Count | sha256 |
|---|---|---|
| Tables | 59 | `1783c548…aa25a76` |
| Functions | 7 (5 SECURITY DEFINER + 2 trigger) | `7b4e378f…2f1c5ed1` |
| Triggers | 8 | `bdff625f…f19dc51c` |
| Indexes | 139 | `30d250c4…f6e7ca78` |
| RLS-enabled tables | 59 (0 policies — deny-by-default) | — |
| Enums / domains / sequences / views / matviews | 0 / 0 / 0 / 0 / 0 | — |
| **OVERALL** | | **`8830f6b1…b71e36`** |

Full object inventory: `../database/baseline/BASELINE.md` and `../architecture/module_architecture.md`.

## 2 · Artifacts (this directory)

- `CONSTITUTION_BASELINE_v1.md` — this document.
- `constitution_v1.0_manifest.json` — machine-readable manifest (counts, checksums, environment, git commit).
- `constitution_checksum.sha256` — the checksum file for automated comparison.
- `constitution_v1.0.sql` — **the full schema DDL.** Produced by broker `pg_dump` (requires DB credentials — see `../database/baseline/BASELINE.md`). Until committed, the manifest + checksums are the authoritative v1.0 descriptor.

## 3 · Checksum algorithm (reproducible)

Each category checksum is `sha256` over the deterministic, name-ordered canonical DDL of that category; the overall checksum is `sha256` of the four category hashes concatenated in the order tables‖functions‖triggers‖indexes. Canonical forms: tables = `relname | columns(name:type:notnull:default, attnum-ordered) | constraints(pg_get_constraintdef, sorted)`; functions = `pg_get_functiondef` (name-ordered); triggers = `pg_get_triggerdef` (table,name-ordered); indexes = `pg_get_indexdef` (sorted). The exact query lives in `../validation/checks.sql` (`genesis_checksum`). Re-running it against any later snapshot and comparing `OVERALL` is the drift test — a mismatch means the live schema diverged from the committed baseline.

**Why a Genesis Block:** it fixes a cryptographic anchor for "what the Constitution was at v1.0." Every subsequent official release (v1.1, v1.2, …) is produced by the migration workflow (baseline refresh) and gets its own manifest + checksums, forming a verifiable chain. No constitutional state can change without the overall checksum changing — which is exactly what makes silent database-first drift detectable.

## 4 · Governance

- **Immutable.** This file, its manifest, and its checksum are never edited. Corrections or evolution happen in v1.1+ via the migration workflow, never by mutating Genesis.
- **Source of truth.** As of v1.0, the **repository is the authoritative source** of the Constitution (per the Phase 0 approval / ADR-002). Production must match the committed baseline; the validation framework enforces this continuously.
- **Next release:** the first official change is `const_0001_updated_at_trigger_coverage` (Phase 5). When applied via the workflow, it produces Constitution **v1.1** with a refreshed manifest + checksums.

— Constitution v1.0 "Genesis" · 2026-07-22
