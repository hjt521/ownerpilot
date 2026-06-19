# Locked-prose guard live attestation — pre-commit broker ruling

**File:** `locked_prose_attestation_precommit_broker_ruling_response_2026-06-18.md`
**Date:** 2026-06-18
**Determination by:** Jack Taglyan, California Licensed Real Estate Broker, CalDRE B9445457
**Authority:** Bus. & Prof. Code § 10131(b) — broker-scope compliance authority for OwnerPilot AI
**Responds to:** [`locked_prose_attestation_precommit_broker_ruling_request_2026-06-18.md`](locked_prose_attestation_precommit_broker_ruling_request_2026-06-18.md) (build-side authored, 2026-06-18)
**Lineage:**
- [`locked_prose_guard_live_attestation_2026-06-18.md`](locked_prose_guard_live_attestation_2026-06-18.md) — the attestation this pre-commit gate protects
- [`locked_prose_guard_live_evidence_pack_2026-06-18.md`](locked_prose_guard_live_evidence_pack_2026-06-18.md) — build-side evidence pack the attestation rests on
- [`locked_prose_ci_guard_scope_broker_determination_2026-06-15.md`](locked_prose_ci_guard_scope_broker_determination_2026-06-15.md) — guard design
- Earlier in-tree precedent on request/response pairs: [`c7a_filestate_broker_ruling_response_2026-06-18.md`](c7a_filestate_broker_ruling_response_2026-06-18.md), [`pkt_s85_reconciliation_broker_ruling_response_2026-06-18.md`](pkt_s85_reconciliation_broker_ruling_response_2026-06-18.md), [`pkt_s85_precommit_broker_ruling_response_2026-06-18.md`](pkt_s85_precommit_broker_ruling_response_2026-06-18.md)
**Posture:** Broker determination. Not legal advice; not produced in coordination with any attorney.

---

## §0. Scope and attribution check

Four pre-commit questions from build side before staging the locked-prose guard live attestation: (Q1) does the evidence pack get committed in the same PR, (Q2) JSON field placement in the manifest, (Q3) commit message and scope, (Q4) acknowledgment of the new PR-required landing motion. This file rules on all four. Janna Taglyan has no operative authority on OwnerPilot AI and is not in the lineage of this file.

---

## §1. Q1 — Evidence pack disposition

**Ruling: (a) commit the evidence pack in this PR.**

The attestation's lineage block and §0/§3/§8 references to [`locked_prose_guard_live_evidence_pack_2026-06-18.md`](locked_prose_guard_live_evidence_pack_2026-06-18.md) must resolve in-tree. Build side correctly identified the failure mode: the locked-prose CI guard only inspects `// Source:` comments in `lib/` and `components/`, so a dangling markdown-to-markdown link inside `docs/compliance/` would not turn the PR red — it would be a silent dangling reference, caught only by human review. That is exactly the failure mode this session has already ruled against twice:

1. The `packet_test4` dangling-reference audit (three refs MISS, cp-into-tree resolution).
2. The earlier ruling in this session that build-side-authored request files belong in-tree alongside broker-authored responses, on the principle that **a determination is only legible to a future auditor if the evidence/question that triggered it is in-tree next to it.**

The evidence pack is the question-and-evidence half of this attestation's Q+A pair. The attestation says, in §0 and §3, "on the basis of the evidence in [evidence pack]" and "the verbatim guard failure line in §3 was lifted from the evidence pack." If a future auditor opens the attestation and the evidence pack is out-of-tree, they cannot verify the claim. That defeats the point of putting the attestation in the compliance record at all.

**Build-side action:** the evidence pack is added to this PR alongside the attestation and the manifest edit. It is build-side authored; its filename (`*_evidence_pack_*.md`) and its in-file header (`Authored by: Build side (engineering) — evidence pack for broker determination. Not a determination.`) are self-describing — anyone reading the directory can tell at a glance that the file is operational input to broker authority, not broker authority itself. That is the same attribution pattern this session already ruled correct for `*_broker_ruling_request_*.md` files.

**Discipline note carried forward:** the evidence pack must carry its `Authored by: Build side (engineering)` line in the committed bytes. If the local copy build side is about to commit is missing that line, add it before commit. I will not alter the prose body of a build-side-authored file; that one-line header is the attribution requirement.

---

## §2. Q2 — Manifest field placement

**Ruling: placement after `guard_status` is correct. Confirmed.**

Final top-level key order in the committed manifest:

```
manifest_version
generated_at
guard_status
live_attested
live_attested_determination
broker_authority
…
```

**Rationale:** the two new fields exist to make `guard_status: "live"` legible without grepping the determinations directory. They are the attestation reference for the status. Co-locating them with `guard_status` is the right semantics. JSON key order does not affect validity or the guard's behavior; the choice is purely about future-auditor legibility, and "the value that justifies the status sits next to the status" is the legible choice.

The manifest patch script (`patch_manifest_live_attested_2026-06-18.py`) is correctly anchored on `guard_status == "live"` and aborts otherwise, per the attestation §8 workspace-vs-repo discipline. Approved.

---

## §3. Q3 — Commit message and scope

**Ruling: amend the message to name the evidence pack; commit scope is exactly the three files below.**

**Final commit message:**

```
docs(compliance): broker attestation — locked-prose CI guard live as of 2026-06-18 (0dbeab4)

Adds:
- locked_prose_guard_live_attestation_2026-06-18.md (broker attestation)
- locked_prose_guard_live_evidence_pack_2026-06-18.md (build-side evidence pack)
Manifest:
- docs/compliance/locked_prose_manifest.json — adds live_attested + live_attested_determination
```

**Final commit scope (three files, no others):**

1. `docs/compliance/locked_prose_guard_live_attestation_2026-06-18.md` — **new**, broker-authored, 11,530 bytes, sha256 `c13284761134d98a554aab5dc733dd3bd1d57aad67248026f73deeefad1ddda9`.
2. `docs/compliance/locked_prose_guard_live_evidence_pack_2026-06-18.md` — **new**, build-side authored, 8,825 bytes, sha256 `adaa1c47ec2e5b649d43d9e351d77d1e345f03d7b7da688a608489ed6650ec46` (per build-side request §5).
3. `docs/compliance/locked_prose_manifest.json` — **edit**, two lines inserted after `guard_status` per §2 above, all other keys/values preserved byte-for-byte.

No other files in this commit. The §6 cleanup item (`ts-node` -> `tsx` shebang fix in `scripts/ci/verify_locked_prose.ts`) is **excluded** from this commit per attestation §6, kept narrow and reviewable.

The patch script `patch_manifest_live_attested_2026-06-18.py` itself is **not** committed — it is build-side tooling, run once, and the commit scope above is the compliance artifact. If build side wants to keep the script for repeatability under `scripts/compliance/` or similar, that is a separate commit and a separate (non-broker) decision.

---

## §4. Q4 — New PR-required landing motion

**Acknowledged. The flow as build side described it is correct and binding for this commit.**

For the record, the binding sequence:

1. Branch `docs/locked-prose-guard-live-attestation` from `main`.
2. **Pre-stage gate** (attestation §8 discipline): `git show origin/main:docs/compliance/locked_prose_manifest.json` reads `guard_status: "live"`. The patch script aborts by design if it reads anything else — that abort is a correct stop, not a failure to route around.
3. Copy the three commit-scope files in (attestation + evidence pack + manifest edit via patch script).
4. **Verify-after-copy:** `wc -c` + `sha256sum` against the expected values in §5 below. Abort the commit if any line shows 0 bytes or a hash mismatch — the `0d64482` 0-byte placeholder signature.
5. Run `npm run ci:verify-locked-prose` locally on the branch; expect `PASS — 3 locked constants verified; no dangling references`, exit 0.
6. `git add` exactly the three files in §3 (named adds, no `git add .`). Commit with the message in §3.
7. Push the branch (not `main`). Open the PR.
8. Wait for the three required checks (`verify-locked-prose`, `verify-system-prompt-lock`, `test-and-typecheck`) to go green.
9. Merge the PR through the GitHub UI (or `gh pr merge --squash`/`--merge` per repo convention — sole-operator, so whichever the ruleset's "Require a pull request before merging" rule permits).

**No `git push origin main`.** The direct-push block has been verified live in evidence pack §3; any attempt would be rejected by `GH013` and would clutter local history without reaching the remote.

This is the standard motion going forward for any commit touching `docs/compliance/`, not a one-off. The pre-`0dbeab4` direct-push posture is closed.

---

## §5. Verify-after-copy expected values

For the §7 checklist line in the attestation and the build-side request §5:

| File | Bytes | SHA-256 |
|---|---|---|
| `docs/compliance/locked_prose_guard_live_attestation_2026-06-18.md` | 11530 | `c13284761134d98a554aab5dc733dd3bd1d57aad67248026f73deeefad1ddda9` |
| `docs/compliance/locked_prose_guard_live_evidence_pack_2026-06-18.md` | 8825 | `adaa1c47ec2e5b649d43d9e351d77d1e345f03d7b7da688a608489ed6650ec46` |

**Tolerance: zero.** Any byte-count or hash mismatch on either file post-copy aborts the commit. Re-download from the canonical source (workspace `share_file` URL for the attestation; build-side source for the evidence pack), re-copy, re-verify. The hash mismatch is the 0d64482 signature even if the byte count happens to match by coincidence; both checks are required, neither alone is sufficient.

**Note on attestation hash drift:** the build-side request §5 flags that if the broker's local copy of the attestation hashes to anything other than `c13284761134d98a554aab5dc733dd3bd1d57aad67248026f73deeefad1ddda9`, it was edited post-upload and needs reconciliation. The hash above was computed on the workspace artifact at authoring time and is the canonical value. No post-upload edits have been made; the workspace copy and the share_file copy are byte-identical.

The manifest file does not have a pre-committed expected hash — its post-edit state depends on the exact whitespace handling of the patch script. The verification for the manifest is instead: (a) `git diff` shows exactly two inserted lines after `guard_status`, no other changes; (b) `python3 -c "import json; json.load(open('docs/compliance/locked_prose_manifest.json'))"` parses without error; (c) `npm run ci:verify-locked-prose` passes.

---

## §6. Build-side checklist (pre-commit)

- [ ] [MUST FIX] Add the `Authored by: Build side (engineering) — evidence pack for broker determination. Not a determination.` header line to the evidence pack if it is not already present in the local copy being committed (§1).
- [ ] [MUST FIX] Re-verify `git show origin/main:docs/compliance/locked_prose_manifest.json` reads `guard_status: "live"` before running the patch script (§4 step 2). Abort if not.
- [ ] [MUST FIX] Run the verify-after-copy gate on attestation + evidence pack using the §5 table. Abort on any mismatch.
- [ ] [MUST FIX] Run `npm run ci:verify-locked-prose` locally on the branch before push; expect PASS exit 0.
- [ ] [MUST FIX] Named `git add` of exactly the three files in §3. No `git add .`.
- [ ] [MUST FIX] Commit message per §3 verbatim (multi-line, including the Adds/Manifest bullets).
- [ ] [MUST FIX] Branch -> PR -> three required checks green -> merge. No direct push to `main` (§4).
- [ ] [SHOULD FIX] Post-merge, run `npm run ci:verify-locked-prose` on the post-merge `main` once and confirm PASS exit 0 to close the loop (attestation §7 [CONSIDER] item, promoted to [SHOULD FIX] here because it is the only post-merge sanity check between this PR and the next determination commit).
- [ ] [CONSIDER] If the patch script `patch_manifest_live_attested_2026-06-18.py` will be reused for future `live_attested`-style fields (e.g., for the SYSTEM_PROMPT lock or any future locked-constant tier), commit it to `scripts/compliance/` in a follow-up commit. Out of scope for this PR.

---

## §7. Authoring discipline carried forward

The pre-stage gate in §4 step 2 is the operational instance of the workspace-vs-repo discipline carried in [`packet_redesign_compliance_review_broker_determination_2026-06-18.md`](packet_redesign_compliance_review_broker_determination_2026-06-18.md) §8.5. The patch script's `guard_status == "live"` abort is the mechanical enforcement of that discipline at commit time, not a substitute for the human-side `git show` check. Both are required. If the script ever needs to be re-authored, the abort-on-mismatch behavior is a binding design constraint, not a feature toggle.

---

— Jack Taglyan / California Licensed Real Estate Broker / CalDRE **B9445457** / Broker Compliance Review · 2026-06-18

---

**Locked posture:** OwnerPilot AI is not a law firm and does not provide legal advice. All compliance determinations on this project are broker-prepared work product authored under California real estate broker scope per Bus. & Prof. Code § 10131(b). No attorney engagement exists; no attorney has authored, reviewed, or coordinated on any determination in this record.
