# Build-side evidence pack — for broker authoring of the locked-prose guard live attestation

**File:** `locked_prose_guard_live_evidence_pack_2026-06-18.md`
**Date:** 2026-06-18
**Authored by:** Build side (engineering) — evidence pack for broker determination. Not a determination.
**To:** Jack Taglyan, California Licensed Real Estate Broker, CalDRE B9445457 — sole compliance authority for OwnerPilot AI
**Purpose:** Assemble the verified acceptance + enforcement evidence so the broker can author the locked-prose CI guard live attestation. Build side authors no ruling/attestation prose; every fact below is disk- or UI-verified and reproducible. The attestation language and any rulings are left blank for the broker.

---

## 0. What this supports

The locked-prose CI guard (`scripts/ci/verify_locked_prose.ts`, run via `npm run ci:verify-locked-prose`) is now (a) proven to hard-fail on locked-prose drift, (b) wired into CI as a job, and (c) enforced as a required status check on `main`. This pack is the evidence base for a broker determination attesting the guard is live, per `locked_prose_ci_guard_scope_broker_determination_2026-06-15.md` (guard design) and the `guard_status` field in `docs/compliance/locked_prose_manifest.json`.

**Note on manifest state:** `guard_status` already reads `"live"` in the committed manifest. So the determination is not flipping a flag — it records the acceptance test and enforcement that justify the live status, and stamps the live-as-of date. Whether to also touch the manifest (e.g., add a `live_attested` field or a determination back-reference) is a broker decision; build side will wire whatever is authored.

---

## 1. Acceptance evidence — guard fails RED on drift (local)

Reproducible local test that the guard hard-fails when a Tier-B locked string is altered by one byte.

- **Branch:** throwaway `test/guard-acceptance-2026-06-18`, cut from `629c4d9`, deleted after the test.
- **Perturbed constant:** `bankDepositMethodDisclosureExpandLabel` (Tier B, `lib/flow/bankDepositDisclosureCopy.ts`).
- **Perturbation:** one byte, `?` -> `.` (the label `"Why is this required?"` -> `"Why is this required."`). Chosen because it is a UI label, not statutory prose — no risk of a corrupted statutory string lingering.
- **Result:** HARD FAIL, exit code **1**.
- **Classifier emitted:** `verbatim-mismatch`.
- **Live SHA-256 (perturbed):** `9d19fba8e0924e1196890cfa2efd5009423ece12e0702c3db506179f0e7eb013`
- **Manifest SHA-256 (expected):** `463a370578d66b7d9a531d9db8c9b18ca0bd9caa01e384086d23a227ef8fd1bc`
- **Guard's stated basis for hard fail:** `locked_prose_ci_guard_scope_broker_determination_2026-06-15.md` §3.3 (no warn-then-ack mode).
- **Source determination cited by the guard for the constant:** `bank_deposit_disclosure_copy_ratification_broker_determination_2026-06-18.md` §2.2.
- **Revert + re-verify:** `git restore` of the file, back to `main`, branch deleted; guard re-run on clean `main` returned **PASS — 3 locked constants verified; no dangling references**, exit code **0**.

Verbatim guard failure line (for the record):

```
[verify-locked-prose] FAIL — 1 drift(s) detected:
  [verbatim-mismatch] bankDepositMethodDisclosureExpandLabel in lib/flow/bankDepositDisclosureCopy.ts differs from manifest verbatim. Live SHA-256: 9d19fba8e0924e1196890cfa2efd5009423ece12e0702c3db506179f0e7eb013. Manifest SHA-256: 463a370578d66b7d9a531d9db8c9b18ca0bd9caa01e384086d23a227ef8fd1bc. Source determination: docs/compliance/bank_deposit_disclosure_copy_ratification_broker_determination_2026-06-18.md §2.2.
```

## 2. Acceptance evidence — guard passes GREEN in CI

The guard runs green on GitHub's runner against a clean tree, proving the workflow is valid and the gate passes when prose matches the manifest.

- **PR:** #28, `ci: add locked-prose-lock workflow as standalone required check (guard acceptance 2026-06-18)`.
- **Branch merged:** `ci/locked-prose-required-check` -> `main`.
- **Workflow file added:** `.github/workflows/locked-prose-lock.yml` (job `verify-locked-prose`), mirroring `system-prompt-lock.yml` (no path filter, always runs, fast — cannot be evaded by how a change touches the source files).
- **Checks on PR #28:** all 5 passed — `locked-prose-lock / verify-locked-prose`, `ci / test-and-typecheck`, `system-prompt-lock / verify-system-prompt-lock`, Vercel deployment, Vercel preview comments.
- **Merge commit:** `0dbeab4` on `main`.

## 3. Enforcement evidence — required status check on `main`

The guard is now a merge-blocking gate, not advisory.

- **Mechanism:** repository ruleset (GitHub rulesets, not classic branch protection).
- **Ruleset name:** `main protection`.
- **Enforcement status:** Active.
- **Bypass list:** empty (applies to the owner as well — no exemptions).
- **Target:** default branch (`main`).
- **Rules enabled:**
  - Require a pull request before merging (required approvals: 0 — sole-operator repo).
  - Require status checks to pass, with three required checks (all GitHub Actions):
    - `verify-locked-prose`
    - `verify-system-prompt-lock`
    - `test-and-typecheck`
  - Require branches to be up to date before merging.
  - Block force pushes.
- **Direct-push block verified:** an empty test commit pushed straight to `main` was rejected by the remote:
  ```
  remote: error: GH013: Repository rule violations found for refs/heads/main.
  - Changes must be made through a pull request.
  - 3 of 3 required status checks are expected.
  ! [remote rejected] main -> main (push declined due to repository rule violations)
  ```
  The test commit never reached the remote; local `main` was reset back to `0dbeab4`.

**Collateral finding (for the record):** prior to this ruleset, the repo had **no** branch protection at all ("Classic branch protections have not been configured"). That means `system-prompt-lock` and `ci` were *running* on every PR but **not enforced** as merge gates. The `main protection` ruleset enforces all three for the first time, including the attorney-gated SYSTEM_PROMPT lock.

## 4. Manifest / guard state at attestation time

From `docs/compliance/locked_prose_manifest.json` at `HEAD` (`0dbeab4`):

- `manifest_version`: `v1`
- `guard_status`: `live`
- 3 Tier-B locked constants, all in `lib/flow/bankDepositDisclosureCopy.ts`, all `version_stamp` `bankDepositMethodCopyVersion=v1`, all sourced from `bank_deposit_disclosure_copy_ratification_broker_determination_2026-06-18.md` (§2.1 / §2.2 / §2.3):
  - `bankDepositMethodHelper` — hash `34c23cc573ee558c86f8bba5563589b9b9c6d46bf57890bf364bc295dd71b2e1`
  - `bankDepositMethodDisclosureExpandLabel` — hash `463a370578d66b7d9a531d9db8c9b18ca0bd9caa01e384086d23a227ef8fd1bc`
  - `bankDepositMethodDisclosure` — hash `32d4f0e66f03f5a2801d793785ea4cd33024c39911722adfe25d3399254a7496`
- Guard also performs a dangling-reference check (every `// Source: <file>.md` comment in `lib/` and `components/` must resolve to a file in `docs/compliance/`); current state: **no dangling references**.

## 5. Open cleanup item (non-blocking — broker may log or defer)

`scripts/ci/verify_locked_prose.ts` shebang and usage docstring reference `ts-node` (`#!/usr/bin/env ts-node`, `npx ts-node ...`), but the `package.json` script and CI both invoke it via `tsx`. Cosmetic — the npm script runs it correctly — but if the file is ever executed by its shebang it would reach for `ts-node`, which may not be installed. One-line fix whenever the file is next touched. Flagged only so it is on the record, not as a blocker to this attestation.

## 6. Commit lineage this attestation sits on top of

```
0dbeab4  Merge PR #28 — locked-prose-lock workflow (CI wiring)
413f241  ci: add locked-prose-lock workflow as standalone required check
629c4d9  docs(compliance): commit C7a/packet_redesign ruling request+response audit trail
402aac8  packet_redesign §8.4 + §8.5 + §8.6 reconciliation (Branch-B C7a)
9baefe5  C7a Branch-B whole-file replacement
```

---

## Broker attestation — to author

Build side will transcribe verbatim into a determination file (suggested name `locked_prose_guard_live_attestation_2026-06-18.md`) and land it via branch -> PR -> green checks -> merge (direct pushes to `main` are now blocked).

- **Live-as-of date:**
- **Attestation statement (guard is live and enforcing):**
- **Acceptance evidence accepted (red local + green CI):**
- **Enforcement accepted (ruleset `main protection`, 3 required checks, direct-push block):**
- **Manifest action (none / add `live_attested` field / add determination back-reference):**
- **§5 cleanup disposition (log as tracked / defer / fix now):**
- **Sign-off:**

---

— Evidence pack only. All facts disk-/UI-verified and reproducible. Awaiting broker attestation; no determination authored by build side.
