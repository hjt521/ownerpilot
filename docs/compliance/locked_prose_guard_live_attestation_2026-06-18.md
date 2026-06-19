# Locked-prose CI guard — live attestation

**File:** `locked_prose_guard_live_attestation_2026-06-18.md`
**Date:** 2026-06-18
**Determination by:** Jack Taglyan, California Licensed Real Estate Broker, CalDRE B9445457
**Authority:** Bus. & Prof. Code § 10131(b) — broker-scope compliance authority for OwnerPilot AI
**Lineage:**
- [`locked_prose_ci_guard_scope_broker_determination_2026-06-15.md`](locked_prose_ci_guard_scope_broker_determination_2026-06-15.md) — guard design and hard-fail policy
- [`bank_deposit_disclosure_copy_ratification_broker_determination_2026-06-18.md`](bank_deposit_disclosure_copy_ratification_broker_determination_2026-06-18.md) — source determination for the three Tier-B locked constants
- [`locked_prose_guard_live_evidence_pack_2026-06-18.md`](locked_prose_guard_live_evidence_pack_2026-06-18.md) — build-side evidence pack (disk- and UI-verified)
**Posture:** Broker determination. Not legal advice; not produced in coordination with any attorney.

---

## §0. Scope and attribution check

This attestation records that the locked-prose CI guard (`scripts/ci/verify_locked_prose.ts`, invoked via `npm run ci:verify-locked-prose`) is live and enforcing on `main` as of the date below, on the basis of the acceptance and enforcement evidence in [`locked_prose_guard_live_evidence_pack_2026-06-18.md`](locked_prose_guard_live_evidence_pack_2026-06-18.md). The evidence pack is build-side authored; this file is the broker determination that the evidence is sufficient and that the guard's live status is hereby attested.

This determination is broker-prepared work product. No attorney authored, reviewed, or coordinated on it. Janna Taglyan has no operative authority on OwnerPilot AI and is not in the lineage of this file.

---

## §1. Live-as-of date

**The locked-prose CI guard is live and enforcing on `main` as of 2026-06-18 (commit `0dbeab4`).**

---

## §2. Attestation statement

The locked-prose CI guard at `scripts/ci/verify_locked_prose.ts`, invoked in CI by the workflow `.github/workflows/locked-prose-lock.yml` (job `verify-locked-prose`), is **live, enforcing, and merge-blocking on `main`** as of 2026-06-18 (commit `0dbeab4`). It hard-fails (exit code 1) on any drift between the verbatim text of a locked constant on disk and the manifest's recorded verbatim/SHA-256 for that constant, with no warn-then-ack mode and no bypass list. It additionally hard-fails on any dangling `// Source: <file>.md` reference in `lib/` or `components/` whose target does not resolve in `docs/compliance/`. The guard's hard-fail policy is the policy authored in [`locked_prose_ci_guard_scope_broker_determination_2026-06-15.md`](locked_prose_ci_guard_scope_broker_determination_2026-06-15.md) §3.3.

---

## §3. Acceptance evidence accepted

**Accepted in full.** Both halves of the acceptance test are sufficient and reproducible.

**Red local (drift -> hard fail):** A one-byte perturbation of the Tier-B constant `bankDepositMethodDisclosureExpandLabel` in `lib/flow/bankDepositDisclosureCopy.ts` (`?` -> `.`) on throwaway branch `test/guard-acceptance-2026-06-18` produced the expected hard fail with exit code 1 and classifier `verbatim-mismatch`. Live SHA-256 `9d19fba8e0924e1196890cfa2efd5009423ece12e0702c3db506179f0e7eb013` against manifest SHA-256 `463a370578d66b7d9a531d9db8c9b18ca0bd9caa01e384086d23a227ef8fd1bc`. The verbatim failure line cited the guard's source determination correctly ([`bank_deposit_disclosure_copy_ratification_broker_determination_2026-06-18.md`](bank_deposit_disclosure_copy_ratification_broker_determination_2026-06-18.md) §2.2). The chosen perturbation was a UI-label punctuation change, not a statutory string — appropriate; no risk of a corrupted statutory string lingering in history. Revert via `git restore`, branch deletion, and re-run on clean `main` produced PASS (3 locked constants verified; no dangling references), exit code 0.

**Green CI (clean tree -> pass):** PR #28 (`ci: add locked-prose-lock workflow as standalone required check (guard acceptance 2026-06-18)`), branch `ci/locked-prose-required-check` -> `main`, merge commit `0dbeab4`. All five PR checks passed: `locked-prose-lock / verify-locked-prose`, `ci / test-and-typecheck`, `system-prompt-lock / verify-system-prompt-lock`, Vercel deployment, Vercel preview comments. Workflow file mirrors `system-prompt-lock.yml` (no path filter, always runs) — the gate cannot be evaded by how a change touches the source files.

**Both halves accepted. The guard fails RED on drift and passes GREEN on clean trees.**

---

## §4. Enforcement accepted

**Accepted in full.** The ruleset `main protection` is the enforcement mechanism and is satisfactory.

- **Mechanism:** GitHub repository ruleset (not classic branch protection).
- **Status:** Active.
- **Target:** default branch (`main`).
- **Bypass list:** empty — applies to the owner as well, no exemptions. This is the correct posture for a sole-operator broker-scope repository.
- **Required status checks (three, all GitHub Actions):** `verify-locked-prose`, `verify-system-prompt-lock`, `test-and-typecheck`.
- **Additional rules:** PR required before merge (zero required approvals, sole-operator), branches must be up to date before merge, force pushes blocked.
- **Direct-push block verified live:** an empty test commit pushed straight to `main` was rejected by the remote with `GH013: Repository rule violations found for refs/heads/main` (`Changes must be made through a pull request` + `3 of 3 required status checks are expected`). The test commit never reached the remote; local `main` was reset to `0dbeab4`. This is the correct enforcement signature.

**Collateral finding acknowledged on the record:** prior to the `main protection` ruleset, the repository had no branch protection at all. The `system-prompt-lock` and `ci` workflows were running on every PR but were **not enforced** as merge gates. The new ruleset enforces all three required checks (including the locked-prose guard and the attorney-gated SYSTEM_PROMPT lock) for the first time. This is a material posture improvement and is recorded here so that any audit reading this file later understands that pre-`0dbeab4` history did not run under enforced gates — only the post-`0dbeab4` repo state does.

---

## §5. Manifest action

**Ruling: add a `live_attested` field and a `live_attested_determination` back-reference to `docs/compliance/locked_prose_manifest.json`. Do not modify `guard_status`.**

**Rationale:**

1. `guard_status` already reads `"live"` in the committed manifest at `0dbeab4` per the evidence pack §4. Flipping it would be a no-op; leaving it alone is correct.
2. The manifest is the machine-readable companion to this file. A future auditor reading the manifest in isolation should be able to find the broker attestation that justifies `guard_status: "live"` without having to grep the determinations directory. A back-reference field accomplishes that in one line.
3. Adding a dated `live_attested` field also gives downstream tooling a stable place to read the attestation date if it ever needs to (e.g., a future compliance dashboard, or a guard self-check that warns if `live_attested` is older than the most recent locked-constant ratification).

**Build-side action:** add the following two top-level fields to `docs/compliance/locked_prose_manifest.json`, alongside the existing `manifest_version` and `guard_status` fields, preserving all existing keys and values byte-for-byte:

```json
"live_attested": "2026-06-18",
"live_attested_determination": "docs/compliance/locked_prose_guard_live_attestation_2026-06-18.md",
```

The manifest edit lands in the same commit as this determination, on the same PR, behind the same three required checks.

---

## §6. §5 cleanup disposition (evidence pack §5)

**Ruling: log as tracked; do not fix in this commit.**

The shebang/docstring `ts-node` reference in `scripts/ci/verify_locked_prose.ts` is cosmetic — the `package.json` script and CI both invoke the file via `tsx`, and that invocation is the only path that runs in practice. Fixing it now would mix a cosmetic script-header edit into a broker-attestation commit whose scope should stay narrow. Leaving it alone keeps the attestation diff small and reviewable.

**Tracked for next touch:** when `scripts/ci/verify_locked_prose.ts` is next opened for any reason, replace `#!/usr/bin/env ts-node` with `#!/usr/bin/env tsx` and update the usage docstring's `npx ts-node ...` example to `npx tsx ...` in the same edit. No separate ticket required; this paragraph is the tracking record.

---

## §7. Build-side checklist

- [ ] [MUST FIX] Add `live_attested` and `live_attested_determination` fields to `docs/compliance/locked_prose_manifest.json` per §5 (verbatim JSON block above, preserving all existing keys byte-for-byte).
- [ ] [MUST FIX] Commit this attestation file to `docs/compliance/locked_prose_guard_live_attestation_2026-06-18.md` and the manifest edit in the same commit. Branch -> PR -> three required checks (`verify-locked-prose`, `verify-system-prompt-lock`, `test-and-typecheck`) green -> merge.
- [ ] [MUST FIX] Verify after copy: `wc -c docs/compliance/locked_prose_guard_live_attestation_2026-06-18.md` matches the workspace byte count; `sha256sum` matches the workspace hash. Abort the commit if either differs (the `0d64482` 0-byte placeholder signature).
- [ ] [MUST FIX] Suggested commit message: `docs(compliance): broker attestation — locked-prose CI guard live as of 2026-06-18 (0dbeab4)`.
- [ ] [SHOULD FIX] When `scripts/ci/verify_locked_prose.ts` is next touched for any reason, fix the `ts-node` shebang and docstring to `tsx` per §6. No separate ticket.
- [ ] [CONSIDER] After merge, run `npm run ci:verify-locked-prose` locally once on the post-merge `main` and confirm `PASS — 3 locked constants verified; no dangling references` to close the loop.

---

## §8. Authoring discipline note

This attestation was authored against the build-side evidence pack ([`locked_prose_guard_live_evidence_pack_2026-06-18.md`](locked_prose_guard_live_evidence_pack_2026-06-18.md)) — not against the workspace copy of `locked_prose_manifest.json`, which still reads `guard_status: "required-but-pending"` (workspace state, pre-flip). The evidence pack §4 reports the committed manifest at `0dbeab4` reads `guard_status: "live"`. The attestation relies on the committed repo state as reported by the evidence pack, consistent with the workspace-vs-repo discipline carried in [`packet_redesign_compliance_review_broker_determination_2026-06-18.md`](packet_redesign_compliance_review_broker_determination_2026-06-18.md) §8.5: workspace artifacts are not assumed to be the same bytes as committed repo files.

Build side should re-verify the committed manifest state with `git show origin/main:docs/compliance/locked_prose_manifest.json` before applying the §5 manifest edit, and abort if `guard_status` reads anything other than `"live"` at that point.

---

— Jack Taglyan / California Licensed Real Estate Broker / CalDRE **B9445457** / Broker Compliance Review · 2026-06-18

---

**Locked posture:** OwnerPilot AI is not a law firm and does not provide legal advice. All compliance determinations on this project are broker-prepared work product authored under California real estate broker scope per Bus. & Prof. Code § 10131(b). No attorney engagement exists; no attorney has authored, reviewed, or coordinated on any determination in this record.
