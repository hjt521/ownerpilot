# Phase 4 — Constitutional Governance Handbook

The governance handbook for the OwnerPilot Constitutional Operating System (COS). It defines how the Constitution *lives* as a software product: its lifecycle, versioning, release, review, approval, deprecation, and amendment. This is the authoritative policy layer; the mechanics live in `../process/` and `../validation/`.

## 1 · Constitution lifecycle

```
Architecture → ADR → Module doc → Security model → Validation strategy → (approval) → Migration draft
   → Repository review → Validation → Broker apply → Baseline refresh → Doc refresh → Release
```

A constitutional object exists in one of: **proposed** (architecture/ADR only), **drafted** (migration in repo, not applied), **released** (applied + baseline-refreshed + documented), **deprecated** (superseded, still present), **removed** (dropped via a dedicated migration).

## 2 · Version numbering (semantic, constitution-scoped)

`vMAJOR.MINOR.PATCH`, starting at **v1.0** (Genesis).

- **PATCH** (v1.0 → v1.0.1): non-structural corrections — comments, an index, a missing trigger, a CHECK tightening that no existing row violates. Backward compatible.
- **MINOR** (v1.0 → v1.1): additive structure — new table/column/function/module; new allowed status value. Backward compatible; existing readers unaffected.
- **MAJOR** (v1.x → v2.0): a breaking change — rename, drop, type change, FK strategy change, or a state-machine change that existing readers can't tolerate. Requires an amendment ADR (§8) and a migration + backward-compat plan.

Every release increments the version, refreshes the baseline manifest/checksum, and appends to the release log. `const_0001` (trigger coverage) is a **PATCH** → produces **v1.1** only because it's the first release (structural-none, correctness-only; if strictly patch, tag v1.0.1 — the increment recommendation is made per-migration in the governance record).

## 3 · Release process

1. Migration merged + broker-applied (workflow steps 4–6).
2. **Baseline refresh:** recompute checksums → new `constitution_v<X.Y>_manifest.json` + `constitution_checksum.sha256` committed (step 8).
3. **Tag/log** the release in `baseline/` (Genesis is v1.0; each release keeps its own manifest, forming the chain).
4. Validation continuous-watch now compares against the new baseline.

## 4 · Review process

- Every constitutional PR requires: the migration draft, its governance record (10 outputs), updated docs, and a green validation run. Reviewer confirms standards compliance (`../standards/`) + ADR coverage for any novel decision.
- **No self-approval of production apply.** Engineering drafts + reviews; the broker/owner approves and applies (governance §4.13).

## 5 · Approval workflow

- **Design approval** (before migration): owner signs off the architecture doc + ADRs.
- **Merge approval** (repo): reviewer + green CI.
- **Apply approval** (production): broker executes; recorded as the release event.
- Founder-in-the-loop gates that exist *in the data model* (`founder_approval_required`, `approved_by`, `approved_at`) are honored by application code, not bypassed by migrations.

## 6 · Deprecation process

Mark deprecated (comment + ADR noting the successor) → keep for **≥1 minor release** → remove in a dedicated migration (MAJOR if any reader still depended on it). Never drop-in-place without this path.

## 7 · Breaking-change & backward-compatibility policy

- **Additive-by-default.** New columns nullable/defaulted; new objects independent.
- A breaking change requires: an amendment ADR, a migration, a **compatibility window** (readers keep working across the change — e.g. expand-then-contract: add new, dual-write/read, migrate, remove old), and a MAJOR version bump.
- Existing production behavior is never altered as a side effect. Behavior changes are explicit, versioned, and documented.

## 8 · Constitutional amendment process

Amending a ratified decision (an ADR, a doctrine, a standard):
1. New **amendment ADR** that names the ADR it supersedes and *why* (the revisit-trigger fired). The old ADR is marked "Superseded by ADR-NNN," never deleted (append-only history — same discipline as the platform's ruling-supersession pattern).
2. If the amendment changes schema, it flows through the full migration workflow with its governance record.
3. If it changes only policy/standards, it updates the relevant `standards/` or `doctrines/` doc + the roadmap, and the validation checks that enforce the old rule are updated in the same PR.

## 9 · Operating principle

> Build for decades, not months. Preserve backward compatibility. Document every architectural decision. No constitutional change is silent — it moves the version, the baseline, the docs, and the checksum together, or it does not ship.
